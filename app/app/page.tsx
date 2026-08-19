"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button, Tabs } from "@/components/ui";
import dynamic from "next/dynamic";
import { AchievementPromptModal } from "@/components/careerpath/AchievementPromptModal";
import { RateLimitAlert } from "@/components/ui/RateLimitAlert";
import { ScorePanel } from "@/components/careerpath/ScorePanel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { ChatInterface } from "@/components/careerpath/workspace/ChatInterface";
import { MemorySummary, NextActions } from "@/components/careerpath/workspace/UIHelpers";
import { PowerToolsTab } from "@/components/careerpath/PowerToolsTab";
import {
  DashboardTab,
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

const PRIMARY_TABS = [
  { id: "dashboard", label: "Overview" },
  { id: "memory", label: "Career Memory" },
  { id: "applications", label: "Applications" },
  { id: "power", label: "Tools" },
];

export default function AppWorkspace() {
  const router = useRouter();
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f6fa]">
        <div className="absolute h-72 w-72 rounded-full bg-indigo-200/40 blur-[100px]" />
        <div className="career-surface relative flex items-center gap-3 rounded-[22px] px-5 py-4 text-sm font-semibold text-slate-600 shadow-[0_18px_55px_rgba(15,23,42,0.08)]"><Loader2 className="h-4 w-4 animate-spin text-indigo-500" />Opening your CareerOS workspace…</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f3f5f9]">
      <div className="pointer-events-none fixed -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-indigo-200/25 blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-36 right-[6%] h-[440px] w-[440px] rounded-full bg-violet-200/20 blur-[140px]" />

      <header className="site-header no-print relative z-40 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto flex h-[62px] max-w-[1780px] items-center justify-between rounded-[20px] border border-white/80 bg-white/82 px-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm"><span className="relative z-10">C</span><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 to-transparent" /></div>
            <div>
              <div className="flex items-center gap-2"><span className="font-display text-[15px] font-bold tracking-[-0.035em] text-slate-950">CareerOS</span><span className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.17em] text-indigo-600 sm:inline">Workspace</span></div>
              <p className="mt-0.5 hidden text-[9px] font-semibold text-slate-400 sm:block">Career intelligence, without the tool sprawl.</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button variant="ghost" size="sm" onClick={startNewResume} className="hidden rounded-xl text-slate-500 sm:flex"><Plus className="mr-1.5 h-3.5 w-3.5" />New</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="hidden rounded-xl text-slate-500 md:flex"><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Career hub</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!currentResume} className="rounded-xl border-slate-200 bg-white"><Download className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-slate-500"><LogOut className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Logout</span></Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-[410px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)_320px]">
        <div className="min-h-0 overflow-hidden rounded-[24px] border border-white/80 bg-white/72 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <ChatInterface />
        </div>

        <section className="career-scrollbar min-h-0 overflow-y-auto rounded-[24px] border border-white/80 bg-white/60 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur-xl print:block print:overflow-visible print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div className="no-print sticky top-0 z-20 border-b border-slate-200/60 bg-white/78 px-4 py-3.5 backdrop-blur-2xl sm:px-5">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <Tabs active={activeTab} onChange={setActiveTab} tabs={PRIMARY_TABS} />
              <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-700 xl:flex"><ShieldCheck className="h-3.5 w-3.5" />Evidence verified</div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-7 print:p-0">
            {activeTab === "dashboard" && <DashboardTab workspace={workspace} resume={currentResume} onCommand={useCommand} />}
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
        </section>

        <aside className="no-print hidden min-h-0 overflow-y-auto rounded-[24px] border border-white/80 bg-white/72 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] backdrop-blur-xl 2xl:block">
          <div className="space-y-3.5">
            <section className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-slate-950 p-4 text-white shadow-[0_14px_35px_rgba(15,23,42,0.12)]">
              <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-indigo-300" /><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300">Live context</span></div>
              <p className="mt-3 text-sm font-semibold tracking-[-0.02em]">CareerOS keeps this workspace connected to your latest evidence.</p>
            </section>
            {currentResume?.score ? <ScorePanel score={currentResume.score} audit={currentResume.audit} /> : null}
            <section className="career-surface rounded-[20px] p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50"><Target className="h-4 w-4 text-indigo-600" /></div><h2 className="text-sm font-semibold text-slate-950">Career snapshot</h2></div><MemorySummary workspace={workspace} /></section>
            <section className="career-surface rounded-[20px] p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50"><Gauge className="h-4 w-4 text-violet-600" /></div><h2 className="text-sm font-semibold text-slate-950">Next best actions</h2></div><NextActions workspace={workspace} /></section>
          </div>
        </aside>

        {currentResume ? (
          <div className="border-t p-4 lg:hidden print:hidden">
            <details className="group">
              <summary className="career-surface no-print flex cursor-pointer items-center gap-2 rounded-2xl p-3 text-sm font-medium text-slate-700"><FileText className="h-4 w-4 text-indigo-600" />View resume<span className="ml-auto text-xs text-slate-400">Score: {currentResume.score?.overall ?? "-"}/100</span></summary>
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
