"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBankAccount } from "../../../lib/actions/bank";
import { Field } from "../../../components/Field";

const EMPTY = { holderName: "", accountNo: "", confirmAccountNo: "", ifsc: "" };

export function BankForm() {
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await addBankAccount(f);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setF(EMPTY);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
      <Field label="Account holder name" value={f.holderName} onChange={set("holderName")} />
      <Field label="Account number" type="password" value={f.accountNo} onChange={set("accountNo")} inputMode="numeric" maxLength={18} autoComplete="off" />
      <Field label="Confirm account number" value={f.confirmAccountNo} onChange={set("confirmAccountNo")} inputMode="numeric" maxLength={18} autoComplete="off" />
      <Field label="IFSC" value={f.ifsc} onChange={(v) => set("ifsc")(v.toUpperCase())} placeholder="HDFC0001234" maxLength={11} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5"
      >
        {busy ? "Saving..." : "Add account"}
      </button>
    </form>
  );
}