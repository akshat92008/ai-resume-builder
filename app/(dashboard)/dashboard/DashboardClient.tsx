"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2, TrendingUp, Brain, Target, ShieldAlert, CheckCircle2, ArrowUpRight, Sparkles, BriefcaseBusiness } from "lucide-react";
import { Badge, Button, EmptyState, Progress } from "@/components/ui";
import type { CareerWorkspaceState } from "@/lib/careerpath/types";
import { useRouter } from "next/navigation";

export function DashboardClient({ initialResumes, initialWorkspace }: { initialResumes: any[]; initialWorkspace: CareerWorkspaceState | null; }) {
  const [resumes, setResumes] = useState<any[]>(initialResumes);
  const router = useRouter();
  const workspace = initialWorkspace;
  const health = workspace?.careerHealth;
  const profile = workspace?.careerProfile;
  const applications = workspace?.applications ?? [];

  async function removeResume(id: string) {
    try { await fetch(`/api/resume/${id}`, { method: "DELETE" }); } catch { /* optimistic UI */ }
    setResumes((current) => current.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <DashboardHeader />

      {!workspace ? (
        <EmptyState
          icon={<Brain className="h-6 w-6" />}
          title="Build your Career Memory"
          description="Give CareerOS your existing resume, projects, achievements, or messy notes. It will turn them into the evidence layer used across your job search."
          action={<Button asChild><Link href="/app">Open CareerOS <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Career health" value={`${health?.overall ?? 0}`} suffix="/100" icon={TrendingUp} progress={health?.overall ?? 0} />
            <MetricCard title="Memory completeness" value={`${health?.memoryCompleteness ?? 0}`} suffix="%" icon={Brain} progress={health?.memoryCompleteness ?? 0} />
            <MetricCard title="Resume readiness" value={`${health?.resumeScore ?? 0}`} suffix="/100" icon={CheckCircle2} progress={health?.resumeScore ?? 0} />
            <MetricCard title="Applications tracked" value={health?.applicationCount ?? 0} icon={Target} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <section className="career-surface rounded-3xl p-6 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Career Memory</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Your evidence base</h2><p className="mt-1 text-sm text-slate-500">The information CareerOS can safely use when making recommendations or writing applications.</p></div>
                  <Button variant="outline" size="sm" asChild><Link href="/memory">View memory <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[['Experience', profile?.experience?.length ?? 0],['Skills',profile?.skills?.length ?? 0],['Projects',profile?.projects?.length ?? 0],['Achievements',profile?.achievements?.length ?? 0]].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p></div>)}
                </div>
              </section>

              <section className="career-surface rounded-3xl p-6 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Reusable proof</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Recent achievements</h2></div><Button variant="ghost" size="sm" asChild><Link href="/app">Log new</Link></Button></div>
                {profile?.achievements?.length ? (
                  <div className="space-y-3">{profile.achievements.slice(0, 4).map((ach, i) => <div key={i} className="flex gap-3 rounded-2xl border border-slate-200/70 bg-white p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><span className="pt-1 text-sm leading-6 text-slate-600">{ach.text}</span></div>)}</div>
                ) : <p className="text-sm text-slate-400">No achievements logged yet. Add outcomes and proof so CareerOS has stronger material to work with.</p>}
              </section>

              <section className="career-surface rounded-3xl p-6 sm:p-7">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Resume library</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Saved versions</h2></div><Badge variant="outline">{resumes.length} versions</Badge></div>
                {resumes.length === 0 ? <p className="text-sm text-slate-400">No resumes saved yet.</p> : (
                  <div className="grid gap-3">{resumes.map((resume) => <div key={resume.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm"><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{resume.title}</p><p className="mt-1 text-xs text-slate-500">{resume.targetRole || "General"} · Score {resume.score?.overall ?? 0}/100 · v{resume.version ?? 1}</p></div><div className="flex shrink-0 gap-1"><Button asChild variant="outline" size="sm"><Link href={`/resume/${resume.id}`}>Open</Link></Button><Button variant="ghost" size="sm" aria-label={`Delete ${resume.title}`} onClick={() => removeResume(resume.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="h-4 w-4 text-indigo-300" /></div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">Next move</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Use a real opportunity.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Paste a job you are considering. CareerOS will compare it against your evidence before you spend time applying.</p>
                <Button asChild className="mt-5 bg-white text-slate-950 shadow-none hover:bg-indigo-50 hover:text-indigo-700"><Link href="/analyze-job">Analyze a job <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
              </section>

              <section className="career-surface rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" /><h2 className="font-semibold text-slate-950">Evidence gaps</h2></div>
                {profile?.gaps?.length ? <div className="space-y-3">{profile.gaps.slice(0, 4).map((gap, i) => <div key={i} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{gap.area.replaceAll("_", " ")}</p><p className="mt-1.5 text-sm leading-5 text-amber-900/80">{gap.question}</p></div>)}</div> : <p className="text-sm text-slate-400">No critical evidence gaps identified.</p>}
              </section>

              <section className="career-surface rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-indigo-500" /><h2 className="font-semibold text-slate-950">Application pulse</h2></div>
                <div className="space-y-3">{[['Interviewing','interview'],['Follow-up needed','follow_up_needed'],['Applied','applied']].map(([label,status]) => <div key={status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 text-sm"><span className="text-slate-600">{label}</span><Badge variant="secondary">{applications.filter(a => a.status === status).length}</Badge></div>)}</div>
                <Button variant="ghost" size="sm" asChild className="mt-3 w-full"><Link href="/jobs">View applications <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">Career operating system</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950">Your career hub</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">See what CareerOS knows, what is missing, what you are testing, and what is actually converting.</p></div>
      <Button asChild><Link href="/app"><Sparkles className="mr-2 h-4 w-4" />Open CareerOS</Link></Button>
    </div>
  );
}

function MetricCard({ title, value, suffix, icon: Icon, progress }: { title: string; value: string | number; suffix?: string; icon: any; progress?: number; }) {
  return (
    <div className="career-surface rounded-3xl p-5">
      <div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50"><Icon className="h-4 w-4 text-indigo-600" /></div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Live</span></div>
      <p className="mt-5 text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}<span className="ml-1 text-sm font-medium text-slate-400">{suffix}</span></p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-4" /> : null}
    </div>
  );
}
