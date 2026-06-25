"use client";

import { Mail } from "lucide-react";
import { MarketingNav } from "@/components/layout/MarketingNav";

export default function ContactPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@amauralabs.com";

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto flex max-w-3xl flex-col px-4 py-12 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Contact</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-950">Talk to Amaura Labs about CareerPath AI.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Use this for support, feedback, or any questions about the resume building workflows.
          </p>
          <div className="mt-6 flex items-center gap-3 text-slate-700">
            <Mail className="h-5 w-5 text-blue-700" />
            <a href={`mailto:${supportEmail}`} className="font-medium hover:underline">{supportEmail}</a>
          </div>
        </div>
      </main>
    </div>
  );
}
