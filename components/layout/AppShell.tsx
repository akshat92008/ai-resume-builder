import Link from "next/link";
import { DashboardSidebar } from "./DashboardSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="font-display font-bold text-slate-950 md:hidden">
            CareerProof
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/proof-score" className="hidden text-sm font-medium text-slate-600 hover:text-blue-700 sm:block">
              Free Proof Score
            </Link>
            <Link href="/portfolio/sample" className="text-sm font-medium text-blue-700 hover:underline">
              Sample Portfolio
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-white text-xs font-semibold text-slate-700">
              AS
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
