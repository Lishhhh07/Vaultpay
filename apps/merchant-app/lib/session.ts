import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getMerchantId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const id = Number(session?.user?.id);
  if (!session?.user || session.user.role !== "MERCHANT" || !Number.isInteger(id)) return null;
  return id;
}

export async function requireMerchant() {
  const merchantId = await getMerchantId();
  if (!merchantId) throw new Error("UNAUTHORIZED");
  return { merchantId };
}