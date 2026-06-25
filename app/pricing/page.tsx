import { MarketingNav } from "@/components/layout/MarketingNav";
import { Suspense } from "react";
import { PricingCards } from "@/components/pricing/PricingCards";
import { getCurrentUser } from "@/lib/data/server/server-repository";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pricing</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-950">Start free, upgrade when you need more proof-backed applications.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Create a free account before payment so we can activate your plan after verification.
          </p>
          <div className="mt-4 inline-block rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>Note:</strong> Payments are manually verified. Your order or plan will be activated after payment proof is approved.
          </div>
        </div>
        <div className="mt-10">
          <Suspense fallback={<div>Loading pricing...</div>}>
            <PricingCards userEmail={user?.email || undefined} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
