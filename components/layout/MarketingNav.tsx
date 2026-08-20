import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

export function MarketingNav() {
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/[0.11] bg-[#090b12]/72 px-3.5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="CareerOS home">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[11px] border border-white/10 bg-white/[0.07] text-white shadow-[0_10px_30px_rgba(99,102,241,0.18)]">
            <Sparkles className="relative z-10 h-3.5 w-3.5" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 via-violet-500/70 to-transparent" />
          </div>
          <div className="leading-none">
            <span className="block font-display text-[15px] font-bold tracking-[-0.035em] text-white">CareerOS</span>
            <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">Amaura Labs</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-[12px] font-semibold text-white/38 md:flex" aria-label="Primary navigation">
          <Link href="/#product" className="transition hover:text-white">Product</Link>
          <Link href="/#how-it-works" className="transition hover:text-white">How it works</Link>
          <Link href="/#trust" className="transition hover:text-white">Trust</Link>
          <Link href="/#film" className="transition hover:text-white">Product film</Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link href="/login" className="hidden h-9 items-center rounded-xl px-3.5 text-xs font-semibold text-white/48 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">Sign in</Link>
          <Link href="/signup" className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3.5 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,.08)] transition hover:-translate-y-px hover:bg-indigo-100">
            Start free
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-60" />
          </Link>
        </div>
      </div>
    </header>
  );
}
