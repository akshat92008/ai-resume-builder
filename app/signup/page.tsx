"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

const isSupabaseMode = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

function SignupForm() {
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
      targetUrl = `${safeNextPath(nextPath)}${search.toString() ? `?${search.toString()}` : ""}`;
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      setMessage("Check your email to confirm your account.");
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
        <CardTitle>Create an Account</CardTitle>
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
            <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {message && <Alert variant="error">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
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
