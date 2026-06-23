import { Progress } from "@/components/ui";
import type { ProofScoreBreakdown } from "@/lib/types";

const labels: Record<keyof ProofScoreBreakdown, { label: string; max: number }> = {
  profileCompleteness: { label: "Profile", max: 20 },
  projects: { label: "Projects", max: 20 },
  proofLinks: { label: "Proof links", max: 20 },
  jobMatch: { label: "Job match", max: 15 },
  resumeClarity: { label: "Resume clarity", max: 15 },
  portfolioCompleteness: { label: "Portfolio", max: 10 },
};

export function ProofBreakdown({ breakdown }: { breakdown: ProofScoreBreakdown }) {
  return (
    <div className="space-y-3">
      {(Object.keys(labels) as (keyof ProofScoreBreakdown)[]).map((key) => {
        const item = labels[key];
        return (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
              <span>{item.label}</span>
              <span>
                {breakdown[key]}/{item.max}
              </span>
            </div>
            <Progress value={(breakdown[key] / item.max) * 100} />
          </div>
        );
      })}
    </div>
  );
}
