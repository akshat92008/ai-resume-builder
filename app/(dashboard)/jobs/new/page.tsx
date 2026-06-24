"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@/components/ui";
import { makeId } from "@/lib/utils";
import { getCurrentVault, saveJob } from "@/lib/repositories";
import { trackEvent } from "@/lib/events";
import type { Job, JobAnalysis } from "@/lib/types";

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    job_title: "",
    company_name: "",
    job_description: "",
    role_category: "Software",
    experience_level: "Internship / Fresher",
    style: "ATS Formal",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const vault = await getCurrentVault();
      const response = await fetch("/api/ai/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userVault: vault }),
      });
      const data = (await response.json()) as JobAnalysis & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error || "Unable to analyze job.");
      const job: Job = {
        id: makeId("job"),
        ...form,
        analysis_json: data,
        fit_score: data.fitScore,
        created_at: new Date().toISOString(),
      };
      await saveJob(job);
      await trackEvent("job_analyzed", { fit_score: job.fit_score, job_title: job.job_title });
      router.push(`/jobs/${job.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze job.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Job Description Analyzer</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-slate-950">Analyze fit before generating a resume.</h1>
        <p className="mt-2 text-slate-600">CareerProof will match the JD against your vault and warn you about unsupported claims.</p>
      </div>

      <Card>
        <CardHeader>
          <Briefcase className="h-8 w-8 text-blue-600" />
          <CardTitle>New job analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Job title</Label>
                <Input required value={form.job_title} placeholder="Frontend Engineer Intern" onChange={(event) => update("job_title", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={form.company_name} placeholder="Company name" onChange={(event) => update("company_name", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role category</Label>
                <Input value={form.role_category} onChange={(event) => update("role_category", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Experience level</Label>
                <Select value={form.experience_level} onChange={(event) => update("experience_level", event.target.value)}>
                  <option>Internship / Fresher</option>
                  <option>0-1 years</option>
                  <option>1-2 years</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resume style</Label>
              <Select value={form.style} onChange={(event) => update("style", event.target.value)}>
                <option>ATS Formal</option>
                <option>Technical Heavy</option>
                <option>Startup/Modern</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job description</Label>
              <Textarea required rows={12} value={form.job_description} placeholder="Paste the full JD here..." onChange={(event) => update("job_description", event.target.value)} />
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Analyzing..." : "Analyze job description"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
