"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Loader2,
  LogOut,
  Plus,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { Alert, Badge, Button, Tabs, Textarea } from "@/components/ui";
import { ResumeDocument } from "@/components/careerpath/ResumeDocument";
import { AchievementPromptModal } from "@/components/careerpath/AchievementPromptModal";
import { ScorePanel } from "@/components/careerpath/ScorePanel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CareerPathResume, CareerWorkspaceState, ResumeMessage } from "@/lib/careerpath/types";
import { getApiError } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const WELCOME_MESSAGE: ChatMsg = {
  id: "welcome",
  role: "assistant",
  content:
    "CareerPath AI is your AI Career Memory. Paste messy career info once, then generate resumes, job tailoring, ATS audits, cover letters, LinkedIn sections, application tracking, coaching, and new achievement updates from the same source of truth.",
  createdAt: new Date().toISOString(),
};

const COMMAND_CHIPS = [
  "Build Career Memory from messy info",
  "Generate my ATS resume",
  "Tailor to a job description",
  "Audit my resume",
  "Improve my resume",
  "Write cover letter",
  "Optimize LinkedIn profile",
  "Track this application",
  "Log achievement: ",
];

const THINKING_PHRASES = [
  "Analyzing input data...",
  "Cross-referencing skills...",
  "Structuring resume sections...",
  "Drafting professional summary...",
  "Refining bullet points...",
  "Optimizing for ATS compatibility...",
  "Mining career memory...",
  "Checking missing proof...",
  "Analyzing job keywords...",
  "Preparing application copy...",
  "Updating career health...",
  "Finalizing layout...",
];

function ThinkingAnimation() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % THINKING_PHRASES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm border border-blue-100"
    >
      <div className="relative flex h-6 w-6 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="h-5 w-5 text-blue-500" />
        </motion.div>
      </div>
      <div className="flex flex-col overflow-hidden w-full relative h-[38px] justify-center">
        <span className="font-semibold text-[13px] leading-tight text-blue-700">CareerPath AI is working</span>
        <div className="relative h-[16px] w-full overflow-hidden mt-0.5">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute left-0 text-[12px] text-blue-600/80 whitespace-nowrap"
            >
              {THINKING_PHRASES[index]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function formatMessageText(text: string) {
  return text.split('\n').map((line, i) => {
    const isBullet = line.trim().startsWith('- ');
    const content = isBullet ? line.replace(/^\s*-\s*/, '') : line;
    
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formatted = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-2 mt-1">
          <span className="text-blue-500 mt-0.5">•</span>
          <span>{formatted}</span>
        </div>
      );
    }
    
    if (!line.trim()) return <div key={i} className="h-2" />;
    
    return <p key={i} className={i > 0 ? "mt-1.5" : ""}>{formatted}</p>;
  });
}

