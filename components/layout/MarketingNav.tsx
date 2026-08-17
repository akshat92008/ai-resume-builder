import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

export function MarketingNav() {
  return (
    <header className="site-header sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="CareerOS home">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">C</div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-950">CareerOS</span>
          <span className="hidden text-xs text-slate-400 sm:inline">by Amaura Labs</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex" aria-label="Primary navigation">
          <Link href="/app" className="hover:text-slate-950">Workspace</Link>
          <Link href="/dashboard" className="hover:text-slate-950">My work</Link>
        </nav>
        <Button size="sm" asChild>
          <Link href="/app">
            <Sparkles className="mr-2 h-4 w-4" />
            Open CareerOS
          </Link>
        </Button>
      </div>
    </header>
  );
}
