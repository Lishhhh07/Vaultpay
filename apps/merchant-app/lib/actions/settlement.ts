"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { settleToBank } from "@repo/payments-core";
import { rupeesToPaise } from "@repo/payments-core/money";
import { getMerchantId } from "../session";

const schema = z.object({
  bankAccountId: z.number().int().positive(),
  amount: z.string().max(12),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
});

export async function settleAction(
  input: unknown
): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const merchantId = await getMerchantId(); // from the session, never from the request
  if (!merchantId) return { ok: false, error: "Please sign in again" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const paise = rupeesToPaise(parsed.data.amount);
  if (paise === null) return { ok: false, error: "Enter a valid amount (up to 2 decimals)" };

  const r = await settleToBank({
    merchantId,
    bankAccountId: parsed.data.bankAccountId,
    amount: paise,
    idempotencyKey: parsed.data.idempotencyKey,
  });
  if (!r.ok) return { ok: false, error: r.message };

  revalidatePath("/settlements");
  revalidatePath("/dashboard");
  return { ok: true, amount: r.amount };
}