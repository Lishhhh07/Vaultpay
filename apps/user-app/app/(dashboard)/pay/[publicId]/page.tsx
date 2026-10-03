import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { rupeesToPaise } from "@repo/payments-core/money";
import { authOptions } from "../../../lib/auth";
import { PayForm } from "./PayForm";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PayPage({
  params,
  searchParams,
}: {
  params: { publicId: string };
  searchParams: { amt?: string };
}) {
  if (!UUID_RE.test(params.publicId)) notFound();

  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);

  const [merchant, balance] = await Promise.all([
    prisma.merchant.findUnique({
      where: { publicId: params.publicId.toLowerCase() },
      select: { publicId: true, businessName: true, name: true, kycStatus: true },
    }),
    Number.isInteger(userId) ? prisma.balance.findUnique({ where: { userId } }) : null,
  ]);
  if (!merchant) notFound();

  const name = merchant.businessName ?? merchant.name ?? "Merchant";

  if (merchant.kycStatus !== "VERIFIED") {
    return (
      <div className="w-screen pr-8">
        <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">Pay {name}</div>
        <p className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm max-w-xl">
          This merchant can&apos;t accept payments right now.
        </p>
      </div>
    );
  }

  const paise = searchParams.amt ? rupeesToPaise(searchParams.amt) : null;

  return (
    <div className="w-screen pr-8">
      <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">Pay {name}</div>
      <PayForm
        merchantPublicId={merchant.publicId}
        merchantName={name}
        balancePaise={balance?.amount ?? 0}
        initialAmount={paise ? (paise / 100).toFixed(2) : ""}
      />
    </div>
  );
}