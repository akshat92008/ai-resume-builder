"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    
    // Redirect to login after successful reset
    router.push("/login?message=Password updated successfully");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto flex max-w-md px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={!isSupabaseConfigured} minLength={6} />
              </div>
              {message && <Alert variant="error">{message}</Alert>}
              <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
                {loading ? "Updating password..." : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
