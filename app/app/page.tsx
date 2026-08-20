"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  BriefcaseBusiness,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { AchievementPromptModal } from "@/components/careerpath/AchievementPromptModal";
import { RateLimitAlert } from "@/components/ui/RateLimitAlert";
import { ScorePanel } from "@/components/careerpath/ScorePanel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { ChatInterface } from "@/components/careerpath/workspace/ChatInterface";
import { MemorySummary, NextActions } from "@/components/careerpath/workspace/UIHelpers";
import { PremiumDashboardTab } from "@/components/careerpath/workspace/PremiumDashboardTab";
import { PowerToolsTab } from "@/components/careerpath/PowerToolsTab";
import {
  ResumeTab,
  JobIntelligenceTab,
  ATSAuditTab,
  ImproveTab,
  TailorTab,
  CoverLetterTab,
  LinkedInTab,
  ApplicationsTab,
  MemoryTab,
  CoachTab,
  AchievementLoggerTab,
} from "@/components/careerpath/workspace/WorkspaceTabs";

const ResumeDocument = dynamic(
  () => import("@/components/careerpath/ResumeDocument").then((mod) => mod.ResumeDocument),
  {
    ssr: false,
    loading: () => <div className="flex h-[1056px] w-full items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>,
  },
);

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, matches: ["dashboard", "coach", "achievements"] },
  { id: "memory", label: "Memory", icon: Brain, matches: ["memory"] },
  { id: "job", label: "Jobs", icon: BriefcaseBusiness, matches: ["job"] },
  { id: "resume", label: "Studio", icon: FileText, matches: ["resume", "tailor", "audit", "improve", "cover", "linkedin"] },
  { id: "applications", label: "Applications", icon: Gauge, matches: ["applications"] },
  { id: "power", label: "Tools", icon: WandSparkles, matches: ["power"] },
];

const TAB_TITLES: Record<string, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: "Command center", title: "Career operating system" },
  memory: { eyebrow: "Evidence layer", title: "Career Memory" },
  job: { eyebrow: "Opportunity intelligence", title: "Job analysis" },
  resume: { eyebrow: "Application studio", title: "Resume Studio" },
  tailor: { eyebrow: "Application studio", title: "Tailor to opportunity" },
  audit: { eyebrow: "Verification layer", title: "ATS & proof audit" },
  improve: { eyebrow: "Application studio", title: "Improve resume" },
  cover: { eyebrow: "Application studio", title: "Cover letter" },
  linkedin: { eyebrow: "Presence", title: "LinkedIn optimizer" },
  applications: { eyebrow: "CareerLoop", title: "Applications" },
  coach: { eyebrow: "Career Twin", title: "Coaching" },
  achievements: { eyebrow: "Evidence layer", title: "Achievement log" },
  power: { eyebrow: "Power layer", title: "Career tools" },
};

