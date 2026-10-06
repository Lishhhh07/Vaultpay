"use client";
import { useState } from "react";
import { setPinAction } from "../../lib/actions/pin";

export function SetPinForm({ hasPassword }: { hasPassword: boolean }) {
  const [f, setF] = useState({ password: "", pin: "", confirmPin: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const cls = "bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5";
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await setPinAction(f);
    setBusy(false);
    if (r.ok) {
      setF({ password: "", pin: "", confirmPin: "" });
      setMsg({ ok: true, text: "PIN saved" });
    } else {
      setMsg({ ok: false, text: r.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" autoComplete="off">
       
     {hasPassword && <input type="password" placeholder="Your login password" value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })} className={cls} autoComplete="current-password" />}
      <input type="password" inputMode="numeric" placeholder="New PIN (4-6 digits)" value={f.pin}
        onChange={(e) => setF({ ...f, pin: digits(e.target.value) })} className={cls} autoComplete="off" />
      <input type="password" inputMode="numeric" placeholder="Confirm PIN" value={f.confirmPin}
        onChange={(e) => setF({ ...f, confirmPin: digits(e.target.value) })} className={cls} autoComplete="off" />
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <button type="submit" disabled={busy}
        className="text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm">
        {busy ? "Saving..." : "Save PIN"}
      </button>
    </form>
  );
}
