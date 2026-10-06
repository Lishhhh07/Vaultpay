import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { z } from "zod";
import { walletSeed } from "./welcome";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret || secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET must be set (32+ chars)");
}

const loginSchema = z.object({
    phone: z.string().regex(/^\d{10}$/),
    password: z.string().min(1).max(72),
});

// unknown numbers still cost one bcrypt compare, so response time doesn't reveal if an account exists
let dummyHash: string | undefined;

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
                password: { label: "Password", type: "password", required: true },
            },
            async authorize(credentials: any) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success) return null;
                const { phone, password } = parsed.data;

                const user = await db.user.findUnique({ where: { number: phone } });
                if (!user || !user.password) {
                    dummyHash ??= await bcrypt.hash("not-a-real-password", 10);
                    await bcrypt.compare(password, dummyHash);
                    return null;
                }
                const ok = await bcrypt.compare(password, user.password);
                return ok ? { id: user.id.toString(), name: user.name, email: user.number } : null;
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
    ],
    secret,
    session: { strategy: "jwt" as const, maxAge: 60 * 60 * 24 },
    pages: { signIn: "/signin" },
    callbacks: {
        async signIn({ user, account, profile }: any) {
            if (account?.provider === "credentials") return true;
            if (account?.provider !== "google" || !user?.email) return false;
            if (profile?.email_verified !== true) return false;

            const email = String(user.email).toLowerCase();
            try {
                const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
                if (!existing) {
                    await db.user.create({ data: { email, name: user.name ?? null, ...walletSeed() } });
                }
            } catch (e: any) {
                // P2002 = two first-time sign-ins raced; the account exists, so carry on
                if (e?.code !== "P2002") {
                    console.error("google signup failed");
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, account, user }: any) {
            // Google's profile id is not our id. Swap in our database id once, at sign-in,
            // so the rest of the app (which reads session.user.id) works unchanged.
            if (account?.provider === "google" && user?.email) {
                const u = await db.user.findUnique({
                    where: { email: String(user.email).toLowerCase() },
                    select: { id: true },
                });
                if (!u) throw new Error("Account not found");
                token.sub = String(u.id);
            }
            return token;
        },
        async session({ token, session }: any) {
            session.user.id = token.sub;
            return session;
        },
    },
};