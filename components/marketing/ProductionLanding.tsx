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
    title: "Build one source of truth for your career.",
    detail: "Projects, work, skills and outcomes become reusable private context instead of getting retyped for every application.",
    icon: Brain,
    state: "Evidence captured",
  },
  {
    label: "Match",
    eyebrow: "Job intelligence",
    title: "See the fit before you spend time applying.",
    detail: "CareerOS separates supported strengths from genuine gaps, so you know what to emphasize and what not to fake.",
    icon: Target,
    state: "Fit decoded",
  },
  {
    label: "Tailor",
    eyebrow: "Truth layer",
    title: "Rewrite for the role without rewriting reality.",
    detail: "Generated resume claims are checked against Career Memory before verified output is saved.",
    icon: ShieldCheck,
    state: "Claims checked",
  },
  {
    label: "Apply",
    eyebrow: "Application workspace",
    title: "Keep the role, resume and PDF in one place.",
    detail: "Job context, resume versions, application stage and the verified PDF stay connected instead of drifting across tabs.",
    icon: WandSparkles,
    state: "Application ready",
  },
  {
    label: "Learn",
    eyebrow: "CareerLoop",
    title: "Turn outcomes into better next moves.",
    detail: "Interviews, rejections and offers become structured feedback that improves the next application cycle.",
    icon: RefreshCcw,
    state: "Outcome captured",
  },
] as const;

const trustCards = [
  {
    icon: Fingerprint,
    title: "Evidence-addressable",
    text: "Your career context stays tied to the private account data that produced it.",
  },
  {
    icon: ShieldCheck,
    title: "Unsupported claims blocked",
    text: "Resume claims are checked against stored evidence before verified output is persisted.",
  },
  {
    icon: FileCheck2,
    title: "Verified PDF path",
    text: "The canonical PDF is generated server-side and re-read before delivery.",
  },
  {
    icon: LockKeyhole,
    title: "Account isolation",
    text: "Career data, jobs, messages and resumes are scoped to the authenticated user.",
  },
] as const;

