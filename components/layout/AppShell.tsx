"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { DashboardSidebar } from "./DashboardSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      <DashboardSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="site-header sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold tracking-[-0.03em] text-slate-950 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs text-white">C</div>CareerOS
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm font-medium">
            <Button asChild variant="ghost" size="sm"><Link href="/app"><Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />Open agent</Link></Button>
            <LogoutButton />
          </div>
        </header>
        <div className="career-scrollbar flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={async () => {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseBrowserClient();
        if (supabase) await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      <LogOut className="mr-1.5 h-3.5 w-3.5" />Logout
    </Button>
  );
}
