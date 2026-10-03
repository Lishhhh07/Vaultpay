"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR, rupeesToPaise } from "@repo/payments-core/money";
import { payMerchantAction, type PayResult } from "../../../lib/actions/payMerchant";

type Receipt = Extract<PayResult, { ok: true }>;

export function PayForm({
  merchantPublicId, merchantName, balancePaise, initialAmount,
}: {
  merchantPublicId: string;
  merchantName: string;
  balancePaise: number;
  initialAmount: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [amount, setAmount] = useState(initialAmount);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // One key per payment attempt. Reused on retry, so a double-click or flaky network can't charge twice.
  const keyRef = useRef<string | null>(null);
  const paise = rupeesToPaise(amount);

  function review(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (paise === null) return setError("Enter a valid amount (up to 2 decimals)");
    if (paise < 100) return setError("Minimum payment is ₹1");
    if (paise > balancePaise) return setError("Insufficient wallet balance");
    setStep("confirm");
  }

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    keyRef.current ??= crypto.randomUUID();
    try {
      const r = await payMerchantAction({
        merchantPublicId,
        amount,
        idempotencyKey: keyRef.current,
        note: note.trim() || undefined,
      });
      if (r.ok) {
        keyRef.current = null;
        setReceipt(r);
        setStep("done");
        router.refresh();
      } else if (r.code === "INTERNAL") {
        setError(r.message); // stay on confirm; same key is reused on retry
      } else {
        keyRef.current = null;
        setError(r.message);
        setStep("form");
      }
    } catch {
      setError("Network problem. Tap Pay again. You won't be charged twice.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && receipt) {
    return (
      <div className="bg-white border rounded-xl p-6 max-w-md space-y-3">
        <div className="text-green-700 font-semibold">Payment successful</div>
        <div className="text-3xl font-bold">{formatINR(receipt.amountPaise)}</div>
        <dl className="text-sm grid grid-cols-2 gap-y-2">
          <dt className="text-gray-500">Paid to</dt><dd>{receipt.merchantName}</dd>
          <dt className="text-gray-500">Reference</dt><dd>#{receipt.paymentId}</dd>
          <dt className="text-gray-500">Time</dt>
          <dd>{new Date(receipt.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd>
        </dl>
        <Link href="/dashboard" className="inline-block text-white bg-gray-800 hover:bg-gray-900 rounded-lg px-5 py-2.5 text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (step === "confirm" && paise !== null) {
    return (
      <div className="bg-white border rounded-xl p-6 max-w-md space-y-4">
        <div className="text-sm text-gray-600">You are paying</div>
        <div className="text-3xl font-bold">{formatINR(paise)}</div>
        <div className="text-sm">to <b>{merchantName}</b></div>
        {note && <div className="text-sm text-gray-600">Note: {note}</div>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={confirm}
            disabled={busy}
            className="text-white bg-[#6a51a6] hover:bg-[#5a4290] disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm"
          >
            {busy ? "Paying..." : `Pay ${formatINR(paise)}`}
          </button>
          <button
            onClick={() => setStep("form")}
            disabled={busy}
            className="border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={review} className="bg-white border rounded-xl p-6 max-w-md space-y-4">
      <div className="text-sm text-gray-600">Wallet balance: <b>{formatINR(balancePaise)}</b></div>
      <label className="block">
        <span className="block mb-1 text-sm font-medium">Amount (₹)</span>
        <input
          value={amount}
          onChange={(e) => { setAmount(e.target.value); keyRef.current = null; }}
          inputMode="decimal"
          placeholder="0.00"
          className="bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5"
        />
      </label>
      <label className="block">
        <span className="block mb-1 text-sm font-medium">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => { setNote(e.target.value); keyRef.current = null; }}
          maxLength={60}
          className="bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="text-white bg-gray-800 hover:bg-gray-900 rounded-lg px-5 py-2.5 text-sm">
        Review payment
      </button>
    </form>
  );
}