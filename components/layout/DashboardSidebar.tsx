"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Briefcase, LineChart, Settings, GitCompareArrows, Network, Sparkles, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Career hub", icon: LayoutDashboard },
  { href: "/analyze-job", label: "Apply / Skip", icon: GitCompareArrows },
  { href: "/career-twin", label: "Career Twin", icon: Network },
  { href: "/app", label: "CareerOS agent", icon: Sparkles },
  { href: "/memory", label: "Career Memory", icon: Brain },
  { href: "/jobs", label: "Applications", icon: Briefcase },
  { href: "/analytics", label: "Conversion intelligence", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200/70 bg-white md:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-bold text-white"><span className="relative z-10">C</span><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 to-transparent" /></div>
        <div><span className="block font-display text-base font-bold tracking-[-0.03em] text-slate-950">CareerOS</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Amaura Labs</span></div>
      </Link>
      <nav className="career-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`}>
              <Icon className={`h-4 w-4 ${isActive ? "text-indigo-300" : "text-slate-400 group-hover:text-indigo-500"}`} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {isActive ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : null}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50/60 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white"><Sparkles className="h-4 w-4" /></div>
          <p className="mt-3 text-sm font-semibold text-slate-900">CareerLoop learns from outcomes.</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Track the job, resume version, and result so future recommendations have evidence behind them.</p>
        </div>
      </div>
    </aside>
  );
}
