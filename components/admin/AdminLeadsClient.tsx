"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";
import { updateAdminLeadStatus } from "@/lib/data/admin-client";
import type { Lead } from "@/lib/types";

const statuses: NonNullable<Lead["status"]>[] = ["new", "contacted", "interested", "closed", "lost"];

export function AdminLeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

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

  return (
    <>
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
        columns={["Source", "Name", "Contact", "College", "Status", "Actions"]}
        rows={filtered.map((lead) => [
          <Badge key="type" variant="outline">{lead.type}</Badge>,
          lead.name,
          <div key="contact" className="text-sm">
            <div>{lead.email}</div>
            <div className="text-slate-500">{lead.phone || lead.whatsapp}</div>
          </div>,
          lead.college || "-",
          <Select key="status" value={lead.status || "new"} onChange={(event) => updateStatus(lead, event.target.value as any)} className="w-32">
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </Select>,
          <div key="actions">
            {lead.whatsapp && (
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`Hi ${lead.name}, thanks for checking CareerProof AI.`)}>
                Copy WA message
              </Button>
            )}
          </div>,
        ])}
      />
    </>
  );
}
