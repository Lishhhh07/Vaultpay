import bcrypt from "bcrypt";
import prisma from "@repo/db/client";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 60_000;

export type PinCheck =
  | { ok: true }
  | { ok: false; code: "NO_PIN" | "WRONG_PIN" | "PIN_LOCKED"; message: string };

async function guarded(
  userId: number,
  check: (u: { password: string | null; pinHash: string | null }) => Promise<boolean>,
  label: string
): Promise<PinCheck> {
  const now = new Date();

  const u = await prisma.user.update({
    where: { id: userId },
    data: { pinAttempts: { increment: 1 } },
    select: { password: true, pinHash: true, pinAttempts: true, pinLockedUntil: true },
  });

  const lock = async (): Promise<PinCheck> => {
    await prisma.user.update({
      where: { id: userId },
      data: { pinLockedUntil: new Date(now.getTime() + LOCK_MS) },
    });
    return { ok: false, code: "PIN_LOCKED", message: "Too many wrong attempts. Try again in 30 minutes." };
  };

  if (u.pinLockedUntil && u.pinLockedUntil > now) {
    const mins = Math.ceil((u.pinLockedUntil.getTime() - now.getTime()) / 60_000);
    return {
      ok: false, code: "PIN_LOCKED",
      message: `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  let attempts = u.pinAttempts;
  if (u.pinLockedUntil) {
    await prisma.user.update({ where: { id: userId }, data: { pinLockedUntil: null, pinAttempts: 1 } });
    attempts = 1;
  }

  if (attempts > MAX_ATTEMPTS) return lock();

  if (!(await check(u))) {
    if (attempts >= MAX_ATTEMPTS) return lock();
    const left = MAX_ATTEMPTS - attempts;
    return { ok: false, code: "WRONG_PIN", message: `Incorrect ${label}. ${left} attempt${left === 1 ? "" : "s"} left.` };
  }

  await prisma.user.update({ where: { id: userId }, data: { pinAttempts: 0 } });
  return { ok: true };
}

export async function verifyPin(userId: number, pin: string): Promise<PinCheck> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  if (!row?.pinHash) return { ok: false, code: "NO_PIN", message: "Set a transaction PIN first" };
  return guarded(userId, async (u) => !!u.pinHash && bcrypt.compare(pin, u.pinHash), "PIN");
}

export const verifyLoginPassword = (userId: number, password: string) =>
  guarded(userId, async (u) => !!u.password && bcrypt.compare(password, u.password), "password");