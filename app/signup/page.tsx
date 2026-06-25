"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { isSupabaseMode } from "@/lib/data/client/mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/events";
import { getCurrentVault, saveCurrentVault } from "@/lib/data/client/client-repository";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && typeof window !== "undefined") {
      localStorage.setItem("careerproof_referral", ref);
    }
  }, [searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    await trackEvent("signup", { email });

    const nextPath = searchParams.get("next");
    const plan = searchParams.get("plan");
    let targetUrl = "/onboarding";
    if (nextPath || plan) {
      const search = new URLSearchParams();
      if (nextPath) search.set("next", nextPath);
      if (plan) search.set("plan", plan);
      targetUrl = `/onboarding?${search.toString()}`;
    }

    if (!isSupabaseMode()) {
      const vault = await getCurrentVault();
      if (vault) {
        vault.profile.full_name = fullName;
        vault.profile.email = email;
        await saveCurrentVault(vault);
      }
      router.push(targetUrl);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not initialized.");
      setLoading(false);
      return;
    }

    const ref = typeof window !== "undefined" ? localStorage.getItem("careerproof_referral") : null;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, referral: ref || undefined },
        emailRedirectTo: `${window.location.origin}${targetUrl}`,
      },
    });
    
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    router.push(targetUrl);
  }

  const loginParams = new URLSearchParams();
  const nextPath = searchParams.get("next");
  const plan = searchParams.get("plan");
  if (nextPath) loginParams.set("next", nextPath);
  if (plan) loginParams.set("plan", plan);
  const loginUrl = loginParams.toString() ? `/login?${loginParams.toString()}` : "/login";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create your proof-backed profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {message && <Alert variant="error">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account? <Link href={loginUrl} className="font-medium text-blue-700">Login</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto flex max-w-md px-4 py-12">
        <Suspense fallback={<div>Loading...</div>}>
          <SignupForm />
        </Suspense>
      </main>
    </div>
  );
}
