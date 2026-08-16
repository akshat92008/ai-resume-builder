import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: August 16, 2026</p>

        <div className="mt-8 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">What CareerOS stores</h2>
            <p className="mt-2">CareerOS stores the information you provide to build and operate your career workspace. This can include account details, education, skills, projects, work history, achievements, proof links, job descriptions, application history, generated resumes, outreach content, and career preferences.</p>
            <p className="mt-2">Do not upload secrets, passwords, private credentials, government identity documents, health information, or documents you do not have permission to share.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">How your data is used</h2>
            <p className="mt-2">We use career data to provide the features you request: memory extraction, resume generation and improvement, job matching, ATS analysis, application preparation, interview preparation, and conversion analytics. We do not sell your career data or use it to create advertising profiles.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Service providers</h2>
            <p className="mt-2">Production deployments use service providers to operate the product. Depending on which features are enabled, data may be processed by Supabase for authentication and persistence, NVIDIA NIM and configured fallback AI providers for AI generation, Inngest for background-job orchestration, Upstash Redis for rate limiting, Sentry for error monitoring, and Stripe for billing.</p>
            <p className="mt-2">We configure application telemetry to minimize raw career content. Operational metadata such as feature name, model, latency, status, token usage, and error information may be retained to keep the service reliable and understand operating cost.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">AI processing and generated content</h2>
            <p className="mt-2">When you use an AI-powered feature, the information required for that request can be sent to the configured AI provider. Generated resume or career content should be reviewed by you before use. CareerOS is designed to avoid unsupported claims, but you remain responsible for confirming that submitted application materials are accurate.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Retention and deletion</h2>
            <p className="mt-2">Career workspace data is retained while needed to provide the account and its saved history. You may request deletion or correction through support. Deletion requests are applied to application-controlled data; some limited records may need to be retained where required for security, billing, fraud prevention, dispute resolution, or legal obligations.</p>
            <p className="mt-2">We do not claim a fixed automatic deletion period for every operational log until that lifecycle is enforced consistently across all production providers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Security</h2>
            <p className="mt-2">Production access is authenticated and authorization is enforced at the application and database layers. We use transport security, row-level data isolation, rate limiting, input controls, monitoring, and least-privilege service credentials. No internet service can guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Your choices</h2>
            <p className="mt-2">You can choose what career information to store, correct inaccurate information, export generated documents, and request account-data deletion. Contact support for privacy or data-access requests.</p>
          </section>
        </div>
        <Link href="/contact" className="mt-8 inline-block font-medium text-blue-700 hover:underline">Contact support</Link>
      </main>
    </div>
  );
}
