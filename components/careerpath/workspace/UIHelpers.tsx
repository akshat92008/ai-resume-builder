import React from "react";
import { Badge } from "@/components/ui";
import type { CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";

export function SectionShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

export function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <SectionShell title={title}>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</p>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(text)}
        className="mt-3 rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Copy
      </button>
    </SectionShell>
  );
}

export function BadgeCloud({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  const cleanItems = Array.from(new Set(items.filter(Boolean)));
  if (!cleanItems.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {cleanItems.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
    </div>
  );
}

export function List({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm leading-6 text-slate-700">
      {items.map((item) => <li key={item}>- {item}</li>)}
    </ul>
  );
}

export function MemorySummary({ workspace, expanded = false }: { workspace: CareerWorkspaceState | null; expanded?: boolean }) {
  const profile = workspace?.careerProfile;
  if (!profile) return <p className="text-sm leading-6 text-slate-500">No career memory yet. Paste messy career info to build it.</p>;
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
        <p className="mt-1 text-slate-900">{profile.target.targetRoles.join(", ") || "Not set yet"}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strongest assets</p>
        <List items={profile.strengths.map((item) => item.title).slice(0, expanded ? 8 : 3)} empty="Add projects, education, or experience to identify strengths." />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing proof</p>
        <List items={profile.gaps.map((item) => item.area.replaceAll("_", " ")).slice(0, expanded ? 8 : 4)} empty="No obvious proof gaps." />
      </div>
      {expanded && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.skills.slice(0, 18).map((skill) => <Badge key={skill.id} variant="secondary">{skill.name}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function NextActions({ workspace }: { workspace: CareerWorkspaceState | null }) {
  const profileGaps = workspace?.careerProfile?.gaps ?? [];
  const insights = workspace?.insights ?? [];
  const actions = [
    ...profileGaps.slice(0, 3).map((item) => item.question),
    ...insights.slice(0, 2).map((item) => item.suggestedAction),
  ].slice(0, 5);
  return <List items={actions} empty="Build a resume or track applications to see next actions." />;
}

export function ProofStrip({ resume }: { resume: CareerPathResume }) {
  const bullets = resume.resumeDocument?.bullets ?? [];
  if (!bullets.length) return null;
  const counts = bullets.reduce<Record<string, number>>((acc, bullet) => {
    acc[bullet.proofLevel] = (acc[bullet.proofLevel] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="no-print mb-4 rounded-lg border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {["verified", "strong", "estimated", "weak", "risky"].map((level) => (
          <Badge key={level} variant={level === "weak" || level === "risky" ? "outline" : "secondary"}>
            {level}: {counts[level] || 0}
          </Badge>
        ))}
      </div>
      {bullets.some((bullet) => bullet.riskFlags.length > 0) && (
        <p className="mt-2 text-xs text-amber-700">Needs proof: add metric, link, result, or technical detail.</p>
      )}
    </div>
  );
}
