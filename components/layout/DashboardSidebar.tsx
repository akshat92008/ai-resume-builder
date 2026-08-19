"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  LayoutDashboard,
  Briefcase,
  LineChart,
  Settings,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/memory", label: "Career Memory", icon: Brain },
  { href: "/jobs", label: "Applications", icon: Briefcase },
  { href: "/analytics", label: "Insights", icon: LineChart },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print hidden w-[258px] shrink-0 p-3 pr-0 md:flex">
      <div className="relative flex w-full flex-col overflow-hidden rounded-[24px] border border-slate-800/80 bg-[#0b0e17] text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
        <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-indigo-600/20 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 bottom-20 h-52 w-52 rounded-full bg-violet-600/15 blur-[90px]" />

        <Link href="/dashboard" className="relative flex h-[70px] items-center gap-3 border-b border-white/[0.07] px-5" aria-label="CareerOS home">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.08] text-sm font-bold text-white shadow-sm">
            <span className="relative z-10">C</span>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-500/80 to-transparent" />
          </div>
          <div>
            <span className="block font-display text-[16px] font-bold tracking-[-0.035em]">CareerOS</span>
            <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500">Amaura Labs</span>
          </div>
        </Link>

        <div className="relative p-3.5 pb-2">
          <Link href="/app" className="group flex items-center gap-3 rounded-[17px] border border-indigo-400/15 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 px-3.5 py-3 text-sm font-semibold text-white shadow-inner shadow-white/[0.03] transition hover:border-indigo-400/30 hover:bg-indigo-500/25">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.28)]"><Sparkles className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">Ask CareerOS</span>
            <ChevronRight className="h-4 w-4 text-indigo-300/70 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="relative px-5 pb-2 pt-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Workspace</div>
        <nav className="career-scrollbar relative flex-1 space-y-1 overflow-y-auto px-3.5 py-2" aria-label="CareerOS navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition ${active ? "bg-white/[0.09] text-white shadow-inner shadow-white/[0.03]" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-[10px] ${active ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 group-hover:text-indigo-300"}`}><Icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-white/[0.07] p-3.5">
          <Link href="/settings" className={`group flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition ${pathname.startsWith("/settings") ? "bg-white/[0.09] text-white" : "text-slate-400 hover:bg-white/[0.045] hover:text-white"}`}>
            <Settings className="h-4 w-4 text-slate-500 group-hover:text-indigo-300" />
            Settings
          </Link>
          <div className="mt-3 rounded-[15px] border border-white/[0.06] bg-white/[0.035] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />CareerLoop active</div>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-600">Outcomes you record improve the context behind future decisions.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
