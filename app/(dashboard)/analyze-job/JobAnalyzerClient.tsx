"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, Loader2, Save, ShieldCheck, Sparkles, TriangleAlert, XCircle } from "lucide-react";
import type { CareerLoopJobIntelligenceReport, JobSource } from "@/lib/careerloop/types";

type AnalyzerResponse = {
  report: CareerLoopJobIntelligenceReport;
  resume: { id: string; title: string; version: number };
  careerTwin: { totalNodes: number; verifiedNodes: number; strongNodes: number; evidenceCoverage: number; skillsWithEvidence: number };
  source: JobSource;
  jobUrl?: string;
  extractedFromUrl: boolean;
};

const decisionStyle = {
  apply: { label: "APPLY", icon: CheckCircle2, wrap: "border-emerald-200 bg-emerald-50", text: "text-emerald-800" },
  consider: { label: "CONSIDER", icon: TriangleAlert, wrap: "border-amber-200 bg-amber-50", text: "text-amber-800" },
  skip: { label: "SKIP", icon: XCircle, wrap: "border-rose-200 bg-rose-50", text: "text-rose-800" },
} as const;

export function JobAnalyzerClient() {
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalyzerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/job-analyzer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobUrl: jobUrl.trim() || undefined, jobDescription: jobDescription.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Could not analyze this job.");
      setResult(data as AnalyzerResponse);
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : "Could not analyze this job.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOpportunity() {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company: result.report.job.company || "Saved Company",
          role: result.report.job.title || "Target Role",
          jobUrl: result.jobUrl,
          status: "saved",
          resumeId: result.resume.id,
          resumeVersion: result.resume.version,
          source: result.source,
          fitScore: result.report.fitPercentage,
          fitRecommendation: result.report.recommendation,
          notes: `CareerLoop ${result.report.recommendation.toUpperCase()} — ${result.report.recommendationReason}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Could not save this opportunity.");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this opportunity.");
    } finally {
      setSaving(false);
    }
  }

  const decision = result ? decisionStyle[result.report.recommendation] : null;
  const DecisionIcon = decision?.icon;

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="sticky top-0 z-10 border-b bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link href="/dashboard" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link>
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Apply / Skip</h1><p className="text-sm text-slate-500">Spend time only on jobs your Career Twin can actually prove.</p></div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="border-b border-slate-200 bg-slate-950 p-7 text-white lg:border-b-0 lg:border-r">
              <div className="mb-10 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><Sparkles className="h-5 w-5" /></div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">CareerLoop decision intelligence</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight">Stop applying to everything.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Paste a job URL or description. CareerLoop compares the requirements against evidence already stored in your Career Twin and returns an explainable Apply / Consider / Skip decision.</p>
            </div>
            <div className="space-y-4 p-6">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Job URL</span><input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://company.com/careers/job" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /><span className="mt-1 block text-xs text-slate-400">Some authenticated job boards block server extraction; paste the JD below if that happens.</span></label>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or paste the description<span className="h-px flex-1 bg-slate-200" /></div>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Job description</span><textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={9} placeholder="Paste the role, requirements, responsibilities, seniority and tools..." className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
              <button onClick={analyze} disabled={loading || (!jobUrl.trim() && jobDescription.trim().length < 120)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze opportunity</button>
            </div>
          </div>
        </section>

        {result && decision && DecisionIcon && (
          <>
            <section className={`rounded-2xl border p-6 ${decision.wrap}`}>
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4"><div className="rounded-2xl bg-white/80 p-3 shadow-sm"><DecisionIcon className={`h-7 w-7 ${decision.text}`} /></div><div><p className={`text-xs font-bold uppercase tracking-[0.24em] ${decision.text}`}>CareerLoop recommendation</p><h2 className={`mt-1 text-4xl font-black tracking-tight ${decision.text}`}>{decision.label}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{result.report.recommendationReason}</p></div></div>
                <div className="min-w-36 rounded-2xl bg-white/80 p-4 text-center shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence-backed fit</p><p className="mt-1 text-4xl font-black text-slate-950">{result.report.fitPercentage}%</p><p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />~{result.report.estimatedEffortMinutes} min effort</p></div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(result.report.fitBreakdown).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{key}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${value}%` }} /></div></div>)}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-950">Requirement → Evidence map</h3><p className="text-sm text-slate-500">CareerLoop only counts evidence found in your Career Twin.</p></div><ShieldCheck className="h-6 w-6 text-indigo-500" /></div>
                <div className="divide-y divide-slate-100">
                  {result.report.requirementEvidence.map((item) => (
                    <div key={item.requirement} className="grid gap-2 py-4 md:grid-cols-[0.8fr_0.45fr_1.75fr] md:items-start">
                      <div><p className="font-semibold text-slate-900">{item.requirement}</p><p className="text-xs uppercase tracking-wide text-slate-400">{item.importance}</p></div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "verified" ? "bg-emerald-100 text-emerald-700" : item.status === "supported" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>{item.status}</span>
                      <div className="text-sm text-slate-600">{item.evidence.length ? item.evidence.join(" · ") : "No evidence found in Career Twin."}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-bold text-slate-950">Career Twin quality</h3><p className="mt-4 text-4xl font-black text-slate-950">{result.careerTwin.evidenceCoverage}%</p><p className="text-sm text-slate-500">evidence coverage</p><div className="mt-4 space-y-2 text-sm text-slate-600"><div className="flex justify-between"><span>Evidence nodes</span><strong>{result.careerTwin.totalNodes}</strong></div><div className="flex justify-between"><span>Strong/verified</span><strong>{result.careerTwin.strongNodes}</strong></div><div className="flex justify-between"><span>Skills with evidence</span><strong>{result.careerTwin.skillsWithEvidence}</strong></div></div></div>
                {result.report.riskFlags.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h3 className="font-bold text-amber-900">Before you apply</h3><ul className="mt-3 space-y-2 text-sm leading-5 text-amber-800">{result.report.riskFlags.map((flag) => <li key={flag}>• {flag}</li>)}</ul></div>}
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white md:flex-row md:items-center md:justify-between">
              <div><h3 className="text-lg font-bold">Turn this decision into outcome data.</h3><p className="mt-1 text-sm text-slate-300">Save the opportunity with fit score, source and resume version so CareerLoop can learn what gets you interviews.</p></div>
              <div className="flex gap-3">{result.jobUrl && <a href={result.jobUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Open job <ExternalLink className="h-4 w-4" /></a>}<button onClick={saveOpportunity} disabled={saving || saved} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saved ? "Saved" : "Save opportunity"}</button></div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
