"use client";
import { useState } from "react";
import { rupeesToPaise } from "@repo/payments-core/money";
import { CopyButton } from "../../../components/CopyButton";

export function PaymentLinkBuilder({ baseLink }: { baseLink: string }) {
  const [amount, setAmount] = useState("");
  const paise = amount ? rupeesToPaise(amount) : null;
  const link = paise ? `${baseLink}?amt=${(paise / 100).toFixed(2)}` : "";

  return (
    <div className="bg-white border rounded-xl p-6 space-y-3">
      <h2 className="font-semibold">Payment link with amount</h2>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="Amount in ₹, e.g. 250"
        className="bg-gray-50 border border-gray-300 text-sm rounded-lg block w-full p-2.5"
      />
      {amount && !paise && <p className="text-sm text-red-600">Enter a valid amount (up to 2 decimals)</p>}
      {link && (
        <>
          <p className="text-xs break-all text-gray-600">{link}</p>
          <div className="flex gap-3">
            <CopyButton text={link} />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Pay here: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2"
            >
              Share on WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  );
}