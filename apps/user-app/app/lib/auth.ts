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
//seeded vaale can still login
const newPasswordSchema = z.string().min(8).max(72);

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

                const existingUser = await db.user.findUnique({ where: { number: phone } });
                if (existingUser) {
                    const ok = await bcrypt.compare(password, existingUser.password);
                    return ok
                        ? { id: existingUser.id.toString(), name: existingUser.name, email: existingUser.number }
                        : null;
                }

                if (!newPasswordSchema.safeParse(password).success) return null;
                try {
                    const user = await db.user.create({
                        data: {
                            number: phone,
                            password: await bcrypt.hash(password, 10),
                            Balance: { create: { amount: 0, locked: 0 } },  // every user needs a balance row
                        },
                    });
                    return { id: user.id.toString(), name: user.name, email: user.number };
                } catch (e) {
                    console.error("signup failed");
                    return null;
                }
            },
        }),
    ],
    secret,
    session: { strategy: "jwt" as const, maxAge: 60 * 60 * 24 },
    callbacks: {
        async session({ token, session }: any) {
            session.user.id = token.sub;
            return session;
        },
    },
};