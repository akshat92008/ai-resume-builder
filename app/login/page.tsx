"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

const isSupabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

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

    if (!isSupabaseConfigured()) {
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
  if (nextPath) signupParams.set("next", nextPath);
  const signupUrl = signupParams.toString() ? `/signup?${signupParams.toString()}` : "/signup";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Login to CareerPath AI</CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured() && (
          <Alert className="mb-5" variant="error">
            Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable authentication.
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured()} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured()} />
          </div>
          {message && <Alert variant="error">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured()}>
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
