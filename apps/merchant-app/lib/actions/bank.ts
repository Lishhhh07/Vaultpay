"use server";

import { revalidatePath } from "next/cache";
import db from "@repo/db/client";
import { bankSchema } from "../validators";
import { getMerchantId } from "../session";
import { encrypt, fingerprint } from "../crypto";
import { peek, record } from "../rate-limit";
import { audit } from "../audit";

type Result = { ok: true } | { ok: false; error: string };

const MAX_ACCOUNTS = 3;

export async function addBankAccount(input: unknown): Promise<Result> {
  const merchantId = await getMerchantId();
  if (!merchantId) return { ok: false, error: "Please sign in again" };

  const key = `bank:add:${merchantId}`;
  if (peek(key, 10).limited) return { ok: false, error: "Too many attempts. Try again later." };
  record(key, 60 * 60 * 1000);

  const parsed = bankSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { holderName, accountNo, ifsc } = parsed.data;

  const count = await db.bankAccount.count({ where: { merchantId } });
  if (count >= MAX_ACCOUNTS) {
    return { ok: false, error: `You can add up to ${MAX_ACCOUNTS} bank accounts` };
  }

  try {
    await db.bankAccount.create({
      data: {
        merchantId,
        holderName,
        accountNoEnc: encrypt(accountNo, `merchant:${merchantId}:bank-account`),
        last4: accountNo.slice(-4),
        ifsc,
        fingerprint: fingerprint(`${accountNo}:${ifsc}`),
        isPrimary: count === 0,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return { ok: false, error: "This account is already added" };
    console.error("add bank failed");
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  await audit({ actorId: merchantId, action: "BANK_ADDED", metadata: { last4: accountNo.slice(-4), ifsc } });
  revalidatePath("/bank");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setPrimaryBank(accountId: number): Promise<Result> {
  const merchantId = await getMerchantId();
  if (!merchantId) return { ok: false, error: "Please sign in again" };
  if (!Number.isInteger(accountId)) return { ok: false, error: "Invalid account" };

  try {
    await db.$transaction(async (tx) => {
      // ownership check: the account must belong to THIS merchant (prevents IDOR)
      const acct = await tx.bankAccount.findFirst({ where: { id: accountId, merchantId } });
      if (!acct) throw new Error("NOT_FOUND");
      await tx.bankAccount.updateMany({ where: { merchantId, isPrimary: true }, data: { isPrimary: false } });
      await tx.bankAccount.update({ where: { id: accountId }, data: { isPrimary: true } });
    });
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") return { ok: false, error: "Account not found" };
    console.error("set primary failed");
    return { ok: false, error: "Something went wrong" };
  }

  await audit({ actorId: merchantId, action: "BANK_PRIMARY_CHANGED", metadata: { accountId } });
  revalidatePath("/bank");
  return { ok: true };
}