"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitKyc } from "../../../lib/actions/kyc";
import { Field, SelectField } from "../../../components/Field";
import { BUSINESS_TYPES, INDIAN_STATES } from "../../../lib/validators";

type Initial = {
  businessType: string; addressLine: string; city: string;
  state: string; pincode: string; gstin: string;
};

export function KycForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [f, setF] = useState({ ...initial, pan: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await submitKyc(f);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SelectField label="Business type" value={f.businessType} onChange={set("businessType")} options={BUSINESS_TYPES} />
      <Field label="PAN" value={f.pan} onChange={(v) => set("pan")(v.toUpperCase())} placeholder="ABCPE1234F" maxLength={10} />
      <Field label="GSTIN (optional)" value={f.gstin} onChange={(v) => set("gstin")(v.toUpperCase())} placeholder="29ABCPE1234F1Z5" maxLength={15} />
      <Field label="Business address" value={f.addressLine} onChange={set("addressLine")} autoComplete="street-address" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="City" value={f.city} onChange={set("city")} />
        <Field label="Pincode" value={f.pincode} onChange={set("pincode")} inputMode="numeric" maxLength={6} />
      </div>
      <SelectField label="State" value={f.state} onChange={set("state")} options={INDIAN_STATES} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5"
      >
        {busy ? "Submitting..." : "Submit for verification"}
      </button>
    </form>
  );
}