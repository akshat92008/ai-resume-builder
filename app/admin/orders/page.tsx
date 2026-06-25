import Link from "next/link";
import { Button } from "@/components/ui";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import { getAdminOrdersServer } from "@/lib/data/admin/admin-actions";
import { isSupabaseMode } from "@/lib/data/server/mode";


export default async function AdminOrdersPage() {
  const isServerDemo = !isSupabaseMode();
  // In demo mode, getAdminOrders returns a static list or empty on server. 
  // It's acceptable for the server render of a demo admin page to be empty or default.
  const orders = isServerDemo ? [] : await getAdminOrdersServer();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Orders" />
        <AdminOrdersClient initialOrders={orders} />
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