export default function AppWorkspace() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [currentResume, setCurrentResume] = useState<CareerPathResume | null>(null);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<CareerWorkspaceState | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  useEffect(() => {
    const lastPrompt = localStorage.getItem("last_achievement_prompt");
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    
    if (!lastPrompt || (now - parseInt(lastPrompt, 10)) > threeDays) {
      const timer = setTimeout(() => setShowAchievementModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleCloseAchievementModal() {
    localStorage.setItem("last_achievement_prompt", Date.now().toString());
    setShowAchievementModal(false);
  }

  // Load workspace state on mount
  useEffect(() => {
    loadAppState();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadAppState() {
    try {
      const res = await fetch("/api/app-state");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as {
        resume?: CareerPathResume;
        resumeId?: string;
        messages?: ResumeMessage[];
        workspace?: CareerWorkspaceState;
      };

      if (data.resume) {
        setCurrentResume(data.resume);
        setCurrentResumeId(data.resumeId || data.resume.id);
      }
      if (data.workspace) setWorkspace(data.workspace);

      if (data.messages && data.messages.length > 0) {
        const restored: ChatMsg[] = data.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
          }));
        if (restored.length > 0) {
          setMessages(restored);
        }
      }
    } catch {
      // First visit — show welcome message
    } finally {
      setInitialLoading(false);
    }
  }

  async function sendMessage(overrideText?: string) {
    const content = (overrideText || input).trim();
    if (!content || loading) return;
    if (!overrideText) setInput("");
    setError("");
    setLoading(true);

    const userMsg: ChatMsg = {
      id: `user_${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/resume-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          resumeId: currentResumeId || undefined,
        }),
      });

      let data: any;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(`Server error (${res.status}): ${textResponse.substring(0, 150)}...`);
      }

      if (!res.ok) throw data;

      const assistantMsg: ChatMsg = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.assistantMessage || "Done.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.resume) {
        setCurrentResume(data.resume);
        setCurrentResumeId(data.resumeId || data.resume.id);
      } else if (data.resumeId) {
        setCurrentResumeId(data.resumeId);
      }
      if (data.workspace) setWorkspace(data.workspace);
    } catch (caught) {
      setError(getApiError(caught, "Something went wrong. Your data is saved. Try again."));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function startNewResume() {
    setCurrentResume(null);
    setCurrentResumeId(null);
    setWorkspace(null);
    setMessages([
      {
        id: "new",
        role: "assistant",
        content: "Starting a fresh Career Memory. Paste education, skills, projects, experience, goals, links, documents, or achievements.",
        createdAt: new Date().toISOString(),
      },
    ]);
    setError("");
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
  }

  function handleDownloadPdf() {
    window.print();
  }

  function useCommand(command: string) {
    setInput(command);
    textareaRef.current?.focus();
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="site-header no-print sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            C
          </div>
          <span className="font-display text-base font-bold tracking-tight text-slate-950">
            CareerPath AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startNewResume}
            className="hidden sm:flex"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Memory
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex"
          >
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            Saved Work
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!currentResume}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[450px_minmax(0,1fr)]">
        <section className="no-print flex min-h-[520px] flex-col border-r bg-white">
          <div className="border-b px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Store once. Generate forever.</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">CareerPath AI</h1>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Build Career Memory once, then produce resumes, audits, tailoring, letters, LinkedIn copy, tracker updates, and coaching from it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMMAND_CHIPS.map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => useCommand(command)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  {command}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-blue-50 text-blue-950"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
                  {msg.role === "assistant" ? "CareerPath AI" : "You"}
                </div>
                <div className="text-sm">{formatMessageText(msg.content)}</div>
              </div>
            ))}
            {loading && (
              <ThinkingAnimation />
            )}
            <div ref={chatEndRef} />
          </div>

          {error && (
            <div className="px-4 pb-2">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <div className="border-t bg-white p-4">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste career info, a job description, or ask CareerPath AI what to do next..."
                disabled={loading}
                className="min-h-[70px] flex-1 resize-none"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="self-end"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto bg-slate-100 print:block print:bg-white print:p-0 print:overflow-visible">
          <div className="p-4 sm:p-6 print:p-0 max-w-4xl mx-auto flex flex-col gap-6">
            {currentResume ? (
              <>
                <div className="flex items-center justify-between no-print mb-2">
                  <h2 className="text-lg font-semibold text-slate-900">Resume Preview</h2>
                  {currentResume.score && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">ATS Score:</span>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        currentResume.score.overall >= 80 ? "bg-emerald-100 text-emerald-700" :
                        currentResume.score.overall >= 60 ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      }`}>
                        {currentResume.score.overall}
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <ResumeDocument content={currentResume.content} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Resume Yet</h3>
                <p className="max-w-md">
                  Your resume preview will appear here. Paste your career history, LinkedIn URL, or upload a document to the chat to get started.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      {showAchievementModal && (
        <AchievementPromptModal
          onClose={handleCloseAchievementModal}
          onLogAchievement={async (text) => {
            handleCloseAchievementModal();
            await sendMessage(text);
          }}
        />
      )}
    </div>
  );
}

function DashboardTab({
  workspace,
  resume,
  onCommand,
}: {
  workspace: CareerWorkspaceState | null;
  resume: CareerPathResume | null;
  onCommand: (command: string) => void;
}) {
  const health = workspace?.careerHealth;
  const profile = workspace?.careerProfile;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Career health" value={`${health?.overall ?? 0} /100`} />
        <Metric label="Memory" value={`${health?.memoryCompleteness ?? 0}%`} />
        <Metric label="Resume" value={`${health?.resumeScore ?? resume?.score?.overall ?? 0} /100`} />
        <Metric label="Applications" value={health?.applicationCount ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionShell title="Career Memory">
          <MemorySummary workspace={workspace} expanded />
        </SectionShell>
        <SectionShell title="Next Actions">
          <NextActions workspace={workspace} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onCommand("Improve my resume")} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Improve resume
            </button>
            <button type="button" onClick={() => onCommand("Log achievement: ")} className="rounded-md border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Log achievement
            </button>
          </div>
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Career Goals">
          <List
            items={[
              profile?.target.dreamRole ? `Dream role: ${profile.target.dreamRole}` : "",
              profile?.target.targetRoles.length ? `Target roles: ${profile.target.targetRoles.join(", ")}` : "",
              profile?.target.dreamCompanies?.length ? `Dream companies: ${profile.target.dreamCompanies.join(", ")}` : "",
              profile?.target.workPreference ? `Work mode: ${profile.target.workPreference}` : "",
            ].filter(Boolean)}
            empty="No goals stored yet."
          />
        </SectionShell>
        <SectionShell title="Skill Gaps">
          <List items={(workspace?.careerProfile?.gaps ?? []).slice(0, 5).map((gap) => gap.question)} empty="No major gaps found." />
        </SectionShell>
        <SectionShell title="Latest Documents">
          <List items={health?.latestDocuments ?? []} empty="No documents saved yet." />
        </SectionShell>
      </div>
    </div>
  );
}

function ResumeTab({ resume }: { resume: CareerPathResume | null }) {
  if (!resume) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Resume preview will appear here</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Paste messy career details into the agent. CareerPath AI will extract memory, mine achievements, and build a proof-based resume.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="no-print mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{resume.title}</h2>
          <p className="text-sm text-slate-500">
            {resume.targetRole} | Career Readiness Score: {resume.resumeDocument?.score?.overall ?? resume.score?.overall ?? "-"} /100 | v{resume.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">Live Preview</span>
        </div>
      </div>
      <ProofStrip resume={resume} />
      <ResumeDocument content={resume.content} />
    </div>
  );
}

function JobIntelligenceTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const report = workspace?.jobIntelligence;
  if (!report) {
    return (
      <SectionShell title="Job Intelligence" description="Paste a job description to extract role signals before tailoring.">
        <button
          type="button"
          onClick={() => onCommand("Analyze and tailor to this job description: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add job description
        </button>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Fit" value={`${report.fitPercentage} /100`} />
        <Metric label="Matched" value={report.matchedSkills.length} />
        <Metric label="Missing skills" value={report.missingSkills.length} />
        <Metric label="Keywords" value={report.keywordRanking.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title={report.job.title || "Job Description"}>
          <List items={[
            report.job.company ? `Company: ${report.job.company}` : "",
            report.job.location ? `Location: ${report.job.location}` : "",
            report.industry ? `Industry: ${report.industry}` : "",
            report.job.seniority ? `Seniority: ${report.job.seniority}` : "",
            report.job.requiredExperience ? `Experience: ${report.job.requiredExperience}` : "",
          ].filter(Boolean)} />
        </SectionShell>
        <SectionShell title="Hidden Expectations">
          <List items={report.hiddenExpectations} empty="No hidden expectations detected." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Matched Skills">
          <BadgeCloud items={report.matchedSkills} empty="No matched skills yet." />
        </SectionShell>
        <SectionShell title="Missing Skills">
          <BadgeCloud items={report.missingSkills} empty="No missing skills detected." />
        </SectionShell>
        <SectionShell title="Salary Clues">
          <List items={report.salaryClues} empty="No salary clues found." />
        </SectionShell>
      </div>
      <SectionShell title="Keyword Ranking">
        <div className="grid gap-2 md:grid-cols-2">
          {report.keywordRanking.map((item) => (
            <div key={item.keyword} className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{item.keyword}</span>
              <span className={item.presentInCareerMemory ? "text-emerald-700" : "text-amber-700"}>
                {item.importance} | {item.presentInCareerMemory ? "in memory" : "missing"}
              </span>
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function ATSAuditTab({ resume }: { resume: CareerPathResume | null }) {
  const audit = resume?.audit;
  if (!audit) {
    return (
      <SectionShell title="ATS Audit">
        <p className="text-sm text-slate-500">Build or paste a resume to see ATS scoring.</p>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Overall" value={`${audit.score.overall} /100`} />
        <Metric label="Keywords" value={`${audit.score.keywordCoverage} /100`} />
        <Metric label="Format" value={`${audit.score.formattingSafety} /100`} />
        <Metric label="Grammar" value={`${audit.score.clarity} /100`} />
        <Metric label="Proof" value={`${audit.score.proofAndMetrics} /100`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionShell title="Weak Bullets">
            <List items={audit.issues.filter(i => i.type === 'WEAK_BULLET').map((issue) => `${issue.section}: ${issue.message}`)} empty="No weak bullets found." />
          </SectionShell>
          <SectionShell title="Missing Metrics">
            <List items={audit.issues.filter(i => i.type === 'MISSING_METRIC').map((issue) => `${issue.section}: ${issue.message}`)} empty="No missing metrics." />
          </SectionShell>
          <SectionShell title="Timeline Issues">
            <List items={audit.issues.filter(i => i.type === 'TIMELINE_GAP').map((issue) => `${issue.section}: ${issue.message}`)} empty="No timeline gaps detected." />
          </SectionShell>
          <SectionShell title="Other Issues">
            <List items={audit.issues.filter(i => !['WEAK_BULLET', 'MISSING_METRIC', 'TIMELINE_GAP'].includes(i.type)).map((issue) => `${issue.section}: ${issue.message}`)} empty="No other issues found." />
          </SectionShell>
        </div>
        <div className="space-y-4">
          <SectionShell title="Recommendations">
            <List items={audit.recommendedFixes} empty="No recommendations yet." />
          </SectionShell>
          <SectionShell title="Readability And Achievement Quality">
            <List
              items={[
                `Readability: ${audit.score.clarity}/100`,
                `Achievement quality: ${audit.score.bulletStrength}/100`,
                `Missing metrics risk: ${audit.score.proofAndMetrics < 75 ? "needs attention" : "healthy"}`,
                `Timeline and formatting risk: ${audit.score.formattingSafety < 85 ? "review formatting" : "safe"}`,
              ]}
            />
          </SectionShell>
        </div>
      </div>
    </div>
  );
}

function ImproveTab({
  resume,
  workspace,
  onCommand,
}: {
  resume: CareerPathResume | null;
  workspace: CareerWorkspaceState | null;
  onCommand: (command: string) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="AI Improvement">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Weak bullets" value={resume?.audit?.issues.filter((issue) => issue.type.includes("weak")).length ?? 0} />
          <Metric label="Missing metrics" value={(workspace?.coachNotes ?? []).filter((note) => /impact|metric/i.test(note.title + note.message)).length} />
          <Metric label="Proof gaps" value={workspace?.careerProfile?.gaps.filter((gap) => /proof|impact/i.test(gap.area)).length ?? 0} />
        </div>
        <button
          type="button"
          onClick={() => onCommand("Improve my resume")}
          className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Improve resume
        </button>
      </SectionShell>
      <SectionShell title="Improvement Queue">
        <List items={[
          ...(resume?.audit?.recommendedFixes ?? []),
          ...(workspace?.careerProfile?.weaknesses ?? []).map((item) => item.suggestedFix),
        ]} empty="No improvement queue yet." />
      </SectionShell>
    </div>
  );
}

function TailorTab({
  resume,
  workspace,
  onCommand,
}: {
  resume: CareerPathResume | null;
  workspace: CareerWorkspaceState | null;
  onCommand: (command: string) => void;
}) {
  const tailoring = resume?.tailoring;
  const job = workspace?.jobDescription;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="Job Tailoring" description="Paste a job description in the agent to tailor without keyword stuffing.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Match" value={`${tailoring?.matchScore ?? resume?.resumeDocument?.score?.roleMatch ?? "-"} /100`} />
          <Metric label="Matched keywords" value={tailoring?.matchedKeywords?.length ?? job?.keywords.length ?? 0} />
          <Metric label="Missing" value={tailoring?.missingKeywordsNotAdded?.length ?? 0} />
        </div>
        <button
          type="button"
          onClick={() => onCommand("Tailor my resume to this job description: ")}
          className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tailor to a job
        </button>
      </SectionShell>
      {tailoring && (
        <SectionShell title="Changes Made">
          <List items={tailoring.tailoringSummary} />
          {tailoring.missingKeywordsNotAdded.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Unsupported keywords left out</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {tailoring.missingKeywordsNotAdded.map((keyword) => (
                  <Badge key={keyword} variant="outline">{keyword}</Badge>
                ))}
              </div>
            </div>
          )}
        </SectionShell>
      )}
    </div>
  );
}

function CoverLetterTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const pack = workspace?.applicationPack;
  if (!pack) {
    return (
      <SectionShell title="Cover Letter" description="Generate job-specific writing from Career Memory and a job description.">
        <button
          type="button"
          onClick={() => onCommand("Write a cover letter for this job description: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create cover letter
        </button>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <TextBlock title="Cover Letter" text={pack.coverLetter} />
      <TextBlock title="Recruiter DM" text={pack.recruiterDM} />
      <TextBlock title="Cold Email" text={pack.coldEmail} />
      <TextBlock title="LinkedIn Message" text={pack.linkedinMessage} />
      <TextBlock title="Why Fit Answer" text={pack.whyFitAnswer} />
      <TextBlock title="Follow-up Message" text={pack.followUpMessage} />
    </div>
  );
}

function LinkedInTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const linkedIn = workspace?.linkedInOptimization;
  if (!linkedIn) {
    return (
      <SectionShell title="LinkedIn Optimizer">
        <button
          type="button"
          onClick={() => onCommand("Optimize my LinkedIn profile")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Generate LinkedIn sections
        </button>
      </SectionShell>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <TextBlock title="Headline" text={linkedIn.headline} />
      <TextBlock title="About" text={linkedIn.about} />
      <SectionShell title="Experience Updates">
        <List items={linkedIn.experienceUpdates} empty="No experience updates yet." />
      </SectionShell>
      <SectionShell title="Skills And SEO Keywords">
        <BadgeCloud items={linkedIn.skills} empty="No skills stored yet." />
        <div className="mt-4">
          <BadgeCloud items={linkedIn.keywords} empty="No keywords generated yet." />
        </div>
      </SectionShell>
      <SectionShell title="Featured">
        <List items={linkedIn.featured} empty="No featured items yet." />
      </SectionShell>
    </div>
  );
}

function ApplicationsTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const applications = workspace?.applications ?? [];
  const statuses = ["saved", "applied", "follow_up_needed", "interview", "rejected", "offer", "ghosted"];
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Application Tracker</h2>
          <p className="text-sm text-slate-500">Track jobs so CareerPath AI can learn from your search loop.</p>
        </div>
        <button
          type="button"
          onClick={() => onCommand("Track this job application: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Track application
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => {
          const items = applications.filter((item) => item.status === status);
          return (
            <section key={status} className="min-h-[160px] rounded-lg border bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize text-slate-900">{status.replaceAll("_", " ")}</h3>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-md border bg-slate-50 p-3">
                    <p className="font-medium text-slate-950">{item.company}</p>
                    <p className="text-sm text-slate-600">{item.role}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.followUpAt ? "Next: follow up scheduled" : "Next: prepare or update status"}</p>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-slate-400">No jobs yet.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MemoryTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const profile = workspace?.careerProfile;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <SectionShell title="Career Memory">
        <MemorySummary workspace={workspace} expanded />
      </SectionShell>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title="Personal Profile">
          <List items={[
            profile?.personal.fullName ? `Name: ${profile.personal.fullName}` : "",
            profile?.personal.email ? `Email: ${profile.personal.email}` : "",
            profile?.personal.phone ? `Phone: ${profile.personal.phone}` : "",
            profile?.personal.location ? `Location: ${profile.personal.location}` : "",
            profile?.personal.linkedin ? `LinkedIn: ${profile.personal.linkedin}` : "",
            profile?.personal.github ? `GitHub: ${profile.personal.github}` : "",
            profile?.personal.portfolio ? `Portfolio: ${profile.personal.portfolio}` : "",
            profile?.personal.workAuthorization ? `Work authorization: ${profile.personal.workAuthorization}` : "",
          ].filter(Boolean)} empty="No personal profile stored yet." />
        </SectionShell>
        <SectionShell title="Career Goals">
          <List items={[
            profile?.target.dreamRole ? `Dream role: ${profile.target.dreamRole}` : "",
            profile?.target.targetRoles.length ? `Target roles: ${profile.target.targetRoles.join(", ")}` : "",
            profile?.target.targetIndustries.length ? `Industries: ${profile.target.targetIndustries.join(", ")}` : "",
            profile?.target.targetSalary ? `Target salary: ${profile.target.targetSalary}` : "",
            profile?.target.workPreference ? `Work mode: ${profile.target.workPreference}` : "",
            profile?.target.relocation ? "Open to relocation" : "",
          ].filter(Boolean)} empty="No goals stored yet." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Education">
          <List items={(profile?.education ?? []).map((item) => [item.degree, item.field, item.institution, item.endDate].filter(Boolean).join(" | "))} empty="No education stored yet." />
        </SectionShell>
        <SectionShell title="Experience">
          <List items={(profile?.experience ?? []).map((item) => [item.title, item.company, item.startDate && item.endDate ? `${item.startDate}-${item.endDate}` : ""].filter(Boolean).join(" | "))} empty="No experience stored yet." />
        </SectionShell>
        <SectionShell title="Projects">
          <List items={(profile?.projects ?? []).map((item) => `${item.name}${item.technologies.length ? ` | ${item.technologies.slice(0, 4).join(", ")}` : ""}`)} empty="No projects stored yet." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionShell title="Skills">
          <BadgeCloud items={(profile?.skills ?? []).map((skill) => skill.name)} empty="No skills stored yet." />
        </SectionShell>
        <SectionShell title="Certifications">
          <List items={(profile?.certifications ?? []).map((item) => [item.name, item.issuer, item.date].filter(Boolean).join(" | "))} empty="No certifications stored yet." />
        </SectionShell>
        <SectionShell title="Documents">
          <List items={(profile?.documents ?? []).map((item) => `${item.name} (${item.type.replaceAll("_", " ")})`)} empty="No documents stored yet." />
        </SectionShell>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title="Memory Gaps">
          <List items={(profile?.gaps ?? []).slice(0, 6).map((gap) => `${gap.question} (${gap.importance})`)} empty="No major missing details found yet." />
          <button
            type="button"
            onClick={() => onCommand("Add this to my Career Memory: ")}
            className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add memory
          </button>
        </SectionShell>
        <SectionShell title="Smart Resume Versions">
          <div className="grid gap-3 sm:grid-cols-2">
            {(workspace?.smartVersions ?? []).map((version) => (
              <div key={version.versionType} className="rounded-md border bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-950">{version.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{version.whenToUse}</p>
                <p className="mt-2 text-xs text-slate-500">Emphasizes: {version.emphasizes.slice(0, 3).join(", ")}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      </div>
    </div>
  );
}

function CoachTab({ workspace }: { workspace: CareerWorkspaceState | null }) {
  const notes = workspace?.coachNotes ?? [];
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="AI Career Coach">
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md border bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">{note.title}</h3>
                <Badge variant={note.priority === "high" ? "outline" : "secondary"}>{note.priority}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{note.message}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{note.action}</p>
            </div>
          ))}
          {!notes.length && <p className="text-sm text-slate-500">No coach notes yet.</p>}
        </div>
      </SectionShell>
    </div>
  );
}

function AchievementLoggerTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const profile = workspace?.careerProfile;
  const log = workspace?.achievementLog;
  const achievements = profile?.achievements ?? [];
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <SectionShell title="Achievement Logger">
        <button
          type="button"
          onClick={() => onCommand("Log achievement: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Log achievement
        </button>
        {log && (
          <div className="mt-4 rounded-md border bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">Latest log</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{log.achievement.text}</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{log.suggestedResumeBullet}</p>
            <div className="mt-3">
              <BadgeCloud items={log.linkedSkills} empty="No linked skills yet." />
            </div>
          </div>
        )}
      </SectionShell>
      <SectionShell title="Stored Achievements">
        <List items={achievements.map((item) => `${item.text}${item.context ? ` (${item.context})` : ""}`)} empty="No achievements stored yet." />
      </SectionShell>
      <SectionShell title="Suggested Resume Bullets">
        <List items={workspace?.mining?.strongBullets ?? []} empty="Add achievements or project details to see suggested bullets." />
      </SectionShell>
    </div>
  );
}

function MemorySummary({ workspace, expanded = false }: { workspace: CareerWorkspaceState | null; expanded?: boolean }) {
  const profile = workspace?.careerProfile;
  if (!profile) return <p className="text-sm leading-6 text-slate-500">No career memory yet. Paste messy career info to build it.</p>;
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
        <p className="mt-1 text-slate-900">{profile.target.targetRoles.join(", ") || "Not set yet"}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strongest assets</p>
        <List items={profile.strengths.map((item) => item.title).slice(0, expanded ? 8 : 3)} empty="Add projects, education, or experience to identify strengths." />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing proof</p>
        <List items={profile.gaps.map((item) => item.area.replaceAll("_", " ")).slice(0, expanded ? 8 : 4)} empty="No obvious proof gaps." />
      </div>
      {expanded && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.skills.slice(0, 18).map((skill) => <Badge key={skill.id} variant="secondary">{skill.name}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

function NextActions({ workspace }: { workspace: CareerWorkspaceState | null }) {
  const profileGaps = workspace?.careerProfile?.gaps ?? [];
  const insights = workspace?.insights ?? [];
  const actions = [
    ...profileGaps.slice(0, 3).map((item) => item.question),
    ...insights.slice(0, 2).map((item) => item.suggestedAction),
  ].slice(0, 5);
  return <List items={actions} empty="Build a resume or track applications to see next actions." />;
}

function ProofStrip({ resume }: { resume: CareerPathResume }) {
  const bullets = resume.resumeDocument?.bullets ?? [];
  if (!bullets.length) return null;
  const counts = bullets.reduce<Record<string, number>>((acc, bullet) => {
    acc[bullet.proofLevel] = (acc[bullet.proofLevel] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="no-print mb-4 rounded-lg border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {["verified", "strong", "estimated", "weak", "risky"].map((level) => (
          <Badge key={level} variant={level === "weak" || level === "risky" ? "outline" : "secondary"}>
            {level}: {counts[level] || 0}
          </Badge>
        ))}
      </div>
      {bullets.some((bullet) => bullet.riskFlags.length > 0) && (
        <p className="mt-2 text-xs text-amber-700">Needs proof: add metric, link, result, or technical detail.</p>
      )}
    </div>
  );
}

function SectionShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <SectionShell title={title}>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</p>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(text)}
        className="mt-3 rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Copy
      </button>
    </SectionShell>
  );
}

function BadgeCloud({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  const cleanItems = Array.from(new Set(items.filter(Boolean)));
  if (!cleanItems.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {cleanItems.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
    </div>
  );
}

function List({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm leading-6 text-slate-700">
      {items.map((item) => <li key={item}>- {item}</li>)}
    </ul>
  );
}
