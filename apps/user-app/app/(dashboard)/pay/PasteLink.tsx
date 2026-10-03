"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function PasteLink() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function go() {
    const m = value.match(UUID);
    if (!m) return setError("That doesn't look like a merchant payment link");
    let amt = "";
    try {
      amt = new URL(value.trim()).searchParams.get("amt") ?? "";
    } catch {}
    router.push(`/pay/${m[0].toLowerCase()}${amt ? `?amt=${encodeURIComponent(amt)}` : ""}`);
  }

  return (
    <div className="space-y-3">
      <input
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(""); }}
        placeholder="http://localhost:3001/pay/..."
        className="bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={go} className="text-white bg-gray-800 hover:bg-gray-900 rounded-lg px-5 py-2.5 text-sm">
        Continue
      </button>
    </div>
  );
}