"use client";

import React from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui";
import type { CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";

export function SectionShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="career-surface rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="career-surface rounded-2xl p-4 sm:p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{value}</div>
    </div>
  );
}

export function TextBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <SectionShell title={title}>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</p>
      <button type="button" onClick={copy} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
      </button>
    </SectionShell>
  );
}

export function BadgeCloud({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  const cleanItems = Array.from(new Set(items.filter(Boolean)));
  if (!cleanItems.length) return <p className="text-sm leading-6 text-slate-400">{empty}</p>;
  return <div className="flex flex-wrap gap-2">{cleanItems.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>;
}

export function List({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm leading-6 text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2.5 text-sm leading-6 text-slate-600">
      {items.map((item) => <li key={item} className="flex items-start gap-2.5"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" /><span>{item}</span></li>)}
    </ul>
  );
}

export function MemorySummary({ workspace, expanded = false }: { workspace: CareerWorkspaceState | null; expanded?: boolean }) {
  const profile = workspace?.careerProfile;
  if (!profile) return <p className="text-sm leading-6 text-slate-400">No career memory yet. Add your resume, projects, achievements, or notes to begin.</p>;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Target</p>
        <p className="mt-1.5 font-medium text-slate-900">{profile.target.targetRoles.join(", ") || "Not set yet"}</p>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Strongest assets</p>
        <List items={profile.strengths.map((item) => item.title).slice(0, expanded ? 8 : 3)} empty="Add projects, education, or experience to identify strengths." />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Missing proof</p>
        <List items={profile.gaps.map((item) => item.area.replaceAll("_", " ")).slice(0, expanded ? 8 : 4)} empty="No obvious proof gaps." />
      </div>
      {expanded && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Skills</p><div className="flex flex-wrap gap-2">{profile.skills.slice(0, 18).map((skill) => <Badge key={skill.id} variant="secondary">{skill.name}</Badge>)}</div></div>}
    </div>
  );
}

export function NextActions({ workspace }: { workspace: CareerWorkspaceState | null }) {
  const profileGaps = workspace?.careerProfile?.gaps ?? [];
  const insights = workspace?.insights ?? [];
  const actions = [...profileGaps.slice(0, 3).map((item) => item.question), ...insights.slice(0, 2).map((item) => item.suggestedAction)].slice(0, 5);
  return <List items={actions} empty="Build your Career Memory or track applications to see the next best actions." />;
}

export function ProofStrip({ resume }: { resume: CareerPathResume }) {
  const bullets = resume.resumeDocument?.bullets ?? [];
  if (!bullets.length) return null;
  const counts = bullets.reduce<Record<string, number>>((acc, bullet) => { acc[bullet.proofLevel] = (acc[bullet.proofLevel] || 0) + 1; return acc; }, {});
  return (
    <div className="no-print mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {["verified", "strong", "estimated", "weak", "risky"].map((level) => <Badge key={level} variant={level === "weak" || level === "risky" ? "outline" : "secondary"}>{level}: {counts[level] || 0}</Badge>)}
      </div>
      {bullets.some((bullet) => bullet.riskFlags.length > 0) && <p className="mt-2.5 text-xs font-medium text-amber-700">Needs proof: add a metric, result, link, or concrete technical detail before sending.</p>}
    </div>
  );
}
