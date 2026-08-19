"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brain, Briefcase, LayoutDashboard, LineChart, LogOut, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { DashboardSidebar } from "./DashboardSidebar";

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/memory", label: "Career", icon: Brain },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/analytics", label: "Insights", icon: LineChart },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#f5f6fa]">
      <div className="pointer-events-none fixed left-[18%] top-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-200/25 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[-160px] right-[8%] h-[440px] w-[440px] rounded-full bg-violet-200/20 blur-[140px]" />
      <DashboardSidebar />

      <main className="relative flex min-w-0 flex-1 flex-col pb-20 md:pb-3 md:pl-3 md:pr-3 md:pt-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-[24px] md:border md:border-white/80 md:bg-white/62 md:shadow-[0_18px_60px_rgba(15,23,42,0.07)] md:backdrop-blur-xl">
          <header className="site-header sticky top-0 z-30 flex h-[70px] shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/78 px-4 backdrop-blur-2xl sm:px-6 lg:px-7">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-display font-bold tracking-[-0.035em] text-slate-950 md:hidden" aria-label="CareerOS home">
              <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[11px] bg-slate-950 text-xs text-white"><span className="relative z-10">C</span><span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 to-transparent" /></div>
              CareerOS
            </Link>

            <div className="hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Career operating system</p>
              <p className="mt-1 text-[13px] font-semibold tracking-[-0.015em] text-slate-700">Your evidence, applications and outcomes in one place.</p>
            </div>

            <div className="ml-auto flex items-center gap-1.5 text-sm font-medium">
              <Button asChild size="sm" className="rounded-xl bg-slate-950 px-3.5 shadow-sm hover:bg-indigo-600">
                <Link href="/app"><Sparkles className="mr-1.5 h-3.5 w-3.5" /><span className="hidden xs:inline">Ask CareerOS</span><span className="xs:hidden">Ask</span></Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="rounded-xl md:hidden" aria-label="Settings">
                <Link href="/settings"><Settings className="h-4 w-4" /></Link>
              </Button>
              <div className="hidden md:block"><LogoutButton /></div>
            </div>
          </header>
          <div className="career-scrollbar flex-1 overflow-auto p-4 sm:p-6 lg:p-7">{children}</div>
        </div>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[20px] border border-white/80 bg-white/88 p-1.5 shadow-[0_14px_42px_rgba(15,23,42,0.13)] backdrop-blur-2xl md:hidden" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-2 text-[9px] font-bold transition ${active ? "bg-slate-950 text-white shadow-sm" : "text-slate-400"}`}>
              <Icon className={`h-4 w-4 ${active ? "text-indigo-300" : ""}`} />
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
      variant="ghost"
      size="sm"
      className="rounded-xl text-slate-500"
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
