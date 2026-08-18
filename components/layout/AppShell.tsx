"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brain, Briefcase, LayoutDashboard, LineChart, LogOut, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { DashboardSidebar } from "./DashboardSidebar";

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/memory", label: "My Career", icon: Brain },
  { href: "/jobs", label: "Applications", icon: Briefcase },
  { href: "/analytics", label: "Insights", icon: LineChart },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      <DashboardSidebar />
      <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="site-header sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold tracking-[-0.03em] text-slate-950 md:hidden" aria-label="CareerOS home">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs text-white">C</div>
            CareerOS
          </Link>
          <div className="ml-auto flex items-center gap-1.5 text-sm font-medium">
            <Button asChild variant="ghost" size="sm">
              <Link href="/app"><Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-500" /><span className="hidden xs:inline">Ask CareerOS</span><span className="xs:hidden">Ask</span></Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Settings">
              <Link href="/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
            <div className="hidden md:block"><LogoutButton /></div>
          </div>
        </header>
        <div className="career-scrollbar flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200/80 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${active ? "text-indigo-700" : "text-slate-400"}`}>
              <span className={`flex h-7 w-9 items-center justify-center rounded-xl ${active ? "bg-indigo-50" : "bg-transparent"}`}><Icon className="h-4 w-4" /></span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
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
