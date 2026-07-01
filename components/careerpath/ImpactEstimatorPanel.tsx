"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, TrendingUp, BarChart3 } from "lucide-react";
import type { ImpactEstimateResult, ImpactSuggestion } from "@/lib/careerpath/types";
import { motion } from "motion/react";

interface ImpactEstimatorPanelProps {
  result: ImpactEstimateResult;
  onAccept: (suggestion: ImpactSuggestion) => void;
  onReject: (suggestionId: string) => void;
}

const confidenceStyles = {
  high: { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200", label: "High Confidence" },
  medium: { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Medium Confidence" },
  low: { bar: "bg-slate-300", text: "text-slate-500", bg: "bg-slate-50 border-slate-200", label: "Estimate Only" },
};

export function ImpactEstimatorPanel({ result, onAccept, onReject }: ImpactEstimatorPanelProps) {
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>({});

  function handleAccept(s: ImpactSuggestion) {
    setDecisions((d) => ({ ...d, [s.id]: "accepted" }));
    onAccept(s);
  }

  function handleReject(s: ImpactSuggestion) {
    setDecisions((d) => ({ ...d, [s.id]: "rejected" }));
    onReject(s.id);
  }

  const pending = result.suggestions.filter((s) => !decisions[s.id]);
  const accepted = result.suggestions.filter((s) => decisions[s.id] === "accepted");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white shadow">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Impact Estimator</p>
          <p className="text-sm text-slate-600">{result.summary}</p>
        </div>
      </div>

      {/* Progress */}
      {accepted.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{accepted.length} metric{accepted.length !== 1 ? "s" : ""} accepted and applied to your resume</span>
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-green-500" />
          <p className="font-semibold text-green-800">All suggestions reviewed!</p>
          <p className="text-sm text-green-600">Your resume now has stronger quantitative proof.</p>
        </div>
      )}

      {/* Suggestion cards */}
      <div className="space-y-4">
        {result.suggestions.map((s, index) => {
          const decision = decisions[s.id];
          const style = confidenceStyles[s.confidence];
          if (decision === "rejected") return null;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: decision === "accepted" ? 0.6 : 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl border p-4 ${decision === "accepted" ? "border-green-200 bg-green-50" : style.bg}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.section}</span>
                  <span className="text-slate-300">·</span>
                  <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                </div>
                <div className="flex gap-2">
                  {/* 4-dot confidence indicator */}
                  {[1, 2, 3, 4].map((dot) => (
                    <div
                      key={dot}
                      className={`h-2 w-2 rounded-full ${
                        (s.confidence === "high" && dot <= 4) ||
                        (s.confidence === "medium" && dot <= 2) ||
                        (s.confidence === "low" && dot <= 1)
                          ? style.bar
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Before / After */}
              <div className="mb-3 space-y-2">
                <div className="rounded-lg bg-white/70 p-2.5">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">BEFORE</p>
                  <p className="text-sm text-slate-600 line-through opacity-70">{s.bulletText}</p>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-sm">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-green-600">AFTER</p>
                  <p className="text-sm font-medium text-slate-900">{s.improvedBullet}</p>
                </div>
              </div>

              {/* Rationale */}
              <p className="mb-3 text-xs text-slate-500">💡 {s.rationale}</p>

              {/* Actions */}
              {!decision && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(s)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Accept & Apply
                  </button>
                  <button
                    onClick={() => handleReject(s)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 transition hover:border-red-200 hover:text-red-500"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Skip
                  </button>
                </div>
              )}
              {decision === "accepted" && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Applied to resume
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
