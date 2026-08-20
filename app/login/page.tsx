"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Alert, Button, Input, Label } from "@/components/ui";
import { PremiumAuthShell } from "@/components/auth/PremiumAuthShell";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const nextPath = searchParams.get("next");
    const targetUrl = nextPath ? safeNextPath(nextPath) : "/app";

    if (!isSupabaseConfigured) {
      setMessage("CareerOS authentication is not configured on this deployment yet.");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("CareerOS authentication is temporarily unavailable.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.code === "email_not_confirmed" ? "This account came from the earlier beta signup flow. Re-enter the same email and password on Create account once to activate it." : error.message);
      setLoading(false);
      return;
    }

    router.push(targetUrl);
    router.refresh();
  }

  const signupParams = new URLSearchParams();
  const nextPath = searchParams.get("next");
  if (nextPath) signupParams.set("next", nextPath);
  const signupUrl = signupParams.toString() ? `/signup?${signupParams.toString()}` : "/signup";

  return (
    <div className="rounded-[30px] border border-white/[0.11] bg-white/[0.075] p-1.5 shadow-[0_40px_120px_rgba(0,0,0,.36)] backdrop-blur-2xl">
      <div className="rounded-[25px] border border-white/[0.08] bg-[#0b0e17]/94 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-200"><Sparkles className="h-5 w-5" /></div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/40"><LockKeyhole className="h-3 w-3" /> Secure access</div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[34px]">Welcome back.</h1>
        <p className="mt-3 text-sm leading-6 text-white/45">Continue from the same Career Memory, applications and outcome history you left behind.</p>

        {!isSupabaseConfigured && <Alert className="mt-5" variant="error">Authentication is not configured on this deployment.</Alert>}

        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-white/70">Email</Label>
            <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured} placeholder="you@example.com" className="h-12 border-white/10 bg-white/[0.055] text-white placeholder:text-white/25 focus:border-indigo-400/50" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label htmlFor="login-password" className="text-white/70">Password</Label><Link href="/forgot-password" className="text-[11px] font-semibold text-indigo-300 transition hover:text-indigo-200">Forgot password?</Link></div>
            <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured} placeholder="Your password" className="h-12 border-white/10 bg-white/[0.055] text-white placeholder:text-white/25 focus:border-indigo-400/50" />
          </div>
          {message && <Alert variant="error">{message}</Alert>}
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,.08)] hover:bg-indigo-100" disabled={loading || !isSupabaseConfigured}>
            {loading ? "Opening CareerOS..." : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-white/30"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Session and career data remain isolated to your account.</div>
        <p className="mt-5 text-center text-sm text-white/38">New to CareerOS? <Link href={signupUrl} className="font-semibold text-white transition hover:text-indigo-200">Create account</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PremiumAuthShell eyebrow="Resume where you left off">
      <Suspense fallback={<div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-8 text-sm text-white/40">Preparing secure sign in…</div>}><LoginForm /></Suspense>
    </PremiumAuthShell>
  );
}
