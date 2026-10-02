import GoogleProvider from "next-auth/providers/google";
import type { AuthOptions } from "next-auth";
import db from "@repo/db/client";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("NEXTAUTH_SECRET must be set (32+ chars)");
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email || account?.provider !== "google") {
        return false;
      }

      await db.merchant.upsert({
        where: { email: user.email },
        select: { id: true },
        create: {
          email: user.email,
          name: user.name ?? null,
          auth_type: "Google",
        },
        update: {
          name: user.name ?? null,
        },
      });

      return true;
    },
  },
  secret,
};