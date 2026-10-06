"use server"
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "@repo/db/client";
import { authOptions } from "../auth";
import { verifyLoginPassword } from "../pin";

const WEAK = new Set(["1234", "4321", "0123", "123456", "654321", "012345"]);

const schema = z
  .object({
    password: z.string().max(72),
    pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits"),
    confirmPin: z.string(),
  })
  .refine((d) => d.pin === d.confirmPin, { message: "PINs do not match", path: ["confirmPin"] })
  .refine((d) => !/^(\d)\1+$/.test(d.pin) && !WEAK.has(d.pin), {
    message: "Choose a less obvious PIN",
    path: ["pin"],
  });

export async function setPinAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  if (!session?.user || !Number.isInteger(userId)) return { ok: false, error: "Please sign in again" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const row = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (row?.password) {
    const check = await verifyLoginPassword(userId, parsed.data.password);
    if (!check.ok) return { ok: false, error: check.message };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { pinHash: await bcrypt.hash(parsed.data.pin, 12), pinAttempts: 0, pinLockedUntil: null },
  });
  return { ok: true };
}