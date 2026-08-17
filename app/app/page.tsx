"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, FolderOpen, Gauge, Loader2, LogOut, Plus, Target, Sparkles } from "lucide-react";
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

const ResumeDocument = dynamic(() => import("@/components/careerpath/ResumeDocument").then(mod => mod.ResumeDocument), {
  ssr: false,
  loading: () => <div className="flex h-[1056px] w-full items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
});

const PRIMARY_TABS = [
  { id: "dashboard", label: "Home" },
  { id: "memory", label: "My Career" },
  { id: "applications", label: "Applications" },
  { id: "power", label: "Tools" },
];

export default function AppWorkspace() {
  const router = useRouter();
  const { currentResume, workspace, activeTab, initialLoading, rateLimitUntil, showAchievementModal, setActiveTab, setCurrentResume, setCurrentResumeId, setWorkspace, setMessages, setInitialLoading, setRateLimitUntil, setShowAchievementModal, startNewResume, setInput } = useWorkspaceStore();

  useEffect(() => {
    const lastPrompt = localStorage.getItem("last_achievement_prompt");
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!lastPrompt || (now - parseInt(lastPrompt, 10)) > threeDays) {
      const timer = setTimeout(() => setShowAchievementModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [setShowAchievementModal]);

  useEffect(() => {
    async function loadAppState() {
      try {
        const res = await fetch("/api/app-state");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (data.resume) { setCurrentResume(data.resume); setCurrentResumeId(data.resumeId || data.resume.id); }
        if (data.workspace) setWorkspace(data.workspace);
        if (data.messages && data.messages.length > 0) {
          const restored = data.messages.filter((m: any) => m.role === "user" || m.role === "assistant").map((m: any) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, createdAt: m.createdAt }));
          if (restored.length > 0) setMessages(restored);
        }
      } catch {
        // First visit — show welcome state.
      } finally { setInitialLoading(false); }
    }
    loadAppState();
  }, [setCurrentResume, setCurrentResumeId, setWorkspace, setMessages, setInitialLoading]);

  function handleCloseAchievementModal() { localStorage.setItem("last_achievement_prompt", Date.now().toString()); setShowAchievementModal(false); }
  async function handleLogout() { const supabase = getSupabaseBrowserClient(); if (supabase) await supabase.auth.signOut(); router.push("/login"); }
  function handleDownloadPdf() { window.print(); }
  function useCommand(command: string) { if (command.startsWith("Log achievement")) { setShowAchievementModal(true); return; } setInput(command); }

  if (initialLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
      <div className="career-surface flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-slate-600"><Loader2 className="h-4 w-4 animate-spin text-indigo-500" />Loading your CareerOS workspace...</div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fc]">
      <header className="site-header no-print sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/88 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm"><span className="relative z-10">C</span><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-600 to-transparent" /></div>
          <div><span className="font-display text-base font-bold tracking-[-0.03em] text-slate-950">CareerOS</span><span className="ml-2 hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 sm:inline">Beta</span></div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={startNewResume} className="hidden sm:flex"><Plus className="mr-1.5 h-3.5 w-3.5" />New profile</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="hidden sm:flex"><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Career hub</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!currentResume}><Download className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Resume PDF</span></Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Logout</span></Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)_330px]">
        <ChatInterface />

        <section className="career-scrollbar min-h-0 overflow-y-auto print:block print:bg-white print:p-0 print:overflow-visible">
          <div className="no-print sticky top-0 z-20 border-b border-slate-200/70 bg-[#f7f8fc]/92 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <Tabs active={activeTab} onChange={setActiveTab} tabs={PRIMARY_TABS} />
              <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 xl:flex"><Sparkles className="h-3.5 w-3.5 text-indigo-400" />Truth-locked career intelligence</div>
            </div>
          </div>
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 print:p-0">
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

        <aside className="no-print hidden min-h-0 overflow-y-auto border-l border-slate-200/70 bg-white/70 p-4 2xl:block">
          <div className="space-y-4">
            {currentResume?.score && <ScorePanel score={currentResume.score} audit={currentResume.audit} />}
            <section className="career-surface rounded-2xl p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50"><Target className="h-4 w-4 text-indigo-600" /></div><h2 className="text-sm font-semibold text-slate-950">Career snapshot</h2></div><MemorySummary workspace={workspace} /></section>
            <section className="career-surface rounded-2xl p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50"><Gauge className="h-4 w-4 text-violet-600" /></div><h2 className="text-sm font-semibold text-slate-950">Next best actions</h2></div><NextActions workspace={workspace} /></section>
          </div>
        </aside>

        {currentResume && <div className="border-t p-4 lg:hidden print:hidden"><details className="group"><summary className="career-surface no-print flex cursor-pointer items-center gap-2 rounded-2xl p-3 text-sm font-medium text-slate-700"><FileText className="h-4 w-4 text-indigo-600" />View resume<span className="ml-auto text-xs text-slate-400">Score: {currentResume.score?.overall ?? "-"}/100</span></summary><div className="mt-3"><ResumeDocument content={currentResume.content} style={currentResume.style} /></div></details></div>}
      </main>

      {showAchievementModal && <AchievementPromptModal onClose={handleCloseAchievementModal} onLogAchievement={async (text) => { handleCloseAchievementModal(); setInput(text); }} />}
      <RateLimitAlert until={rateLimitUntil} onClear={() => setRateLimitUntil(null)} />
    </div>
  );
}
