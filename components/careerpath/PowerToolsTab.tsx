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
        <SectionShell title="CareerOS Power Tools">
          <p className="text-sm text-slate-500">Build or import a resume first. Advanced interview, humanizer, impact, gap, ATS, persona, and outreach tools will appear here.</p>
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
      <SectionShell title="CareerOS Power Tools">
        <p className="mb-4 text-sm leading-6 text-slate-600">Advanced tools use Career Memory and the current resume as the source of truth. Verify generated claims before sending an application.</p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={() => onCommand(action.command)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{action.label}</button>
          ))}
        </div>
      </SectionShell>
      {!hasResults && <SectionShell title="No advanced analysis yet"><p className="text-sm text-slate-500">Run any Power Tool above. Results are saved on this resume and survive refreshes.</p></SectionShell>}
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
