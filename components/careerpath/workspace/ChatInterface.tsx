import React, { useEffect, useRef } from "react";
import { Loader2, Send, Sparkles, Paperclip } from "lucide-react";
import { Alert, Textarea, Button } from "@/components/ui";
import { motion, AnimatePresence } from "motion/react";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { getApiError } from "@/lib/utils";
import type { CareerPathResume, CareerWorkspaceState, ResumeMessage } from "@/lib/careerpath/types";

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
  const [index, setIndex] = React.useState(0);

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
      className="relative flex flex-col gap-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 shadow-sm border border-blue-100 overflow-hidden"
    >
      {/* Animated gradient background sweep */}
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 pointer-events-none"
      />
      
      <div className="relative z-10 flex items-center gap-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100/80 shadow-inner">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.15, 1] }}
            transition={{ 
              rotate: { duration: 4, repeat: Infinity, ease: "linear" }, 
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } 
            }}
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
          </motion.div>
        </div>
        <div className="flex flex-col overflow-hidden w-full relative h-[38px] justify-center">
          <span className="font-semibold text-[13px] leading-tight text-blue-800">CareerPath AI is orchestrating...</span>
          <div className="relative h-[16px] w-full overflow-hidden mt-0.5">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute left-0 text-[12px] font-medium text-blue-600/80 whitespace-nowrap"
              >
                {THINKING_PHRASES[index]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Indeterminate pulsing progress bar */}
      <div className="relative z-10 h-1 w-full overflow-hidden rounded-full bg-blue-100/50 mt-1">
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80"
        />
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

type AgentResponse = {
  status?: "queued";
  jobId?: string;
  queuedAt?: string;
  assistantMessage?: string;
  resume?: CareerPathResume | null;
  resumeId?: string | null;
  workspace?: CareerWorkspaceState | null;
};

type AgentStatusResponse = {
  done?: boolean;
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
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
      
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract PDF");
      
      const text = input.trim() ? input + "\n\n" : "";
      setInput(text + `[Extracted from ${file.name}]:\n${data.text}`);
      textareaRef.current?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function pollQueuedAgent(queuedAt: string, resumeId?: string | null) {
    const params = new URLSearchParams({ after: queuedAt });
    if (resumeId) params.set("resumeId", resumeId);

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt < 4 ? 1500 : 3000));
      const response = await fetch(`/api/resume-agent/status?${params.toString()}`);
      const data = await readJsonResponse(response);
      if (!response.ok) throw data;
      if (!isAgentResponse(data)) continue;

      const status = data as AgentStatusResponse;
      applyAgentPayload(status);

      const latestAssistant = status.latestAssistant;
      if (status.done && latestAssistant) {
        setMessages((prev) => prev.some((msg) => msg.id === latestAssistant.id)
          ? prev
          : [
              ...prev,
              {
                id: latestAssistant.id,
                role: "assistant",
                content: latestAssistant.content,
                createdAt: latestAssistant.createdAt,
              },
            ]);
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant_pending_${Date.now()}`,
        role: "assistant",
        content: "I’m still working in the background. Refresh the workspace in a moment to pick up the completed result.",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async function sendMessage(overrideText?: string) {
    const content = (overrideText || input).trim();
    if (!content || loading) return;
    if (!overrideText) setInput("");
    setError("");
    setLoading(true);

    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user" as const,
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

      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimitUntil(Date.now() + 30000);
          throw new Error("RATE_LIMIT");
        }
        throw json;
      }

      if (!isAgentResponse(json)) {
        throw new Error("Unexpected agent response.");
      }

      const data = json;

      if (data.status === "queued" && data.queuedAt) {
        await pollQueuedAgent(data.queuedAt, data.resumeId || currentResumeId);
        return;
      }

      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: "assistant" as const,
        content: data.assistantMessage || "Done.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      applyAgentPayload(data);
    } catch (caught: unknown) {
      if (caught instanceof Error && caught.message === "RATE_LIMIT") return;
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

  function useCommand(command: string) {
    if (command.startsWith("Log achievement")) {
      setShowAchievementModal(true);
      return;
    }
    setInput(command);
    textareaRef.current?.focus();
  }

  return (
    <section className="no-print flex min-h-[520px] flex-col border-r bg-white h-full">
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
        {loading && <ThinkingAnimation />}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="px-4 pb-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="border-t bg-white p-4">
        <div className="flex gap-2 items-end">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            title="Upload PDF (e.g. Certificate, Job Description, old Resume)"
            className="mb-0 shrink-0 self-end"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
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
  );
}
