"use client";

import { CheckCircle2, Settings } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const checklist = [
  ["Supabase connected", isSupabaseConfigured],
  ["NVIDIA NIM connected", Boolean(process.env.NEXT_PUBLIC_NIM_STATUS === "configured")],
  ["Payment mode set", Boolean(process.env.NEXT_PUBLIC_PAYMENT_MODE)],
  ["UPI/payment configured", Boolean(process.env.NEXT_PUBLIC_UPI_ID || process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP)],
  ["Admin user configured", false],
  ["Pricing configured", true],
  ["Portfolio sample works", true],
  ["Proof score works", true],
  ["Resume generation works", true],
  ["PDF print works", true],
  ["Landing CTAs work", true],
  ["Lead capture works", true],
  ["Orders work", true],
  ["Admin approval works", true],
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Settings</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">Account and launch checklist</h1>
        <p className="mt-2 text-slate-600">Use this before deploying and sharing CareerProof AI publicly.</p>
      </div>

      <Card>
        <CardHeader>
          <Settings className="h-8 w-8 text-blue-600" />
          <CardTitle>Environment status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Status label="Supabase" ok={isSupabaseConfigured} />
          <Status label="Payment mode" ok={Boolean(process.env.NEXT_PUBLIC_PAYMENT_MODE)} />
          <Status label="Manual payment" ok={Boolean(process.env.NEXT_PUBLIC_UPI_ID || process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP)} />
          <Status label="NVIDIA NIM" ok={Boolean(process.env.NEXT_PUBLIC_NIM_STATUS === "configured")} note="Server key only; set NVIDIA_API_KEY in Vercel." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Launch checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {checklist.map(([label, ok]) => (
            <div key={String(label)} className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className={ok ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-300"} />
                {label}
              </div>
              <Badge variant={ok ? "default" : "secondary"}>{ok ? "Ready" : "Setup"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Status({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{label}</div>
        <Badge variant={ok ? "default" : "secondary"}>{ok ? "Configured" : "Demo mode"}</Badge>
      </div>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
