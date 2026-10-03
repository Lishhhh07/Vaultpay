"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="text-sm border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2"
    >
      {done ? "Copied!" : label}
    </button>
  );
}