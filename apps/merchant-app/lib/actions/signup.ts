"use server";

import bcrypt from "bcrypt";
import { headers } from "next/headers";
import db from "@repo/db/client";
import { signupSchema } from "../validators";
import { peek, record } from "../rate-limit";
import { clientIpFrom } from "../client-ip";

type Result = { ok: true } | { ok: false; error: string };

const DUPLICATE = "An account with this email or phone already exists";

export async function signupMerchant(input: unknown): Promise<Result> {
  const h = headers();
  const ip = clientIpFrom((n) => h.get(n));
  const key = `signup:ip:${ip}`;

  if (peek(key, 5).limited) {
    return { ok: false, error: "Too many signup attempts. Please try again later." };
  }
  record(key, 60 * 60 * 1000); // 5 signups per hour per IP

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { businessName, ownerName, email, phone, password } = parsed.data;

  const exists = await db.merchant.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });
  if (exists) return { ok: false, error: DUPLICATE };

  try {
    await db.merchant.create({
      data: {
        email,
        phone,
        name: ownerName,
        businessName,
        password: await bcrypt.hash(password, 12),
        auth_type: "Credentials",
        balance: { create: { amount: 0, locked: 0 } },
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return { ok: false, error: DUPLICATE }; // lost a race
    console.error("signup failed");
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}