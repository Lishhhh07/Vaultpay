"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Field } from "../../../components/Field";

export function SigninForm({ callbackUrl, authError }: { callbackUrl: string; authError?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    authError
      ? "Sign-in was not allowed. If you registered with a password, use it instead of Google."
      : ""
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signIn("credentials", { identifier, password, redirect: false });
    if (res?.error) {
      setError(
        res.error === "TOO_MANY_ATTEMPTS"
          ? "Too many failed attempts. Try again in 15 minutes."
          : "Invalid email/phone or password"
      );
      setBusy(false);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Sign in</h2>
      <Field label="Email or mobile number" value={identifier} onChange={setIdentifier} autoComplete="username" />
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full border border-gray-300 hover:bg-gray-50 rounded-lg px-5 py-2.5 text-sm"
      >
        Continue with Google
      </button>
      <p className="text-sm text-gray-600">
        New merchant? <Link href="/signup" className="text-[#6a51a6] underline">Create an account</Link>
      </p>
    </form>
  );
}