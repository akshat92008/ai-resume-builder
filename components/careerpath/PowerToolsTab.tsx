import { Sparkles } from "lucide-react";
import { SectionShell } from "@/components/careerpath/workspace/UIHelpers";
import { StarInterviewPanel } from "@/components/careerpath/StarInterviewPanel";
import { HumanizePanel } from "@/components/careerpath/HumanizePanel";
import { ImpactEstimatorPanel } from "@/components/careerpath/ImpactEstimatorPanel";
import { GapAnalysisPanel } from "@/components/careerpath/GapAnalysisPanel";
import { MultiPersonaPanel } from "@/components/careerpath/MultiPersonaPanel";
import { ATSViewPanel } from "@/components/careerpath/ATSViewPanel";
import { OutreachPanel } from "@/components/careerpath/OutreachPanel";
import type { CareerPathResume } from "@/lib/careerpath/types";

export function PowerToolsTab({ resume, onCommand }: { resume: CareerPathResume | null; onCommand: (command: string) => void; }) {
  if (!resume) {
    return (
      <div className="mx-auto max-w-5xl">
        <SectionShell title="CareerOS tools">
          <div className="flex min-h-44 flex-col items-center justify-center text-center"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles className="h-5 w-5" /></div><p className="mt-4 font-semibold text-slate-900">Build or import a resume first.</p><p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Interview prep, humanization, impact analysis, gap analysis, ATS review, personas, and outreach will appear here once CareerOS has evidence to work with.</p></div>
        </SectionShell>
      </div>
    );
  }

  const actions = [
    { label: "STAR interview", command: "Interview me with STAR questions to strengthen my resume" },
    { label: "Humanize resume", command: "Humanize my resume and remove AI-sounding language" },
    { label: "Estimate impact", command: "Estimate impact and add safe metrics to my resume" },
    { label: "Gap analysis", command: `Gap analysis for ${resume.targetRole || "my target role"}` },
    { label: "Generate personas", command: "Generate multiple versions of my resume for different personas" },
    { label: "ATS robot view", command: "Show ATS view for my resume" },
    { label: "Outreach pack", command: "Write outreach for my current target job" },
  ];

  const hasResults = Boolean(resume.starInterview || resume.humanizedResume || resume.impactEstimates || resume.gapAnalysis || resume.multiPersona || resume.atsView || resume.outreachPack);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SectionShell title="CareerOS tools" description="Specialized analysis when the main workflow needs a deeper pass.">
        <p className="mb-4 text-sm leading-6 text-slate-600">Every tool uses Career Memory and the current resume as its source of truth. Generated claims still need your verification before sending.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={() => onCommand(action.command)} className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-md"><span>{action.label}</span><Sparkles className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-indigo-500" /></button>
          ))}
        </div>
      </SectionShell>
      {!hasResults && <SectionShell title="No analysis yet"><p className="text-sm leading-6 text-slate-500">Choose a tool above. Results stay attached to this resume and remain available after refresh.</p></SectionShell>}
      {resume.starInterview && <StarInterviewPanel result={resume.starInterview} onAnswer={(_questionId, answer) => onCommand(`Add this project detail to my resume: ${answer}`)} />}
      {resume.humanizedResume && <HumanizePanel result={resume.humanizedResume} />}
      {resume.impactEstimates && <ImpactEstimatorPanel result={resume.impactEstimates} onAccept={(suggestion) => onCommand(`Update this resume bullet with a verified impact statement: ${suggestion.improvedBullet}`)} onReject={() => undefined} />}
      {resume.gapAnalysis && <GapAnalysisPanel result={resume.gapAnalysis} />}
      {resume.multiPersona && <MultiPersonaPanel result={resume.multiPersona} onSavePersona={(persona) => onCommand(`Update my summary section for the ${persona.persona} positioning. Emphasize: ${persona.emphasis.join(", ")}`)} />}
      {resume.atsView && <ATSViewPanel result={resume.atsView} />}
      {resume.outreachPack && <OutreachPanel pack={resume.outreachPack} />}
    </div>
  );
}
