import Link from "next/link";
import db from "@repo/db/client";
import { formatINR } from "@repo/payments-core/money";
import { requireMerchant } from "../../../lib/session";
import { formatIST, startOfTodayIST } from "../../../lib/time";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const DAY_MS = 86_400_000;
const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
] as const;

const STATUS_CLS: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-200 text-gray-800",
};

function sinceFor(range: string): Date | null {
  if (range === "today") return startOfTodayIST();
  if (range === "7d") return new Date(Date.now() - 7 * DAY_MS);
  if (range === "30d") return new Date(Date.now() - 30 * DAY_MS);
  return null;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { range?: string; page?: string };
}) {
  const { merchantId } = await requireMerchant();

  const range = RANGES.some((r) => r.key === searchParams.range) ? searchParams.range! : "today";
  const page = Math.min(1000, Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1));
  const since = sinceFor(range);
  const where = { merchantId, ...(since ? { createdAt: { gte: since } } : {}) };

  const [rows, total, sum] = await Promise.all([
    db.merchantPayment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, amount: true, status: true, note: true, createdAt: true,
        fromUser: { select: { name: true, number: true } },
      },
    }),
    db.merchantPayment.count({ where }),
    db.merchantPayment.aggregate({ where: { ...where, status: "SUCCESS" }, _sum: { amount: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (r: string, p: number) => `/transactions?range=${r}&page=${p}`;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-[#6a51a6]">Transactions</h1>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={href(r.key, 1)}
            className={`px-4 py-1.5 rounded-full text-sm border ${
              r.key === range ? "bg-[#6a51a6] text-white border-[#6a51a6]" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white border rounded-xl p-5">
          <div className="text-sm text-gray-500">Collected</div>
          <div className="text-2xl font-semibold">{formatINR(sum._sum.amount ?? 0)}</div>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <div className="text-sm text-gray-500">Payments</div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Note</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No payments in this period.</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{formatIST(p.createdAt)}</td>
                <td className="p-3">
                  {p.fromUser.name ?? "Customer"}
                  <div className="text-xs text-gray-500">XXXXXX{p.fromUser.number.slice(-4)}</div>
                </td>
                <td className="p-3 text-gray-600">{p.note ?? "-"}</td>
                <td className="p-3 text-right font-medium">{formatINR(p.amount)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-3 py-1 text-xs ${STATUS_CLS[p.status] ?? ""}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(range, page - 1)} className="text-[#6a51a6] underline">← Previous</Link> : <span />}
          <span className="text-gray-500">Page {page} of {pages}</span>
          {page < pages ? <Link href={href(range, page + 1)} className="text-[#6a51a6] underline">Next →</Link> : <span />}
        </div>
      )}
    </div>
  );
}