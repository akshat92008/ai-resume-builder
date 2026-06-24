import Link from "next/link";
import { AdminTable } from "@/components/admin/AdminTable";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const funnel = [
  "landing_view",
  "proof_score_submit",
  "proof_score_submitted",
  "signup",
  "vault_completed",
  "onboarding_completed",
  "job_analyzed",
  "resume_generated",
  "portfolio_published",
  "upgrade_clicked",
  "order_created",
  "payment_approved",
];

export default async function AdminMetricsPage() {
  const supabase = await createServerSupabaseClient();
  let events: any[] = [
    { id: "demo-event-1", event_name: "landing_view", metadata: { mode: "demo" }, created_at: new Date().toISOString() },
    { id: "demo-event-2", event_name: "proof_score_submitted", metadata: { score: 42, grade: "Average" }, created_at: new Date().toISOString() },
    { id: "demo-event-3", event_name: "order_created", metadata: { plan: "pro", amount_inr: 199 }, created_at: new Date().toISOString() },
  ];
  let demoMode = true;
  
  if (supabase) {
    demoMode = false;
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(1000);
    if (data) events = data;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Metrics" />
        {demoMode && <Alert variant="warning">Demo mode: this admin panel is using local sample data.</Alert>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.map((eventName) => (
            <Card key={eventName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">{eventName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{events.filter((event) => event.event_name === eventName).length}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <AdminTable
          columns={["Event", "Metadata", "Created"]}
          rows={events.map((event) => [
            <Badge key="event" variant="secondary">{event.event_name}</Badge>,
            <pre key="metadata" className="max-w-md whitespace-pre-wrap text-xs">{JSON.stringify(event.metadata, null, 2)}</pre>,
            new Date(event.created_at).toLocaleString(),
          ])}
        />
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
