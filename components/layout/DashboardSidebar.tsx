"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Brain, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Career Health", icon: LayoutDashboard },
  { href: "/app", label: "CareerPath AI", icon: Sparkles },
  { href: "/memory", label: "Career Memory", icon: Brain },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-slate-300 md:flex">
      <Link href="/" className="flex h-16 items-center border-b border-slate-800 px-6 text-white">
        <div className="mr-2 flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-xs font-bold">C</div>
        <span className="font-display text-lg font-bold">CareerPath AI</span>
      </Link>
      <nav className="flex-1 space-y-1 px-4 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-900 p-4">
          <p className="text-sm leading-6 text-slate-300">Chat with the AI agent to build, improve, and tailor your resume.</p>
        </div>
      </div>
    </aside>
  );
}
