"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Brain, Check, FileCheck2, Sparkles, Target, WandSparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const signals = [
  { icon: Brain, label: "Career Memory", value: "Evidence synced" },
  { icon: Target, label: "Role fit", value: "Strong match" },
  { icon: FileCheck2, label: "Truth layer", value: "Claims verified" },
];

export function PremiumAuthShell({ children, eyebrow = "CareerOS access" }: { children: ReactNode; eyebrow?: string }) {
  const reduce = useReducedMotion();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070910] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_82%_68%,rgba(168,85,247,0.16),transparent_30%),linear-gradient(180deg,#080a12_0%,#05060a_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.10)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { x: [0, 70, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-indigo-500/15 blur-[130px]"
      />
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-48 bottom-[-80px] h-[560px] w-[560px] rounded-full bg-fuchsia-500/10 blur-[140px]"
      />

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden min-h-screen border-r border-white/[0.07] px-10 py-10 lg:flex lg:flex-col xl:px-16">
          <Link href="/" className="inline-flex w-fit items-center gap-3" aria-label="CareerOS home">
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.08] shadow-[0_12px_40px_rgba(99,102,241,.18)] backdrop-blur-xl">
              <Sparkles className="relative z-10 h-4 w-4 text-white" />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600/80 to-transparent" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-[-0.035em]">CareerOS</span>
              <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.24em] text-white/35">Amaura Labs</span>
            </span>
          </Link>

          <div className="my-auto max-w-2xl py-20">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200 backdrop-blur-xl"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.9)]" />
              {eyebrow}
            </motion.div>
            <motion.h2
              initial={reduce ? undefined : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] xl:text-6xl"
            >
              Your career context should get smarter every time you use it.
            </motion.h2>
            <motion.p
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.65 }}
              className="mt-6 max-w-lg text-[15px] leading-7 text-white/48"
            >
              One private evidence layer powers role decisions, truthful resume tailoring, applications and the feedback loop that follows.
            </motion.p>

            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 22 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.7 }}
              className="relative mt-10 overflow-hidden rounded-[28px] border border-white/[0.10] bg-white/[0.055] p-2 shadow-[0_40px_120px_rgba(0,0,0,.32)] backdrop-blur-2xl"
            >
              <div className="rounded-[22px] border border-white/[0.07] bg-[#0d101a]/90 p-5">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Live decision layer</p>
                    <p className="mt-1.5 text-sm font-semibold">Product Engineer · Acme AI</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-bold text-emerald-300">APPLY</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {signals.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        animate={reduce ? undefined : { y: [0, index === 1 ? -3 : -2, 0] }}
                        transition={{ duration: 3.5 + index, repeat: Infinity, ease: "easeInOut" }}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5"
                      >
                        <Icon className="h-3.5 w-3.5 text-indigo-300" />
                        <p className="mt-3 text-[9px] font-semibold text-white/35">{item.label}</p>
                        <p className="mt-1 text-[11px] font-semibold text-white/85">{item.value}</p>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-3.5 rounded-2xl border border-indigo-400/15 bg-indigo-400/[0.06] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-300"><WandSparkles className="h-3 w-3" /> Next best move</div>
                  <p className="mt-2 text-xs leading-5 text-white/60">Tailor Resume v4 using verified project evidence. Keep AWS listed as a gap, not a claimed skill.</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-emerald-300"><Check className="h-3 w-3" /> Unsupported claims blocked before save</div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] pt-5 text-[10px] font-medium text-white/28">
            <span>Evidence-aware career intelligence</span>
            <span>Private by account · Truthfulness gated</span>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-4 py-24 sm:px-7 lg:px-10">
          <div className="absolute left-5 top-5 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5 text-sm font-bold"><Sparkles className="h-4 w-4" /> CareerOS</Link>
          </div>
          <div className="w-full max-w-[470px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
