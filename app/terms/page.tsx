import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">Terms of Use</h1>
        <div className="mt-8 space-y-5 leading-7 text-slate-700">
          <p>CareerOS helps users present real achievements more clearly. You remain responsible for the accuracy of every resume, certificate, link, application, and claim you submit or share.</p>
          <p>You must not use the product to fabricate internships, companies, marks, awards, certificates, experience, or metrics. AI-generated material should be reviewed before it is sent to recruiters, employers, or other third parties.</p>
          <p>CareerOS offers a free plan and may offer a paid Pro subscription. The price, billing interval, taxes, and any trial terms shown in Stripe Checkout at the time of purchase control your transaction. Paid subscriptions renew automatically for the interval shown at checkout until canceled.</p>
          <p>You can manage or cancel an active subscription through the billing portal in Settings. Unless Stripe or applicable law requires otherwise, cancellation stops future renewals and access remains subject to the subscription state and paid period reported by Stripe.</p>
          <p>Usage limits and features may change over time. We will not represent a payment as granting unlimited use when server-enforced quotas or fair-use limits apply.</p>
          <p>CareerOS provides career-assistance software, not a guarantee of interviews, employment, compensation, admissions, or other outcomes.</p>
          <p>By using the app, you agree to use it lawfully, respect third-party rights, and avoid uploading sensitive information you do not want processed for career workflows.</p>
        </div>
        <Link href="/privacy" className="mt-8 inline-block font-medium text-blue-700 hover:underline">Read privacy policy</Link>
      </main>
    </div>
  );
}
