"use client";

import { Target, CheckCircle2, AlertCircle, Lightbulb, Code2, ArrowRight } from "lucide-react";
import type { GapAnalysisResult } from "@/lib/careerpath/types";
import { motion } from "motion/react";

interface GapAnalysisPanelProps {
  result: GapAnalysisResult;
}

const importanceConfig = {
  critical: { color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-500", label: "Critical" },
  recommended: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", label: "Recommended" },
  bonus: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500", label: "Bonus" },
};

export function GapAnalysisPanel({ result }: GapAnalysisPanelProps) {
  const scoreColor =
    result.matchScore >= 80
      ? "text-green-600"
      : result.matchScore >= 60
      ? "text-amber-600"
      : "text-red-600";

  const scoreBarColor =
    result.matchScore >= 80
      ? "bg-green-500"
      : result.matchScore >= 60
      ? "bg-amber-400"
      : "bg-red-400";

  return (
    <div className="space-y-5">
      {/* Score Header */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Role Match Score
        </p>
        <div className="mb-4 flex items-baseline gap-2">
          <span className={`text-5xl font-black ${scoreColor}`}>{result.matchScore}</span>
          <span className="text-2xl font-light text-slate-400">/100</span>
          <span className="ml-2 text-sm font-medium text-slate-300">— {result.targetRole}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
          <motion.div
            className={`h-full rounded-full ${scoreBarColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${result.matchScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {result.readyToApply ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">Ready to apply for this role</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Build more proof before applying</span>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">{result.summary}</p>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Your Strengths for This Role
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.strengths.map((strength, i) => (
              <span key={i} className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 border border-green-100">
                {strength}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Target className="h-4 w-4 text-red-500" />
            Skill Gaps to Address
          </h3>
          <div className="space-y-2">
            {result.gaps.map((gap, i) => {
              const cfg = importanceConfig[gap.importance];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-xl border p-3 ${cfg.bg}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{gap.skill}</span>
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-slate-400">{gap.category}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{gap.evidence}</p>
                      {gap.projectIdea && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/70 p-2">
                          <Code2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-violet-700">Project idea: </span>
                            {gap.projectIdea}
                          </p>
                        </div>
                      )}
                      {gap.learningResource && (
                        <p className="mt-1 text-xs text-slate-400">📚 {gap.learningResource}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekend Projects */}
      {result.weekendProjects.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Projects to Build This Weekend
          </h3>
          <div className="space-y-3">
            {result.weekendProjects.map((project, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-900">{project.title}</span>
                </div>
                <p className="mb-2 text-sm text-slate-600">{project.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.skills.map((skill, j) => (
                    <span key={j} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!result.readyToApply && (
        <div className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-100 p-4 text-sm">
          <ArrowRight className="h-4 w-4 text-violet-600 shrink-0" />
          <span className="text-violet-800">Build the projects above, add links to your GitHub, then re-run the gap analysis.</span>
        </div>
      )}
    </div>
  );
}
