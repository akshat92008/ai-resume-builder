"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FolderOpen,
  Loader2,
  LogOut,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { Alert, Button, Textarea } from "@/components/ui";
import { ResumeDocument } from "@/components/careerpath/ResumeDocument";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CareerPathResume, ResumeMessage, AgentIntent } from "@/lib/careerpath/types";
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
    "Welcome to CareerPath AI! Tell me what you want to do.\n\nExamples:\n• \"Build my resume from this information…\"\n• Paste your current resume and say \"Improve this\"\n• Paste a job description and say \"Tailor my resume to this job\"\n• \"Add this project: [details]\"\n• \"Rewrite my summary\"\n• \"Download PDF\"",
  createdAt: new Date().toISOString(),
};

const THINKING_PHRASES = [
  "Analyzing input data...",
  "Cross-referencing skills...",
  "Structuring resume sections...",
  "Drafting professional summary...",
  "Refining bullet points...",
  "Optimizing for ATS compatibility...",
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
      };

      if (data.resume) {
        setCurrentResume(data.resume);
        setCurrentResumeId(data.resumeId || data.resume.id);
      }

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
      } else if (data.resumeId) {
        setCurrentResumeId(data.resumeId);
      }
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

      {/* Main workspace */}
      <main className="flex min-h-0 flex-1">
        {/* Chat panel */}
        <div className="no-print flex w-full flex-col border-r bg-white lg:w-[440px] xl:w-[480px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

          {/* Error */}
          {error && (
            <div className="px-4 pb-2">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          {/* Input */}
          <div className="border-t bg-white p-4">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or paste career details..."
                disabled={loading}
                className="min-h-[52px] flex-1 resize-none"
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
        </div>

        {/* Resume preview */}
        <div className="hidden flex-1 overflow-y-auto bg-slate-100 p-6 lg:block print:block print:bg-white print:p-0 print:overflow-visible">
          {currentResume ? (
            <div className="mx-auto max-w-[800px]">
              <div className="no-print mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {currentResume.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {currentResume.targetRole} | Score:{" "}
                    {currentResume.score?.overall ?? "—"}/100 | v
                    {currentResume.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">
                    Live Preview
                  </span>
                </div>
              </div>
              <ResumeDocument content={currentResume.content} />
            </div>
          ) : (
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                  Resume preview will appear here
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Start by typing in the chat. Paste your career details, and
                  CareerPath AI will build your resume.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile preview — shown below chat on small screens */}
        {currentResume && (
          <div className="border-t p-4 lg:hidden print:hidden">
            <details className="group">
              <summary className="no-print flex cursor-pointer items-center gap-2 rounded-lg bg-white p-3 text-sm font-medium text-slate-700 shadow-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                View Resume Preview
                <span className="ml-auto text-xs text-slate-400">
                  Score: {currentResume.score?.overall ?? "—"}/100
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
