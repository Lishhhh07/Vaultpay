"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, rupeesToPaise } from "@repo/payments-core/money";
import { settleAction } from "../../../lib/actions/settlement";

type Acct = { id: number; label: string };

export function SettleForm({ accounts, availablePaise }: { accounts: Acct[]; availablePaise: number }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const keyRef = useRef<string | null>(null);
  const cls = "bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMsg(null);

    const paise = rupeesToPaise(amount);
    if (paise === null) return setMsg({ ok: false, text: "Enter a valid amount (up to 2 decimals)" });
    if (paise < 10_000) return setMsg({ ok: false, text: "Minimum settlement is ₹100" });
    if (paise > availablePaise) return setMsg({ ok: false, text: "Amount exceeds your available balance" });

    const label = accounts.find((a) => a.id === accountId)?.label ?? "your account";
    if (!window.confirm(`Settle ${formatINR(paise)} to ${label}?`)) return;

    setBusy(true);
    keyRef.current ??= crypto.randomUUID();
    try {
      const r = await settleAction({ bankAccountId: accountId, amount, idempotencyKey: keyRef.current });
      if (r.ok) {
        keyRef.current = null;
        setAmount("");
        setMsg({ ok: true, text: `Settled ${formatINR(r.amount)}` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    } catch {
      setMsg({ ok: false, text: "Network problem. Check the history before retrying." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <label className="block">
        <span className="block mb-1 text-sm font-medium">To account</span>
        <select value={accountId} onChange={(e) => { setAccountId(Number(e.target.value)); keyRef.current = null; }} className={cls}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block mb-1 text-sm font-medium">Amount (₹)</span>
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => { setAmount(e.target.value); keyRef.current = null; }}
            inputMode="decimal" placeholder="0.00" className={cls}
          />
          <button
            type="button"
            onClick={() => { setAmount((availablePaise / 100).toFixed(2)); keyRef.current = null; }}
            className="border border-gray-300 hover:bg-gray-50 rounded-lg px-3 text-sm"
          >
            Max
          </button>
        </div>
      </label>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <button
        type="submit" disabled={busy}
        className="text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm"
      >
        {busy ? "Settling..." : "Settle"}
      </button>
    </form>
  );
}