const productSurfaces = [
  {
    icon: Brain,
    eyebrow: "Remember",
    title: "One career profile. Reused everywhere.",
    text: "Capture the experience, skills and projects you can actually prove, then reuse them across every role.",
  },
  {
    icon: BriefcaseBusiness,
    eyebrow: "Decide",
    title: "Know which jobs are worth your time.",
    text: "Compare a role with your evidence, surface gaps and prioritize applications with a clearer signal.",
  },
  {
    icon: Gauge,
    eyebrow: "Execute",
    title: "Go from job post to verified resume.",
    text: "Tailor, review, save and export without losing the connection between the role and the evidence behind it.",
  },
] as const;

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
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
    const timer = window.setInterval(() => setActive((value) => (value + 1) % storySteps.length), 3200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const step = storySteps[active];
  const Icon = step.icon;

  return (
    <div id="demo" className="relative mx-auto mt-14 max-w-[1120px] sm:mt-20">
      <div aria-hidden className="pointer-events-none absolute inset-x-16 -inset-y-16 rounded-[80px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,.28),rgba(168,85,247,.10)_38%,transparent_70%)] blur-3xl" />

      <div className="relative overflow-hidden rounded-[34px] border border-white/[0.12] bg-white/[0.055] p-2 shadow-[0_55px_180px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <div className="overflow-hidden rounded-[27px] border border-white/[0.07] bg-[#090b12]/95">
          <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 sm:flex">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> CareerOS application engine
            </div>
            <StatusPill>Ready</StatusPill>
          </div>

          <div className="grid min-h-[510px] lg:grid-cols-[220px_1fr_290px]">
            <aside className="hidden border-r border-white/[0.06] bg-white/[0.018] p-4 lg:block">
              <p className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/24">Application flow</p>
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
                  <Zap className="h-3 w-3" /> One workspace
                </div>
                <p className="mt-2 text-[10px] leading-4 text-white/34">Your evidence, role, resume and outcome stay connected.</p>
              </div>
            </aside>

            <section className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-[90px]" />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step.label}
                  initial={false}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
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
                  <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.05em] text-white sm:text-4xl">{step.title}</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/42">{step.detail}</p>
                </motion.div>
              </AnimatePresence>

              <div className="relative mt-9 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/24">Evidence available</p>
                  <p className="mt-2 text-sm font-semibold text-white/80">React · TypeScript · REST APIs</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-200/70"><Check className="h-3 w-3" /> Safe to use</div>
                </div>
                <div className="rounded-[18px] border border-amber-200/10 bg-amber-200/[0.035] p-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-100/55">Role asks for</p>
                  <p className="mt-2 text-sm font-semibold text-white/80">AWS production experience</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-100/55"><ShieldCheck className="h-3 w-3" /> Kept as a real gap</div>
                </div>
              </div>
            </section>

            <aside className="hidden border-l border-white/[0.06] bg-white/[0.018] p-5 lg:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/24">Verification</p>
              <div className="mt-5 space-y-3">
                {[
                  ["Career Memory", "Private evidence loaded"],
                  ["Truth layer", "Unsupported claim blocked"],
                  ["Resume", "Verified content saved"],
                  ["PDF", "Server export verified"],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold text-white/68">{title}</p>
                      <Check className="h-3 w-3 text-emerald-300" />
                    </div>
                    <p className="mt-1 text-[9px] leading-4 text-white/27">{detail}</p>
                  </div>
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
                  <span className={`block h-full origin-left rounded-full bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 transition-transform duration-300 ${index === active ? "scale-x-100" : "scale-x-[0.08]"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductionLanding() {
  return (
    <main className="overflow-hidden bg-[#05060a] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/[0.07] pb-24 pt-32 sm:pb-32 sm:pt-40">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.075)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.075)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_74%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_50%_0%,rgba(129,140,248,.22),transparent_62%)]" />
        <div aria-hidden className="pointer-events-none absolute -left-52 top-12 h-[620px] w-[620px] rounded-full bg-indigo-500/14 blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute -right-56 top-24 h-[660px] w-[660px] rounded-full bg-fuchsia-500/10 blur-[170px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.05] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.19em] text-indigo-200 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" /> Truthful AI resume + job search system
            </div>

            <h1 className="mx-auto mt-8 max-w-6xl text-[50px] font-semibold leading-[0.96] tracking-[-0.075em] sm:text-7xl lg:text-[92px]">
              Tailor every application.
              <span className="block bg-gradient-to-r from-indigo-300 via-white to-violet-300 bg-clip-text text-transparent">Never invent experience.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-3xl text-base leading-8 text-white/46 sm:text-lg">
              CareerOS turns your real experience into role-specific resumes, verified PDFs and a reusable career memory—so every application gets sharper without drifting away from the truth.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="group inline-flex h-13 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_55px_rgba(255,255,255,.10)] transition hover:-translate-y-0.5 hover:bg-indigo-100">
                Build my resume free
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link href="#demo" className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/[0.11] bg-white/[0.04] px-6 text-sm font-semibold text-white/72 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white">
                <Zap className="mr-2 h-4 w-4 text-indigo-300" /> See how it works
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium text-white/30">
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-300" /> Free beta · no card</span>
              <span className="flex items-center gap-1.5"><LockKeyhole className="h-3 w-3 text-indigo-300" /> Private by account</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-violet-300" /> Claims checked against evidence</span>
            </div>
          </div>

          <HeroConsole />
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#07080d] py-7">
        <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            {["Career Memory", "Job matching", "Truthful tailoring", "Verified PDF", "Applications", "Outcome learning"].map((item) => (
              <span key={item} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-indigo-300" />{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="relative py-28 sm:py-36 [content-visibility:auto]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Section className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">One workflow</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">From one career profile to every application.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
              Stop rebuilding context every time you find a new role. CareerOS keeps your evidence, opportunities, resumes and outcomes connected.
            </p>
          </Section>

          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            {productSurfaces.map(({ icon: Icon, eyebrow, title, text }) => (
              <div key={title} className="group relative min-h-[320px] overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.045]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-500/0 blur-3xl transition duration-500 group-hover:bg-indigo-500/12" />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-indigo-300"><Icon className="h-5 w-5" /></span>
                <p className="relative mt-10 text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300">{eyebrow}</p>
                <h3 className="relative mt-3 text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
                <p className="relative mt-4 text-sm leading-7 text-white/40">{text}</p>
                <div className="relative mt-8 flex items-center gap-2 text-[10px] font-semibold text-white/28"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Context stays connected</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/[0.07] bg-[#080a10] py-28 sm:py-36 [content-visibility:auto]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Section className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">How it works</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Five moves. One application system.</h2>
          </Section>

          <div className="mt-16 grid gap-px overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.08] lg:grid-cols-5">
            {storySteps.map((step, index) => (
              <div key={step.label} className="h-full min-h-[255px] bg-[#090b12] p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.18em] text-indigo-300">0{index + 1}</span>
                  <step.icon className="h-4 w-4 text-white/24" />
                </div>
                <h3 className="mt-12 text-xl font-semibold tracking-[-0.035em]">{step.label}</h3>
                <p className="mt-3 text-sm leading-6 text-white/36">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="relative overflow-hidden py-28 sm:py-36 [content-visibility:auto]">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[160px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
            <Section>
              <Fingerprint className="h-6 w-6 text-indigo-300" />
              <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Built around truth</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">AI that improves the application—not the fiction.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/40 sm:text-base">CareerOS is designed to make your real experience easier to understand, easier to tailor and harder to accidentally overstate.</p>
            </Section>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustCards.map(({ icon: Icon, title, text }) => (
                <div key={title} className="h-full rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-white/[0.14] hover:bg-white/[0.045]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300"><Icon className="h-4 w-4" /></span>
                  <h3 className="mt-5 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/36">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.07] bg-[#080a10] py-28 sm:py-36 [content-visibility:auto]">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-10 h-80 w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/16 via-violet-500/14 to-transparent blur-[120px]" />
        <Section className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.045] text-indigo-300"><Gauge className="h-5 w-5" /></div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Start with one real role</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">Paste the job. Bring your evidence. Build the application.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/40">CareerOS handles the translation from what you have done to what the role needs—without crossing the line into made-up experience.</p>
          <Link href="/signup" className="group mt-9 inline-flex h-13 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-100">
            Start building free
            <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-4 text-[10px] font-medium text-white/24">Free beta · No card required</p>
        </Section>
      </section>
    </main>
  );
}
