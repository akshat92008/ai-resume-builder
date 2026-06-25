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
          <p>CareerPath AI helps users present real achievements more clearly. You are responsible for the accuracy of every resume, certificate, link, and claim you generate.</p>
          <p>You must not use the product to fabricate internships, companies, marks, awards, certificates, experience, or metrics. AI output should be reviewed before sharing with recruiters.</p>
          <p>Access limits, pricing, and beta features may change as the product evolves.</p>
          <p>By using the app, you agree to use it lawfully, respect third-party rights, and avoid uploading sensitive information you do not want processed for resume building workflows.</p>
        </div>
        <Link href="/privacy" className="mt-8 inline-block font-medium text-blue-700 hover:underline">Read privacy policy</Link>
      </main>
    </div>
  );
}
