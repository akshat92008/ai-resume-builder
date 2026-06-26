"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { DashboardSidebar } from "./DashboardSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="site-header flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display font-bold text-slate-950 md:hidden">
            CareerPath AI
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm font-medium">
            <Link href="/app" className="text-blue-700 hover:underline">Agent</Link>
            <Link href="/" className="text-slate-600 hover:text-slate-950">Home</Link>
            <LogoutButton />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
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
      <LogOut className="mr-1.5 h-3.5 w-3.5" />
      Logout
    </Button>
  );
}
