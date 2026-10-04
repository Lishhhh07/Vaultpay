import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { authOptions } from "../../lib/auth";
import { SetPinForm } from "./SetPinForm";

export const dynamic = "force-dynamic";

export default async function PinPage() {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  const u = Number.isInteger(userId)
    ? await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } })
    : null;

  return (
    <div className="w-screen pr-8">
      <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">Security</div>
      <div className="bg-white border rounded-xl p-6 max-w-md space-y-4">
        <h2 className="font-semibold">{u?.pinHash ? "Change transaction PIN" : "Set a transaction PIN"}</h2>
        <p className="text-sm text-gray-600">You&apos;ll enter this PIN to confirm payments. Never share it.</p>
        <SetPinForm />
      </div>
    </div>
  );
}