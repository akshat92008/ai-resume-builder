import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

export function MarketingNav() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-slate-200/70 bg-white/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="CareerOS home">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">
            <span className="relative z-10">C</span>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 to-transparent opacity-80" />
          </div>
          <div className="leading-none">
            <span className="block font-display text-[17px] font-bold tracking-[-0.03em] text-slate-950">CareerOS</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Amaura Labs</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-50/70 p-1 text-sm font-medium text-slate-600 md:flex" aria-label="Primary navigation">
          <Link href="/" className="rounded-lg px-3 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">Product</Link>
          <Link href="/app" className="rounded-lg px-3 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">Workspace</Link>
          <Link href="/dashboard" className="rounded-lg px-3 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">My career</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/app">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Open CareerOS
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
