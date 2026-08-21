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
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const storySteps = [
  {
    label: "Remember",
    eyebrow: "Career Memory",
    title: "Your evidence stops resetting to zero.",
    detail:
      "Projects, work, skills and outcomes become reusable private context for every later decision.",
    icon: Brain,
    state: "Evidence captured",
  },
  {
    label: "Decide",
    eyebrow: "Job intelligence",
    title: "Know whether a role deserves your time.",
    detail:
      "CareerOS separates supported strengths from real gaps before you spend effort tailoring an application.",
    icon: Target,
    state: "Fit decoded",
  },
  {
    label: "Verify",
    eyebrow: "Truth layer",
    title: "Stronger wording. Same reality.",
    detail:
      "Generated resume claims are checked against Career Memory before they are allowed into saved output.",
    icon: ShieldCheck,
    state: "Claims checked",
  },
  {
    label: "Apply",
    eyebrow: "Application workspace",
    title: "One opportunity becomes one coherent application.",
    detail:
      "Resume, job context, application stage and the verified PDF stay connected instead of drifting across tools.",
    icon: WandSparkles,
    state: "Pack ready",
  },
  {
    label: "Learn",
    eyebrow: "CareerLoop",
    title: "Every outcome improves the next move.",
    detail:
      "Interviews, rejections and offers become structured feedback instead of disappearing into a spreadsheet.",
    icon: RefreshCcw,
    state: "Outcome captured",
  },
] as const;

const trustCards = [
  {
    icon: Fingerprint,
    title: "Evidence-addressable",
    text: "Career context remains tied to the private account data that produced it.",
  },
  {
    icon: ShieldCheck,
    title: "Unsupported claims blocked",
    text: "The resume verification layer removes or rejects claims that are not supported by stored evidence.",
  },
  {
    icon: FileCheck2,
    title: "Verified PDF path",
    text: "The canonical export is generated server-side and re-read before delivery.",
  },
  {
    icon: LockKeyhole,
    title: "Account isolated",
    text: "Career data, jobs, messages and resumes are scoped to the authenticated user.",
  },
] as const;

const productSurfaces = [
  {
    icon: Brain,
    eyebrow: "Memory",
    title: "A durable evidence layer",
    text: "Stop rebuilding the same personal context for every resume, role and application.",
  },
  {
    icon: BriefcaseBusiness,
    eyebrow: "Decision",
    title: "Role intelligence before rewriting",
    text: "See strengths, gaps and the next best move before you burn time on the wrong opportunity.",
  },
  {
    icon: Gauge,
    eyebrow: "Execution",
    title: "One operating workspace",
    text: "Move from evidence to resume to application to outcome without losing context between steps.",
  },
] as const;

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 26 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.8)]" />
      {children}
    </span>
  );
}

