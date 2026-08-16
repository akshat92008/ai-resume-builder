import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileCheck2, Fingerprint, Link2, Network, ShieldCheck } from "lucide-react";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { getLatestResumeForUser } from "@/lib/careerpath/db";
import { buildCareerEvidenceGraph } from "@/lib/careerloop";

const proofStyle = {
  verified: "bg-emerald-100 text-emerald-700",
  strong: "bg-blue-100 text-blue-700",
  estimated: "bg-amber-100 text-amber-700",
  weak: "bg-slate-100 text-slate-600",
  risky: "bg-rose-100 text-rose-700",
} as const;

export default async function CareerTwinPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) redirect("/login");
  const resume = await getLatestResumeForUser(auth.user.id);
  const profile = resume ? buildCareerWorkspaceState(resume).careerProfile : null;

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Network className="mx-auto h-10 w-10 text-indigo-500" />
          <h1 className="mt-4 text-2xl font-bold">Build Career Memory first</h1>
          <p className="mt-2 text-slate-500">Your Career Twin is generated from projects, experience, skills, achievements, credentials and evidence already stored in CareerOS.</p>
          <Link href="/app" className="mt-5 inline-block rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Open CareerOS</Link>
        </div>
      </div>
    );
  }

  const graph = buildCareerEvidenceGraph(profile);
  const topSkills = Object.entries(graph.skillEvidence).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  const visibleNodes = graph.nodes.filter((node) => node.type !== "skill").slice(0, 18);

  return (
    <div className="min-h-full bg-slate-50/60">
      <header className="border-b bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link href="/dashboard" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link>
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Evidence + provenance</p><h1 className="text-2xl font-bold tracking-tight text-slate-950">Career Twin</h1></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Fingerprint className="h-6 w-6" /></div>
              <h2 className="max-w-3xl text-4xl font-black tracking-tight">Every claim should have somewhere real to point.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Career Twin turns your career history into a reusable evidence graph. Resume tailoring can select the right evidence, but it should never create experience that is not here.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Evidence coverage</p><p className="mt-2 text-6xl font-black">{graph.stats.evidenceCoverage}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-300" style={{ width: `${graph.stats.evidenceCoverage}%` }} /></div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Network} label="Evidence nodes" value={graph.stats.totalNodes} />
          <Metric icon={ShieldCheck} label="Verified nodes" value={graph.stats.verifiedNodes} />
          <Metric icon={FileCheck2} label="Strong or verified" value={graph.stats.strongNodes} />
          <Metric icon={CheckCircle2} label="Skills with evidence" value={graph.stats.skillsWithEvidence} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">Skill evidence index</h3><p className="mt-1 text-sm text-slate-500">Where CareerLoop can point when a job asks for a skill.</p>
            <div className="mt-5 space-y-3">
              {topSkills.length ? topSkills.map(([skill, evidence]) => (
                <div key={skill} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold capitalize text-slate-900">{skill}</span><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{evidence.length} source{evidence.length === 1 ? "" : "s"}</span></div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{evidence.join(" · ")}</p>
                </div>
              )) : <p className="text-sm text-slate-500">Add GitHub links, metrics, credentials or project proof to strengthen the graph.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">Evidence ledger</h3><p className="mt-1 text-sm text-slate-500">The career assets CareerLoop is allowed to use.</p></div><Link2 className="h-5 w-5 text-indigo-500" /></div>
            <div className="mt-5 divide-y divide-slate-100">
              {visibleNodes.map((node) => (
                <div key={node.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{node.label}</p><p className="text-xs uppercase tracking-wide text-slate-400">{node.type}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${proofStyle[node.proofLevel]}`}>{node.proofLevel}</span></div>
                  {node.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{node.skills.slice(0, 8).map((skill) => <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{skill}</span>)}</div>}
                  {(node.evidence.length > 0 || node.urls.length > 0) && <p className="mt-2 text-xs leading-5 text-slate-500">Proof: {[...node.evidence, ...node.urls].slice(0, 4).join(" · ")}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Network; label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-sm font-medium">{label}</span></div><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>;
}
