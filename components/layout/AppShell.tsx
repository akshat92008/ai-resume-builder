import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
const isDemoMode = () => !Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export function AppShell({ children }: { children: ReactNode }) {
  const demoMode = isDemoMode();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {demoMode && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
            Demo mode: saved CareerPath resumes are stored in this browser.
          </div>
        )}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display font-bold text-slate-950 md:hidden">
            CareerPath AI
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm font-medium">
            <Link href="/builder" className="text-blue-700 hover:underline">Builder</Link>
            <Link href="/" className="text-slate-600 hover:text-slate-950">Home</Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
