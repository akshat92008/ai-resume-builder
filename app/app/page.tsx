"use client";

import React, { useEffect, useState } from "react";
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
  ApplicationsTab,
  MemoryTab,
  CoachTab,
} from "@/components/careerpath/workspace/WorkspaceTabs";

const ResumeDocument = dynamic(() => import("@/components/careerpath/ResumeDocument").then(mod => mod.ResumeDocument), {
  ssr: false,
  loading: () => <div className="flex h-[1056px] w-full items-center justify-center bg-white shadow-sm ring-1 ring-slate-200"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
});

const JOURNEY_TABS = [
  { id: "dashboard", label: "Overview" },
  { id: "memory", label: "Evidence" },
  { id: "job", label: "1. Decide" },
  { id: "prepare", label: "2. Prepare" },
  { id: "applications", label: "3. Track" },
  { id: "coach", label: "4. Learn" },
  { id: "power", label: "More" },
];

export default function AppWorkspace() {
  const router = useRouter();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { currentResume, workspace, activeTab, initialLoading, rateLimitUntil, showAchievementModal, setActiveTab, setCurrentResume, setCurrentResumeId, setWorkspace, setMessages, setInitialLoading, setRateLimitUntil, setShowAchievementModal, startNewResume, setInput } = useWorkspaceStore();

  useEffect(() => {
    // Compatibility for users who refreshed while an old 13-tab view was active.
    const oldPrepareTabs = new Set(["resume", "tailor", "audit", "improve", "cover", "linkedin"]);
    if (oldPrepareTabs.has(activeTab)) setActiveTab("prepare");
    if (activeTab === "achievements") setActiveTab("memory");
  }, [activeTab, setActiveTab]);

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

  async function handleDownloadPdf() {
    if (!currentResume || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const response = await fetch(`/api/resume/${currentResume.id}/pdf`, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || "Verified PDF export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentResume.title.replace(/[^a-zA-Z0-9._-]+/g, "-") || "resume"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Verified PDF export failed.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function useCommand(command: string) { if (command.startsWith("Log achievement")) { setShowAchievementModal(true); return; } setInput(command); }

  if (initialLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="flex items-center gap-3 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading workspace...</div></div>;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="site-header no-print sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">C</div><span className="font-display text-base font-bold tracking-tight text-slate-950">CareerOS</span></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startNewResume} className="hidden sm:flex"><Plus className="mr-1.5 h-3.5 w-3.5" />New Memory</Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="hidden sm:flex"><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Saved Work</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!currentResume || downloadingPdf}>
            {downloadingPdf ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Verified PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Logout</span></Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)_320px] xl:grid-cols-[430px_minmax(0,1fr)_360px]">
        <ChatInterface />
        <section className="min-h-0 overflow-y-auto bg-slate-100">
          <div className="border-b bg-white px-4"><Tabs active={activeTab} onChange={setActiveTab} tabs={JOURNEY_TABS} /></div>
          <div className="p-4 sm:p-6">
            {activeTab === "dashboard" && <DashboardTab workspace={workspace} resume={currentResume} onCommand={useCommand} />}
            {activeTab === "memory" && <MemoryTab workspace={workspace} onCommand={useCommand} />}
            {activeTab === "job" && <JobIntelligenceTab workspace={workspace} onCommand={useCommand} />}
            {activeTab === "prepare" && (
              <div className="mx-auto max-w-[900px] space-y-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">Prepare this application</p>
                  <p className="mt-1 text-sm text-slate-500">These are capabilities, not separate destinations. Choose what the current application needs.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => useCommand("Tailor my resume to this job description: ")}>Tailor to job</Button>
                    <Button size="sm" variant="outline" onClick={() => useCommand("Audit my resume and explain the weaknesses")}>Audit content</Button>
                    <Button size="sm" variant="outline" onClick={() => useCommand("Improve my resume")}>Improve</Button>
                    <Button size="sm" variant="outline" onClick={() => useCommand("Write outreach and a cover letter for this job: ")}>Outreach</Button>
                    <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={!currentResume || downloadingPdf}>Export verified PDF</Button>
                  </div>
                </div>
                <ResumeTab resume={currentResume} />
              </div>
            )}
            {activeTab === "applications" && <ApplicationsTab workspace={workspace} onCommand={useCommand} />}
            {activeTab === "coach" && <CoachTab workspace={workspace} />}
            {activeTab === "power" && <PowerToolsTab resume={currentResume} onCommand={useCommand} />}
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-y-auto border-l bg-white p-4 lg:block">
          <div className="space-y-4">
            {currentResume?.score && <ScorePanel score={currentResume.score} audit={currentResume.audit} />}
            <section className="rounded-lg border bg-white p-4"><div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950">Career Memory</h2></div><MemorySummary workspace={workspace} /></section>
            <section className="rounded-lg border bg-white p-4"><div className="mb-3 flex items-center gap-2"><Gauge className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950">Next Actions</h2></div><NextActions workspace={workspace} /></section>
          </div>
        </aside>

        {currentResume && <div className="border-t p-4 lg:hidden"><details className="group"><summary className="flex cursor-pointer items-center gap-2 rounded-lg bg-white p-3 text-sm font-medium text-slate-700 shadow-sm"><FileText className="h-4 w-4 text-blue-600" />View Resume Preview<span className="ml-auto text-xs text-slate-400">Score: {currentResume.score?.overall ?? "-"} /100</span></summary><div className="mt-3"><ResumeDocument content={currentResume.content} style={currentResume.style} /></div></details></div>}
      </main>

      {showAchievementModal && <AchievementPromptModal onClose={handleCloseAchievementModal} onLogAchievement={async (text) => { handleCloseAchievementModal(); setInput(text); }} />}
      <RateLimitAlert until={rateLimitUntil} onClear={() => setRateLimitUntil(null)} />
    </div>
  );
}
