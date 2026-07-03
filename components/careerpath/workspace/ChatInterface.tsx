import React, { useEffect, useRef } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Alert, Textarea, Button } from "@/components/ui";
import { motion, AnimatePresence } from "motion/react";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { getApiError } from "@/lib/utils";

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
  } = useWorkspaceStore();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      let data: any;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(`Server error (${res.status}): ${textResponse.substring(0, 150)}...`);
      }

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimitUntil(Date.now() + 30000);
          throw new Error("RATE_LIMIT");
        }
        throw data;
      }

      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: "assistant" as const,
        content: data.assistantMessage || "Done.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

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
    } catch (caught: any) {
      if (caught?.message === "RATE_LIMIT") return;
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
  );
}
