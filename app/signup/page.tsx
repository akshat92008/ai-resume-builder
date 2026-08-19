"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Alert, Button, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const nextPath = searchParams.get("next");
    const targetUrl = nextPath ? safeNextPath(nextPath) : "/app";
    if (!isSupabaseConfigured) { setMessage("CareerOS authentication is not configured on this deployment yet."); setLoading(false); return; }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error?.message || "Unable to create account. Try again.");
        setLoading(false);
        return;
      }
      if (data.requiresEmailConfirmation) {
        setMessage("Check your email to confirm your account, then return here to sign in.");
        setLoading(false);
        return;
      }
      router.push(targetUrl);
    } catch {
      setMessage("Unable to create account right now. Try again.");
      setLoading(false);
    }
  }

  const loginParams = new URLSearchParams();
  const nextPath = searchParams.get("next");
  if (nextPath) loginParams.set("next", nextPath);
  const loginUrl = loginParams.toString() ? `/login?${loginParams.toString()}` : "/login";

  return (
    <div className="career-surface w-full rounded-[28px] p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><Sparkles className="h-5 w-5" /></div>
      <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em] text-slate-950">Build your career operating system.</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Create one Career Memory, then use it across job decisions, tailoring, applications, and outcome tracking.</p>
      {!isSupabaseConfigured && <Alert className="mt-5" variant="error">Authentication is not configured on this deployment.</Alert>}
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="space-y-2"><Label htmlFor="signup-email">Email</Label><Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured} placeholder="you@example.com" /></div>
        <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><Input id="signup-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured} placeholder="At least 8 characters" /></div>
        {message && <Alert variant={message.startsWith("Check your email") ? "success" : "error"}>{message}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || !isSupabaseConfigured}>{loading ? "Creating account..." : <>Create free account <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
      </form>
      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Free plan with server-enforced fair-use AI limits.</div>
      <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href={loginUrl} className="font-semibold text-indigo-600 hover:underline">Sign in</Link></p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <MarketingNav />
      <main className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-violet-200/35 blur-[110px]" />
        <div className="relative w-full max-w-md"><Suspense fallback={<div className="career-surface rounded-3xl p-8 text-sm text-slate-500">Loading...</div>}><SignupForm /></Suspense></div>
      </main>
    </div>
  );
}
