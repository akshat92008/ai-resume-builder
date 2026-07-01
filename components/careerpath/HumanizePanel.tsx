"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRightLeft } from "lucide-react";
import type { HumanizedResume } from "@/lib/careerpath/types";
import { motion } from "motion/react";

interface HumanizePanelProps {
  result: HumanizedResume;
}

export function HumanizePanel({ result }: HumanizePanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow">
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Anti-BS Humanizer</p>
          <p className="text-sm text-slate-600">{result.summary}</p>
        </div>
      </div>

      {/* Clichés removed */}
      {result.clisheesRemoved.length > 0 && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600">AI Clichés Removed</p>
          <div className="flex flex-wrap gap-2">
            {result.clisheesRemoved.map((cliche, i) => (
              <span key={i} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 line-through">
                {cliche}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Change list */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          {result.changes.length} Change{result.changes.length !== 1 ? "s" : ""} Made
        </h3>
        <div className="space-y-3">
          {result.changes.map((change, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              {/* Section label */}
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{change.section}</span>
              </div>

              <div className="p-3 space-y-2">
                {/* Before */}
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">BEFORE</p>
                  <p className="text-sm text-red-800 line-through opacity-80">{change.original}</p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRightLeft className="h-4 w-4 text-slate-300" />
                </div>

                {/* After */}
                <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-green-600">AFTER</p>
                  <p className="text-sm font-medium text-green-900">{change.humanized}</p>
                </div>

                {/* Reason */}
                <p className="text-xs text-slate-400 italic">{change.reason}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Humanized summary */}
      {result.content.summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Humanized Summary</p>
            <button
              onClick={() => copy(result.content.summary, "summary")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition"
            >
              {copiedSection === "summary" ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied</>
              ) : "Copy"}
            </button>
          </div>
          <p className="text-sm text-slate-700">{result.content.summary}</p>
        </div>
      )}
    </div>
  );
}
