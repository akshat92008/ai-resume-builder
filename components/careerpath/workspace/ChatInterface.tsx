import React, { useEffect, useRef } from "react";
import {
  ArrowUp,
  CircleAlert,
  FileUp,
  Loader2,
  Paperclip,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { Textarea, Button } from "@/components/ui";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { getApiError } from "@/lib/utils";
import type { CareerPathResume, CareerWorkspaceState, ResumeMessage } from "@/lib/careerpath/types";

const COMMAND_CHIPS = [
  "Build my Career Memory",
  "Should I apply to this job?",
  "Tailor my resume",
  "Find my biggest resume weakness",
  "Prepare me for an interview",
];

const THINKING_PHRASES = [
  "Reading your career evidence",
  "Checking claims against Career Memory",
  "Comparing the role with your proof",
  "Prioritizing the strongest signals",
  "Running the ATS and truth checks",
  "Preparing your next best action",
];

function ThinkingAnimation() {
  const [index, setIndex] = React.useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % THINKING_PHRASES.length), 2100);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 10, scale: 0.985 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: -8 }}
      className="relative mr-5 overflow-hidden rounded-[22px] border border-white/[0.09] bg-white/[0.055] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(99,102,241,0.20),transparent_46%)]" />
      <div className="relative flex items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/20">
          <motion.div animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="h-4 w-4" />
          </motion.div>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1019] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tracking-[-0.01em] text-white">CareerOS is working</p>
            <span className="rounded-full border border-indigo-400/15 bg-indigo-400/[0.09] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-indigo-200">Agent</span>
          </div>
          <div className="relative mt-1.5 h-5 overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={index}
                initial={reduce ? undefined : { opacity: 0, y: 8 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                className="absolute left-0 text-xs font-medium text-white/38"
              >
                {THINKING_PHRASES[index]}…
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <motion.div
        animate={reduce ? undefined : { x: ["-140%", "250%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
        className="absolute inset-y-0 w-24 skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl"
      />
    </motion.div>
  );
}

function formatMessageText(text: string) {
  return text.split("\n").map((line, index) => {
    const isBullet = line.trim().startsWith("- ");
    const content = isBullet ? line.replace(/^\s*-\s*/, "") : line;
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formatted = parts.map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={partIndex} className="font-semibold text-inherit">{part.slice(2, -2)}</strong>
      ) : part,
    );
    if (isBullet) {
      return <div key={index} className="mt-1.5 flex items-start gap-2"><span className="mt-0.5 text-indigo-300">•</span><span>{formatted}</span></div>;
    }
    if (!line.trim()) return <div key={index} className="h-2" />;
    return <p key={index} className={index > 0 ? "mt-1.5" : ""}>{formatted}</p>;
  });
}

type AgentResponse = {
  status?: "queued";
  jobId?: string;
  operationId?: string;
  assistantMessage?: string;
  resume?: CareerPathResume | null;
  resumeId?: string | null;
  workspace?: CareerWorkspaceState | null;
};

type AgentStatusResponse = {
  done?: boolean;
  operationId?: string;
  latestAssistant?: ResumeMessage | null;
  resume?: CareerPathResume | null;
  resumeId?: string | null;
  workspace?: CareerWorkspaceState | null;
};

function isAgentResponse(value: unknown): value is AgentResponse {
  return typeof value === "object" && value !== null;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  const textResponse = await response.text();
  throw new Error(`Server error (${response.status}): ${textResponse.substring(0, 150)}...`);
}

export function ChatInterface() {
  const reduce = useReducedMotion();
  const {
    messages,
    input,
    loading,
    error,
    setInput,
    setMessages,
    setLoading,
    setError,
    setRateLimitUntil,
    setCurrentResume,
    setCurrentResumeId,
    setActiveTab,
    setWorkspace,
    currentResumeId,
    setShowAchievementModal,
  } = useWorkspaceStore();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || "Failed to extract PDF");
      const prefix = input.trim() ? `${input}\n\n` : "";
      setInput(`${prefix}[Extracted from ${file.name}]:\n${data.text}`);
      textareaRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  function applyAgentPayload(data: AgentResponse | AgentStatusResponse) {
    if (data.resume) {
      setCurrentResume(data.resume);
      setCurrentResumeId(data.resumeId || data.resume.id);
      if (data.workspace?.achievementLog) setActiveTab("achievements");
      else if (data.workspace?.applicationPack) setActiveTab("cover");
      else if (data.workspace?.jobIntelligence) setActiveTab("job");
      else if (data.resume.tailoring) setActiveTab("tailor");
      else setActiveTab("dashboard");
    } else if (data.resumeId) {
      setCurrentResumeId(data.resumeId);
    }
    if (data.workspace) setWorkspace(data.workspace);
  }

  async function pollQueuedAgent(operationId: string, resumeId?: string | null) {
    const params = new URLSearchParams({ operationId });
    if (resumeId) params.set("resumeId", resumeId);

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt < 5 ? 1400 : 2800));
      const response = await fetch(`/api/resume-agent/status?${params.toString()}`, { cache: "no-store" });
      const data = await readJsonResponse(response);
      if (!response.ok) throw data;
      if (!isAgentResponse(data)) continue;
      const status = data as AgentStatusResponse;
      applyAgentPayload(status);
      if (status.done && status.latestAssistant) {
        const latestAssistant = status.latestAssistant;
        setMessages((previous) => previous.some((message) => message.id === latestAssistant.id)
          ? previous
          : [...previous, {
              id: latestAssistant.id,
              role: "assistant",
              content: latestAssistant.content,
              createdAt: latestAssistant.createdAt,
            }]);
        return;
      }
    }

    setMessages((previous) => [...previous, {
      id: `assistant_pending_${Date.now()}`,
      role: "assistant",
      content: "This operation is still finishing. Your result is safely queued and tied to this exact request.",
      createdAt: new Date().toISOString(),
    }]);
  }

  async function sendMessage(overrideText?: string) {
    const content = (overrideText || input).trim();
    if (!content || loading) return;
    if (!overrideText) setInput("");
    setError("");
    setLoading(true);

    setMessages((previous) => [...previous, {
      id: `user_${Date.now()}`,
      role: "user" as const,
      content,
      createdAt: new Date().toISOString(),
    }]);

    try {
      const response = await fetch("/api/resume-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, resumeId: currentResumeId || undefined }),
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        if (response.status === 429) {
          setRateLimitUntil(Date.now() + 30_000);
          throw new Error("RATE_LIMIT");
        }
        throw json;
      }
      if (!isAgentResponse(json)) throw new Error("Unexpected agent response.");

      if (json.status === "queued") {
        if (!json.operationId) throw new Error("The agent did not return an operation identifier.");
        await pollQueuedAgent(json.operationId, json.resumeId || currentResumeId);
        return;
      }

      setMessages((previous) => [...previous, {
        id: `assistant_${Date.now()}`,
        role: "assistant" as const,
        content: json.assistantMessage || "Done.",
        createdAt: new Date().toISOString(),
      }]);
      applyAgentPayload(json);
    } catch (caught: unknown) {
      if (caught instanceof Error && caught.message === "RATE_LIMIT") return;
      setError(getApiError(caught, "Something went wrong. Your data is saved. Try again."));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function useCommand(command: string) {
    if (command.startsWith("Log achievement")) {
      setShowAchievementModal(true);
      return;
    }
    setInput(command);
    textareaRef.current?.focus();
  }

  const hasConversation = messages.length > 0;

  return (
    <section className="no-print relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0b0e16]/82 text-white backdrop-blur-xl">
      <motion.div aria-hidden animate={reduce ? undefined : { x: [0, 50, 0], y: [0, 24, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-indigo-500/16 blur-[100px]" />
      <motion.div aria-hidden animate={reduce ? undefined : { y: [0, -30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-20 top-[38%] h-56 w-56 rounded-full bg-violet-500/10 blur-[90px]" />

      <div className="relative shrink-0 border-b border-white/[0.07] px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/90 to-violet-600/90 text-white shadow-[0_12px_32px_rgba(79,70,229,0.22)]">
            <WandSparkles className="h-4.5 w-4.5" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-[3px] border-[#0b0e16] bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold tracking-[-0.02em] text-white">CareerOS Agent</h1>
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300">Live</span>
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-white/28">Evidence-aware career copilot</p>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-0.5">
          {COMMAND_CHIPS.map((command) => (
            <button
              key={command}
              type="button"
              onClick={() => useCommand(command)}
              className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.045] px-3 py-1.5 text-[10px] font-semibold text-white/45 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/25 hover:bg-indigo-400/[0.09] hover:text-indigo-100"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      <div className="career-scrollbar relative min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {!hasConversation ? (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center"
          >
            <div className="relative">
              <motion.div aria-hidden animate={reduce ? undefined : { scale: [0.92, 1.16, 0.92], opacity: [0.3, 0.62, 0.3] }} transition={{ duration: 4.5, repeat: Infinity }} className="absolute inset-0 rounded-[32px] bg-indigo-500/30 blur-3xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-[0_20px_60px_rgba(79,70,229,0.30)]">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-6 text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">Start anywhere</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">Bring CareerOS something real.</h2>
            <p className="mt-2 max-w-[310px] text-sm leading-6 text-white/36">A messy resume. A job description. A project. A career question. It becomes structured evidence and a next move.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3.5 py-2 text-xs font-semibold text-white/65 transition hover:-translate-y-0.5 hover:border-indigo-400/25 hover:bg-white/[0.08] hover:text-white"
            >
              <FileUp className="h-3.5 w-3.5 text-indigo-300" />Import an existing resume
            </button>
          </motion.div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={reduce ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
              animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
              className={message.role === "assistant" ? "mr-5" : "ml-8"}
            >
              <div className={`relative overflow-hidden rounded-[22px] px-4 py-3.5 text-sm leading-6 ${message.role === "assistant"
                ? "border border-white/[0.08] bg-white/[0.055] text-white/68 shadow-[0_12px_34px_rgba(0,0,0,0.12)]"
                : "border border-indigo-400/15 bg-gradient-to-br from-indigo-600 to-violet-700 text-white/90 shadow-[0_16px_38px_rgba(79,70,229,0.20)]"
              }`}>
                {message.role === "assistant" ? <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-indigo-500/12 blur-3xl" /> : null}
                <div className={`relative mb-1.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.18em] ${message.role === "assistant" ? "text-indigo-300" : "text-white/45"}`}>
                  {message.role === "assistant" ? <Sparkles className="h-3 w-3" /> : null}
                  {message.role === "assistant" ? "CareerOS" : "You"}
                </div>
                <div className="relative">{formatMessageText(message.content)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && <ThinkingAnimation />}
        <div ref={chatEndRef} />
      </div>

      <AnimatePresence>
        {error ? (
          <motion.div initial={reduce ? undefined : { opacity: 0, y: 8 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: 6 }} className="relative shrink-0 px-4 pb-2 sm:px-5">
            <div className="relative overflow-hidden rounded-[18px] border border-amber-300/15 bg-amber-300/[0.075] p-3.5 text-amber-50 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
              <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-amber-300/10 blur-2xl" />
              <div className="relative flex items-start gap-2.5">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Request needs attention</p>
                  <p className="mt-1.5 text-xs leading-5 text-amber-50/70">{error}</p>
                  <p className="mt-2 text-[10px] leading-4 text-amber-100/40">Normal resumes, career facts and job descriptions are allowed. CareerOS only blocks direct attempts to override protected system rules.</p>
                </div>
                <button type="button" onClick={() => setError("")} className="rounded-lg p-1 text-amber-100/35 transition hover:bg-white/5 hover:text-amber-100" aria-label="Dismiss error"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative shrink-0 border-t border-white/[0.07] bg-[#0a0d15]/88 p-3.5 backdrop-blur-2xl sm:p-4">
        <div className="rounded-[22px] border border-white/[0.09] bg-white/[0.05] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition duration-200 focus-within:border-indigo-400/30 focus-within:bg-white/[0.065] focus-within:shadow-[0_20px_58px_rgba(79,70,229,0.12)]">
          <Textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CareerOS or paste a job description…"
            disabled={loading}
            className="min-h-[76px] resize-none border-0 bg-transparent p-2.5 text-sm text-white shadow-none placeholder:text-white/22 focus:ring-0"
          />
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/[0.06] px-1 pt-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} title="Upload a PDF" className="rounded-xl text-white/38 hover:bg-white/[0.06] hover:text-white">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                <span className="ml-1.5 hidden sm:inline">Attach</span>
              </Button>
              <span className="hidden items-center gap-1.5 text-[9px] font-semibold text-white/26 sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Verified claims</span>
            </div>
            <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="icon" className="h-9 w-9 rounded-xl bg-white text-slate-950 shadow-md hover:bg-indigo-100">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[8px] font-medium leading-4 text-white/20">CareerOS verifies generated claims against Career Memory. Review important details before applying.</p>
      </div>
    </section>
  );
}
