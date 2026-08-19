import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSupabaseUser } from "@/lib/careerpath/db";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSupabaseUser();
  if (!user) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
