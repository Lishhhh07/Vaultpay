"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function SigninForm({ callbackUrl, authError }: { callbackUrl: string; authError?: string }) {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(
        authError === "AccessDenied"
            ? "Google sign-in was not allowed. Use a Google account with a verified email."
            : authError
                ? "Sign-in failed. Please try again."
                : ""
    );
    const [busy, setBusy] = useState(false);
    const cls = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5";

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await signIn("credentials", { phone, password, redirect: false });
        setBusy(false);
        if (!res || res.error || !res.ok) {
            setError("Invalid phone number or password");
            return;
        }
        router.push(callbackUrl);
        router.refresh();
    }

    return (
        <div className="flex justify-center pt-16 px-4">
            <form onSubmit={onSubmit} className="bg-white border rounded-xl p-8 w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold text-[#6a51a6]">Sign in</h1>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric"
                    maxLength={10} placeholder="Phone number" autoComplete="username" className={cls} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" autoComplete="current-password" className={cls} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy}
                    className="w-full text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5 text-sm">
                    {busy ? "Signing in..." : "Sign in"}
                </button>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex-1 border-t" /> or <span className="flex-1 border-t" />
                </div>
                <button type="button" onClick={() => signIn("google", { callbackUrl })}
                    className="w-full border border-gray-300 hover:bg-gray-50 rounded-lg px-5 py-2.5 text-sm">
                    Continue with Google
                </button>

                <p className="text-sm text-gray-600">
                    New here? <Link href="/signup" className="text-[#6a51a6] underline">Create an account</Link>
                </p>
            </form>
        </div>
    );
}