import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { PremiumLanding } from "@/components/marketing/PremiumLanding";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <MarketingNav />
      <PremiumLanding />
      <footer className="border-t border-slate-200/70 bg-[#fbfbfd] px-4 py-10 text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display font-bold tracking-[-0.03em] text-slate-950">CareerOS</div>
            <div className="mt-1 text-[11px] font-medium text-slate-400">An Amaura Labs product.</div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold">
            <Link href="/app" className="transition hover:text-slate-950">Workspace</Link>
            <Link href="/dashboard" className="transition hover:text-slate-950">Career hub</Link>
            <Link href="/privacy" className="transition hover:text-slate-950">Privacy</Link>
            <Link href="/terms" className="transition hover:text-slate-950">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
