import Link from "next/link";
import { BarChart3, CreditCard, FileText, GraduationCap, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getAdminMetricsServer } from "@/lib/data/admin/admin-actions";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseMode } from "@/lib/data/server/mode";


const adminLinks = [
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/testimonials", label: "Testimonials", icon: FileText },
];

export default async function AdminPage() {
  const isServerDemo = !isSupabaseMode();
  const metricsData = isServerDemo ? { users: 0, orders: 0, leads: 0, resumes: 0, events: 0 } : await getAdminMetricsServer();

  const metrics = metricsData
    ? [
        { label: "Total users", value: metricsData.users },
        { label: "Total leads", value: metricsData.leads },
        { label: "Total orders", value: metricsData.orders },
        { label: "Total resumes", value: metricsData.resumes },
        { label: "Total events", value: metricsData.events },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin</p>
            <h1 className="font-display text-3xl font-bold text-slate-950">CareerProof admin dashboard</h1>
            <p className="mt-2 text-slate-600">Manage leads, orders, users, testimonials, and funnel metrics.</p>
          </div>
          <Badge variant={isSupabaseConfigured ? "default" : "secondary"}>{isSupabaseConfigured ? "Supabase mode" : "Demo mode"}</Badge>
        </div>

        {metricsData ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{metric.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metric.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <span className="text-slate-400">Loading...</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Admin sections</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.href} variant="outline" className="h-auto justify-start gap-3 p-4" asChild>
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
            <Button variant="outline" className="h-auto justify-start gap-3 p-4" asChild>
              <Link href="/dashboard">
                <GraduationCap className="h-4 w-4" />
                Back to app
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
