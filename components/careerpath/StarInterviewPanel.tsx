"use client";

import { useState } from "react";
import { MessageSquare, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";
import type { StarInterviewResult } from "@/lib/careerpath/types";
import { motion, AnimatePresence } from "motion/react";

interface StarInterviewPanelProps {
  result: StarInterviewResult;
  onAnswer: (questionId: string, answer: string) => void;
}

const categoryColors: Record<string, string> = {
  situation: "bg-blue-100 text-blue-700",
  task: "bg-purple-100 text-purple-700",
  action: "bg-amber-100 text-amber-700",
  result: "bg-green-100 text-green-700",
  metric: "bg-rose-100 text-rose-700",
};

export function StarInterviewPanel({ result, onAnswer }: StarInterviewPanelProps) {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  function handleSubmit(qId: string) {
    if (!answers[qId]?.trim()) return;
    onAnswer(qId, answers[qId]);
    setSubmitted((s) => new Set(s).add(qId));
    setActiveQuestion(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">STAR Career Interview</p>
          <p className="text-sm text-slate-600">{result.summary}</p>
        </div>
      </div>

      {/* Vague bullets that triggered questions */}
      {result.vagueBullets.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Bullets That Need More Detail</p>
          <ul className="space-y-1">
            {result.vagueBullets.map((bullet, i) => (
              <li key={i} className="text-sm text-amber-800 before:mr-2 before:content-['→']">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {result.questions.map((q, index) => {
          const isActive = activeQuestion === q.id;
          const isDone = submitted.has(q.id);
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={`rounded-xl border transition-all duration-200 ${
                isDone
                  ? "border-green-200 bg-green-50"
                  : isActive
                  ? "border-violet-200 bg-violet-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
              }`}
            >
              <button
                className="flex w-full items-start gap-3 p-4 text-left"
                onClick={() => { if (!isDone) setActiveQuestion(isActive ? null : q.id); }}
              >
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {index + 1}
                  </span>
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryColors[q.category] || "bg-slate-100 text-slate-600"}`}>
                      {q.category.toUpperCase()}
                    </span>
                    {q.targetBullet && (
                      <span className="text-xs text-slate-400">→ {q.targetBullet.slice(0, 50)}…</span>
                    )}
                  </div>
                  <p className="font-medium text-slate-900">{q.question}</p>
                  <p className="text-sm text-slate-500">{q.context}</p>
                </div>
                {!isDone && (
                  <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isActive ? "rotate-90" : ""}`} />
                )}
              </button>

              <AnimatePresence>
                {isActive && !isDone && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-violet-100 px-4 pb-4 pt-3">
                      <textarea
                        className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
                        rows={3}
                        placeholder="Answer in plain language — the AI will extract the key proof points..."
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        autoFocus
                      />
                      <button
                        className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                        onClick={() => handleSubmit(q.id)}
                        disabled={!answers[q.id]?.trim()}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Update Resume with This Answer
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
