"use client";

import { useMemo, useState } from "react";
import { Plus, Calendar, Building2, MapPin, ExternalLink, ArrowUpRight, Sparkles } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { AddJobModal } from "@/components/careerpath/AddJobModal";
import type { JobApplication } from "@/lib/careerpath/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS = [
  { id: "all", title: "All" },
  { id: "saved", title: "Saved" },
  { id: "applied", title: "Applied" },
  { id: "interview", title: "Interview" },
  { id: "offer", title: "Offer" },
  { id: "rejected", title: "Rejected" },
] as const;

export function JobsClient({ initialJobs }: { initialJobs: JobApplication[] }) {
  const [jobs] = useState<JobApplication[]>(initialJobs);
  const [filter, setFilter] = useState<(typeof STATUS)[number]["id"]>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const router = useRouter();

  const visibleJobs = useMemo(() => filter === "all" ? jobs : jobs.filter((job) => job.status === filter), [jobs, filter]);
  const counts = useMemo(() => Object.fromEntries(STATUS.map((item) => [item.id, item.id === "all" ? jobs.length : jobs.filter((job) => job.status === item.id).length])), [jobs]);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Your pipeline</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">Applications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Keep every opportunity, next step, and outcome in one place. CareerLoop uses the outcomes to improve future recommendations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/analyze-job"><Sparkles className="mr-2 h-4 w-4 text-indigo-500" />Analyze a job</Link></Button>
          <Button onClick={() => setIsAddModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Add application</Button>
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Application status">
        {STATUS.map((item) => {
          const active = filter === item.id;
          return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setFilter(item.id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${active ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-slate-950"}`}>{item.title}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[item.id] ?? 0}</span></button>;
        })}
      </div>

      {visibleJobs.length === 0 ? (
        <EmptyState icon={<BriefcaseIcon />} title={jobs.length ? `No ${filter} applications` : "Your pipeline is empty"} description={jobs.length ? "Choose another status or add a new opportunity." : "Add an opportunity manually or let CareerOS analyze a job before you spend time applying."} action={<Button onClick={() => setIsAddModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Add your first application</Button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleJobs.map((job) => <ApplicationCard key={job.id} job={job} />)}
        </div>
      )}

      <AddJobModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdded={() => { setIsAddModalOpen(false); router.refresh(); }} />
    </div>
  );
}

function ApplicationCard({ job }: { job: JobApplication }) {
  return (
    <article className="group career-surface rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">{job.company?.slice(0, 1).toUpperCase() || "J"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="truncate font-semibold tracking-[-0.02em] text-slate-950">{job.role}</h2><p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500"><Building2 className="h-3.5 w-3.5 shrink-0" />{job.company}</p></div>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">{job.status}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}{job.workType ? ` · ${job.workType}` : ""}</span>}
            {job.appliedAt && <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Applied {new Date(job.appliedAt).toLocaleDateString()}</span>}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">{job.stage && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{job.stage}</span>}{job.fitScore != null && <span className="text-xs font-semibold text-slate-500">{job.fitScore}% fit</span>}</div>
            <div className="flex items-center gap-1">{job.jobUrl && <a href={job.jobUrl} target="_blank" rel="noreferrer" aria-label="Open original job" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-indigo-600"><ExternalLink className="h-4 w-4" /></a>}<Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">Details <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          </div>
        </div>
      </div>
    </article>
  );
}

function BriefcaseIcon() { return <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Building2 className="h-5 w-5" /></div>; }
