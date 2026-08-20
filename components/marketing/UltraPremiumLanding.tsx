"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Check,
  FileCheck2,
  Fingerprint,
  Gauge,
  Layers3,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const filmSteps = [
  { label: "MEMORY", title: "Evidence synced", detail: "Projects, experience and outcomes become reusable career context.", icon: Brain },
  { label: "FIT", title: "Role decoded", detail: "CareerOS separates real strengths from gaps before you spend time applying.", icon: Target },
  { label: "VERIFY", title: "Claims gated", detail: "Unsupported technologies and inflated metrics are blocked before persistence.", icon: ShieldCheck },
  { label: "TAILOR", title: "Resume sharpened", detail: "The strongest truthful version is built around the exact opportunity.", icon: WandSparkles },
  { label: "LEARN", title: "Outcome captured", detail: "Interviews, rejections and offers make the next decision more informed.", icon: RefreshCcw },
];

const proof = ["Career Memory", "Job intelligence", "Verified resumes", "ATS-ready PDF", "CareerLoop", "Private workspace"];

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 26 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductFilm() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % filmSteps.length), 2600);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const step = filmSteps[active];
  const Icon = step.icon;

  return (
    <div className="relative mx-auto w-full max-w-[980px] [perspective:1600px]">
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.34, 0.58, 0.34], scale: [0.96, 1.05, 0.96] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-16 -inset-y-16 rounded-[70px] bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,.42),rgba(168,85,247,.14)_38%,transparent_68%)] blur-3xl"
      />
      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 36, rotateX: 7 }}
        animate={reduce ? undefined : { opacity: 1, y: 0, rotateX: 2 }}
        transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[32px] border border-white/[0.13] bg-white/[0.065] p-2 shadow-[0_50px_160px_rgba(0,0,0,.5)] backdrop-blur-2xl"
      >
        <div className="overflow-hidden rounded-[25px] border border-white/[0.07] bg-[#0b0d14]/95">
          <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
            <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" /></div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /> CareerOS intelligence layer</div>
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500" />
          </div>

          <div className="grid min-h-[500px] lg:grid-cols-[240px_1fr_300px]">
            <aside className="hidden border-r border-white/[0.06] bg-white/[0.018] p-4 lg:block">
              <p className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">Workspace</p>
              <div className="mt-4 space-y-1.5">
                {["Overview", "Career Memory", "Jobs", "Resume studio", "Applications", "Analytics"].map((item, index) => (
                  <div key={item} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold ${index === 0 ? "border border-white/[0.07] bg-white/[0.065] text-white" : "text-white/32"}`}><span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-indigo-400" : "bg-white/15"}`} />{item}</div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300"><ShieldCheck className="h-3 w-3" /> Truth layer</div>
                <p className="mt-2 text-[10px] leading-4 text-white/32">Every generated claim stays tied to evidence.</p>
              </div>
            </aside>

            <section className="relative overflow-hidden p-5 sm:p-7">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">Next best action</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">Apply with verified Resume v4</h3>
                  <p className="mt-2 max-w-lg text-xs leading-5 text-white/35">Product Engineer · Remote · Strong evidence match</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-bold text-emerald-300">APPLY</span>
              </div>

              <div className="relative mt-6 grid grid-cols-3 gap-2.5">
                {[['Fit', 'Strong', '86%'], ['Evidence', 'Ready', '92%'], ['Risk', 'Low', '18%']].map(([label, value, metric]) => (
                  <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/25">{label}</p>
                    <div className="mt-2 flex items-end justify-between gap-1"><p className="text-xs font-semibold text-white/85">{value}</p><p className="text-[9px] font-semibold text-indigo-300">{metric}</p></div>
                  </div>
                ))}
              </div>

              <div className="relative mt-3.5 overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/12 text-indigo-300"><Icon className="h-4 w-4" /></span><div><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-indigo-300">{step.label}</p><p className="mt-1 text-sm font-semibold text-white">{step.title}</p></div></div>
                  <span className="text-[9px] font-semibold text-white/20">0{active + 1} / 05</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={active}
                    initial={reduce ? undefined : { opacity: 0, y: 8 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.32 }}
                    className="mt-4 min-h-10 text-[11px] leading-5 text-white/42"
                  >{step.detail}</motion.p>
                </AnimatePresence>
                <div className="mt-5 flex gap-1.5">
                  {filmSteps.map((item, index) => (
                    <button key={item.label} type="button" onClick={() => setActive(index)} aria-label={`Show ${item.label} step`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <motion.span className="block h-full origin-left rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" animate={{ scaleX: index === active ? 1 : 0 }} transition={{ duration: index === active ? 0.45 : 0.2 }} />
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <aside className="hidden border-l border-white/[0.06] bg-white/[0.018] p-5 lg:block">
              <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/25">Evidence graph</p><Fingerprint className="h-3.5 w-3.5 text-indigo-300" /></div>
              <div className="mt-5 space-y-3">
                {[['ApplyTrack', '35 beta users', 92], ['SupportBot', '30% fewer queries', 84], ['DemoTech', 'React + APIs', 77]].map(([name, value, width]) => (
                  <div key={String(name)} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-white/70">{name}</p><Check className="h-3 w-3 text-emerald-400" /></div><p className="mt-1 text-[9px] text-white/27">{value}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" style={{ width: `${width}%` }} /></div></div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-3.5"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200/70">Gap detected</p><p className="mt-2 text-[10px] leading-4 text-white/32">AWS is requested by the role but absent from Career Memory. CareerOS will not invent it.</p></div>
            </aside>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function UltraPremiumLanding() {
  const reduce = useReducedMotion();

  return (
    <main className="overflow-hidden bg-[#06070b] text-white">
      <section className="relative isolate min-h-[1120px] overflow-hidden border-b border-white/[0.07] pt-32 sm:pt-36">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <motion.div aria-hidden animate={reduce ? undefined : { x: [0, 90, 0], scale: [1, 1.12, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -left-52 top-16 h-[620px] w-[620px] rounded-full bg-indigo-500/18 blur-[150px]" />
        <motion.div aria-hidden animate={reduce ? undefined : { x: [0, -70, 0], y: [0, 40, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-56 top-32 h-[680px] w-[680px] rounded-full bg-fuchsia-500/12 blur-[160px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div initial={reduce ? undefined : { opacity: 0, y: 12 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200 backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5" /> Your career, finally in one system</motion.div>
            <motion.h1 initial={reduce ? undefined : { opacity: 0, y: 24 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.85, ease: [0.22, 1, 0.36, 1] }} className="mx-auto mt-8 max-w-5xl text-[52px] font-semibold leading-[0.96] tracking-[-0.072em] sm:text-7xl lg:text-[92px]">Turn career evidence into <span className="bg-gradient-to-r from-indigo-300 via-white to-violet-300 bg-clip-text text-transparent">better outcomes.</span></motion.h1>
            <motion.p initial={reduce ? undefined : { opacity: 0, y: 18 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7 }} className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/42 sm:text-lg">CareerOS remembers what you have actually done, decides which opportunities deserve your time, builds stronger truthful applications and learns from what happens next.</motion.p>
            <motion.div initial={reduce ? undefined : { opacity: 0, y: 16 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.65 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="group inline-flex h-13 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 shadow-[0_16px_50px_rgba(255,255,255,.12)] transition hover:-translate-y-0.5 hover:bg-indigo-100">Build my CareerOS <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
              <Link href="#film" className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/[0.11] bg-white/[0.045] px-6 text-sm font-semibold text-white/70 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.075] hover:text-white"><Zap className="mr-2 h-4 w-4 text-indigo-300" /> Watch the product flow</Link>
            </motion.div>
            <motion.div initial={reduce ? undefined : { opacity: 0 }} animate={reduce ? undefined : { opacity: 1 }} transition={{ delay: 0.38 }} className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium text-white/27"><span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Free beta</span><span className="flex items-center gap-1.5"><LockKeyhole className="h-3 w-3 text-indigo-300" /> Private by account</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-violet-300" /> Unsupported claims blocked</span></motion.div>
          </div>

          <div id="film" className="mt-20 sm:mt-24"><ProductFilm /></div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#080a10] py-7">
        <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.22em] text-white/20">One context layer across the entire job search</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">{proof.map((item) => <span key={item} className="flex items-center gap-2 text-[11px] font-semibold text-white/38"><span className="h-1 w-1 rounded-full bg-indigo-400" />{item}</span>)}</div>
        </div>
      </section>

      <section id="product" className="relative py-28 sm:py-36">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,.13),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">The career intelligence stack</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Less busywork. More signal.</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/38 sm:text-base">The complexity stays underneath. You see the evidence, the recommendation and the next move.</p></Reveal>

          <div className="mt-16 grid gap-4 lg:grid-cols-12">
            <Reveal className="lg:col-span-7"><div className="relative min-h-[430px] overflow-hidden rounded-[32px] border border-white/[0.09] bg-gradient-to-br from-indigo-500/[0.10] via-white/[0.035] to-transparent p-7 sm:p-9"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" /><Brain className="relative h-5 w-5 text-indigo-300" /><p className="relative mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">Career Memory</p><h3 className="relative mt-3 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Your context compounds instead of resetting in every tool.</h3><p className="relative mt-4 max-w-xl text-sm leading-7 text-white/40">Projects, experience, achievements, skills and outcomes become the factual substrate for every later decision.</p><div className="relative mt-10 grid gap-2.5 sm:grid-cols-3">{[['Experience','Verified'],['Projects','Reusable'],['Outcomes','Learning']].map(([a,b]) => <div key={a} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/25">{a}</p><p className="mt-2 text-sm font-semibold">{b}</p></div>)}</div></div></Reveal>
            <Reveal className="lg:col-span-5" delay={0.05}><div className="min-h-[430px] rounded-[32px] border border-white/[0.09] bg-white/[0.035] p-7 sm:p-9"><FileCheck2 className="h-5 w-5 text-emerald-300" /><p className="mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Truth layer</p><h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Better wording. Same reality.</h3><p className="mt-4 text-sm leading-7 text-white/40">CareerOS verifies generated claims against Career Memory and removes unsupported claims before persistence.</p><div className="mt-8 space-y-2.5">{['Evidence-backed metrics','Unsupported skill detection','ATS audit before export'].map(item => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-white/55"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400/10"><Check className="h-3 w-3 text-emerald-300" /></span>{item}</div>)}</div></div></Reveal>
            {[
              { icon: BriefcaseBusiness, title: 'Job intelligence', copy: 'Separate strong-fit opportunities from prestige distractions before rewriting anything.', accent: 'text-indigo-300' },
              { icon: Layers3, title: 'One workspace', copy: 'Memory, resume, jobs, applications and analytics remain in one operating context.', accent: 'text-violet-300' },
              { icon: RefreshCcw, title: 'CareerLoop', copy: 'Interview, rejection and offer outcomes feed the next recommendation instead of disappearing.', accent: 'text-emerald-300' },
            ].map((feature, index) => { const Icon = feature.icon; return <Reveal key={feature.title} className="lg:col-span-4" delay={index * .04}><div className="min-h-[310px] rounded-[30px] border border-white/[0.08] bg-white/[0.028] p-7 transition duration-500 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.045]"><Icon className={`h-5 w-5 ${feature.accent}`} /><h3 className="mt-10 text-2xl font-semibold tracking-[-0.04em]">{feature.title}</h3><p className="mt-4 text-sm leading-7 text-white/38">{feature.copy}</p><div className="mt-8 flex items-center gap-2 text-[10px] font-semibold text-white/24"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Context stays connected</div></div></Reveal>; })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/[0.07] bg-[#090b12] py-28 sm:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">One continuous loop</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">From “what have I done?” to “what actually worked?”</h2></Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">{[
            ['01','Remember','Build a factual Career Memory once.'],['02','Decide','Score opportunities against real evidence.'],['03','Apply','Generate and tailor without inventing.'],['04','Learn','Record outcomes and sharpen the next move.']
          ].map(([n,title,copy]) => <div key={n} className="bg-[#0a0c13] p-7 sm:p-8"><span className="text-[10px] font-bold tracking-[0.18em] text-indigo-300">{n}</span><h3 className="mt-10 text-xl font-semibold tracking-[-0.035em]">{title}</h3><p className="mt-3 text-sm leading-6 text-white/35">{copy}</p></div>)}</div>
        </div>
      </section>

      <section id="trust" className="relative overflow-hidden py-28 sm:py-36">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <Reveal><Fingerprint className="h-6 w-6 text-indigo-300" /><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Built for trust</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Useful AI needs boundaries.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/38 sm:text-base">CareerOS is designed to improve presentation without turning your application into fiction.</p></Reveal>
            <div className="grid gap-3">{[
              ['Evidence first','Generated claims are checked against the same private Career Memory that powers decisions.',ShieldCheck],
              ['Export verified','The PDF is re-read and audited before it leaves the system.',FileCheck2],
              ['Account isolated','Career data, resumes and outcomes remain scoped to the authenticated user.',LockKeyhole],
            ].map(([title,copy,Icon],index) => <Reveal key={String(title)} delay={index*.04}><div className="flex gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300"><Icon className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold">{title as string}</h3><p className="mt-1.5 text-sm leading-6 text-white/35">{copy as string}</p></div></div></Reveal>)}</div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.07] bg-[#090b11] py-28 sm:py-36">
        <div className="pointer-events-none absolute left-1/2 top-10 h-80 w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/15 via-violet-500/15 to-transparent blur-[120px]" />
        <Reveal className="relative mx-auto max-w-4xl px-4 text-center sm:px-6"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.045] text-indigo-300"><Gauge className="h-5 w-5" /></div><h2 className="mt-7 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">Bring one real opportunity.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/38">Add your evidence, paste the job and let CareerOS show you the strongest truthful move from here.</p><Link href="/signup" className="group mt-9 inline-flex h-13 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-100">Start free <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" /></Link></Reveal>
      </section>
    </main>
  );
}
