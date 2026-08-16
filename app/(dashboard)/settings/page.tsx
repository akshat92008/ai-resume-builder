"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, CreditCard, User, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SettingsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [aiActionsPerDay, setAiActionsPerDay] = useState(3);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  useEffect(() => { if (searchParams.get("success") === "true") { setSuccess(true); setTimeout(() => setSuccess(false), 5000); } }, [searchParams]);
  useEffect(() => {
    let cancelled = false;
    async function loadSubscription() {
      try {
        const res = await fetch("/api/subscription", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) { setPlan(data.plan === "pro" ? "pro" : "free"); setAiActionsPerDay(Number(data.aiActionsPerDay) || 3); }
      } finally { if (!cancelled) setSubscriptionLoading(false); }
    }
    loadSubscription(); return () => { cancelled = true; };
  }, [success]);

  const handleUpgrade = async () => {
    setLoading(true); setBillingError(null);
    try { const res = await fetch("/api/stripe/checkout", { method: "POST" }); const data = await res.json(); if (data.url) window.location.href = data.url; else setBillingError(data.error?.message || "Unable to start checkout."); }
    catch (err) { console.error(err); setBillingError("Unable to start checkout."); }
    finally { setLoading(false); }
  };
  const handleManageSubscription = async () => {
    setLoading(true);
    try { const res = await fetch("/api/stripe/create-portal-session", { method: "POST" }); const data = await res.json(); if (data.url) window.location.href = data.url; else if (data.error) alert(data.error.message); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      <div className="flex-none p-6 pb-4 border-b border-slate-200 bg-white sticky top-0 z-10"><div className="max-w-4xl mx-auto flex items-center gap-4"><Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1><p className="text-sm text-slate-500 mt-1">Manage your account and subscription.</p></div></div></div>
      <div className="flex-1 p-6"><div className="max-w-4xl mx-auto space-y-8">
        {success && <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800"><CheckCircle2 className="h-5 w-5" /><div><p className="font-medium">Checkout complete</p><p className="text-sm">Your plan will update as soon as Stripe confirms the subscription.</p></div></div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="md:col-span-1"><h3 className="font-semibold text-slate-900 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Subscription</h3><p className="text-sm text-slate-500 mt-1">Upgrade to Pro for higher AI limits, interview prep, and advanced career analytics.</p></div>
          <div className="md:col-span-2"><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6"><div><div className="inline-block bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full text-sm mb-2">Current Plan: {subscriptionLoading ? "Loading…" : plan === "pro" ? "Pro" : "Free"}</div><p className="text-sm text-slate-500">{plan === "pro" ? `You have up to ${aiActionsPerDay} AI actions per day plus higher tailoring and outreach limits.` : `You have core CareerOS access with up to ${aiActionsPerDay} AI actions per day.`}</p></div>
            <div className="pt-4 border-t border-slate-100"><h4 className="font-medium text-slate-900 mb-4">Pro Plan - $15/month</h4><ul className="space-y-2 text-sm text-slate-600 mb-6"><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Up to 100 AI actions/day</li><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Advanced Interview Prep</li><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Automated Cover Letters</li><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Priority Support</li></ul>
              {billingError && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{billingError}</p>}
              <div className="flex gap-3 flex-col sm:flex-row">{plan === "free" ? <Button onClick={handleUpgrade} disabled={loading || subscriptionLoading} className="w-full sm:w-auto">{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Upgrade to Pro</Button> : <Button onClick={handleManageSubscription} disabled={loading} variant="outline" className="w-full sm:w-auto">{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Manage Subscription</Button>}</div>
            </div></div></div></div>
        <div className="border-t border-slate-200 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8"><div className="md:col-span-1"><h3 className="font-semibold text-slate-900 flex items-center gap-2"><User className="h-4 w-4" /> Account Settings</h3></div><div className="md:col-span-2"><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"><div><p className="font-medium text-slate-900">Email Address</p><p className="text-sm text-slate-500">Connected via Supabase Auth</p></div><Button variant="outline" disabled>Managed internally</Button></div></div></div>
      </div></div>
    </div>
  );
}

export default function SettingsPage() { return <Suspense fallback={<SettingsFallback />}><SettingsContent /></Suspense>; }
function SettingsFallback() { return <div className="flex min-h-screen items-center justify-center bg-slate-50/50"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>; }
