"use server"
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@repo/db/client";
import { authOptions } from "../auth";

const schema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export async function addPhoneAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user || !Number.isInteger(userId)) return { ok: false, error: "Please sign in again" };

    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid number" };

    try {
        // only fills an EMPTY number: it can't overwrite an existing one
        const r = await prisma.user.updateMany({ where: { id: userId, number: null }, data: { number: parsed.data } });
        if (r.count === 0) return { ok: false, error: "A number is already linked to your account" };
    } catch (e: any) {
        if (e?.code === "P2002") return { ok: false, error: "This number is already registered" };
        return { ok: false, error: "Something went wrong" };
    }
    revalidatePath("/dashboard");
    revalidatePath("/pin");
    return { ok: true };
}