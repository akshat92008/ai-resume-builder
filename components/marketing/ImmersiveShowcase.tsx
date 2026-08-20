"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Check,
  FileCheck2,
  Gauge,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const scenes = [
  {
    label: "01 · MEMORY",
    title: "Your evidence becomes reusable context.",
    detail: "CareerOS turns projects, achievements and experience into a private evidence layer instead of making you re-explain yourself in every tool.",
    icon: Brain,
    accent: "from-indigo-500/28 via-violet-500/10 to-transparent",
  },
  {
    label: "02 · FIT",
    title: "One job description becomes a decision.",
    detail: "The role is decoded into must-haves, gaps and match signals before you waste time tailoring for the wrong opportunity.",
    icon: Target,
    accent: "from-cyan-500/22 via-indigo-500/10 to-transparent",
  },
  {
    label: "03 · VERIFY",
    title: "The strongest version stays truthful.",
    detail: "Unsupported skills, inflated metrics and invented experience are separated from evidence before they can enter a saved application.",
    icon: ShieldCheck,
    accent: "from-emerald-500/20 via-indigo-500/10 to-transparent",
  },
  {
    label: "04 · APPLY",
    title: "The application pack assembles itself.",
    detail: "Resume, cover letter, ATS checks and role-specific improvements stay connected to the same evidence instead of drifting apart.",
    icon: WandSparkles,
    accent: "from-fuchsia-500/22 via-violet-500/10 to-transparent",
  },
];

const signalRows = [
  ["Role fit", "86%", "Strong evidence match"],
  ["Career Memory", "92%", "Verified context ready"],
  ["ATS coverage", "88%", "Keywords mapped"],
  ["Truth risk", "Low", "Unsupported claims blocked"],
];

