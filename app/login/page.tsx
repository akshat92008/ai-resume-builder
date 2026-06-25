"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { isSupabaseMode } from "@/lib/data/client/mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
    const plan = searchParams.get("plan");

    let targetUrl = "/dashboard";
    if (nextPath) {
      const search = new URLSearchParams();
      if (plan) search.set("plan", plan);
      targetUrl = `${nextPath}${search.toString() ? `?${search.toString()}` : ""}`;
    }

    if (!isSupabaseMode()) {
      router.push(targetUrl);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not initialized.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    router.push(targetUrl);
  }

  const signupParams = new URLSearchParams();
  const nextPath = searchParams.get("next");
  const plan = searchParams.get("plan");
  if (nextPath) signupParams.set("next", nextPath);
  if (plan) signupParams.set("plan", plan);
  const signupUrl = signupParams.toString() ? `/signup?${signupParams.toString()}` : "/signup";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Login to CareerProof AI</CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupabaseMode() && (
          <Alert className="mb-5" variant="warning">
            Supabase env vars are missing. Demo mode will take you to the dashboard without real authentication.
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {message && <Alert variant="error">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          New here? <Link href={signupUrl} className="font-medium text-blue-700">Create account</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto flex max-w-md px-4 py-12">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
