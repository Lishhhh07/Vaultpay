import db from "@repo/db/client";

const REVIEW_DELAY_MS = 30_000;

export type KycView = "NOT_SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";

export function kycView(m: {
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  kycSubmittedAt: Date | null;
}): KycView {
  if (m.kycStatus === "VERIFIED") return "VERIFIED";
  if (m.kycStatus === "REJECTED") return "REJECTED";
  return m.kycSubmittedAt ? "UNDER_REVIEW" : "NOT_SUBMITTED";
}

export async function settleKycIfDue(merchantId: number) {
  const base = {
    id: merchantId,
    kycStatus: "PENDING" as const,
    kycSubmittedAt: { lte: new Date(Date.now() - REVIEW_DELAY_MS) },
  };
  await db.merchant.updateMany({
    where: { ...base, panLast4: { endsWith: "Z" } },
    data: {
      kycStatus: "REJECTED",
      kycReviewedAt: new Date(),
      kycRejectReason: "PAN could not be verified (demo rule: PAN ending in Z)",
    },
  });
  await db.merchant.updateMany({
    where: base,
    data: { kycStatus: "VERIFIED", kycReviewedAt: new Date() },
  });
}