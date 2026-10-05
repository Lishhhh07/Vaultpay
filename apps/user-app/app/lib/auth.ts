import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { z } from "zod";

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
                if (!user) {
                    dummyHash ??= await bcrypt.hash("not-a-real-password", 10);
                    await bcrypt.compare(password, dummyHash);
                    return null;
                }
                const ok = await bcrypt.compare(password, user.password);
                return ok ? { id: user.id.toString(), name: user.name, email: user.number } : null;
            },
        }),
    ],
    secret,
    session: { strategy: "jwt" as const, maxAge: 60 * 60 * 24 },
    pages: { signIn: "/signin" },
    callbacks: {
        async session({ token, session }: any) {
            session.user.id = token.sub;
            return session;
        },
    },
};