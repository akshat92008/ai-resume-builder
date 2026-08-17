"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, FolderOpen, Gauge, Loader2, LogOut, Plus, Target } from "lucide-react";
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
  loading: () => <div className="flex h-[1056px] w-full items-center justify-center bg-white shadow-sm ring-1 ring-slate-200"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
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
        // First visit — show welcome message.
      } finally { setInitialLoading(false); }
    }
    loadAppState();
  }, [setCurrentResume, setCurrentResumeId, setWorkspace, setMessages, setInitialLoading]);

  function handleCloseAchievementModal() { localStorage.setItem("last_achievement_prompt", Date.now().toString()); setShowAchievementModal(false); }
  async function handleLogout() { const supabase = getSupabaseBrowserClient(); if (supabase) await supabase.auth.signOut(); router.push("/login"); }
  function handleDownloadPdf() { window.print(); }
  function useCommand(command: string) { if (command.startsWith("Log achievement")) { setShowAchievementModal(true); return; } setInput(command); }

  if (initialLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="flex items-center gap-3 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading CareerOS...</div></div>;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="site-header no-print sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">C</div><span className="font-display text-base font-bold tracking-tight text-slate-950">CareerOS</span><span className="hidden text-xs text-slate-400 sm:inline">by Amaura Labs</span></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startNewResume} className="hidden sm:flex"><Plus className="mr-1.5 h-3.5 w-3.5" />New profile</Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="hidden sm:flex"><FolderOpen className="mr-1.5 h-3.5 w-3.5" />My work</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!currentResume}><Download className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Resume PDF</span></Button>
          <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Logout</span></Button>
        </div>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)_320px] xl:grid-cols-[430px_minmax(0,1fr)_360px]">
        <ChatInterface />
        <section className="min-h-0 overflow-y-auto bg-slate-100 print:block print:bg-white print:p-0 print:overflow-visible">
          <div className="no-print border-b bg-white px-4"><Tabs active={activeTab} onChange={setActiveTab} tabs={PRIMARY_TABS} /></div>
          <div className="p-4 sm:p-6 print:p-0">
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
        <aside className="no-print hidden min-h-0 overflow-y-auto border-l bg-white p-4 lg:block"><div className="space-y-4">{currentResume?.score && <ScorePanel score={currentResume.score} audit={currentResume.audit} />}<section className="rounded-lg border bg-white p-4"><div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950">My Career</h2></div><MemorySummary workspace={workspace} /></section><section className="rounded-lg border bg-white p-4"><div className="mb-3 flex items-center gap-2"><Gauge className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950">What to do next</h2></div><NextActions workspace={workspace} /></section></div></aside>
        {currentResume && <div className="border-t p-4 lg:hidden print:hidden"><details className="group"><summary className="no-print flex cursor-pointer items-center gap-2 rounded-lg bg-white p-3 text-sm font-medium text-slate-700 shadow-sm"><FileText className="h-4 w-4 text-blue-600" />View resume<span className="ml-auto text-xs text-slate-400">Score: {currentResume.score?.overall ?? "-"} /100</span></summary><div className="mt-3"><ResumeDocument content={currentResume.content} style={currentResume.style} /></div></details></div>}
      </main>
      {showAchievementModal && <AchievementPromptModal onClose={handleCloseAchievementModal} onLogAchievement={async (text) => { handleCloseAchievementModal(); setInput(text); }} />}
      <RateLimitAlert until={rateLimitUntil} onClear={() => setRateLimitUntil(null)} />
    </div>
  );
}