export default function AppWorkspace() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const {
    currentResume,
    workspace,
    activeTab,
    initialLoading,
    rateLimitUntil,
    showAchievementModal,
    setActiveTab,
    setCurrentResume,
    setCurrentResumeId,
    setWorkspace,
    setMessages,
    setInitialLoading,
    setRateLimitUntil,
    setShowAchievementModal,
    startNewResume,
    setInput,
  } = useWorkspaceStore();

  useEffect(() => {
    const lastPrompt = localStorage.getItem("last_achievement_prompt");
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!lastPrompt || now - parseInt(lastPrompt, 10) > threeDays) {
      const timer = setTimeout(() => setShowAchievementModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [setShowAchievementModal]);

  useEffect(() => {
    async function loadAppState() {
      try {
        const response = await fetch("/api/app-state", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load");
        const data = await response.json();
        if (data.resume) {
          setCurrentResume(data.resume);
          setCurrentResumeId(data.resumeId || data.resume.id);
        }
        if (data.workspace) setWorkspace(data.workspace);
        if (data.messages?.length > 0) {
          const restored = data.messages
            .filter((message: { role?: string }) => message.role === "user" || message.role === "assistant")
            .map((message: { id: string; role: "user" | "assistant"; content: string; createdAt: string }) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              createdAt: message.createdAt,
            }));
          if (restored.length > 0) setMessages(restored);
        }
      } catch {
        // First visit — the product intentionally opens in a useful empty state.
      } finally {
        setInitialLoading(false);
      }
    }
    loadAppState();
  }, [setCurrentResume, setCurrentResumeId, setWorkspace, setMessages, setInitialLoading]);

  function handleCloseAchievementModal() {
    localStorage.setItem("last_achievement_prompt", Date.now().toString());
    setShowAchievementModal(false);
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  function handleDownloadPdf() {
    window.print();
  }

  function useCommand(command: string) {
    if (command.startsWith("Log achievement")) {
      setShowAchievementModal(true);
      return;
    }
    setInput(command);
  }

  if (initialLoading) {
    return (
      <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-[#070910] text-white">
        <motion.div aria-hidden animate={reduce ? undefined : { scale: [1, 1.22, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 5, repeat: Infinity }} className="absolute h-80 w-80 rounded-full bg-indigo-500/25 blur-[120px]" />
        <div className="relative flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.055] px-5 py-4 text-sm font-semibold text-white/70 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl"><Loader2 className="h-4 w-4 animate-spin text-indigo-300" />Opening your CareerOS workspace…</div>
      </div>
    );
  }

  const tabMeta = TAB_TITLES[activeTab] ?? TAB_TITLES.dashboard;
  const score = currentResume?.score?.overall ?? workspace?.careerHealth?.overall ?? 0;

  return (
    <div className="career-workspace-shell relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#070910] text-white print:h-auto print:overflow-visible">
      <div className="pointer-events-none fixed inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:68px_68px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
      <motion.div aria-hidden animate={reduce ? undefined : { x: [0, 90, 0], y: [0, 35, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none fixed -left-48 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-500/18 blur-[150px]" />
      <motion.div aria-hidden animate={reduce ? undefined : { x: [0, -70, 0], y: [0, -24, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none fixed -bottom-56 right-[8%] h-[580px] w-[580px] rounded-full bg-fuchsia-500/12 blur-[165px]" />

      <header className="site-header no-print relative z-40 shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto flex h-[64px] max-w-[1880px] items-center justify-between rounded-[22px] border border-white/[0.10] bg-[#0b0e16]/72 px-3.5 shadow-[0_20px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-white/10 bg-white/[0.07] text-white shadow-[0_10px_32px_rgba(99,102,241,0.18)]"><Sparkles className="relative z-10 h-4 w-4" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 via-violet-500/70 to-transparent" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="font-display text-[15px] font-bold tracking-[-0.035em] text-white">CareerOS</span><span className="hidden rounded-full border border-indigo-400/15 bg-indigo-400/[0.08] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.17em] text-indigo-200 sm:inline">Live workspace</span></div>
              <p className="mt-0.5 hidden truncate text-[9px] font-semibold text-white/28 sm:block">One context layer for every career decision.</p>
            </div>
          </div>

          <nav className="no-scrollbar mx-4 hidden max-w-[760px] flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex" aria-label="CareerOS workspace navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = item.matches.includes(activeTab);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition ${selected ? "bg-white text-slate-950 shadow-[0_8px_24px_rgba(255,255,255,.08)]" : "text-white/38 hover:bg-white/[0.055] hover:text-white/80"}`}
                >
                  <Icon className="h-3.5 w-3.5" />{item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button variant="ghost" size="sm" onClick={startNewResume} className="hidden rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white sm:flex"><Plus className="mr-1.5 h-3.5 w-3.5" />New</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="hidden rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white xl:flex"><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Career hub</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!currentResume} className="rounded-xl border-white/10 bg-white/[0.055] text-white/70 hover:bg-white/[0.09] hover:text-white"><Download className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"><LogOut className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Logout</span></Button>
          </div>
        </div>
      </header>

      <div className="no-print relative z-30 shrink-0 px-3 pb-1 pt-2 lg:hidden sm:px-4">
        <div className="no-scrollbar mx-auto flex max-w-[1880px] gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = item.matches.includes(activeTab);
            return <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-semibold ${selected ? "bg-white text-slate-950" : "text-white/40"}`}><Icon className="h-3.5 w-3.5" />{item.label}</button>;
          })}
        </div>
      </div>

      <main className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1900px] flex-1 grid-cols-1 gap-3 overflow-hidden p-3 pt-2 sm:p-4 sm:pt-3 lg:grid-cols-[390px_minmax(0,1fr)] 2xl:grid-cols-[410px_minmax(0,1fr)_310px]">
        <div className="min-h-0 h-full overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0b0e16]/80 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <ChatInterface />
        </div>

        <section className="relative min-h-0 h-full overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#f2f3f7] shadow-[0_24px_70px_rgba(0,0,0,0.20)] print:block print:h-auto print:overflow-visible print:border-0 print:bg-white print:shadow-none">
          <div className="no-print absolute inset-x-0 top-0 z-10 h-32 bg-[radial-gradient(circle_at_48%_0%,rgba(99,102,241,.16),transparent_70%)]" />
          <div className="career-scrollbar relative z-20 h-full overflow-y-auto">
            <div className="sticky top-0 z-30 border-b border-slate-200/65 bg-[#f7f8fb]/88 px-4 py-3.5 backdrop-blur-2xl sm:px-5">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-indigo-500">{tabMeta.eyebrow}</p>
                  <h1 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-950">{tabMeta.title}</h1>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Truth layer active</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Synced</span>
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-7xl p-4 sm:p-5 lg:p-6 print:p-0">
              {activeTab === "dashboard" && <PremiumDashboardTab workspace={workspace} resume={currentResume} onCommand={useCommand} />}
              {activeTab === "memory" && <MemoryTab workspace={workspace} onCommand={useCommand} />}
              {activeTab === "resume" && <ResumeTab resume={currentResume} />}
              {activeTab === "job" && <JobIntelligenceTab workspace={workspace} onCommand={useCommand} />}
              {activeTab === "tailor" && <TailorTab resume={currentResume} workspace={workspace} onCommand={useCommand} />}
              {activeTab === "audit" && <ATSAuditTab resume={currentResume} />}
              {activeTab === "improve" && <ImproveTab resume={currentResume} workspace={workspace} onCommand={useCommand} />}
              {activeTab === "cover" && <CoverLetterTab workspace={workspace} onCommand={useCommand} />}
              {activeTab === "linkedin" && <LinkedInTab workspace={workspace} onCommand={useCommand} />}
              {activeTab === "applications" && <ApplicationsTab workspace={workspace} onCommand={useCommand} />}
              {activeTab === "coach" && <CoachTab workspace={workspace} />}
              {activeTab === "achievements" && <AchievementLoggerTab workspace={workspace} onCommand={useCommand} />}
              {activeTab === "power" && <PowerToolsTab resume={currentResume} onCommand={useCommand} />}
            </div>
          </div>
        </section>

        <aside className="no-print hidden min-h-0 h-full overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#0b0e16]/80 p-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl 2xl:block">
          <div className="space-y-3.5">
            <section className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-gradient-to-br from-indigo-500/18 via-white/[0.045] to-violet-500/10 p-4 text-white">
              <motion.div aria-hidden animate={reduce ? undefined : { x: [-30, 40, -30], y: [0, 25, 0] }} transition={{ duration: 9, repeat: Infinity }} className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-indigo-400/25 blur-3xl" />
              <div className="relative flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-indigo-300" /><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-200">Live intelligence</span></div><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span></div>
              <p className="relative mt-3 text-sm font-semibold tracking-[-0.02em]">CareerOS is reading the same evidence across every workflow.</p>
              <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-3.5 py-3"><div><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/28">Current score</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{score}/100</p></div><Gauge className="h-5 w-5 text-indigo-300" /></div>
            </section>
            {currentResume?.score ? <ScorePanel score={currentResume.score} audit={currentResume.audit} /> : null}
            <section className="rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-400/10"><Brain className="h-4 w-4 text-indigo-300" /></div><h2 className="text-sm font-semibold text-white">Career snapshot</h2></div><div className="workspace-dark-summary"><MemorySummary workspace={workspace} /></div></section>
            <section className="rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/10"><WandSparkles className="h-4 w-4 text-violet-300" /></div><h2 className="text-sm font-semibold text-white">Next best actions</h2></div><div className="workspace-dark-summary"><NextActions workspace={workspace} /></div></section>
          </div>
        </aside>

        {currentResume ? (
          <div className="border-t p-4 lg:hidden print:hidden">
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm font-medium text-white/70"><FileText className="h-4 w-4 text-indigo-300" />View resume<span className="ml-auto text-xs text-white/30">Score: {currentResume.score?.overall ?? "-"}/100</span></summary>
              <div className="mt-3"><ResumeDocument content={currentResume.content} style={currentResume.style} /></div>
            </details>
          </div>
        ) : null}
      </main>

      {showAchievementModal ? <AchievementPromptModal onClose={handleCloseAchievementModal} onLogAchievement={async (text) => { handleCloseAchievementModal(); setInput(text); }} /> : null}
      <RateLimitAlert until={rateLimitUntil} onClear={() => setRateLimitUntil(null)} />
    </div>
  );
}
