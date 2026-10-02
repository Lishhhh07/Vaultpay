import db from "@repo/db/client";
import { requireMerchant } from "../../../lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { merchantId } = await requireMerchant();
  const m = await db.merchant.findUnique({
    where: { id: merchantId },
    select: { businessName: true, name: true, kycStatus: true, balance: { select: { amount: true } } },
  });

  const rupees = ((m?.balance?.amount ?? 0) / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#6a51a6]">
        Welcome, {m?.businessName ?? m?.name ?? "merchant"}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="bg-white border rounded-xl p-6">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-2xl font-semibold">{rupees}</div>
        </div>
        <div className="bg-white border rounded-xl p-6">
          <div className="text-sm text-gray-500">KYC status</div>
          <div className="text-2xl font-semibold">{m?.kycStatus}</div>
        </div>
      </div>
    </div>
  );
}