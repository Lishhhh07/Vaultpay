import Link from "next/link";
import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { formatINR } from "@repo/payments-core/money";
import { authOptions } from "../../lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
    { href: "/transfer", label: "Add money" },
    { href: "/pay", label: "Pay merchant" },
    { href: "/p2p", label: "Send to a friend" },
    { href: "/pin", label: "Security" },
];

type Row = { key: string; title: string; amount: number; date: Date };

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!Number.isInteger(userId)) return null;

    const [user, balance, merchantPays, sent, received] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true, number: true, pinHash: true } }),
        prisma.balance.findUnique({ where: { userId } }),
        prisma.merchantPayment.findMany({
            where: { fromUserId: userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, amount: true, status: true, createdAt: true,
                merchant: { select: { businessName: true, name: true } },
            },
        }),
        prisma.p2pTransfer.findMany({
            where: { fromUserId: userId },
            orderBy: { timestamp: "desc" },
            take: 5,
            select: { id: true, amount: true, timestamp: true, toUser: { select: { name: true, number: true } } },
        }),
        prisma.p2pTransfer.findMany({
            where: { toUserId: userId },
            orderBy: { timestamp: "desc" },
            take: 5,
            select: { id: true, amount: true, timestamp: true, fromUser: { select: { name: true, number: true } } },
        }),
    ]);

    const masked = (n: string | null) => (n ? "XXXXXX" + n.slice(-4) : "no number yet");

    const rows: Row[] = [
        ...merchantPays.map((p) => ({
            key: `m${p.id}`,
            title: `Paid ${p.merchant.businessName ?? p.merchant.name ?? "merchant"}${p.status === "REFUNDED" ? " (refunded)" : ""}`,
            amount: -p.amount,
            date: p.createdAt,
        })),
        ...sent.map((t) => ({
            key: `s${t.id}`,
            title: `Sent to ${t.toUser.name ?? masked(t.toUser.number)}`,
            amount: -t.amount,
            date: t.timestamp,
        })),
        ...received.map((t) => ({
            key: `r${t.id}`,
            title: `Received from ${t.fromUser.name ?? masked(t.fromUser.number)}`,
            amount: t.amount,
            date: t.timestamp,
        })),
    ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 8);

    return (
        <div className="w-screen pr-8">
            <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
                Hi{user?.name ? `, ${user.name}` : ""}
            </div>

            {!user?.pinHash && (
                <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-3xl mb-6">
                    Set a transaction PIN to start paying.{" "}
                    <Link href="/pin" className="text-[#6a51a6] underline">Set PIN</Link>
                </p>
            )}

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
                <div className="bg-white border rounded-xl p-6">
                    <div className="text-sm text-gray-500">Wallet balance</div>
                    <div className="text-3xl font-semibold">{formatINR(balance?.amount ?? 0)}</div>
                    {user && <div className="text-xs text-gray-500 mt-1">{masked(user.number)}</div>}
                </div>

                <div className="bg-white border rounded-xl p-6">
                    <div className="text-sm text-gray-500 mb-3">Quick actions</div>
                    <div className="grid grid-cols-2 gap-2">
                        {LINKS.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="text-center text-sm border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-2"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-xl p-6 max-w-3xl mt-6">
                <h2 className="font-semibold mb-3">Recent activity</h2>
                {rows.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
                <ul className="space-y-3">
                    {rows.map((r) => (
                        <li key={r.key} className="flex justify-between text-sm">
                            <div>
                                <div className="font-medium">{r.title}</div>
                                <div className="text-xs text-gray-500">
                                    {r.date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                                </div>
                            </div>
                            <div className={r.amount < 0 ? "text-gray-900" : "text-green-700"}>
                                {r.amount < 0 ? "-" : "+"}{formatINR(Math.abs(r.amount))}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}