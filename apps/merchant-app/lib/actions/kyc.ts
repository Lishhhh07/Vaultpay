"use server";

import { revalidatePath } from "next/cache";
import db from "@repo/db/client";
import { kycSchema } from "../validators";
import { getMerchantId } from "../session";
import { encrypt } from "../crypto";
import { audit } from "../audit";

type Result = { ok: true } | { ok: false; error: string };

export async function submitKyc(input: unknown): Promise<Result> {
  const merchantId = await getMerchantId();
  if (!merchantId) return { ok: false, error: "Please sign in again" };

  const parsed = kycSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // Atomic guard: only allowed if never submitted, or previously rejected. VERIFIED can't be edited.
  const updated = await db.merchant.updateMany({
    where: {
      id: merchantId,
      OR: [{ kycSubmittedAt: null }, { kycStatus: "REJECTED" }],
    },
    data: {
      businessType: d.businessType,
      addressLine: d.addressLine,
      city: d.city,
      state: d.state,
      pincode: d.pincode,
      gstin: d.gstin || null,
      panEnc: encrypt(d.pan, `merchant:${merchantId}:pan`),
      panLast4: d.pan.slice(-4),
      kycStatus: "PENDING",
      kycSubmittedAt: new Date(),
      kycReviewedAt: null,
      kycRejectReason: null,
    },
  });
  if (updated.count === 0) return { ok: false, error: "KYC has already been submitted" };

  await audit({ actorId: merchantId, action: "KYC_SUBMITTED", metadata: { panLast4: d.pan.slice(-4) } });
  revalidatePath("/kyc");
  revalidatePath("/dashboard");
  return { ok: true };
}