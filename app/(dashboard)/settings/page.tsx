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
  providerStatus: string | null;
  billingProvider: "razorpay";
  billingConfigured: boolean;
};

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { email?: string };
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

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
    void loadSubscription().catch((error) => {
      if (active) setMessage(error instanceof Error ? error.message : "Unable to load billing state.");
    });
    return () => { active = false; };
  }, []);

  async function startCheckout() {
    setBillingBusy(true);
    setMessage(null);
    try {
      await loadRazorpayCheckout();
      const response = await fetch("/api/razorpay/checkout", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.keyId || !payload.subscriptionId) {
        throw new Error(payload?.error?.message || "Unable to start checkout.");
      }
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable.");

      const checkout = new window.Razorpay({
        key: payload.keyId,
        subscription_id: payload.subscriptionId,
        name: payload.name || "CareerOS",
        description: payload.description || "CareerOS Pro subscription",
        prefill: payload.prefill,
        handler: async (payment) => {
          try {
            const confirm = await fetch("/api/razorpay/confirm", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                paymentId: payment.razorpay_payment_id,
                subscriptionId: payment.razorpay_subscription_id,
                signature: payment.razorpay_signature,
              }),
            });
            const confirmation = await confirm.json().catch(() => ({}));
            if (!confirm.ok) throw new Error(confirmation?.error?.message || "Payment verification failed.");
            setMessage(confirmation.isPro
              ? "Payment verified. CareerOS Pro is active."
              : "Payment verified. Razorpay is completing subscription activation; access will update automatically.");
            await loadSubscription();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to verify payment.");
          } finally {
            setBillingBusy(false);
          }
        },
        modal: { ondismiss: () => setBillingBusy(false) },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setBillingBusy(false);
    }
  }

  async function cancelSubscription() {
    setBillingBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/razorpay/cancel", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || "Unable to cancel subscription.");
      setMessage("Cancellation scheduled for the end of the current billing cycle.");
      await loadSubscription();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update billing.");
    } finally {
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
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage your CareerOS plan, Razorpay subscription, security, and session.</p>
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
                  {subscription && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">{subscription.isPro ? "Pro active" : subscription.providerStatus || "Free"}</span>}
                </div>
                {!subscription && <p className="mt-1 text-sm text-slate-500">Loading subscription…</p>}
                {subscription?.isPro && <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{subscription.cancelAtPeriodEnd ? `Cancellation scheduled · Pro access continues through ${periodLabel || "the current billing period"}.` : `Recurring billing is managed securely by Razorpay${periodLabel ? ` · current period ends ${periodLabel}` : ""}.`}</p>}
                {subscription && !subscription.isPro && <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Use the free plan with constrained AI quotas, or upgrade through Razorpay Checkout for higher server-enforced limits.</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {billingBusy && <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />}
              {subscription?.billingConfigured && subscription.isPro && !subscription.cancelAtPeriodEnd && <Button variant="outline" onClick={cancelSubscription} disabled={billingBusy}>Cancel at period end</Button>}
              {subscription?.billingConfigured && !subscription.isPro && <Button onClick={startCheckout} disabled={billingBusy}>Upgrade to Pro</Button>}
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-7">
          <SettingPoint icon={<CheckCircle2 className="h-4 w-4" />} title="AI actions" text={subscription ? `${subscription.aiActionsPerDay} per day` : "Loading…"} />
          <SettingPoint icon={<CheckCircle2 className="h-4 w-4" />} title="Resume tailoring" text={subscription ? `${subscription.tailoringPerDay} per day` : "Loading…"} />
          <SettingPoint icon={<CheckCircle2 className="h-4 w-4" />} title="Outreach packs" text={subscription ? `${subscription.outreachPerDay} per day` : "Loading…"} />
        </div>
        {subscription && !subscription.billingConfigured && <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 text-sm text-amber-800 sm:px-7">Paid billing is not enabled on this deployment. No checkout button is exposed until the complete Razorpay configuration passes the paid-production readiness gate.</div>}
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
