"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Wrench } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { ProofScoreCard } from "@/components/proof/ProofScoreCard";
import { saveLead } from "@/lib/repositories";
import { trackEvent } from "@/lib/events";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { ProofScoreResult, ProofScoreSubmission } from "@/lib/types";

const emptySubmission: ProofScoreSubmission = {
  name: "",
  email: "",
  whatsapp: "",
  course: "",
  college: "",
  target_role: "",
  resume_text: "",
  github_url: "",
  linkedin_url: "",
  portfolio_url: "",
  projects_text: "",
  source: "proof-score-page",
};

export default function ProofScorePage() {
  const [form, setForm] = useState(emptySubmission);
  const [result, setResult] = useState<ProofScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof ProofScoreSubmission>(key: K, value: ProofScoreSubmission[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    await trackEvent("proof_score_started", { source: "proof-score-page" });

    try {
      const response = await fetch("/api/ai/proof-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { result?: ProofScoreResult; error?: string };
      if (!response.ok || !data.result) {
        throw new Error(data.error || "Unable to calculate proof score.");
      }
      setResult(data.result);
      if (!isSupabaseConfigured) {
        await saveLead({
          type: "proof_score",
          name: form.name,
          email: form.email,
          whatsapp: form.whatsapp,
          course: form.course,
          college: form.college,
          role: form.target_role,
          source: "proof-score-page",
          metadata: { score: data.result.total, grade: data.result.grade },
        });
      }
      await trackEvent("proof_score_submitted", { score: data.result.total, grade: data.result.grade });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to calculate proof score.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Free Resume Proof Score</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-950">Does your resume look real or AI-generated?</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Paste your resume and project details. CareerProof AI will score how much proof supports your claims and show what to fix before recruiters see it.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle>Check my resume proof score</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} required onChange={(event) => update("name", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} required onChange={(event) => update("email", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} required onChange={(event) => update("whatsapp", event.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Input value={form.course} placeholder="BCA, MCA, BTech..." onChange={(event) => update("course", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>College</Label>
                    <Input value={form.college} onChange={(event) => update("college", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target role</Label>
                    <Input value={form.target_role} required placeholder="Frontend intern" onChange={(event) => update("target_role", event.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input value={form.github_url} placeholder="https://github.com/..." onChange={(event) => update("github_url", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input value={form.linkedin_url} placeholder="https://linkedin.com/in/..." onChange={(event) => update("linkedin_url", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Portfolio URL</Label>
                    <Input value={form.portfolio_url} placeholder="https://..." onChange={(event) => update("portfolio_url", event.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resume text</Label>
                  <Textarea rows={8} required value={form.resume_text} placeholder="Paste your resume text here..." onChange={(event) => update("resume_text", event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Top 3 projects</Label>
                  <Textarea rows={4} value={form.projects_text} placeholder="One project per line. Include tech, proof links, and impact if available." onChange={(event) => update("projects_text", event.target.value)} />
                </div>

                {error && <Alert variant="error">{error}</Alert>}
                <Button type="submit" disabled={loading} size="lg" className="w-full">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {loading ? "Checking proof..." : "Check my resume proof score"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            {result ? (
              <>
                <ProofScoreCard result={result} />
                <Card>
                  <CardHeader>
                    <CardTitle>Top issues</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="font-semibold">Missing proof</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                        {result.missingProof.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold">Weak bullet examples</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                        {result.weakBullets.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold">Next actions</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                        {result.nextActions.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-3">
                  <Button asChild>
                    <Link href="/signup">Create account <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/resumes/new">Build full resume</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/pricing">Upgrade to Pro</Link>
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <Wrench className="h-8 w-8 text-blue-600" />
                  <h2 className="mt-4 text-xl font-bold text-slate-950">What you get</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                    <li>Proof Score out of 100 with grade</li>
                    <li>Breakdown across profile, projects, proof links, job match, resume clarity, and portfolio</li>
                    <li>Missing proof links and weak bullet warnings</li>
                    <li>Lead capture for manual Resume Fix Pack follow-up</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
