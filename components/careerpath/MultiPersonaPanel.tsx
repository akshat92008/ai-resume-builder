"use client";

import { useState } from "react";
import { Users, Eye, Save, CheckCircle2 } from "lucide-react";
import type { MultiPersonaResult, PersonaResume } from "@/lib/careerpath/types";
import { motion } from "motion/react";

interface MultiPersonaPanelProps {
  result: MultiPersonaResult;
  onSavePersona: (persona: PersonaResume) => void;
}

const personaGradients = [
  "from-blue-600 to-indigo-600",
  "from-violet-600 to-purple-600",
  "from-emerald-600 to-teal-600",
];

export function MultiPersonaPanel({ result, onSavePersona }: MultiPersonaPanelProps) {
  const [selected, setSelected] = useState<number>(0);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);

  function handleSave(index: number) {
    setSaved((s) => new Set(s).add(index));
    onSavePersona(result.personas[index]);
  }

  const activePersona = result.personas[selected];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Multi-Persona Resumes</p>
          <p className="text-sm text-slate-600">{result.summary}</p>
        </div>
      </div>

      {/* Persona selector tabs */}
      <div className="grid grid-cols-3 gap-2">
        {result.personas.map((persona, i) => (
          <button
            key={i}
            onClick={() => { setSelected(i); setPreviewMode(false); }}
            className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
              selected === i
                ? "border-violet-300 bg-violet-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-violet-200"
            }`}
          >
            <div className={`mb-2 h-1.5 w-8 rounded-full bg-gradient-to-r ${personaGradients[i]}`} />
            <p className="text-xs font-bold text-slate-900">{persona.persona}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2">{persona.whenToUse}</p>
            {saved.has(i) && (
              <div className="absolute right-2 top-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected persona detail */}
      {activePersona && (
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-white"
        >
          {/* Persona header */}
          <div className={`rounded-t-xl bg-gradient-to-r ${personaGradients[selected]} p-4 text-white`}>
            <h3 className="text-lg font-bold">{activePersona.persona}</h3>
            <p className="mt-0.5 text-sm text-white/80">{activePersona.whenToUse}</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Emphasis */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Emphasizes</p>
              <div className="flex flex-wrap gap-1.5">
                {activePersona.emphasis.map((e, i) => (
                  <span key={i} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 border border-violet-100">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {/* Differences from master */}
            {activePersona.differenceFromMaster.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Changes from Master Resume</p>
                <ul className="space-y-1">
                  {activePersona.differenceFromMaster.map((diff, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      {diff}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary preview */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{activePersona.resume.summary}</p>
            </div>

            {/* Toggle full preview */}
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? "Hide Full Preview" : "View Full Resume Preview"}
            </button>

            {previewMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-700 space-y-3 font-mono overflow-hidden"
              >
                {activePersona.resume.skills.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-500 mb-1">SKILLS</p>
                    {activePersona.resume.skills.map((g, i) => (
                      <p key={i}>{g.category}: {g.items.join(", ")}</p>
                    ))}
                  </div>
                )}
                {activePersona.resume.projects.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-500 mb-1">PROJECTS</p>
                    {activePersona.resume.projects.map((p, i) => (
                      <div key={i} className="mb-2">
                        <p className="font-semibold">{p.name} | {p.techStack.join(", ")}</p>
                        {p.bullets.map((b, j) => <p key={j} className="ml-2 before:content-['·_']">{b}</p>)}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Save button */}
            <button
              onClick={() => handleSave(selected)}
              disabled={saved.has(selected)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                saved.has(selected)
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              {saved.has(selected) ? (
                <><CheckCircle2 className="h-4 w-4" /> Saved as Resume</>
              ) : (
                <><Save className="h-4 w-4" /> Save as New Resume</>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
