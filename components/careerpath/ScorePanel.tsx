import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import type { CareerPathResumeAudit, CareerPathResumeScore } from "@/lib/careerpath/types";

export function ScorePanel({ score, audit }: { score?: CareerPathResumeScore; audit?: CareerPathResumeAudit }) {
  const currentScore = score ?? audit?.score;
  if (!currentScore) return null;
  const topFixes = audit?.recommendedFixes?.slice(0, 3) ?? [];
  const sectionScores = [
    ["ATS", currentScore.atsCompatibility],
    ["Role Match", currentScore.roleAlignment],
    ["Clarity", currentScore.clarity],
    ["Proof", currentScore.proofAndMetrics],
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Resume Score</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Practical guidance, not a hiring guarantee.</p>
          </div>
          <Badge className="bg-slate-950 text-white">{currentScore.overall}/100</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={currentScore.overall} />
        <div className="grid grid-cols-2 gap-3">
          {sectionScores.map(([label, value]) => (
            <div key={label as string} className="rounded-md border bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
            </div>
          ))}
        </div>
        {topFixes.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Top fixes
            </div>
            <ol className="space-y-1 text-sm text-slate-700">
              {topFixes.map((fix, index) => (
                <li key={fix}>{index + 1}. {fix}</li>
              ))}
            </ol>
          </div>
        )}
        {audit?.issues?.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            No major resume risks found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
