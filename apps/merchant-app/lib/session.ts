import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireMerchant() {
  const session = await getServerSession(authOptions);
  const merchantId = Number(session?.user?.id);
  if (!session?.user || session.user.role !== "MERCHANT" || !Number.isInteger(merchantId)) {
    throw new Error("UNAUTHORIZED");
  }
  return { merchantId, email: session.user.email ?? "" };
}