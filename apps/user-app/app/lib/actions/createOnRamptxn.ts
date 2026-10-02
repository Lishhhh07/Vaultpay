"use server"
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";

const PROVIDERS = ["HDFC Bank", "Axis Bank"] as const;
const schema = z.object({
  amount: z.number().int().positive().max(100000 * 100),   // max ₹1,00,000 in paise
  provider: z.enum(PROVIDERS),
});

export async function createOnRampTransaction(amount: number, provider: string) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { message: "User not logged in" };

  const parsed = schema.safeParse({ amount, provider });
  if (!parsed.success) return { message: "Invalid amount or bank" };

  const token = crypto.randomUUID();

  await prisma.onRampTransaction.create({
    data: {
      userId: Number(userId),
      amount: parsed.data.amount,
      status: "Processing",
      startTime: new Date(),
      provider: parsed.data.provider,
      token,
    },
  });

  return { message: "On ramp transaction added", token };
}