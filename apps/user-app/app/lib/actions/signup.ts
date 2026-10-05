"use server"
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "@repo/db/client";

const schema = z.object({
    name: z.string().trim().min(2, "Name is too short").max(60),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password is too long")
        .regex(/[A-Za-z]/, "Password needs at least one letter")
        .regex(/\d/, "Password needs at least one number"),
});

const DUPLICATE = "An account with this number already exists";

export async function signupUser(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const { name, phone, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { number: phone }, select: { id: true } });
    if (exists) return { ok: false, error: DUPLICATE };

    try {
        await prisma.user.create({
            data: {
                name,
                number: phone,
                password: await bcrypt.hash(password, 12),
                Balance: { create: { amount: 0, locked: 0 } }, // every user needs a wallet row
            },
        });
    } catch (e: any) {
        if (e?.code === "P2002") return { ok: false, error: DUPLICATE };
        console.error("signup failed");
        return { ok: false, error: "Something went wrong. Please try again." };
    }
    return { ok: true };
}