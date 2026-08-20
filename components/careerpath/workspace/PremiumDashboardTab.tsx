"use client";

import React from "react";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDot,
  FileText,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";

const quickStarts = [
  {
    title: "Build Career Memory",
    detail: "Turn projects, internships and achievements into reusable evidence.",
    command: "Build my Career Memory",
    icon: Brain,
  },
  {
    title: "Analyze a real job",
    detail: "Paste a job description and separate strong fit from wishful thinking.",
    command: "Should I apply to this job? Here is the job description: ",
    icon: Target,
  },
  {
    title: "Create a verified resume",
    detail: "Generate the strongest version possible without inventing experience.",
    command: "Create my strongest truthful resume from my Career Memory",
    icon: FileText,
  },
];

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-white/86 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.055)] backdrop-blur-xl"
    >
      <div className={`pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full ${accent} blur-3xl transition duration-500 group-hover:scale-125`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-[26px] font-semibold tracking-[-0.045em] text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">{detail}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </motion.div>
  );
}

function SignalRing({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 44;
  const dash = (safeValue / 100) * circumference;
  return (
    <div className="relative flex h-[132px] w-[132px] items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="url(#careerRingGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="careerRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative text-center">
        <p className="text-3xl font-semibold tracking-[-0.05em] text-white">{safeValue}</p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">{label}</p>
      </div>
    </div>
  );
}

export function PremiumDashboardTab({
  workspace,
  resume,
  onCommand,
}: {
  workspace: CareerWorkspaceState | null;
  resume: CareerPathResume | null;
  onCommand: (command: string) => void;
}) {
  const reduce = useReducedMotion();
  const health = workspace?.careerHealth;
  const profile = workspace?.careerProfile;
  const overall = health?.overall ?? resume?.score?.overall ?? 0;
  const memory = health?.memoryCompleteness ?? (profile ? 64 : 0);
  const resumeScore = health?.resumeScore ?? resume?.score?.overall ?? 0;
  const applicationCount = health?.applicationCount ?? 0;
  const hasCoreContext = Boolean(profile || resume || workspace?.jobIntelligence);
  const nextActions = [
    ...(profile?.gaps ?? []).slice(0, 2).map((gap) => gap.question),
    ...(workspace?.insights ?? []).slice(0, 2).map((insight) => insight.suggestedAction),
  ].filter(Boolean).slice(0, 4);
  const targetRoles = profile?.target.targetRoles ?? [];
  const topStrengths = profile?.strengths?.slice(0, 4).map((item) => item.title) ?? [];
  const latestDocuments = health?.latestDocuments ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8">
      <motion.section
        initial={reduce ? undefined : { opacity: 0, y: 18 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[30px] border border-slate-200/60 bg-[#0b0d14] p-5 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-6 lg:p-7"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(circle_at_65%_45%,black,transparent_72%)]" />
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { x: [0, 70, 0], y: [0, 24, 0], scale: [1, 1.14, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-[90px]"
        />
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { x: [0, -38, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-[-120px] left-[35%] h-64 w-64 rounded-full bg-fuchsia-500/15 blur-[100px]"
        />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-200">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
              Career intelligence live
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/28">Next best move</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-4xl">
              {hasCoreContext ? "Turn your strongest evidence into the next application." : "Build the context once. Let every application get smarter."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/42">
              {hasCoreContext
                ? "CareerOS is keeping your Career Memory, resume evidence and role signals in one connected decision layer."
                : "Start with your real projects, experience or a job description. CareerOS will structure the evidence and guide the next move."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onCommand(hasCoreContext ? "What is my highest-value next action right now?" : "Build my Career Memory")}
                className="group inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-100"
              >
                {hasCoreContext ? "Show next action" : "Build Career Memory"}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => onCommand("Analyze this job description and tell me whether I should apply: ")}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-xs font-semibold text-white/70 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.09] hover:text-white"
              >
                <BriefcaseBusiness className="h-3.5 w-3.5 text-indigo-300" />Analyze a job
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center lg:pr-4">
            <SignalRing value={Math.round(overall)} label="Career score" />
          </div>
        </div>
      </motion.section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Career health" value={`${overall}/100`} detail="Combined readiness signal" icon={Gauge} accent="bg-indigo-300/30" />
        <MetricCard label="Memory" value={`${memory}%`} detail="Evidence completeness" icon={Brain} accent="bg-violet-300/30" />
        <MetricCard label="Resume" value={`${resumeScore}/100`} detail="Current resume quality" icon={FileText} accent="bg-cyan-300/25" />
        <MetricCard label="Applications" value={applicationCount} detail="Tracked in CareerLoop" icon={TrendingUp} accent="bg-emerald-300/25" />
      </div>

      {!hasCoreContext ? (
        <motion.section
          initial={reduce ? undefined : { opacity: 0, y: 16 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.6 }}
          className="rounded-[28px] border border-slate-200/70 bg-white/82 p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-500">Start anywhere</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Three fast ways to wake up your workspace.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">No setup maze. Give CareerOS real evidence and it will structure the operating context.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Unsupported claims remain blocked</div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {quickStarts.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.title}
                  type="button"
                  onClick={() => onCommand(item.command)}
                  initial={reduce ? undefined : { opacity: 0, y: 14 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  whileHover={reduce ? undefined : { y: -4, scale: 1.01 }}
                  className="group relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 text-left transition hover:border-indigo-200 hover:bg-white hover:shadow-[0_14px_36px_rgba(79,70,229,0.08)]"
                >
                  <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-indigo-200/35 blur-3xl transition group-hover:scale-125" />
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600"><Icon className="h-4 w-4" /></span>
                  <h3 className="relative mt-5 text-sm font-semibold text-slate-950">{item.title}</h3>
                  <p className="relative mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
                  <div className="relative mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-600">Run workflow <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[28px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_16px_46px_rgba(15,23,42,0.055)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-500">Evidence graph</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-slate-950">What CareerOS can safely use.</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white"><ShieldCheck className="h-4 w-4" /></span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Target direction</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{targetRoles.length ? targetRoles.join(", ") : "No target role saved yet"}</p>
              <div className="mt-4 space-y-2">
                {(topStrengths.length ? topStrengths : ["Add projects or experience to surface verified strengths"]).map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-500"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[20px] border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Latest artifacts</p>
              <div className="mt-3 space-y-2.5">
                {(latestDocuments.length ? latestDocuments.slice(0, 4) : ["No saved documents yet"]).map((item) => (
                  <div key={item} className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 text-xs font-medium text-slate-600"><FileText className="h-3.5 w-3.5 text-indigo-500" />{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_16px_46px_rgba(15,23,42,0.055)] backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute right-[-70px] top-[-70px] h-48 w-48 rounded-full bg-violet-200/45 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-violet-600">CareerLoop</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-slate-950">Next actions</h2>
              </div>
              <WandSparkles className="h-5 w-5 text-violet-500" />
            </div>
            <div className="mt-5 space-y-2.5">
              {(nextActions.length ? nextActions : ["Build Career Memory to unlock evidence-aware recommendations.", "Analyze one real opportunity to create a fit signal.", "Generate or import a resume to start the proof audit."]).map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  onClick={() => onCommand(item)}
                  className="group flex w-full items-start gap-3 rounded-[18px] border border-slate-200/70 bg-slate-50/75 p-3.5 text-left transition hover:border-violet-200 hover:bg-white hover:shadow-sm"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[10px] font-bold text-violet-600">0{index + 1}</span>
                  <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-600">{item}</span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3 text-[10px] font-semibold leading-5 text-emerald-700">
              <CircleDot className="h-3.5 w-3.5 shrink-0" />Outcomes feed back into the next recommendation instead of disappearing.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
