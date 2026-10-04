import Link from "next/link";
import db from "@repo/db/client";
import { formatINR } from "@repo/payments-core/money";
import { requireMerchant } from "../../../lib/session";
import { formatIST } from "../../../lib/time";
import { SettleForm } from "./SettleForm";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const { merchantId } = await requireMerchant();

  const [m, accounts, history] = await Promise.all([
    db.merchant.findUnique({
      where: { id: merchantId },
      select: { kycStatus: true, balance: { select: { amount: true, locked: true } } },
    }),
    db.bankAccount.findMany({
      where: { merchantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, holderName: true, last4: true, isPrimary: true },
    }),
    db.settlement.findMany({
      where: { merchantId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true, amount: true, status: true, utr: true, createdAt: true,
        bankAccount: { select: { last4: true } },
      },
    }),
  ]);
  if (!m) return null;

  const available = (m.balance?.amount ?? 0) - (m.balance?.locked ?? 0);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-[#6a51a6]">Settlements</h1>

      <div className="bg-white border rounded-xl p-5 max-w-xs">
        <div className="text-sm text-gray-500">Available to settle</div>
        <div className="text-2xl font-semibold">{formatINR(available)}</div>
      </div>

      {m.kycStatus !== "VERIFIED" ? (
        <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          Complete KYC to settle. <Link href="/kyc" className="text-[#6a51a6] underline">Go to KYC</Link>
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          Add a bank account first. <Link href="/bank" className="text-[#6a51a6] underline">Bank accounts</Link>
        </p>
      ) : (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Settle to bank</h2>
          <SettleForm
            accounts={accounts.map((a) => ({
              id: a.id,
              label: `${a.holderName} · XXXX ${a.last4}${a.isPrimary ? " (primary)" : ""}`,
            }))}
            availablePaise={available}
          />
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Bank</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No settlements yet.</td></tr>
            )}
            {history.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{formatIST(s.createdAt)}</td>
                <td className="p-3">XXXX {s.bankAccount.last4}</td>
                <td className="p-3 text-right font-medium">{formatINR(s.amount)}</td>
                <td className="p-3">
                  <span className="rounded-full px-3 py-1 text-xs bg-green-100 text-green-800">{s.status}</span>
                </td>
                <td className="p-3 text-xs text-gray-600">{s.utr ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}