"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!isSupabaseConfigured) {
      setMessage("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not initialized.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto flex max-w-md px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center">
                <Alert className="mb-5" variant="success">
                  Password reset link sent! Check your email.
                </Alert>
                <Link href="/login">
                  <Button className="w-full" variant="outline">Return to login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email address</Label>
                  <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isSupabaseConfigured} />
                </div>
                {message && <Alert variant="error">{message}</Alert>}
                <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
                  {loading ? "Sending link..." : "Send reset link"}
                </Button>
              </form>
            )}
            <p className="mt-5 text-center text-sm text-slate-600">
              Remember your password? <Link href="/login" className="font-medium text-blue-700 hover:underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
