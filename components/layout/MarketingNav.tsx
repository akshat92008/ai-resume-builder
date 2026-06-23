import Link from "next/link";
import { Button } from "@/components/ui";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">C</div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-950">CareerProof AI</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/proof-score" className="hover:text-slate-950">Proof Score</Link>
          <Link href="/pricing" className="hover:text-slate-950">Pricing</Link>
          <Link href="/college-pilot" className="hover:text-slate-950">College Pilot</Link>
          <Link href="/portfolio/sample" className="hover:text-slate-950">Sample</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/proof-score">Get Free Proof Score</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
