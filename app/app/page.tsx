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
  MessageSquare,
  BarChart3,
  Users,
  Monitor,
  ArrowRightLeft,
  Mail,
} from "lucide-react";
import { Alert, Badge, Button, Tabs, Textarea } from "@/components/ui";
import { ResumeDocument } from "@/components/careerpath/ResumeDocument";
import { ScorePanel } from "@/components/careerpath/ScorePanel";
import { StarInterviewPanel } from "@/components/careerpath/StarInterviewPanel";
import { ImpactEstimatorPanel } from "@/components/careerpath/ImpactEstimatorPanel";
import { GapAnalysisPanel } from "@/components/careerpath/GapAnalysisPanel";
import { MultiPersonaPanel } from "@/components/careerpath/MultiPersonaPanel";
import { ATSViewPanel } from "@/components/careerpath/ATSViewPanel";
import { HumanizePanel } from "@/components/careerpath/HumanizePanel";
import { OutreachPanel } from "@/components/careerpath/OutreachPanel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CareerPathResume, CareerWorkspaceState, ImpactSuggestion, PersonaResume, ResumeMessage } from "@/lib/careerpath/types";
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
    "CareerPath AI is your personal AI career agent. Paste messy career info once, then I can build your career memory, tailor your resume to jobs, prepare application packs, track applications, and improve your strategy over time.",
  createdAt: new Date().toISOString(),
};

const COMMAND_CHIPS = [
  // Core
  "Build my resume from messy info",
  "Tailor to a job description",
  // Premium agentic features
  "Interview me (STAR)",
  "Humanize this resume",
  "Add metrics to my bullets",
  "Gap analysis for my target role",
  "Generate 3 persona versions",
  "Show ATS view",
  "Write cover letter + outreach",
];

const THINKING_PHRASES = [
  "Analyzing input data...",
  "Cross-referencing skills...",
  "Structuring resume sections...",
  "Drafting professional summary...",
  "Refining bullet points...",
  "Optimizing for ATS compatibility...",
  "Running STAR interview analysis...",
  "De-AI-ifying your resume...",
  "Mining impact metrics...",
  "Mapping skill gaps to target role...",
  "Generating persona variants...",
  "Simulating ATS parse...",
  "Crafting personalized outreach...",
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

export default function AppWorkspace() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [currentResume, setCurrentResume] = useState<CareerPathResume | null>(null);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<CareerWorkspaceState | null>(null);
  const [activeTab, setActiveTab] = useState("resume");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput("");
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
        // Auto-navigate to relevant tab based on what was just generated
        if (data.resume.starInterview) setActiveTab("interview");
        else if (data.resume.humanizedResume) setActiveTab("humanize");
        else if (data.resume.impactEstimates) setActiveTab("impact");
        else if (data.resume.gapAnalysis) setActiveTab("gaps");
        else if (data.resume.multiPersona) setActiveTab("personas");
        else if (data.resume.atsView) setActiveTab("atsview");
        else if (data.resume.outreachPack) setActiveTab("outreach");
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
        content: "Starting fresh! Paste your career details — education, skills, projects, experience — and I'll build you a new resume.",
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
            New Resume
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex"
          >
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            Saved Resumes
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

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)_320px] xl:grid-cols-[430px_minmax(0,1fr)_360px]">
        <section className="no-print flex min-h-[520px] flex-col border-r bg-white">
          <div className="border-b px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Your personal AI career agent</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">CareerPath AI</h1>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Build your career memory once, tailor every resume, prepare applications, and learn from outcomes.
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
                <p className="whitespace-pre-wrap">{msg.content}</p>
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
                onClick={sendMessage}
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
          <div className="no-print border-b bg-white px-4">
            <Tabs
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "resume", label: "Resume" },
                { id: "tailor", label: "Tailor" },
                { id: "pack", label: "App Pack" },
                { id: "applications", label: "Applications" },
                { id: "memory", label: "Memory" },
                ...(currentResume?.starInterview ? [{ id: "interview", label: "⭐ Interview" }] : []),
                ...(currentResume?.humanizedResume ? [{ id: "humanize", label: "✦ Humanize" }] : []),
                ...(currentResume?.impactEstimates ? [{ id: "impact", label: "📈 Impact" }] : []),
                ...(currentResume?.gapAnalysis ? [{ id: "gaps", label: "🎯 Gaps" }] : []),
                ...(currentResume?.multiPersona ? [{ id: "personas", label: "👥 Personas" }] : []),
                ...(currentResume?.atsView ? [{ id: "atsview", label: "🤖 ATS View" }] : []),
                ...(currentResume?.outreachPack ? [{ id: "outreach", label: "✉️ Outreach" }] : []),
              ]}
            />
          </div>
          <div className="p-4 sm:p-6 print:p-0">
            {activeTab === "resume" && (
              <ResumeTab resume={currentResume} />
            )}
            {activeTab === "tailor" && (
              <TailorTab resume={currentResume} workspace={workspace} onCommand={useCommand} />
            )}
            {activeTab === "pack" && (
              <ApplicationPackTab workspace={workspace} onCommand={useCommand} />
            )}
            {activeTab === "applications" && (
              <ApplicationsTab workspace={workspace} onCommand={useCommand} />
            )}
            {activeTab === "memory" && (
              <MemoryTab workspace={workspace} onCommand={useCommand} />
            )}
            {/* Premium Differentiation Tabs */}
            {activeTab === "interview" && currentResume?.starInterview && (
              <div className="mx-auto max-w-2xl">
                <StarInterviewPanel
                  result={currentResume.starInterview}
                  onAnswer={(questionId, answer) => {
                    useCommand(`I answered interview question ${questionId}: ${answer}`);
                  }}
                />
              </div>
            )}
            {activeTab === "humanize" && currentResume?.humanizedResume && (
              <div className="mx-auto max-w-2xl">
                <HumanizePanel result={currentResume.humanizedResume} />
              </div>
            )}
            {activeTab === "impact" && currentResume?.impactEstimates && (
              <div className="mx-auto max-w-2xl">
                <ImpactEstimatorPanel
                  result={currentResume.impactEstimates}
                  onAccept={(suggestion: ImpactSuggestion) => {
                    useCommand(`Accept this metric improvement for ${suggestion.itemName}: ${suggestion.improvedBullet}`);
                  }}
                  onReject={(_id: string) => {}}
                />
              </div>
            )}
            {activeTab === "gaps" && currentResume?.gapAnalysis && (
              <div className="mx-auto max-w-2xl">
                <GapAnalysisPanel result={currentResume.gapAnalysis} />
              </div>
            )}
            {activeTab === "personas" && currentResume?.multiPersona && (
              <div className="mx-auto max-w-2xl">
                <MultiPersonaPanel
                  result={currentResume.multiPersona}
                  onSavePersona={(_persona: PersonaResume) => {
                    useCommand(`Save persona resume: ${_persona.persona}`);
                  }}
                />
              </div>
            )}
            {activeTab === "atsview" && currentResume?.atsView && (
              <div className="mx-auto max-w-2xl">
                <ATSViewPanel result={currentResume.atsView} />
              </div>
            )}
            {activeTab === "outreach" && currentResume?.outreachPack && (
              <div className="mx-auto max-w-2xl">
                <OutreachPanel pack={currentResume.outreachPack} />
              </div>
            )}
          </div>
        </section>

        <aside className="no-print hidden min-h-0 overflow-y-auto border-l bg-white p-4 lg:block">
          <div className="space-y-4">
            {currentResume?.score && (
              <ScorePanel score={currentResume.score} audit={currentResume.audit} />
            )}
            <section className="rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-950">Career Memory</h2>
              </div>
              <MemorySummary workspace={workspace} />
            </section>
            <section className="rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-950">Next Actions</h2>
              </div>
              <NextActions workspace={workspace} />
            </section>
          </div>
        </aside>

        {currentResume && (
          <div className="border-t p-4 lg:hidden print:hidden">
            <details className="group">
              <summary className="no-print flex cursor-pointer items-center gap-2 rounded-lg bg-white p-3 text-sm font-medium text-slate-700 shadow-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                View Resume Preview
                <span className="ml-auto text-xs text-slate-400">
                  Score: {currentResume.score?.overall ?? "-"} /100
                </span>
              </summary>
              <div className="mt-3">
                <ResumeDocument content={currentResume.content} />
              </div>
            </details>
          </div>
        )}
      </main>
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
            {resume.targetRole} | Interview Conversion Score: {resume.resumeDocument?.score?.overall ?? resume.score?.overall ?? "-"} /100 | v{resume.version}
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

