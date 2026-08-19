import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">Privacy Policy</h1>
        <div className="mt-8 space-y-5 leading-7 text-slate-700">
          <p>CareerOS by Amaura Labs collects the information needed to provide account, resume, job-search, application-tracking, billing, and support workflows.</p>
          <p>Career data can include profile details, education, skills, projects, proof links, job descriptions, application outcomes, and generated resumes. Do not upload secrets, private credentials, or documents you do not have permission to share.</p>
          <p>Production account and career data is stored in Supabase and protected by account-scoped access controls. Operational AI telemetry is designed to store metadata such as provider, token counts, attempts, and estimated cost rather than raw resume, job-description, or model payloads.</p>
          <p>Paid subscriptions are processed by Stripe. CareerOS stores Stripe customer/subscription identifiers and subscription state needed to enforce entitlements, but does not store full card numbers or card security codes.</p>
          <p>We do not sell user data to advertisers. Service providers used to operate the product may process data only as needed to provide infrastructure, AI, payment, security, and observability services.</p>
          <p>To request correction or deletion of account data, contact support. Some billing or security records may need to be retained where required for legitimate accounting, fraud-prevention, or legal obligations.</p>
        </div>
        <Link href="/contact" className="mt-8 inline-block font-medium text-blue-700 hover:underline">Contact support</Link>
      </main>
    </div>
  );
}
