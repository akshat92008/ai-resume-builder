import { BrainCircuit } from "lucide-react";
import type { ConversionCohort, ConversionIntelligence } from "@/lib/careerloop/types";

export function ConversionIntelligencePanel({ data }: { data: ConversionIntelligence }) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">CareerLoop North Star</p><p className="mt-2 text-6xl font-black">{data.northStar.interviewRate}%</p><p className="mt-1 text-sm text-slate-300">application → interview conversion</p><p className="mt-4 text-xs text-slate-400">{data.northStar.interviews} interviews from {data.northStar.applications} tracked applications · {data.northStar.offers} offers</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-start gap-3"><BrainCircuit className="mt-0.5 h-5 w-5 text-cyan-300" /><div><h2 className="font-bold">Learning status</h2><p className="mt-1 text-sm leading-6 text-slate-300">{data.learningStatus.message}</p></div></div></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">What CareerLoop is learning</h2><p className="mt-1 text-sm text-slate-500">These are experiments suggested by recorded outcomes, not claims of causation.</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {data.recommendations.map((recommendation) => <div key={recommendation.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{recommendation.title}</h3><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{recommendation.confidence} confidence</span></div><p className="mt-2 text-sm leading-5 text-slate-600">{recommendation.explanation}</p><p className="mt-3 text-sm font-semibold text-indigo-700">Next test: {recommendation.action}</p></div>)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <CohortTable title="By target role" cohorts={data.cohorts.byRole} />
        <CohortTable title="By application source" cohorts={data.cohorts.bySource} />
        <CohortTable title="By resume version" cohorts={data.cohorts.byResume} />
        <CohortTable title="By fit at application" cohorts={data.cohorts.byFit} />
      </section>
    </div>
  );
}

function CohortTable({ title, cohorts }: { title: string; cohorts: ConversionCohort[] }) {
  const visible = cohorts.filter((cohort) => cohort.applications > 0).slice(0, 6);
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-950">{title}</h3>{visible.length ? <div className="mt-3 divide-y divide-slate-100">{visible.map((cohort) => <div key={cohort.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 text-sm"><div><p className="font-medium text-slate-800">{cohort.label}</p><p className="text-xs text-slate-400">{cohort.applications} apps</p></div><div className="text-right"><p className="font-bold text-slate-900">{cohort.interviewRate}%</p><p className="text-[10px] uppercase tracking-wide text-slate-400">interview</p></div><div className="text-right"><p className="font-bold text-emerald-700">{cohort.offerRate}%</p><p className="text-[10px] uppercase tracking-wide text-slate-400">offer</p></div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Not enough attributed applications yet.</p>}</div>;
}