function ApplicationPackTab({ workspace, onCommand }: { workspace: CareerWorkspaceState | null; onCommand: (command: string) => void }) {
  const pack = workspace?.applicationPack;
  if (!pack) {
    return (
      <SectionShell title="Application Pack" description="Generate the complete kit for a job: cover letter, recruiter DM, cold email, LinkedIn note, why-fit answer, interview questions, prep plan, and follow-up.">
        <button
          type="button"
          onClick={() => onCommand("Here is a job description. Prepare everything I need to apply: ")}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create application pack
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
      <SectionShell title="Interview Questions">
        <div className="space-y-3">
          {pack.interviewQuestions.map((item) => (
            <div key={item.question} className="rounded-md border bg-slate-50 p-3">
              <p className="font-medium text-slate-950">{item.question}</p>
              <p className="mt-1 text-xs text-slate-500">{item.whyAsked}</p>
              <p className="mt-2 text-sm text-slate-700">{item.suggestedAnswer}</p>
            </div>
          ))}
        </div>
      </SectionShell>
      <TextBlock title="Preparation Plan" text={pack.preparationPlan.map((item, index) => `${index + 1}. ${item}`).join("\n")} />
      <TextBlock title="Follow-up Message" text={pack.followUpMessage} />
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
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionShell title="Career Memory Vault" description="CareerPath AI remembers reusable career proof so you do not rebuild from scratch every time.">
        <MemorySummary workspace={workspace} expanded />
      </SectionShell>
      <SectionShell title="Career Interview">
        <List items={(workspace?.careerProfile?.gaps ?? []).slice(0, 5).map((gap) => `${gap.question} (${gap.importance})`)} empty="No major missing details found yet." />
        <button
          type="button"
          onClick={() => onCommand("Use these answers to improve my resume: ")}
          className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Use answers to improve resume
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

function List({ items, empty = "Nothing yet." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm leading-6 text-slate-700">
      {items.map((item) => <li key={item}>- {item}</li>)}
    </ul>
  );
}
