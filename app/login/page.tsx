"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Alert, Button, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
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
    event.preventDefault(); setLoading(true); setMessage("");
    const nextPath = searchParams.get("next");
    const targetUrl = nextPath ? safeNextPath(nextPath) : "/app";
    if (!isSupabaseConfigured) { setMessage("CareerOS authentication is not configured on this deployment yet."); setLoading(false); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setMessage("CareerOS authentication is temporarily unavailable."); setLoading(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); setLoading(false); return; }
    router.push(targetUrl);
  }

  const signupParams = new URLSearchParams();
  const nextPath = searchParams.get("next");
  if (nextPath) signupParams.set("next", nextPath);
  const signupUrl = signupParams.toString() ? `/signup?${signupParams.toString()}` : "/signup";

  return (
    <div className="career-surface w-full rounded-[28px] p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><Sparkles className="h-5 w-5" /></div>
      <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em] text-slate-950">Welcome back.</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue your Career Memory, applications, and outcome history.</p>
      {!isSupabaseConfigured && <Alert className="mt-5" variant="error">Authentication is not configured on this deployment.</Alert>}
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="space-y-2"><Label htmlFor="login-email">Email</Label><Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured} placeholder="you@example.com" /></div>
        <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="login-password">Password</Label><Link href="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">Forgot password?</Link></div><Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured} placeholder="••••••••" /></div>
        {message && <Alert variant="error">{message}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || !isSupabaseConfigured}>{loading ? "Signing in..." : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
      </form>
      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Your career data stays tied to your account.</div>
      <p className="mt-5 text-center text-sm text-slate-500">New to CareerOS? <Link href={signupUrl} className="font-semibold text-indigo-600 hover:underline">Create account</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <MarketingNav />
      <main className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-indigo-200/35 blur-[110px]" />
        <div className="relative w-full max-w-md"><Suspense fallback={<div className="career-surface rounded-3xl p-8 text-sm text-slate-500">Loading...</div>}><LoginForm /></Suspense></div>
      </main>
    </div>
  );
}
