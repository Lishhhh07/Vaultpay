import Link from "next/link";
import db from "@repo/db/client";
import { requireMerchant } from "../../../lib/session";
import { kycView, settleKycIfDue } from "../../../lib/kyc";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatINR } from "@repo/payments-core/money";
import { startOfTodayIST } from "../../../lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { merchantId } = await requireMerchant();
  await settleKycIfDue(merchantId);

  const m = await db.merchant.findUnique({
    where: { id: merchantId },
    select: {
      businessName: true,
      name: true,
      kycStatus: true,
      kycSubmittedAt: true,
      balance: { select: { amount: true } },
      _count: { select: { bankAccounts: true } },
    },
  });
     const today = await db.merchantPayment.aggregate({
     where: { merchantId, status: "SUCCESS", createdAt: { gte: startOfTodayIST() } },
     _sum: { amount: true },
     _count: true,
   });
  if (!m) return null;

  const view = kycView(m);
  const rupees = (m.balance?.amount ?? 0) / 100;
  const steps = [
    { done: view === "VERIFIED", label: "Complete KYC", href: "/kyc" },
    { done: m._count.bankAccounts > 0, label: "Add a bank account for settlements", href: "/bank" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold text-[#6a51a6]">
        Welcome, {m.businessName ?? m.name ?? "merchant"}
      </h1>
   <div className="bg-white border rounded-xl p-6">
     <div className="text-sm text-gray-500">Today&apos;s collection</div>
     <div className="text-2xl font-semibold">{formatINR(today._sum.amount ?? 0)}</div>
     <div className="text-xs text-gray-500">{today._count} payments</div>
   </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border rounded-xl p-6">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-2xl font-semibold">
            {rupees.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
          </div>
        </div>
        <div className="bg-white border rounded-xl p-6">
          <div className="text-sm text-gray-500 mb-1">KYC status</div>
          <StatusBadge view={view} />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold mb-3">Get started</h2>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span className={s.done ? "text-green-600" : "text-gray-400"}>{s.done ? "✔" : "○"}</span>
              {s.done ? (
                <span className="text-gray-500 line-through">{s.label}</span>
              ) : (
                <Link href={s.href} className="text-[#6a51a6] underline">{s.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}