function VideoFrame({ active, reduce }: { active: number; reduce: boolean | null }) {
  const scene = scenes[active];
  const Icon = scene.icon;
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/[0.11] bg-[#0a0d15] shadow-[0_50px_150px_rgba(0,0,0,.46)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${scene.accent}`} />
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { x: [-80, 90, -80], y: [0, 36, 0], scale: [1, 1.16, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-[100px]"
      />

      <div className="relative flex h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" /></div>
        <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.045] px-3 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-white/35"><Play className="h-3 w-3 fill-white/35" /> Live product film</div>
        <div className="text-[9px] font-semibold text-white/20">00:1{active + 2}</div>
      </div>

      <div className="relative grid min-h-[520px] lg:grid-cols-[190px_1fr_260px]">
        <aside className="hidden border-r border-white/[0.06] bg-white/[0.018] p-4 lg:block">
          <div className="flex items-center gap-2.5 px-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><Sparkles className="h-3.5 w-3.5" /></span><div><p className="text-[11px] font-bold text-white">CareerOS</p><p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-white/22">Workspace</p></div></div>
          <div className="mt-6 space-y-1.5">
            {["Overview", "Career Memory", "Job intelligence", "Resume Studio", "Applications", "Analytics"].map((item, index) => (
              <motion.div key={item} animate={reduce ? undefined : { opacity: index === active + 1 || index === 0 ? 1 : 0.35 }} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[10px] font-semibold ${index === 0 ? "border border-white/[0.07] bg-white/[0.06] text-white" : "text-white/34"}`}><span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-indigo-400" : "bg-white/15"}`} />{item}</motion.div>
            ))}
          </div>
        </aside>

        <section className="relative p-5 sm:p-7 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={scene.label} initial={reduce ? undefined : { opacity: 0, y: 16 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.42 }}>
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/15 bg-indigo-400/[0.09] text-indigo-200"><Icon className="h-5 w-5" /></span>
                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.15em] text-emerald-300">System active</span>
              </div>
              <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">{scene.label}</p>
              <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.055em] text-white sm:text-4xl">{scene.title}</h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/40">{scene.detail}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {signalRows.map(([label, value, detail], index) => (
              <motion.div key={label} animate={reduce ? undefined : { y: active === index ? -3 : 0, borderColor: active === index ? "rgba(129,140,248,.28)" : "rgba(255,255,255,.07)" }} className="rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-3.5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/24">{label}</p><p className="mt-2 text-sm font-semibold text-white/80">{detail}</p></div><span className="text-sm font-semibold text-indigo-300">{value}</span></div>
              </motion.div>
            ))}
          </div>
        </section>

        <aside className="hidden border-l border-white/[0.06] bg-white/[0.018] p-5 lg:block">
          <div className="flex items-center justify-between"><p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/24">Evidence stream</p><FileCheck2 className="h-3.5 w-3.5 text-emerald-300" /></div>
          <div className="mt-5 space-y-3">
            {[['ApplyTrack', '35 beta testers'], ['SupportBot', '30% support reduction'], ['DemoTech', 'React + REST APIs']].map(([title, detail], index) => (
              <motion.div key={title} animate={reduce ? undefined : { x: active === index ? 2 : 0, opacity: active === index ? 1 : 0.65 }} className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-3.5"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-white/68">{title}</p><Check className="h-3 w-3 text-emerald-400" /></div><p className="mt-1 text-[9px] text-white/26">{detail}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]"><motion.div animate={{ width: `${78 + index * 7}%` }} className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" /></div></motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-[18px] border border-amber-300/10 bg-amber-300/[0.04] p-3.5"><p className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-200/65">Gap preserved</p><p className="mt-2 text-[10px] leading-4 text-white/30">AWS requested by role. Not present in memory. Kept as a gap instead of fabricated experience.</p></div>
        </aside>
      </div>

      <div className="relative border-t border-white/[0.06] px-5 py-4">
        <div className="flex gap-1.5">
          {scenes.map((item, index) => <div key={item.label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><motion.div animate={{ scaleX: index === active ? 1 : 0.08 }} transition={{ duration: 0.4 }} className="h-full origin-left rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" /></div>)}
        </div>
      </div>
    </div>
  );
}

export function ImmersiveShowcase() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % scenes.length), 3200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return (
    <section id="cinematic-demo" className="relative overflow-hidden border-t border-white/[0.07] bg-[#05060a] py-28 text-white sm:py-36">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,.13)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      <motion.div aria-hidden animate={reduce ? undefined : { x: [0, 120, 0], scale: [1, 1.18, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -left-64 top-12 h-[620px] w-[620px] rounded-full bg-indigo-500/14 blur-[160px]" />
      <motion.div aria-hidden animate={reduce ? undefined : { x: [0, -100, 0], y: [0, 60, 0] }} transition={{ duration: 21, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-72 bottom-[-100px] h-[650px] w-[650px] rounded-full bg-fuchsia-500/11 blur-[170px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.045] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200"><Play className="h-3 w-3 fill-indigo-200" /> Product theater</div>
            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">Don’t read a feature list. Watch the system move.</h2>
          </div>
          <div className="lg:pb-1">
            <p className="max-w-xl text-sm leading-7 text-white/38 sm:text-base">The experience is designed as a continuous loop: remember the evidence, decide where to spend effort, verify the truth, build the application and learn from the outcome.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {scenes.map((scene, index) => <button key={scene.label} type="button" onClick={() => setActive(index)} className={`rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition ${active === index ? "border-indigo-400/30 bg-indigo-400/[0.10] text-indigo-200" : "border-white/[0.07] bg-white/[0.03] text-white/25 hover:text-white/60"}`}>{scene.label.split("·")[1]}</button>)}
            </div>
          </div>
        </div>

        <div className="mt-14">
          <VideoFrame active={active} reduce={reduce} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[{ icon: BriefcaseBusiness, label: "Decision first", text: "Know whether the opportunity deserves your time before tailoring." }, { icon: FileCheck2, label: "Evidence gated", text: "Generated claims stay tied to the same private Career Memory." }, { icon: Gauge, label: "Outcome aware", text: "Applications, interviews and offers feed the next recommendation." }].map(({ icon: Icon, label, text }, index) => (
            <motion.div key={label} initial={reduce ? undefined : { opacity: 0, y: 18 }} whileInView={reduce ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-5"><Icon className="h-4 w-4 text-indigo-300" /><h3 className="mt-5 text-sm font-semibold">{label}</h3><p className="mt-2 text-xs leading-5 text-white/30">{text}</p></motion.div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 rounded-[30px] border border-white/[0.08] bg-gradient-to-r from-indigo-500/[0.10] via-white/[0.035] to-violet-500/[0.08] p-6 sm:flex-row sm:p-8">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.19em] text-indigo-300">Your turn</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Bring one real opportunity into the loop.</h3><p className="mt-2 text-sm text-white/32">Free beta. No credit card. Start with evidence, not hype.</p></div>
          <Link href="/signup" className="group inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-100">Start free <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
        </div>
      </div>
    </section>
  );
}
