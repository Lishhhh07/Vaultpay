"use client";
import { signOut, useSession } from "next-auth/react";

export function TopBar() {
  const { data } = useSession();
  return (
    <div className="flex justify-between items-center border-b border-slate-300 px-4 py-3 bg-white">
      <div className="text-lg font-semibold text-[#6a51a6]">Paytm for Business</div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-700">{data?.user?.name ?? data?.user?.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="text-white bg-gray-800 hover:bg-gray-900 rounded-lg px-4 py-2"
        >
          Logout
        </button>
      </div>
    </div>
  );
}