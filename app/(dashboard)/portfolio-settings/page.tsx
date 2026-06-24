"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Eye, Save, Loader2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { getCurrentVault, saveCurrentVault } from "@/lib/repositories";
import { canRemoveFooter } from "@/lib/plans";
import { trackEvent } from "@/lib/events";
import type { UserVault } from "@/lib/types";

export default function PortfolioSettingsPage() {
  const [vault, setVault] = useState<UserVault | null>(null);
  const [message, setMessage] = useState("");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    async function load() {
      const data = await getCurrentVault();
      setVault(data);
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

  const portfolioLink = `${baseUrl}/portfolio/${vault.profile.public_slug || "sample"}`;
  const footerOptional = canRemoveFooter(vault.profile.plan ?? "free");

  async function save() {
    if (!vault) return;
    await saveCurrentVault(vault);
    setMessage("Portfolio settings saved.");
    void trackEvent("portfolio_published", { public: vault.profile.portfolio_public, slug: vault.profile.public_slug });
    window.setTimeout(() => setMessage(""), 1600);
  }

  async function copy() {
    await navigator.clipboard.writeText(portfolioLink);
    setMessage("Portfolio link copied.");
    void trackEvent("referral_copied", { type: "portfolio_link" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Public Portfolio</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">Portfolio settings</h1>
        <p className="mt-2 text-slate-600">Publish a recruiter link that connects your claims to visible proof.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visibility and slug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center justify-between gap-4 rounded-lg border p-4 text-sm font-medium">
            <span>
              Public portfolio
              <span className="mt-1 block text-sm font-normal text-slate-500">When enabled, recruiters can view your proof-backed profile.</span>
            </span>
            <input
              type="checkbox"
              checked={vault.profile.portfolio_public}
              onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, portfolio_public: event.target.checked } })}
            />
          </label>
          <div className="space-y-2">
            <Label>Public slug</Label>
            <Input
              value={vault.profile.public_slug}
              onChange={(event) => setVault({ ...vault, profile: { ...vault.profile, public_slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") } })}
            />
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="font-semibold">Share link</div>
            <div className="mt-1 break-all text-slate-600">{portfolioLink}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              Save settings
            </Button>
            <Button variant="outline" onClick={copy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/portfolio/${vault.profile.public_slug || "sample"}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview portfolio
              </Link>
            </Button>
          </div>
          {message && <Alert variant="success">{message}</Alert>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer and featured proof</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">CareerProof footer</div>
              <p className="mt-1 text-sm text-slate-500">Free portfolios include the viral footer. Pro and Lifetime can remove it.</p>
            </div>
            <Badge variant={footerOptional ? "secondary" : "default"}>{footerOptional ? "Optional" : "Required"}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {vault.projects.map((project) => (
              <label key={project.id} className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm">
                <input type="checkbox" defaultChecked />
                <span>{project.title}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
