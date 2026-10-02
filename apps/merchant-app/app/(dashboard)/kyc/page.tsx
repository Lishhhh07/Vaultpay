import db from "@repo/db/client";
import { requireMerchant } from "../../../lib/session";
import { kycView, settleKycIfDue } from "../../../lib/kyc";
import { StatusBadge } from "../../../components/StatusBadge";
import { AutoRefresh } from "../../../components/AutoRefresh";
import { KycForm } from "./KycForm";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const { merchantId } = await requireMerchant();
  await settleKycIfDue(merchantId);

  const m = await db.merchant.findUnique({
    where: { id: merchantId },
    select: {
      kycStatus: true, kycSubmittedAt: true, kycRejectReason: true,
      businessType: true, addressLine: true, city: true, state: true,
      pincode: true, gstin: true, panLast4: true,
    },
  });
  if (!m) return null;

  const view = kycView(m);
  const editable = view === "NOT_SUBMITTED" || view === "REJECTED";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[#6a51a6]">KYC verification</h1>
        <StatusBadge view={view} />
      </div>

      {view === "UNDER_REVIEW" && (
        <>
          <AutoRefresh />
          <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            Your documents are being reviewed. This page updates automatically.
          </p>
        </>
      )}
      {view === "REJECTED" && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          {m.kycRejectReason ?? "Your KYC was rejected."} Please correct your details and submit again.
        </p>
      )}

      {editable ? (
        <div className="bg-white border rounded-xl p-6">
          <KycForm
            initial={{
              businessType: m.businessType ?? "",
              addressLine: m.addressLine ?? "",
              city: m.city ?? "",
              state: m.state ?? "",
              pincode: m.pincode ?? "",
              gstin: m.gstin ?? "",
            }}
          />
        </div>
      ) : (
        <dl className="bg-white border rounded-xl p-6 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-gray-500">PAN</dt>
          <dd>XXXXXX{m.panLast4}</dd>
          <dt className="text-gray-500">GSTIN</dt>
          <dd>{m.gstin ?? "Not provided"}</dd>
          <dt className="text-gray-500">Business type</dt>
          <dd>{m.businessType}</dd>
          <dt className="text-gray-500">Address</dt>
          <dd>{m.addressLine}, {m.city}, {m.state} {m.pincode}</dd>
        </dl>
      )}
    </div>
  );
}