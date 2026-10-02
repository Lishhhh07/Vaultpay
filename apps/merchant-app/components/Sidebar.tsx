"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href?: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/kyc", label: "KYC" },
  { href: "/bank", label: "Bank accounts" },
  { label: "Transactions" },
  { label: "Soundbox" },
  { label: "QR code" },
  { label: "Settlements" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:w-56 shrink-0 bg-white border-b md:border-b-0 md:border-r p-3">
      {ITEMS.map((it) => {
        if (!it.href) {
          return (
            <span key={it.label} className="px-3 py-2 text-sm text-gray-400 flex justify-between whitespace-nowrap">
              {it.label} <span className="ml-3 text-xs">Soon</span>
            </span>
          );
        }
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap ${
              active ? "bg-[#6a51a6] text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}