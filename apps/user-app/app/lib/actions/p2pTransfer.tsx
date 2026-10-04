"use server"
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "../auth";
import { verifyPin } from "../pin";
import prisma from "@repo/db/client";

const MAX_P2P_PAISE = 100000 * 100; // ₹1,00,000 per transfer

const p2pSchema = z.object({
    to: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit number"),
    amount: z.number()
        .int("Invalid amount")
        .positive("Amount must be greater than 0")
        .max(MAX_P2P_PAISE, "Amount too large"),
    pin: z.string().regex(/^\d{4,6}$/, "Enter your transaction PIN"),
});

export async function p2pTransfer(to: string, amount: number, pin: string) {
    const session = await getServerSession(authOptions);
    const from = session?.user?.id;
    if (!from) return { message: "Error while sending" };

    const parsed = p2pSchema.safeParse({ to, amount, pin });
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return { message: issue?.code === "invalid_type" ? "Please fill in all fields" : issue?.message ?? "Invalid input" };
    }

    const fromId = Number(from);

    const pinCheck = await verifyPin(fromId, parsed.data.pin);
    if (!pinCheck.ok) return { message: pinCheck.message };

    const toUser = await prisma.user.findUnique({ where: { number: parsed.data.to } });
    if (!toUser) return { message: "User not found" };
    if (toUser.id === fromId) return { message: "You can't send money to yourself" };

    try {
        await prisma.$transaction(async (tx) => {
            // lock BOTH rows in a fixed order so A->B and B->A can't deadlock
            const [first, second] = fromId < toUser.id ? [fromId, toUser.id] : [toUser.id, fromId];
            await tx.$queryRaw`SELECT 1 FROM "Balance" WHERE "userId" IN (${first}, ${second}) ORDER BY "userId" FOR UPDATE`;

            const fromBalance = await tx.balance.findUnique({ where: { userId: fromId } });
            if (!fromBalance || fromBalance.amount < parsed.data.amount) {
                throw new Error("INSUFFICIENT_FUNDS");
            }
            await tx.balance.update({
                where: { userId: fromId },
                data: { amount: { decrement: parsed.data.amount } },
            });
            await tx.balance.update({
                where: { userId: toUser.id },
                data: { amount: { increment: parsed.data.amount } },
            });
            await tx.p2pTransfer.create({
                data: {
                    amount: parsed.data.amount,
                    timestamp: new Date(),
                    fromUserId: fromId,
                    toUserId: toUser.id,
                },
            });
        });
    } catch (e: any) {
        if (e?.message === "INSUFFICIENT_FUNDS") return { message: "Insufficient funds" };
        console.error("p2p transfer failed");
        return { message: "Transfer failed" };
    }

    return { message: "Transfer successful" };
}

export async function getP2PTransfers() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return [];

    const transfers = await prisma.p2pTransfer.findMany({
        where: {
            OR: [
                { fromUserId: Number(userId) },
                { toUserId: Number(userId) }
            ]
        },
        include: {
            fromUser: { select: { name: true, number: true } },
            toUser: { select: { name: true, number: true } }
        },
        orderBy: { timestamp: "desc" }
    });

    return transfers;
}