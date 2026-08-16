"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Brain, LayoutDashboard, Briefcase, FileText, LineChart, Settings, GitCompareArrows, Network } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Career Health", icon: LayoutDashboard },
  { href: "/analyze-job", label: "Apply / Skip", icon: GitCompareArrows },
  { href: "/career-twin", label: "Career Twin", icon: Network },
  { href: "/app", label: "CareerPath AI", icon: Sparkles },
  { href: "/memory", label: "Career Memory", icon: Brain },
  { href: "/jobs", label: "Job Tracker", icon: Briefcase },
  { href: "/cover-letter", label: "Cover Letters", icon: FileText },
  { href: "/analytics", label: "Conversion Intelligence", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-slate-300 md:flex">
      <Link href="/dashboard" className="flex h-16 items-center border-b border-slate-800 px-6 text-white">
        <div className="mr-2 flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-xs font-bold">C</div>
        <div><span className="block font-display text-lg font-bold leading-none">CareerOS</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">CareerLoop</span></div>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-900 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-900 p-4">
          <p className="text-sm leading-6 text-slate-300">Use evidence, outcomes, and learning to turn fewer applications into more interviews.</p>
        </div>
      </div>
    </aside>
  );
}
