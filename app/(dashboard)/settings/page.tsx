"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Crown, Loader2, LogOut, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui";

type SubscriptionState = {
  plan: "free" | "pro";
  isPro: boolean;
  aiActionsPerDay: number;
  tailoringPerDay: number;
  outreachPerDay: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  billingConfigured: boolean;
};

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSubscription() {
    const response = await fetch("/api/subscription", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load subscription state.");
    setSubscription(await response.json());
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        if (params.get("success") === "true" && sessionId) {
          setBillingBusy(true);
          const confirm = await fetch("/api/stripe/confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          if (!confirm.ok) {
            const payload = await confirm.json().catch(() => ({}));
            throw new Error(payload?.error?.message || "Payment completed, but subscription confirmation is still pending.");
          }
          if (active) setMessage("Payment confirmed. Your subscription is active.");
          window.history.replaceState({}, "", "/settings");
        } else if (params.get("canceled") === "true") {
          if (active) setMessage("Checkout was canceled. No plan change was made.");
          window.history.replaceState({}, "", "/settings");
        }
        await loadSubscription();
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Unable to load billing state.");
      } finally {
        if (active) setBillingBusy(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function startCheckout() {
    setBillingBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload?.error?.message || "Unable to start checkout.");
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setBillingBusy(false);
    }
  }

  async function manageBilling() {
    setBillingBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload?.error?.message || "Unable to open billing portal.");
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open billing portal.");
      setBillingBusy(false);
    }
  }

  async function logout() {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const periodLabel = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage your CareerOS plan, billing lifecycle, security, and session.</p>
      </header>

      {message && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{message}</div>}

      <section className="career-surface overflow-hidden rounded-3xl">
        <div className="border-b border-slate-100 p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">{subscription?.isPro ? <Crown className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-950">{subscription?.isPro ? "CareerOS Pro" : "CareerOS Free"}</h2>
                  {subscription && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">{subscription.isPro ? "Pro active" : "Free"}</span>}
                </div>
                {!subscription && <p className="mt-1 text-sm text-slate-500">Loading subscription…</p>}
                {subscription?.isPro && <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{subscription.cancelAtPeriodEnd ? `Canceled · Pro access continues through ${periodLabel || "the current billing period"}.` : `Renews through Stripe${periodLabel ? ` after ${periodLabel}` : ""}.`}</p>}
                {subscription && !subscription.isPro && <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Use the free plan with constrained AI quotas, or upgrade through secure Stripe Checkout for higher server-enforced limits.</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {billingBusy && <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />}
              {subscription?.billingConfigured && subscription.isPro && <Button onClick={manageBilling} disabled={billingBusy}>Manage billing</Button>}
              {subscription?.billingConfigured && !subscription.isPro && <Button onClick={startCheckout} disabled={billingBusy}>Upgrade to Pro</Button>}
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-7">
          <SettingPoint icon={<CheckCircle2 className="h-4 w-4" />} title="AI actions" text={subscription ? `${subscription.aiActionsPerDay} per day` : "Loading…"} />
          <SettingPoint icon={<CheckCircle2 className="h-4 w-4" />} title="Resume tailoring" text={subscription ? `${subscription.tailoringPerDay} per day` : "Loading…"} />
          <SettingPoint icon={<CheckCircle2 className="h-4 w-4" />} title="Outreach packs" text={subscription ? `${subscription.outreachPerDay} per day` : "Loading…"} />
        </div>
        {subscription && !subscription.billingConfigured && <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 text-sm text-amber-800 sm:px-7">Paid billing is not enabled on this deployment. No checkout button is exposed until the complete Stripe configuration passes the paid-production readiness gate.</div>}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <SettingPoint icon={<ShieldCheck className="h-4 w-4" />} title="Evidence-first AI" text="CareerOS removes unsupported resume claims rather than inventing skills, achievements, or experience." />
        <SettingPoint icon={<User className="h-4 w-4" />} title="Account isolation" text="Authentication and user-owned data are enforced at the application and database boundaries." />
      </section>

      <section className="career-surface rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-950">Session</h2><p className="mt-1 text-sm leading-6 text-slate-500">Sign out of CareerOS on this device.</p></div><Button variant="outline" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Log out</Button></div>
      </section>

      <p className="text-center text-xs leading-5 text-slate-400">Review the <Link href="/privacy" className="font-semibold text-slate-600 hover:text-indigo-700">privacy policy</Link> and <Link href="/terms" className="font-semibold text-slate-600 hover:text-indigo-700">terms of use</Link>.</p>
    </div>
  );
}

function SettingPoint({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><span className="text-indigo-500">{icon}</span>{title}</div><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>;
}
