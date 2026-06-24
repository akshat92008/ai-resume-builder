"use client";

import { useEffect, useState } from "react";
import { Copy, Gift, Share2, Loader2 } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import { getCurrentVault, saveCurrentVault } from "@/lib/repositories";
import { trackEvent } from "@/lib/events";
import type { UserVault } from "@/lib/types";

export default function ReferralsPage() {
  const [vault, setVault] = useState<UserVault | null>(null);
  const [message, setMessage] = useState("");
  const [copiedCount, setCopiedCount] = useState(0);
  
  useEffect(() => {
    async function load() {
      const v = await getCurrentVault();
      setVault(v);
      setCopiedCount(0); // This can be fetched from DB if needed
    }
    load();
  }, []);

  if (!vault) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const code = vault.profile.referral_code || `${vault.profile.full_name?.split(" ")[0] || "USER"}100`.toUpperCase();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/signup?ref=${code}`;

  async function copy() {
    if (!vault) return;
    const currentVault = vault;
    if (!currentVault.profile.referral_code) {
      const next: UserVault = { ...currentVault, profile: { ...currentVault.profile, referral_code: code } };
      await saveCurrentVault(next);
      setVault(next);
    }
    await navigator.clipboard.writeText(link);
    await trackEvent("referral_copied", { code });
    setCopiedCount(c => c + 1);
    setMessage("Referral link copied.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Referrals</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">Invite friends and unlock extra usage.</h1>
        <p className="mt-2 text-slate-600">Referral link format: NEXT_PUBLIC_APP_URL?ref=CODE, captured during signup.</p>
      </div>

      <Card>
        <CardHeader>
          <Share2 className="h-8 w-8 text-blue-600" />
          <CardTitle>Your referral link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="font-semibold">Code: {code}</div>
            <div className="mt-2 break-all text-slate-600">{link}</div>
          </div>
          <Button onClick={copy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy referral link
          </Button>
          {message && <Alert variant="success">{message}</Alert>}
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reward 1</CardTitle>
          </CardHeader>
          <CardContent>
            <Gift className="mb-3 h-8 w-8 text-blue-600" />
            <div className="font-semibold">Invite 3 friends</div>
            <p className="mt-1 text-sm text-slate-500">Unlock extra resume generations.</p>
            <Progress value={(copiedCount / 3) * 100} className="mt-4" />
            <p className="mt-2 text-xs text-slate-500">{Math.min(copiedCount, 3)}/3 invites</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reward 2</CardTitle>
          </CardHeader>
          <CardContent>
            <Gift className="mb-3 h-8 w-8 text-blue-600" />
            <div className="font-semibold">Invite 10 friends</div>
            <p className="mt-1 text-sm text-slate-500">Unlock temporary Pro access after admin review.</p>
            <Progress value={(copiedCount / 10) * 100} className="mt-4" />
            <p className="mt-2 text-xs text-slate-500">{Math.min(copiedCount, 10)}/10 invites</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
