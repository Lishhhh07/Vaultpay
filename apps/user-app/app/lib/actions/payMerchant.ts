"use server"
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@repo/db/client";
import { payMerchant } from "@repo/payments-core";
import { rupeesToPaise } from "@repo/payments-core/money";
import { authOptions } from "../auth";

const schema = z.object({
  merchantPublicId: z.string().uuid(),
  amount: z.string().max(12),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  note: z.string().max(60).optional(),
});

export type PayResult =
  | { ok: true; paymentId: number; amountPaise: number; merchantName: string; createdAt: string; replayed: boolean }
  | { ok: false; code: string; message: string };

export async function payMerchantAction(input: unknown): Promise<PayResult> {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  if (!session?.user || !Number.isInteger(userId)) {
    return { ok: false, code: "UNAUTHORIZED", message: "Please sign in again" };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "Invalid payment details" };

  const paise = rupeesToPaise(parsed.data.amount);
  if (paise === null) return { ok: false, code: "INVALID_AMOUNT", message: "Enter a valid amount (up to 2 decimals)" };

  const merchant = await prisma.merchant.findUnique({
    where: { publicId: parsed.data.merchantPublicId },
    select: { id: true },
  });
  if (!merchant) return { ok: false, code: "NOT_FOUND", message: "Merchant not found" };

  const r = await payMerchant({
    userId,                                  // from the session, never from the request
    merchantId: merchant.id,
    amount: paise,
    idempotencyKey: parsed.data.idempotencyKey,
    note: parsed.data.note,
  });
  if (!r.ok) return r;

  revalidatePath("/dashboard");
  revalidatePath("/pay");
  return {
    ok: true,
    paymentId: r.paymentId,
    amountPaise: r.amount,
    merchantName: r.merchantName,
    createdAt: r.createdAt.toISOString(),
    replayed: r.replayed,
  };
}