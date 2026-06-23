"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { saveLead } from "@/lib/leads";
import { trackEvent } from "@/lib/events";

const initial = {
  name: "",
  email: "",
  phone: "",
  college: "",
  role: "",
  students: "",
  goal: "",
  message: "",
};

export default function CollegePilotPage() {
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const whatsapp = process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP || "";

  function update(key: keyof typeof initial, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await saveLead({
        type: "college_pilot",
        name: form.name,
        email: form.email,
        phone: form.phone,
        whatsapp: form.phone,
        college: form.college,
        role: form.role,
        message: [form.goal, form.message].filter(Boolean).join("\n\n"),
        source: "college-pilot-page",
        metadata: { students: form.students },
      });
      await trackEvent("college_pilot_lead_submitted", { college: form.college, students: form.students });
      setSubmitted(true);
    } catch {
      setError("Unable to save this lead. Please check required fields and try again.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_430px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">College Pilot</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-950">
              Placement readiness dashboard for colleges and bootcamps.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              CareerProof AI helps students create proof-backed resumes, portfolios, and job-specific applications while giving placement teams a clear readiness report.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Problem", "Generic AI resumes make students sound similar and unverifiable."],
                ["What students get", "Proof Score, Career Vault, JD analysis, resume, portfolio, and proof gap actions."],
                ["What placement cells get", "Batch readiness view, proof gaps, candidate links, and workshop-ready reports."],
                ["Free pilot offer", "Start with a small batch audit and convert to a paid placement-readiness workshop."],
              ].map(([title, text]) => (
                <Card key={title}>
                  <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-600">{text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Pilot pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-3">
                {["Starter audit: ₹10k+", "Workshop + dashboard: ₹25k+", "Placement pilot: ₹50k+"].map((item) => (
                  <div key={item} className="rounded-md bg-slate-50 p-3 font-medium">{item}</div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 text-blue-600" />
              <CardTitle>Request a pilot</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="space-y-5">
                  <Alert variant="success">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    Thank you. Your college pilot request has been saved.
                  </Alert>
                  <p className="text-sm leading-6 text-slate-600">We will follow up with a placement readiness pilot plan and sample student audit format.</p>
                  {whatsapp ? (
                    <Button asChild className="w-full">
                      <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}>Continue on WhatsApp</a>
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/pricing">View manual packs</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input required value={form.name} onChange={(event) => update("name", event.target.value)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone/WhatsApp</Label>
                      <Input required value={form.phone} onChange={(event) => update("phone", event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>College/institute</Label>
                    <Input required value={form.college} onChange={(event) => update("college", event.target.value)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={form.role} placeholder="Placement officer" onChange={(event) => update("role", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of students</Label>
                      <Input value={form.students} placeholder="120" onChange={(event) => update("students", event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Goal</Label>
                    <Input value={form.goal} placeholder="Improve placement readiness before drive" onChange={(event) => update("goal", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea rows={4} value={form.message} onChange={(event) => update("message", event.target.value)} />
                  </div>
                  {error && <Alert variant="error">{error}</Alert>}
                  <Button type="submit" className="w-full">Request College Pilot</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
