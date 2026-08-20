import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { UltraPremiumLanding } from "@/components/marketing/UltraPremiumLanding";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <MarketingNav />
      <UltraPremiumLanding />
      <footer className="border-t border-white/[0.07] bg-[#05060a] px-4 py-10 text-sm text-white/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display font-bold tracking-[-0.03em] text-white">CareerOS</div>
            <div className="mt-1 text-[11px] font-medium text-white/25">An Amaura Labs product.</div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold">
            <Link href="/signup" className="transition hover:text-white">Start free</Link>
            <Link href="/login" className="transition hover:text-white">Sign in</Link>
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
