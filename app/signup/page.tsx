"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Alert, Button, Input, Label } from "@/components/ui";
import { PremiumAuthShell } from "@/components/auth/PremiumAuthShell";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageVariant("error");
    const nextPath = searchParams.get("next");
    const targetUrl = nextPath ? safeNextPath(nextPath) : "/app";

    if (!isSupabaseConfigured) {
      setMessage("CareerOS authentication is not configured on this deployment yet.");
      setLoading(false);
      return;
    }

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
        setMessageVariant("success");
        setMessage("Verification email requested. Check your inbox and spam folder, open the verification link, then sign in with the same email and password.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Your account was created, but sign-in is temporarily unavailable. Try signing in again.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage("Your account was created. Sign in with the same email and password to continue.");
        setLoading(false);
        return;
      }

      router.push(targetUrl);
      router.refresh();
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
    <div className="rounded-[30px] border border-white/[0.11] bg-white/[0.075] p-1.5 shadow-[0_40px_120px_rgba(0,0,0,.36)] backdrop-blur-2xl">
      <div className="rounded-[25px] border border-white/[0.08] bg-[#0b0e17]/94 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-200"><Sparkles className="h-5 w-5" /></div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Free beta</div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[34px]">Build your career operating system.</h1>
        <p className="mt-3 text-sm leading-6 text-white/45">Create your account, verify your email, and keep Career Memory tied to a confirmed identity.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {["Career Memory", "Truthful AI", "Outcome loop"].map((item) => (
            <div key={item} className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-2 text-center text-[9px] font-semibold text-white/45"><Check className="mx-auto mb-1 h-3 w-3 text-emerald-400" />{item}</div>
          ))}
        </div>

        {!isSupabaseConfigured && <Alert className="mt-5" variant="error">Authentication is not configured on this deployment.</Alert>}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-white/70">Email</Label>
            <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured} placeholder="you@example.com" className="h-12 border-white/10 bg-white/[0.055] text-white placeholder:text-white/25 focus:border-indigo-400/50" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label htmlFor="signup-password" className="text-white/70">Password</Label><span className="text-[10px] font-medium text-white/25">8–128 characters</span></div>
            <Input id="signup-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured} placeholder="Create a strong password" className="h-12 border-white/10 bg-white/[0.055] text-white placeholder:text-white/25 focus:border-indigo-400/50" />
          </div>
          {message && <Alert variant={messageVariant}>{message}</Alert>}
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,.08)] hover:bg-indigo-100" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Creating your workspace..." : <>Create free account <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-[10px] leading-4 text-white/30"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />Passwords are screened against known breach data before an account can be created.</div>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/30"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Your career data stays isolated to your account.</div>
        <p className="mt-5 text-center text-sm text-white/38">Already have an account? <Link href={loginUrl} className="font-semibold text-white transition hover:text-indigo-200">Sign in</Link></p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <PremiumAuthShell eyebrow="Start in under a minute">
      <Suspense fallback={<div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-8 text-sm text-white/40">Preparing secure signup…</div>}><SignupForm /></Suspense>
    </PremiumAuthShell>
  );
}
