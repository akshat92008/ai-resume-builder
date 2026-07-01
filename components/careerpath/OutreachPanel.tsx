"use client";

import { useState } from "react";
import { Mail, Linkedin, Copy, CheckCircle2, ChevronDown, MessageSquare, FileText, HelpCircle, CalendarCheck } from "lucide-react";
import type { OutreachPack } from "@/lib/careerpath/types";
import { motion, AnimatePresence } from "motion/react";

interface OutreachPanelProps {
  pack: OutreachPack;
}

type OutreachTab = "cover_letter" | "recruiter_dm" | "cold_email" | "linkedin" | "why_fit" | "follow_up" | "interview_qa";

const TABS: { id: OutreachTab; label: string; icon: React.ElementType; shortLabel: string }[] = [
  { id: "cover_letter", label: "Cover Letter", icon: FileText, shortLabel: "Cover" },
  { id: "recruiter_dm", label: "Recruiter DM", icon: MessageSquare, shortLabel: "DM" },
  { id: "cold_email", label: "Cold Email", icon: Mail, shortLabel: "Email" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, shortLabel: "LI" },
  { id: "why_fit", label: "Why This Role", icon: HelpCircle, shortLabel: "Why" },
  { id: "follow_up", label: "Follow Up", icon: CalendarCheck, shortLabel: "Follow" },
  { id: "interview_qa", label: "Interview Q&A", icon: HelpCircle, shortLabel: "Q&A" },
];

function CopyBox({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {copied ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied!</>
          ) : (
            <><Copy className="h-3.5 w-3.5" /> Copy</>
          )}
        </button>
      </div>
      <div className="p-4">
        <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function InterviewQASection({ pack }: { pack: OutreachPack }) {
  const [openQ, setOpenQ] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {pack.interviewQuestions.map((q, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpenQ(openQ === i ? null : i)}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{i + 1}</span>
                <p className="text-sm font-medium text-slate-900">{q.question}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openQ === i ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {openQ === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                    <p className="text-xs text-slate-500 italic">💡 Why asked: {q.whyAsked}</p>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-500">Suggested Answer</p>
                      <p className="text-sm text-blue-900">{q.suggestedAnswer}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Prep plan */}
      {pack.preparationPlan.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Preparation Plan</p>
          <ol className="space-y-1.5">
            {pack.preparationPlan.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Skills to prepare */}
      {pack.missingSkillsToPrepare.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Study Before Interview</p>
          <div className="flex flex-wrap gap-2">
            {pack.missingSkillsToPrepare.map((skill, i) => (
              <span key={i} className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OutreachPanel({ pack }: OutreachPanelProps) {
  const [activeTab, setActiveTab] = useState<OutreachTab>("cover_letter");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Outreach Pack</p>
          <p className="text-sm text-slate-600">
            {pack.jobTitle || "Target Role"} at {pack.company || "Company"} — 7 pieces of personalized outreach
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="grid grid-cols-4 gap-1 lg:grid-cols-7">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-blue-100 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "cover_letter" && <CopyBox text={pack.coverLetter} label="Cover Letter" />}
          {activeTab === "recruiter_dm" && <CopyBox text={pack.recruiterDM} label="LinkedIn Recruiter DM" />}
          {activeTab === "cold_email" && <CopyBox text={pack.coldEmail} label="Cold Email" />}
          {activeTab === "linkedin" && <CopyBox text={pack.linkedinMessage} label="LinkedIn Connection Message" />}
          {activeTab === "why_fit" && <CopyBox text={pack.whyFitAnswer} label="Why Do You Want This Role?" />}
          {activeTab === "follow_up" && <CopyBox text={pack.followUpMessage} label="Follow-Up Message (5 days later)" />}
          {activeTab === "interview_qa" && <InterviewQASection pack={pack} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
