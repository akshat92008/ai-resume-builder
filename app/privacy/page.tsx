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
          <p>CareerPath AI by Amaura Labs collects only the information needed to provide proof-score, resume, portfolio, billing, and support workflows.</p>
          <p>Account and vault data can include profile details, education, skills, projects, proof links, job descriptions, generated resumes, leads, and manual payment references. Do not upload secrets, private credentials, or documents you do not have permission to share.</p>
          <p>When Supabase is configured, production data is stored in Supabase. In demo mode, data is stored in your browser only. Payment proof is used only to verify manual payments and activate plans.</p>
          <p>We do not sell student data. Admin access is intended for support, billing approval, and lead follow-up. To request deletion or correction, contact us through the contact page.</p>
        </div>
        <Link href="/contact" className="mt-8 inline-block font-medium text-blue-700 hover:underline">Contact support</Link>
      </main>
    </div>
  );
}
