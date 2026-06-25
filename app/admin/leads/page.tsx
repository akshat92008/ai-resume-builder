import Link from "next/link";
import { Button } from "@/components/ui";
import { AdminLeadsClient } from "@/components/admin/AdminLeadsClient";
import { getAdminLeadsServer } from "@/lib/data/admin/admin-actions";
import { isSupabaseMode } from "@/lib/data/server/mode";


export default async function AdminLeadsPage() {
  const isServerDemo = !isSupabaseMode();
  const leads = isServerDemo ? [] : await getAdminLeadsServer();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Leads" />
        <AdminLeadsClient initialLeads={leads} />
      </main>
    </div>
  );
}

function AdminHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">{title}</h1>
      </div>
      <Button variant="outline" asChild><Link href="/admin">Back to admin</Link></Button>
    </div>
  );
}
