import db from "@repo/db/client";
import { requireMerchant } from "../../../lib/session";
import { BankForm } from "./BankForm";
import { SetPrimaryButton } from "./SetPrimaryButton";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const { merchantId } = await requireMerchant();
  const accounts = await db.bankAccount.findMany({
    where: { merchantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, holderName: true, last4: true, ifsc: true, isPrimary: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#6a51a6]">Bank accounts</h1>
      <p className="text-sm text-gray-600">
        Settlements go to your primary account. Account numbers are encrypted and never shown in full.
      </p>

      <ul className="space-y-3">
        {accounts.length === 0 && <li className="text-sm text-gray-500">No bank accounts yet.</li>}
        {accounts.map((a) => (
          <li key={a.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">{a.holderName}</div>
              <div className="text-gray-600">XXXX XXXX {a.last4} · {a.ifsc}</div>
            </div>
            {a.isPrimary ? (
              <span className="text-xs rounded-full bg-green-100 text-green-800 px-3 py-1">Primary</span>
            ) : (
              <SetPrimaryButton accountId={a.id} />
            )}
          </li>
        ))}
      </ul>

      {accounts.length < 3 && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Add a bank account</h2>
          <BankForm />
        </div>
      )}
    </div>
  );
}