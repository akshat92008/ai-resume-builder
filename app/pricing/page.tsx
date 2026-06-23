import { MarketingNav } from "@/components/layout/MarketingNav";
import { PricingCards } from "@/components/pricing/PricingCards";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pricing</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-950">Start free, upgrade when you need more proof-backed applications.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Manual payments work from day one. Stripe, Razorpay, and Lemon Squeezy can be connected later through the provider abstraction.
          </p>
        </div>
        <div className="mt-10">
          <PricingCards />
        </div>
      </main>
    </div>
  );
}
