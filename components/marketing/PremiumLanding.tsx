"use client";

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
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui";

const spring = { type: "spring" as const, stiffness: 110, damping: 18 };

const flow = [
  { icon: Brain, label: "Career Memory", detail: "Your real skills, work, projects and achievements become reusable evidence." },
  { icon: Target, label: "Fit intelligence", detail: "See whether a role is worth your time before you start rewriting anything." },
  { icon: WandSparkles, label: "Verified application", detail: "Tailor the strongest version without silently inventing experience." },
  { icon: RefreshCcw, label: "CareerLoop", detail: "Record outcomes so the next decision has more context than the last one." },
];

const proof = [
  ["Evidence first", "Generated claims are checked against Career Memory."],
  ["ATS verified", "PDF output is re-read before CareerOS lets it leave the system."],
  ["One workspace", "Resume, jobs, memory, applications and career decisions stay connected."],
];

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductMock() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 26, rotateX: 5 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[720px] [perspective:1400px]"
    >
      <div className="absolute -inset-12 rounded-[54px] bg-[radial-gradient(circle_at_50%_42%,rgba(99,102,241,0.28),rgba(139,92,246,0.10)_38%,transparent_68%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/90 bg-white/88 p-2 shadow-[0_42px_120px_rgba(30,41,59,0.18)] backdrop-blur-2xl">
        <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-[#f7f8fc]">
          <div className="flex h-11 items-center justify-between border-b border-slate-200/70 bg-white/86 px-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">CareerOS Workspace</div>
            <div className="h-7 w-7 rounded-lg bg-slate-950" />
          </div>

          <div className="grid min-h-[430px] grid-cols-[0.86fr_1.14fr] sm:min-h-[470px]">
            <div className="relative border-r border-slate-200/70 bg-white/76 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white"><Sparkles className="h-4 w-4" /></div>
                <div><p className="text-xs font-semibold text-slate-950">CareerOS Agent</p><p className="mt-0.5 text-[9px] text-slate-400">Evidence-aware</p></div>
              </div>
              <div className="mt-6 rounded-[18px] bg-slate-950 p-3.5 text-[10px] leading-5 text-slate-200 shadow-lg">
                Tailor my resume for this Product Engineer role. Keep every claim grounded in my Career Memory.
              </div>
              <motion.div
                animate={reduce ? undefined : { y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mt-3 rounded-[18px] border border-indigo-100 bg-white p-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-indigo-500"><ShieldCheck className="h-3 w-3" />Verified result</div>
                <p className="mt-2 text-[10px] leading-5 text-slate-600">Emphasized your product dashboard and automation work. Removed one unsupported scale claim before saving.</p>
              </motion.div>
              <div className="absolute inset-x-4 bottom-4 rounded-[16px] border border-slate-200 bg-white p-2.5 shadow-sm sm:inset-x-5">
                <div className="h-5 rounded-lg bg-slate-50" />
                <div className="mt-2 flex justify-between"><div className="h-6 w-20 rounded-lg bg-slate-100" /><div className="h-7 w-7 rounded-lg bg-slate-950" /></div>
              </div>
            </div>

            <div className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-500">Next best action</p><h3 className="mt-1 text-sm font-semibold tracking-[-0.03em] text-slate-950 sm:text-base">Apply with Resume v4</h3></div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">APPLY</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[["Fit", "Strong"], ["Evidence", "Ready"], ["Risk", "Low"]].map(([label, value]) => (
                  <div key={label} className="rounded-[16px] border border-slate-200/70 bg-white p-3 shadow-sm">
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-900">Why this role fits</p><Gauge className="h-3.5 w-3.5 text-indigo-500" /></div>
                <div className="mt-3 space-y-2.5">
                  {["Product-facing engineering evidence matches the core role.", "Your strongest proof is already in Career Memory.", "Tailoring can improve relevance without adding unsupported skills."].map((item) => (
                    <div key={item} className="flex gap-2 text-[9px] leading-4 text-slate-500"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />{item}</div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[18px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3.5"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-indigo-500">Career Memory</p><p className="mt-1.5 text-[10px] font-semibold text-slate-800">Evidence synchronized</p></div>
                <div className="rounded-[18px] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-3.5"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-violet-500">CareerLoop</p><p className="mt-1.5 text-[10px] font-semibold text-slate-800">Track the outcome</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PremiumLanding() {
  const reduce = useReducedMotion();

  return (
    <main className="overflow-hidden bg-[#fbfbfd] text-slate-950">
      <section className="relative isolate min-h-[980px] overflow-hidden border-b border-slate-200/60 pt-32 sm:pt-36 lg:min-h-[1040px]">
        <div className="career-grid pointer-events-none absolute inset-0 opacity-70" />
        <motion.div animate={reduce ? undefined : { x: [0, 48, 0], y: [0, 18, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute left-[8%] top-24 h-[420px] w-[420px] rounded-full bg-indigo-300/25 blur-[120px]" />
        <motion.div animate={reduce ? undefined : { x: [0, -36, 0], y: [0, 30, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-[4%] top-32 h-[480px] w-[480px] rounded-full bg-violet-300/20 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial={reduce ? undefined : { opacity: 0, y: 12 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 shadow-sm backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" />Your career, finally in one system
            </motion.div>
            <motion.h1 initial={reduce ? undefined : { opacity: 0, y: 18 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.75, ease: [0.22, 1, 0.36, 1] }} className="mt-7 text-[48px] font-bold leading-[0.98] tracking-[-0.065em] text-slate-950 sm:text-6xl md:text-7xl lg:text-[86px]">
              Turn career evidence into <span className="career-text-gradient">better outcomes.</span>
            </motion.h1>
            <motion.p initial={reduce ? undefined : { opacity: 0, y: 16 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.17, duration: 0.65 }} className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
              CareerOS remembers what you have actually done, helps you choose better roles, builds stronger truthful applications, and learns from what happens next.
            </motion.p>
            <motion.div initial={reduce ? undefined : { opacity: 0, y: 14 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-2xl bg-slate-950 px-6 shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-indigo-600">
                <Link href="/app">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white/80 px-6 shadow-sm backdrop-blur-xl">
                <Link href="/dashboard">Open career hub</Link>
              </Button>
            </motion.div>
            <motion.div initial={reduce ? undefined : { opacity: 0 }} animate={reduce ? undefined : { opacity: 1 }} transition={{ delay: 0.38, duration: 0.7 }} className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Built to keep generated claims tied to your real evidence.</motion.div>
          </div>

          <div className="mt-16 sm:mt-20"><ProductMock /></div>
        </div>
      </section>

      <section id="product" className="relative py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Less software. More signal.</p>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.055em] text-slate-950 sm:text-5xl">The complexity stays underneath.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">You should not need six disconnected tools to answer one question: what is the smartest career move to make next?</p>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <div className="group relative min-h-[410px] overflow-hidden rounded-[30px] border border-slate-200/80 bg-slate-950 p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-9">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(99,102,241,0.38),transparent_34%),radial-gradient(circle_at_18%_90%,rgba(139,92,246,0.20),transparent_30%)]" />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10"><Brain className="h-5 w-5 text-indigo-200" /></div>
                  <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Career Memory</p>
                  <h3 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Your career context should compound, not reset.</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Store projects, skills, achievements, education and experience once. Every resume, job decision and interview workflow can reuse the same evidence base.</p>
                </div>
                <div className="relative mt-10 grid gap-2.5 sm:grid-cols-3">
                  {["Experience", "Projects", "Achievements"].map((item, index) => <motion.div key={item} whileHover={reduce ? undefined : { y: -4 }} transition={spring} className="rounded-2xl border border-white/10 bg-white/[0.065] p-4 backdrop-blur"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">0{index + 1}</p><p className="mt-2 text-sm font-semibold text-white">{item}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" style={{ width: `${72 + index * 8}%` }} /></div></motion.div>)}
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-5" delay={0.08}>
              <div className="relative min-h-[410px] overflow-hidden rounded-[30px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-7 shadow-[0_20px_60px_rgba(79,70,229,0.08)] sm:p-9">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"><FileCheck2 className="h-5 w-5" /></div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Truth layer</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-slate-950">Better wording. Same reality.</h3>
                <p className="mt-4 text-sm leading-7 text-slate-500">CareerOS verifies generated claims against Career Memory and removes unsupported claims before persistence.</p>
                <div className="mt-8 rounded-[22px] border border-white bg-white/80 p-4 shadow-sm">
                  {["Runtime truthfulness checks", "Claim provenance", "ATS audit before save"].map((item) => <div key={item} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50"><Check className="h-3.5 w-3.5 text-emerald-600" /></span><span className="text-xs font-semibold text-slate-700">{item}</span></div>)}
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-4">
              <div className="min-h-[320px] rounded-[30px] border border-slate-200/80 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <BriefcaseBusiness className="h-5 w-5 text-indigo-600" />
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Job intelligence</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">Know why a role is Apply, Consider or Skip before spending your limited time.</p>
                <div className="mt-7 flex gap-2">{["APPLY", "CONSIDER", "SKIP"].map((label, index) => <span key={label} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${index === 0 ? "bg-emerald-50 text-emerald-700" : index === 1 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{label}</span>)}</div>
              </div>
            </Reveal>
            <Reveal className="lg:col-span-4" delay={0.05}>
              <div className="min-h-[320px] rounded-[30px] border border-slate-200/80 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <Layers3 className="h-5 w-5 text-violet-600" />
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-slate-950">One workspace</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">Memory, resume, jobs, applications, ATS checks and next actions stay in one operating context.</p>
                <div className="mt-7 space-y-2">{["Resume", "Applications", "Career Memory"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-600"><span>{item}</span><span className="text-slate-300">0{index + 1}</span></div>)}</div>
              </div>
            </Reveal>
            <Reveal className="lg:col-span-4" delay={0.1}>
              <div className="min-h-[320px] rounded-[30px] border border-slate-200/80 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <RefreshCcw className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-slate-950">CareerLoop</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">Applications become feedback. Interviews, rejections and offers make the next recommendation more informed.</p>
                <div className="mt-8 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-indigo-500" /><span className="h-px flex-1 bg-gradient-to-r from-indigo-200 to-emerald-200" /><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200/70 bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">One continuous loop</p><h2 className="mt-4 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">From “what have I done?” to “what worked?”</h2></Reveal>
          <div className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-6 hidden h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent lg:block" />
            {flow.map((item, index) => (
              <Reveal key={item.label} delay={index * 0.05}>
                <div className="relative rounded-[26px] border border-slate-200/80 bg-[#fbfbfd] p-6 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:bg-white hover:shadow-[0_18px_50px_rgba(79,70,229,0.08)]">
                  <div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><item.icon className="h-4.5 w-4.5" /></div><span className="text-[10px] font-bold tracking-[0.18em] text-slate-300">0{index + 1}</span></div>
                  <h3 className="mt-7 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="relative overflow-hidden bg-[#0a0d17] py-24 text-white sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]"><Fingerprint className="h-5 w-5 text-indigo-300" /></div>
              <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">Built for trust</p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">Useful AI needs boundaries.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">CareerOS is designed to improve presentation without turning your application into fiction. The system keeps multiple layers between generation and persistence.</p>
            </Reveal>
            <div className="grid gap-3">
              {proof.map(([title, text], index) => (
                <Reveal key={title} delay={index * 0.06}>
                  <div className="flex gap-4 rounded-[24px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:bg-white/[0.065]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><Check className="h-4 w-4" /></div>
                    <div><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-400">{text}</p></div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-24 sm:py-32">
        <div className="absolute left-1/2 top-0 h-80 w-[760px] -translate-x-1/2 rounded-full bg-indigo-100/70 blur-[110px]" />
        <Reveal className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-sm"><Sparkles className="h-5 w-5" /></div>
          <h2 className="mt-7 text-4xl font-bold tracking-[-0.06em] text-slate-950 sm:text-6xl">Bring one real opportunity.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">Add your evidence, paste the job, and let CareerOS show you the strongest truthful move from here.</p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-2xl bg-slate-950 px-6 shadow-[0_14px_30px_rgba(15,23,42,0.16)] hover:bg-indigo-600"><Link href="/app">Open CareerOS <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </Reveal>
      </section>
    </main>
  );
}
