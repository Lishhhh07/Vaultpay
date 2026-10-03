import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";
import bcrypt from "bcrypt";
import db from "@repo/db/client";
import { loginSchema } from "./validators";
import { peek, record, clear } from "./rate-limit";
import { clientIpFrom } from "./client-ip";
import { SESSION_COOKIE, CALLBACK_COOKIE, CSRF_COOKIE } from "./constants";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("NEXTAUTH_SECRET must be set (32+ chars)");
}
const isProd = process.env.NODE_ENV === "production";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_ACCOUNT = 5;
const MAX_FAILS_PER_IP = 20;

let dummyHash: string | undefined;
async function burnTime(password: string) {
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  await bcrypt.compare(password, dummyHash);
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email or phone",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;

        const ip = clientIpFrom((n) => {
          const v = req?.headers?.[n];
          return Array.isArray(v) ? v[0] : v;
        });
        const idKey = `login:id:${identifier}`;
        const ipKey = `login:ip:${ip}`;

        if (peek(idKey, MAX_FAILS_PER_ACCOUNT).limited || peek(ipKey, MAX_FAILS_PER_IP).limited) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        const isPhone = /^\d{10}$/.test(identifier);
        const merchant = await db.merchant.findUnique({
          where: isPhone ? { phone: identifier } : { email: identifier },
        });

        let ok = false;
        if (merchant?.password) ok = await bcrypt.compare(password, merchant.password);
        else await burnTime(password);

        if (!ok || !merchant) {
          record(idKey, WINDOW_MS);
          record(ipKey, WINDOW_MS);
          return null;
        }

        clear(idKey);
        return {
          id: String(merchant.id),
          name: merchant.businessName ?? merchant.name,
          email: merchant.email,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/signin", error: "/signin" },
  secret,

  cookies: {
    sessionToken: {
      name: SESSION_COOKIE,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
    callbackUrl: {
      name: CALLBACK_COOKIE,
      options: { sameSite: "lax", path: "/", secure: isProd },
    },
    csrfToken: {
      name: CSRF_COOKIE,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;
      if (account?.provider !== "google" || !user?.email) return false;
      if ((profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;

      const email = user.email.toLowerCase();
      const existing = await db.merchant.findUnique({ where: { email }, select: { auth_type: true } });

  
      if (existing && existing.auth_type !== "Google") return false;

      await db.merchant.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: user.name ?? null,
          auth_type: "Google",
          balance: { create: { amount: 0, locked: 0 } },
        },
      });
      return true;
    },

    async jwt({ token, user }) {

      if (user?.email) {
        const m = await db.merchant.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true },
        });
        if (m) {
          token.merchantId = m.id;
          token.role = "MERCHANT";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.merchantId) {
        session.user.id = String(token.merchantId);
        session.user.role = "MERCHANT";
      }
      return session;
    },
  },
};