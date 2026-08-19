import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

export function MarketingNav() {
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/70 bg-white/78 px-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="CareerOS home">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[11px] bg-slate-950 text-xs font-bold text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)]">
            <span className="relative z-10">C</span>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 via-violet-500/70 to-transparent" />
          </div>
          <div className="leading-none">
            <span className="block font-display text-[15px] font-bold tracking-[-0.035em] text-slate-950">CareerOS</span>
            <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Amaura Labs</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-[13px] font-semibold text-slate-500 md:flex" aria-label="Primary navigation">
          <Link href="/#product" className="transition hover:text-slate-950">Product</Link>
          <Link href="/#how-it-works" className="transition hover:text-slate-950">How it works</Link>
          <Link href="/#trust" className="transition hover:text-slate-950">Trust</Link>
          <Link href="/dashboard" className="transition hover:text-slate-950">Career hub</Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" asChild className="hidden rounded-xl sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="rounded-xl bg-slate-950 px-3.5 shadow-sm hover:bg-indigo-600">
            <Link href="/app">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Start free
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
