"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Briefcase, LineChart, Settings, Sparkles, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/memory", label: "My Career", icon: Brain },
  { href: "/jobs", label: "Applications", icon: Briefcase },
  { href: "/analytics", label: "Insights", icon: LineChart },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[244px] shrink-0 flex-col border-r border-slate-200/70 bg-white md:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-slate-100 px-5" aria-label="CareerOS home">
        <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-bold text-white">
          <span className="relative z-10">C</span>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 to-transparent" />
        </div>
        <div>
          <span className="block font-display text-base font-bold tracking-[-0.03em] text-slate-950">CareerOS</span>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Amaura Labs</span>
        </div>
      </Link>

      <div className="p-3 pb-1">
        <Link href="/app" className="group flex items-center gap-3 rounded-2xl bg-slate-950 px-3.5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-indigo-200"><Sparkles className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">Ask CareerOS</span>
          <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <nav className="career-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="CareerOS navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"}`} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <Link href="/settings" className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${pathname.startsWith("/settings") ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`}>
          <Settings className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
          Settings
        </Link>
        <p className="px-3 pt-3 text-[11px] leading-5 text-slate-400">CareerLoop works quietly in the background and learns from the outcomes you record.</p>
      </div>
    </aside>
  );
}
