import db from "@repo/db/client";

export const LIMITS = {
  MIN_PAISE: 100,                      // ₹1
  MAX_PER_PAYMENT_PAISE: 100_000 * 100, // ₹1,00,000
  DAILY_PAISE: 200_000 * 100,          // ₹2,00,000 per payer per 24h
  MAX_PAYMENTS_PER_MINUTE: 10,
} as const;

const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

export type PaymentErrorCode =
  | "INVALID_AMOUNT" | "INVALID_KEY" | "KEY_REUSED" | "NO_WALLET"
  | "MERCHANT_UNAVAILABLE" | "RATE_LIMITED" | "DAILY_LIMIT"
  | "INSUFFICIENT_FUNDS" | "INTERNAL";

export type PayMerchantInput = {
  userId: number;
  merchantId: number;
  amount: number;            // paise
  idempotencyKey: string;
  note?: string | null;
};

export type PayMerchantResult =
  | { ok: true; paymentId: number; amount: number; merchantName: string; createdAt: Date; replayed: boolean }
  | { ok: false; code: PaymentErrorCode; message: string };

class PaymentError extends Error {
  constructor(public code: PaymentErrorCode, message: string) {
    super(message);
  }
}

const fail = (code: PaymentErrorCode, message: string): PayMerchantResult => ({ ok: false, code, message });

type PriorPayment = {
  id: number; amount: number; createdAt: Date; fromUserId: number; merchantId: number;
  merchant: { businessName: string | null; name: string | null };
};

function toOk(p: PriorPayment, replayed: boolean): PayMerchantResult {
  return {
    ok: true,
    paymentId: p.id,
    amount: p.amount,
    merchantName: p.merchant.businessName ?? p.merchant.name ?? "Merchant",
    createdAt: p.createdAt,
    replayed,
  };
}

export async function payMerchant(input: PayMerchantInput): Promise<PayMerchantResult> {
  const { userId, merchantId, amount, idempotencyKey } = input;
  const note = input.note?.trim().slice(0, 60) || null;

  if (!Number.isInteger(amount) || amount < LIMITS.MIN_PAISE || amount > LIMITS.MAX_PER_PAYMENT_PAISE) {
    return fail("INVALID_AMOUNT", "Amount must be between ₹1 and ₹1,00,000");
  }
  if (!KEY_RE.test(idempotencyKey)) return fail("INVALID_KEY", "Invalid request");

  try {
    return await db.$transaction(
      async (tx) =>{
        const wallet = await tx.$queryRaw<{ id: number }[]>`
          SELECT id FROM "Balance" WHERE "userId" = ${userId} FOR UPDATE`;
        if (wallet.length === 0) throw new PaymentError("NO_WALLET", "Wallet not found");

        const prior = await tx.merchantPayment.findUnique({
          where: { idempotencyKey },
          include: { merchant: { select: { businessName: true, name: true } } },
        });
        if (prior) {
          if (prior.fromUserId !== userId || prior.merchantId !== merchantId || prior.amount !== amount) {
            throw new PaymentError("KEY_REUSED", "This request was already used for a different payment");
          }
          return toOk(prior, true);
        }

        const merchant = await tx.merchant.findUnique({
          where: { id: merchantId },
          select: { kycStatus: true, businessName: true, name: true },
        });
        if (!merchant || merchant.kycStatus !== "VERIFIED") {
          throw new PaymentError("MERCHANT_UNAVAILABLE", "This merchant can't accept payments right now");
        }

        const recent = await tx.merchantPayment.count({
          where: { fromUserId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } },
        });
        if (recent >= LIMITS.MAX_PAYMENTS_PER_MINUTE) {
          throw new PaymentError("RATE_LIMITED", "Too many payments. Please wait a minute.");
        }
        const day = await tx.merchantPayment.aggregate({
          _sum: { amount: true },
          where: { fromUserId: userId, status: "SUCCESS", createdAt: { gte: new Date(Date.now() - 86_400_000) } },
        });
        if ((day._sum.amount ?? 0) + amount > LIMITS.DAILY_PAISE) {
          throw new PaymentError("DAILY_LIMIT", "Daily payment limit reached");
        }

        const mBal = await tx.$queryRaw<{ id: number }[]>`
          SELECT id FROM "MerchantBalance" WHERE "merchantId" = ${merchantId} FOR UPDATE`;
        if (mBal.length === 0) throw new PaymentError("MERCHANT_UNAVAILABLE", "This merchant can't accept payments right now");

        const bal = await tx.balance.findUnique({ where: { userId } });
        if (!bal || bal.amount - bal.locked < amount) {
          throw new PaymentError("INSUFFICIENT_FUNDS", "Insufficient wallet balance");
        }

        await tx.balance.update({ where: { userId }, data: { amount: { decrement: amount } } });
        await tx.merchantBalance.update({ where: { merchantId }, data: { amount: { increment: amount } } });
        const payment = await tx.merchantPayment.create({
          data: { merchantId, fromUserId: userId, amount, status: "SUCCESS", idempotencyKey, note },
          include: { merchant: { select: { businessName: true, name: true } } },
        });
        return toOk(payment, false);
      },
      { maxWait: 10_000, timeout: 15_000 }
    );
  } catch (e) {
    if (e instanceof PaymentError) return fail(e.code, e.message);

    if ((e as { code?: string })?.code === "P2002") {
      const prior = await db.merchantPayment.findUnique({
        where: { idempotencyKey },
        include: { merchant: { select: { businessName: true, name: true } } },
      });
      if (prior && prior.fromUserId === userId && prior.merchantId === merchantId && prior.amount === amount) {
        return toOk(prior, true);
      }
      return fail("KEY_REUSED", "This request was already used for a different payment");
    }

    console.error("payMerchant failed");
    return fail("INTERNAL", "Something went wrong. Please retry. You won't be charged twice.");
  }
}