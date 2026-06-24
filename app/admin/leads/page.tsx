"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Download, Loader2 } from "lucide-react";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";
import { getAdminLeads, updateAdminLeadStatus } from "@/lib/data/admin-repository";
import type { Lead } from "@/lib/types";

const statuses: NonNullable<Lead["status"]>[] = ["new", "contacted", "interested", "closed", "lost"];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    setLeads(await getAdminLeads());
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  const filtered = useMemo(
    () =>
      leads.filter((lead) => (type === "all" || lead.type === type) && (status === "all" || lead.status === status)),
    [leads, type, status],
  );

  async function updateStatus(lead: Lead, nextStatus: NonNullable<Lead["status"]>) {
    if (!lead.id) return;
    const updated = await updateAdminLeadStatus(lead.id, nextStatus);
    if (updated) {
      setLeads(leads.map((item) => (item.id === lead.id ? updated : item)));
    }
  }

  async function copyWhatsApp(lead: Lead) {
    const text = `Hi ${lead.name}, thanks for checking CareerProof AI. Your next step is to add proof links to your strongest projects and generate a proof-backed resume.`;
    await navigator.clipboard.writeText(text);
  }

  function exportCsv() {
    const csv = [
      ["type", "name", "email", "phone", "college", "status", "created_at"].join(","),
      ...filtered.map((lead) => [lead.type, lead.name, lead.email, lead.phone || lead.whatsapp || "", lead.college || "", lead.status || "new", lead.created_at || ""].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "careerproof-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminHeader title="Leads" />
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={type} onChange={(event) => setType(event.target.value)} className="w-56">
              <option value="all">All types</option>
              <option value="proof_score">Proof score</option>
              <option value="manual_pack">Manual pack</option>
              <option value="college_pilot">College pilot</option>
              <option value="pricing_interest">Pricing interest</option>
              <option value="contact">Contact</option>
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-56">
              <option value="all">All statuses</option>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        <AdminTable
          columns={["Type", "Lead", "College / role", "Status", "Actions"]}
          rows={filtered.map((lead) => [
            <Badge key="type" variant="secondary">{lead.type}</Badge>,
            <div key="lead">
              <div className="font-semibold">{lead.name}</div>
              <div className="text-slate-500">{lead.email}</div>
              <div className="text-slate-500">{lead.phone || lead.whatsapp}</div>
            </div>,
            <div key="college">
              <div>{lead.college || lead.company || "-"}</div>
              <div className="text-slate-500">{lead.role || lead.course || "-"}</div>
            </div>,
            <Select key="status" value={lead.status || "new"} onChange={(event) => updateStatus(lead, event.target.value as NonNullable<Lead["status"]>)}>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </Select>,
            <Button key="copy" size="sm" variant="outline" onClick={() => copyWhatsApp(lead)}>
              <Copy className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>,
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
