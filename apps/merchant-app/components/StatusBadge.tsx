import type { KycView } from "../lib/kyc";

const MAP: Record<KycView, { label: string; cls: string }> = {
  NOT_SUBMITTED: { label: "Not submitted", cls: "bg-gray-200 text-gray-800" },
  UNDER_REVIEW: { label: "Under review", cls: "bg-yellow-100 text-yellow-800" },
  VERIFIED: { label: "Verified", cls: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-800" },
};

export function StatusBadge({ view }: { view: KycView }) {
  const s = MAP[view];
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}