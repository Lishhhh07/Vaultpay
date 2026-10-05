"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { signupUser } from "../lib/actions/signup";

export function SignupForm() {
    const router = useRouter();
    const [f, setF] = useState({ name: "", phone: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const cls = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5";
    const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        const r = await signupUser(f);
        if (!r.ok) {
            setError(r.error);
            setBusy(false);
            return;
        }
        const login = await signIn("credentials", { phone: f.phone, password: f.password, redirect: false });
        setBusy(false);
        if (!login || login.error) {
            router.push("/signin");
            return;
        }
        router.push("/dashboard");
        router.refresh();
    }

    return (
        <div className="flex justify-center pt-16 px-4">
            <form onSubmit={onSubmit} className="bg-white border rounded-xl p-8 w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold text-[#6a51a6]">Create your account</h1>
                <input value={f.name} onChange={(e) => set("name")(e.target.value)}
                    placeholder="Full name" autoComplete="name" className={cls} />
                <input value={f.phone} onChange={(e) => set("phone")(e.target.value)} inputMode="numeric"
                    maxLength={10} placeholder="Mobile number" autoComplete="username" className={cls} />
                <input type="password" value={f.password} onChange={(e) => set("password")(e.target.value)}
                    placeholder="Password (8+ characters, letters and numbers)" autoComplete="new-password" className={cls} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy}
                    className="w-full text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm">
                    {busy ? "Creating account..." : "Sign up"}
                </button>
                <p className="text-sm text-gray-600">
                    Already have an account? <Link href="/signin" className="text-[#6a51a6] underline">Sign in</Link>
                </p>
            </form>
        </div>
    );
}