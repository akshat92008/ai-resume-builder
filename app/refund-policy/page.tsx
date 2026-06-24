import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">Refund Policy</h1>
        <div className="mt-8 space-y-5 leading-7 text-slate-700">
          <p>Manual payments are approved after admin verification. If a payment cannot be verified, the order may be rejected and the user will be contacted for clarification.</p>
          <p>For digital SaaS access, refunds are reviewed case by case within 7 days of approval when there is a duplicate payment, accidental payment, or product access issue that cannot be resolved.</p>
          <p>Manual service packs depend on work already delivered. Once a resume, portfolio, or review service has started, partial refunds may depend on the completed work.</p>
          <p>For refund help, share your order ID, payment reference, email, and reason through the contact page.</p>
        </div>
        <Link href="/contact" className="mt-8 inline-block font-medium text-blue-700 hover:underline">Request refund help</Link>
      </main>
    </div>
  );
}
