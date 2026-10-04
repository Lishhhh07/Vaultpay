import crypto from "crypto";
import db from "@repo/db/client";

export const SETTLE = {
  MIN_PAISE: 100 * 100,     
  MAX_PAISE: 500_000 * 100, 
} as const;

export type SettleResult =
  | { ok: true; settlementId: number; amount: number; replayed: boolean }
  | { ok: false; message: string };

class UserError extends Error {}

const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function settleToBank(input: {
  merchantId: number;
  bankAccountId: number;
  amount: number; // paise
  idempotencyKey: string;
}): Promise<SettleResult> {
  const { merchantId, bankAccountId, amount, idempotencyKey } = input;

  if (!KEY_RE.test(idempotencyKey)) return { ok: false, message: "Invalid request" };
  if (!Number.isInteger(amount) || amount < SETTLE.MIN_PAISE || amount > SETTLE.MAX_PAISE) {
    return { ok: false, message: "Amount must be between ₹100 and ₹5,00,000" };
  }

  try {
    return await db.$transaction(
      async (tx) => {

        const locked = await tx.$queryRaw<{ id: number }[]>`
          SELECT id FROM "MerchantBalance" WHERE "merchantId" = ${merchantId} FOR UPDATE`;
        if (locked.length === 0) throw new UserError("Merchant account not found");
        const prior = await tx.settlement.findFirst({ where: { idempotencyKey } });
        if (prior) {
          if (prior.merchantId !== merchantId || prior.bankAccountId !== bankAccountId || prior.amount !== amount) {
            throw new UserError("This request was already used for a different settlement");
          }
          return { ok: true as const, settlementId: prior.id, amount: prior.amount, replayed: true };
        }

        const merchant = await tx.merchant.findUnique({ where: { id: merchantId }, select: { kycStatus: true } });
        if (merchant?.kycStatus !== "VERIFIED") throw new UserError("Complete KYC to settle");
        const bank = await tx.bankAccount.findFirst({
          where: { id: bankAccountId, merchantId },
          select: { last4: true },
        });
        if (!bank) throw new UserError("Bank account not found");

        const bal = await tx.merchantBalance.findUnique({ where: { merchantId } });
        if (!bal || bal.amount - bal.locked < amount) throw new UserError("Insufficient balance");

        await tx.merchantBalance.update({ where: { merchantId }, data: { amount: { decrement: amount } } });
        const s = await tx.settlement.create({
          data: {
            merchantId,
            bankAccountId,
            amount,
            status: "PROCESSED",
            processedAt: new Date(),
            utr: crypto.randomInt(0, 1_000_000_000_000).toString().padStart(12, "0"),
            idempotencyKey,
          },
        });

        await tx.auditLog.create({
          data: {
            actorType: "MERCHANT",
            actorId: merchantId,
            action: "SETTLEMENT",
            metadata: { settlementId: s.id, amount, bankLast4: bank.last4 },
          },
        });
        return { ok: true as const, settlementId: s.id, amount, replayed: false };
      },
      { maxWait: 10_000, timeout: 15_000 }
    );
  } catch (e) {
    if (e instanceof UserError) return { ok: false, message: e.message };
    console.error("settleToBank failed");
    return { ok: false, message: "Something went wrong. Please retry. You won't be charged twice." };
  }
}