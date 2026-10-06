"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPhoneAction } from "../../lib/actions/phone";

export function AddPhoneForm() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        const r = await addPhoneAction(phone);
        setBusy(false);
        if (!r.ok) return setError(r.error);
        router.refresh();
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-gray-600">Add your mobile number so friends can send you money.</p>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={10}
                placeholder="Mobile number" className="bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy}
                className="text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm">
                {busy ? "Saving..." : "Save number"}
            </button>
        </form>
    );
}