"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { signupMerchant } from "../../../lib/actions/signup";
import { Field } from "../../../components/Field";

export function SignupForm() {
  const router = useRouter();
  const [f, setF] = useState({ businessName: "", ownerName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signupMerchant(f);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    const login = await signIn("credentials", {
      identifier: f.email,
      password: f.password,
      redirect: false,
    });
    if (login?.error) {
      router.push("/signin");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Create your merchant account</h2>
      <Field label="Business name" value={f.businessName} onChange={set("businessName")} placeholder="Ravi Tea Stall" />
      <Field label="Owner name" value={f.ownerName} onChange={set("ownerName")} autoComplete="name" />
      <Field label="Email" type="email" value={f.email} onChange={set("email")} autoComplete="email" inputMode="email" />
      <Field label="Mobile number" value={f.phone} onChange={set("phone")} autoComplete="tel" inputMode="numeric" placeholder="9876543210" />
      <Field label="Password" type="password" value={f.password} onChange={set("password")} autoComplete="new-password" placeholder="8+ characters, letters and numbers" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded-lg px-5 py-2.5"
      >
        {busy ? "Creating account..." : "Sign up"}
      </button>
      <p className="text-sm text-gray-600">
        Already have an account? <Link href="/signin" className="text-[#6a51a6] underline">Sign in</Link>
      </p>
    </form>
  );
}