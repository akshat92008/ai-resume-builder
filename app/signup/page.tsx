"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { storageKeys, writeLocal } from "@/lib/storage";
import { trackEvent } from "@/lib/events";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) writeLocal(storageKeys.referralCode, ref);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    await trackEvent("signup", { email, demo: !isSupabaseConfigured });

    if (!isSupabaseConfigured) {
      router.push("/onboarding");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto flex max-w-md px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create your proof-backed profile</CardTitle>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured && (
              <Alert className="mb-5" variant="warning">
                Supabase env vars are missing. Signup will run in local demo mode.
              </Alert>
            )}
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
              Already have an account? <Link href="/login" className="font-medium text-blue-700">Login</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
