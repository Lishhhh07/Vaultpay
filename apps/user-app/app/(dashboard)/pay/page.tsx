import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { formatINR } from "@repo/payments-core/money";
import { authOptions } from "../../lib/auth";
import { PasteLink } from "./PasteLink";

export const dynamic = "force-dynamic";

export default async function PayHome() {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);

  const recent = Number.isInteger(userId)
    ? await prisma.merchantPayment.findMany({
        where: { fromUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, amount: true, status: true, createdAt: true,
          merchant: { select: { businessName: true, name: true } },
        },
      })
    : [];

  return (
    <div className="w-screen pr-8">
      <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">Pay a merchant</div>
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Scan or paste</h2>
          <p className="text-sm text-gray-600 mb-4">
            Scan the merchant&apos;s QR with your phone camera, or paste their payment link here.
          </p>
          <PasteLink />
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-3">Recent merchant payments</h2>
          {recent.length === 0 && <p className="text-sm text-gray-500">No payments yet.</p>}
          <ul className="space-y-3">
            {recent.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">{p.merchant.businessName ?? p.merchant.name ?? "Merchant"}</div>
                  <div className="text-xs text-gray-500">
                    {p.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-right">
                  <div>{formatINR(p.amount)}</div>
                  <div className="text-xs text-gray-500">{p.status}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}