"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPrimaryBank } from "../../../lib/actions/bank";

export function SetPrimaryButton({ accountId }: { accountId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setPrimaryBank(accountId);
        setBusy(false);
        router.refresh();
      }}
      className="text-sm text-[#6a51a6] underline disabled:opacity-50"
    >
      Make primary
    </button>
  );
}