function HeroConsole() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % storySteps.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const step = storySteps[active];
  const Icon = step.icon;

  return (
    <div id="demo" className="relative mx-auto mt-16 max-w-[1080px] sm:mt-20">
      <motion.div
        aria-hidden
        animate={
          reduce
            ? undefined
            : {
                opacity: [0.28, 0.52, 0.28],
                scale: [0.96, 1.06, 0.96],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-x-20 -inset-y-20 rounded-[80px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,.34),rgba(168,85,247,.12)_38%,transparent_70%)] blur-3xl"
      />

      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 34, rotateX: 5 }}
        animate={reduce ? undefined : { opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[34px] border border-white/[0.12] bg-white/[0.055] p-2 shadow-[0_55px_180px_rgba(0,0,0,.55)] backdrop-blur-2xl [perspective:1600px]"
      >
        <div className="overflow-hidden rounded-[27px] border border-white/[0.07] bg-[#090b12]/95">
          <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> CareerOS operating layer
            </div>
            <StatusPill>Live</StatusPill>
          </div>

          <div className="grid min-h-[520px] lg:grid-cols-[220px_1fr_290px]">
            <aside className="hidden border-r border-white/[0.06] bg-white/[0.018] p-4 lg:block">
              <p className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/24">Workflow</p>
              <div className="mt-4 space-y-1.5">
                {storySteps.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActive(index)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold transition ${
                      index === active
                        ? "border border-indigo-300/15 bg-indigo-300/[0.08] text-white"
                        : "border border-transparent text-white/32 hover:bg-white/[0.03] hover:text-white/60"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${index === active ? "bg-indigo-300" : "bg-white/15"}`} />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-200">
                  <Zap className="h-3 w-3" /> One context
                </div>
                <p className="mt-2 text-[10px] leading-4 text-white/34">
                  Memory, jobs, resumes and outcomes stay connected.
                </p>
              </div>
            </aside>

            <section className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
              <motion.div
                aria-hidden
                animate={reduce ? undefined : { x: [-50, 80, -50], y: [0, 24, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-[90px]"
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.label}
                  initial={reduce ? undefined : { opacity: 0, y: 14 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.34 }}
                  className="relative"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.08] text-indigo-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-white/34">
                      {step.state}
                    </span>
                  </div>
                  <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">{step.eyebrow}</p>
                  <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.05em] text-white sm:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/40">{step.detail}</p>
                </motion.div>
              </AnimatePresence>

              <div className="relative mt-9 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/24">Supported evidence</p>
                  <p className="mt-2 text-sm font-semibold text-white/80">React · TypeScript · REST APIs</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-200/70">
                    <Check className="h-3 w-3" /> Available to use
                  </div>
                </div>
                <div className="rounded-[18px] border border-amber-200/10 bg-amber-200/[0.035] p-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-100/55">Requested gap</p>
                  <p className="mt-2 text-sm font-semibold text-white/80">AWS production experience</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-100/55">
                    <ShieldCheck className="h-3 w-3" /> Preserved as a gap
                  </div>
                </div>
              </div>
            </section>

            <aside className="hidden border-l border-white/[0.06] bg-white/[0.018] p-5 lg:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/24">Output checks</p>
              <div className="mt-5 space-y-3">
                {[
                  ["Career Memory", "Private evidence loaded"],
                  ["Truth layer", "Unsupported claim blocked"],
                  ["Resume", "Verified content saved"],
                  ["PDF", "Server export verified"],
                ].map(([title, detail], index) => (
                  <motion.div
                    key={title}
                    animate={reduce ? undefined : { x: active === index ? 2 : 0 }}
                    className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold text-white/68">{title}</p>
                      <Check className="h-3 w-3 text-emerald-300" />
                    </div>
                    <p className="mt-1 text-[9px] leading-4 text-white/27">{detail}</p>
                  </motion.div>
                ))}
              </div>
            </aside>
          </div>

          <div className="border-t border-white/[0.06] px-5 py-4">
            <div className="flex gap-1.5">
              {storySteps.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show ${item.label} step`}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
                >
                  <motion.span
                    className="block h-full origin-left rounded-full bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300"
                    animate={{ scaleX: index === active ? 1 : 0.08 }}
                    transition={{ duration: 0.38 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ProductionLanding() {
  const reduce = useReducedMotion();

  return (
    <main className="overflow-hidden bg-[#05060a] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/[0.07] pb-24 pt-32 sm:pb-32 sm:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.075)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.075)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_74%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(129,140,248,.20),transparent_62%)]" />
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { x: [0, 90, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -left-52 top-12 h-[620px] w-[620px] rounded-full bg-indigo-500/16 blur-[150px]"
        />
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { x: [0, -80, 0], y: [0, 55, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-56 top-24 h-[660px] w-[660px] rounded-full bg-fuchsia-500/11 blur-[170px]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.05] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.19em] text-indigo-200 backdrop-blur-xl"
            >
              <Sparkles className="h-3.5 w-3.5" /> Evidence → decision → application → outcome
            </motion.div>

            <motion.h1
              initial={reduce ? undefined : { opacity: 0, y: 26 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-8 max-w-6xl text-[54px] font-semibold leading-[0.94] tracking-[-0.075em] sm:text-7xl lg:text-[96px]"
            >
              Your career search,
              <span className="block bg-gradient-to-r from-indigo-300 via-white to-violet-300 bg-clip-text text-transparent">run like a system.</span>
            </motion.h1>

            <motion.p
              initial={reduce ? undefined : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.72 }}
              className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/44 sm:text-lg"
            >
              CareerOS remembers what you have actually done, helps decide where to apply, builds truthful role-specific applications and learns from what happens next.
            </motion.p>

            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.27, duration: 0.64 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                className="group inline-flex h-13 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_55px_rgba(255,255,255,.10)] transition hover:-translate-y-0.5 hover:bg-indigo-100"
              >
                Start free
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/[0.11] bg-white/[0.04] px-6 text-sm font-semibold text-white/72 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                <Zap className="mr-2 h-4 w-4 text-indigo-300" /> See the flow
              </Link>
            </motion.div>

            <motion.div
              initial={reduce ? undefined : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium text-white/28"
            >
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-300" /> Free beta</span>
              <span className="flex items-center gap-1.5"><LockKeyhole className="h-3 w-3 text-indigo-300" /> Private by account</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-violet-300" /> Truthfulness checks</span>
            </motion.div>
          </div>

          <HeroConsole />
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#07080d] py-7">
        <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">
            {["Career Memory", "Job intelligence", "Verified resumes", "Server PDF", "Applications", "CareerLoop"].map((item) => (
              <span key={item} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-indigo-300" />{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="relative py-28 sm:py-36 [content-visibility:auto]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">The product</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">One context layer across the whole job search.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
              CareerOS is not another resume textbox. It connects evidence, opportunities, applications and outcomes into one operating loop.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            {productSurfaces.map(({ icon: Icon, eyebrow, title, text }, index) => (
              <Reveal key={title} delay={index * 0.08}>
                <motion.div
                  whileHover={reduce ? undefined : { y: -6 }}
                  transition={{ duration: 0.24 }}
                  className="group relative min-h-[330px] overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-7"
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-500/0 blur-3xl transition duration-500 group-hover:bg-indigo-500/12" />
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="relative mt-10 text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300">{eyebrow}</p>
                  <h3 className="relative mt-3 text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
                  <p className="relative mt-4 text-sm leading-7 text-white/38">{text}</p>
                  <div className="relative mt-8 flex items-center gap-2 text-[10px] font-semibold text-white/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Context stays connected
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/[0.07] bg-[#080a10] py-28 sm:py-36 [content-visibility:auto]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">The loop</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Five moves. One accumulating advantage.</h2>
          </Reveal>

          <div className="mt-16 grid gap-px overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.08] lg:grid-cols-5">
            {storySteps.map((step, index) => (
              <Reveal key={step.label} delay={index * 0.055}>
                <div className="h-full min-h-[255px] bg-[#090b12] p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.18em] text-indigo-300">0{index + 1}</span>
                    <step.icon className="h-4 w-4 text-white/24" />
                  </div>
                  <h3 className="mt-12 text-xl font-semibold tracking-[-0.035em]">{step.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/35">{step.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="relative overflow-hidden py-28 sm:py-36 [content-visibility:auto]">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[160px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
            <Reveal>
              <Fingerprint className="h-6 w-6 text-indigo-300" />
              <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Trust architecture</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Useful AI needs boundaries.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/40 sm:text-base">
                The product is designed to improve presentation without turning your application into fiction.
              </p>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustCards.map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 0.07}>
                  <motion.div
                    whileHover={reduce ? undefined : { y: -4 }}
                    className="h-full rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-5 text-sm font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/35">{text}</p>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.07] bg-[#080a10] py-28 sm:py-36 [content-visibility:auto]">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-10 h-80 w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/16 via-violet-500/14 to-transparent blur-[120px]" />
        <Reveal className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.045] text-indigo-300">
            <Gauge className="h-5 w-5" />
          </div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Start with evidence</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">Bring one real opportunity.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/40">
            Add what you have actually done, paste the role and let CareerOS show you the strongest truthful move from here.
          </p>
          <Link
            href="/signup"
            className="group mt-9 inline-flex h-13 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-100"
          >
            Build my CareerOS
            <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-4 text-[10px] font-medium text-white/24">Free beta · No card required</p>
        </Reveal>
      </section>
    </main>
  );
}
