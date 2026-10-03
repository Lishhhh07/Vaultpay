import Link from "next/link";
import QRCode from "qrcode";
import db from "@repo/db/client";
import { requireMerchant } from "../../../lib/session";
import { settleKycIfDue } from "../../../lib/kyc";
import { CopyButton } from "../../../components/CopyButton";
import { PaymentLinkBuilder } from "./PaymentLinkBuilder";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const { merchantId } = await requireMerchant();
  await settleKycIfDue(merchantId);

  const m = await db.merchant.findUnique({
    where: { id: merchantId },
    select: { publicId: true, businessName: true, name: true, kycStatus: true },
  });
  if (!m) return null;

  if (m.kycStatus !== "VERIFIED") {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-bold text-[#6a51a6]">Your payment QR</h1>
        <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          Complete KYC to start accepting payments.{" "}
          <Link href="/kyc" className="text-[#6a51a6] underline">Go to KYC</Link>
        </p>
      </div>
    );
  }

  const base = process.env.USER_APP_URL;
  if (!base) throw new Error("USER_APP_URL is not set");
  const link = `${base.replace(/\/$/, "")}/pay/${m.publicId}`;
  const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 2, width: 320 });
  const title = m.businessName ?? m.name ?? "Merchant";

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-[#6a51a6]">Your payment QR</h1>

      <div className="bg-white border rounded-xl p-6 flex flex-col items-center gap-4">
        <div className="font-semibold">{title}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Payment QR code" width={320} height={320} />
        <p className="text-xs text-gray-500">Customers scan this with any camera and pay from their wallet.</p>
        <div className="flex gap-3">
          <a href={qr} download="merchant-qr.png" className="text-sm border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2">
            Download QR
          </a>
          <CopyButton text={link} />
        </div>
      </div>

      <PaymentLinkBuilder baseLink={link} />
    </div>
  );
}