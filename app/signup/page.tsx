"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

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

    const targetUrl = nextPath ? safeNextPath(nextPath) : "/app";

    if (!isSupabaseConfigured) {
      setMessage("Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
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
  if (nextPath) loginParams.set("next", nextPath);
  const loginUrl = loginParams.toString() ? `/login?${loginParams.toString()}` : "/login";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured && (
          <Alert className="mb-5" variant="error">
            Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable authentication.
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured} />
          </div>
          {message && <Alert variant="error">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
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
