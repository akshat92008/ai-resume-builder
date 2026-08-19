import React, { useEffect, useRef } from "react";
import {
  ArrowUp,
  FileUp,
  Loader2,
  Paperclip,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Alert, Textarea, Button } from "@/components/ui";
import { motion, AnimatePresence } from "motion/react";
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
  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % THINKING_PHRASES.length), 2100);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative mr-6 overflow-hidden rounded-[22px] border border-indigo-200/70 bg-white/80 p-4 shadow-[0_16px_50px_rgba(79,70,229,0.10)] backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.14),transparent_42%)]" />
      <div className="relative flex items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-indigo-950/10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="h-4 w-4" />
          </motion.div>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tracking-[-0.01em] text-slate-950">CareerOS is working</p>
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-600">Agent</span>
          </div>
          <div className="relative mt-1.5 h-5 overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute left-0 text-xs font-medium text-slate-500"
              >
                {THINKING_PHRASES[index]}…
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <motion.div
        animate={{ x: ["-140%", "250%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
        className="absolute inset-y-0 w-28 skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent blur-xl"
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
        <strong key={partIndex} className="font-semibold text-slate-950">{part.slice(2, -2)}</strong>
      ) : part,
    );
    if (isBullet) {
      return <div key={index} className="mt-1.5 flex items-start gap-2"><span className="mt-0.5 text-indigo-500">•</span><span>{formatted}</span></div>;
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
    <section className="no-print relative flex min-h-[620px] h-full flex-col overflow-hidden border-r border-slate-200/70 bg-white/72 backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-indigo-200/30 blur-[90px]" />
      <div className="pointer-events-none absolute right-0 top-44 h-56 w-56 rounded-full bg-violet-100/40 blur-[90px]" />

      <div className="relative border-b border-slate-200/60 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
            <WandSparkles className="h-4.5 w-4.5" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-[3px] border-white bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">CareerOS Agent</h1>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-700">Ready</span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">Evidence-aware career copilot</p>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-0.5">
          {COMMAND_CHIPS.map((command) => (
            <button
              key={command}
              type="button"
              onClick={() => useCommand(command)}
              className="shrink-0 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      <div className="career-scrollbar relative flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {!hasConversation ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[330px] flex-col items-center justify-center px-4 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-indigo-400/20 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] border border-white bg-gradient-to-br from-slate-950 to-indigo-950 text-white shadow-[0_18px_40px_rgba(49,46,129,0.22)]">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-[-0.035em] text-slate-950">Start with anything.</h2>
            <p className="mt-2 max-w-[310px] text-sm leading-6 text-slate-500">A messy resume. A job link. A career question. CareerOS turns it into an evidence-backed next move.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
            >
              <FileUp className="h-3.5 w-3.5" />Import an existing resume
            </button>
          </motion.div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={message.role === "assistant" ? "mr-6" : "ml-9"}
            >
              <div className={`rounded-[22px] px-4 py-3.5 text-sm leading-6 ${message.role === "assistant"
                ? "border border-slate-200/80 bg-white/92 text-slate-700 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
                : "bg-gradient-to-br from-slate-950 to-slate-800 text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
              }`}>
                <div className={`mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] ${message.role === "assistant" ? "text-indigo-500" : "text-slate-400"}`}>
                  {message.role === "assistant" ? <Sparkles className="h-3 w-3" /> : null}
                  {message.role === "assistant" ? "CareerOS" : "You"}
                </div>
                <div>{formatMessageText(message.content)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && <ThinkingAnimation />}
        <div ref={chatEndRef} />
      </div>

      {error ? <div className="relative px-4 pb-2 sm:px-5"><Alert variant="error">{error}</Alert></div> : null}

      <div className="relative border-t border-slate-200/60 bg-white/80 p-3.5 backdrop-blur-xl sm:p-4">
        <div className="rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.07)] transition duration-200 focus-within:border-indigo-300 focus-within:shadow-[0_16px_48px_rgba(79,70,229,0.11)] focus-within:ring-4 focus-within:ring-indigo-500/[0.05]">
          <Textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CareerOS or paste a job description…"
            disabled={loading}
            className="min-h-[78px] resize-none border-0 bg-transparent p-2.5 text-sm shadow-none placeholder:text-slate-400 focus:ring-0"
          />
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} title="Upload a PDF" className="rounded-xl text-slate-500">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                <span className="ml-1.5 hidden sm:inline">Attach</span>
              </Button>
              <span className="hidden items-center gap-1.5 text-[10px] font-semibold text-slate-400 sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Verified claims</span>
            </div>
            <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="icon" className="h-9 w-9 rounded-xl bg-slate-950 shadow-md hover:bg-indigo-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[9px] font-medium leading-4 text-slate-400">CareerOS verifies generated claims against your Career Memory. Review important details before applying.</p>
      </div>
    </section>
  );
}
