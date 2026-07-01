"use client";

import { Monitor, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ATSParseResult } from "@/lib/careerpath/types";
import { motion } from "motion/react";

interface ATSViewPanelProps {
  result: ATSParseResult;
}

const severityConfig = {
  high: { icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-200", label: "High" },
  medium: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 border-amber-200", label: "Medium" },
  low: { icon: AlertTriangle, color: "text-slate-400", bg: "bg-slate-50 border-slate-200", label: "Low" },
};

export function ATSViewPanel({ result }: ATSViewPanelProps) {
  const scoreColor =
    result.overallATSScore >= 85
      ? "text-green-600"
      : result.overallATSScore >= 70
      ? "text-amber-600"
      : "text-red-600";

  const scoreBarColor =
    result.overallATSScore >= 85
      ? "bg-green-500"
      : result.overallATSScore >= 70
      ? "bg-amber-400"
      : "bg-red-400";

  return (
    <div className="space-y-5">
      {/* ATS Score Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">ATS Robot Simulation</p>
        </div>
        <div className="mb-4 flex items-baseline gap-2">
          <span className={`text-5xl font-black ${scoreColor}`}>{result.overallATSScore}</span>
          <span className="text-2xl font-light text-slate-400">/100</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
          <motion.div
            className={`h-full rounded-full ${scoreBarColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${result.overallATSScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="mt-3 text-sm text-slate-300">{result.summary}</p>
      </div>

      {/* Critical failures */}
      {result.criticalFailures.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
            <XCircle className="h-4 w-4" />
            Critical Failures ({result.criticalFailures.length})
          </p>
          <ul className="space-y-1.5">
            {result.criticalFailures.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Passed checks */}
      {result.passedChecks.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Passed Checks ({result.passedChecks.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {result.passedChecks.map((check, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                {check}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section-by-section parse view */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Section-by-Section Parse</h3>
        <div className="space-y-3">
          {result.sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              {/* Section header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{section.sectionName}</span>
                  {section.issues.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : section.issues.some((iss) => iss.severity === "high") ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">ATS score:</span>
                  <span className={`text-sm font-bold ${section.atsScore >= 80 ? "text-green-600" : section.atsScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {section.atsScore}/100
                  </span>
                </div>
              </div>

              {/* Raw ATS text */}
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">What ATS Would Extract</p>
                <p className="font-mono text-xs text-slate-600 whitespace-pre-wrap break-words">
                  {section.rawText || "(empty — ATS could not parse this section)"}
                </p>
              </div>

              {/* Issues */}
              {section.issues.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  {section.issues.map((issue, j) => {
                    const cfg = severityConfig[issue.severity];
                    const Icon = cfg.icon;
                    return (
                      <div key={j} className={`flex items-start gap-2 rounded-lg border p-2 ${cfg.bg}`}>
                        <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                        <p className="text-xs text-slate-700">{issue.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
