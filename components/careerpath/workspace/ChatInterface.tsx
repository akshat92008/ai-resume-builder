import React, { useEffect, useRef } from "react";
import { Loader2, Send, Sparkles, Paperclip, ShieldCheck } from "lucide-react";
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
  "Reading your evidence...",
  "Comparing role requirements...",
  "Checking unsupported claims...",
  "Prioritizing strongest proof...",
  "Updating your career context...",
  "Preparing the next best action...",
];

function ThinkingAnimation() {
  const [index, setIndex] = React.useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % THINKING_PHRASES.length), 2200);
    return () => clearInterval(timer);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 p-4 shadow-sm">
      <div className="relative z-10 flex items-center gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">CareerOS is reasoning</p>
          <div className="relative mt-1 h-5 overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 text-xs font-medium text-indigo-600">
                {THINKING_PHRASES[index]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <motion.div animate={{ x: ["-120%", "220%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-y-0 w-24 skew-x-12 bg-white/35 blur-xl" />
    </motion.div>
  );
}

function formatMessageText(text: string) {
  return text.split('\n').map((line, i) => {
    const isBullet = line.trim().startsWith('- ');
    const content = isBullet ? line.replace(/^\s*-\s*/, '') : line;
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formatted = parts.map((part, j) => part.startsWith("**") && part.endsWith("**") ? <strong key={j} className="font-semibold text-slate-950">{part.slice(2, -2)}</strong> : part);
    if (isBullet) return <div key={i} className="mt-1.5 flex items-start gap-2"><span className="mt-0.5 text-indigo-500">•</span><span>{formatted}</span></div>;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className={i > 0 ? "mt-1.5" : ""}>{formatted}</p>;
  });
}

type AgentResponse = { status?: "queued"; jobId?: string; queuedAt?: string; assistantMessage?: string; resume?: CareerPathResume | null; resumeId?: string | null; workspace?: CareerWorkspaceState | null; };
type AgentStatusResponse = { done?: boolean; latestAssistant?: ResumeMessage | null; resume?: CareerPathResume | null; resumeId?: string | null; workspace?: CareerWorkspaceState | null; };
function isAgentResponse(value: unknown): value is AgentResponse { return typeof value === "object" && value !== null; }
async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) return response.json();
  const textResponse = await response.text();
  throw new Error(`Server error (${response.status}): ${textResponse.substring(0, 150)}...`);
}

export function ChatInterface() {
  const { messages, input, loading, error, setInput, setMessages, setLoading, setError, setRateLimitUntil, setCurrentResume, setCurrentResumeId, setActiveTab, setWorkspace, currentResumeId, setShowAchievementModal } = useWorkspaceStore();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Only PDF files are supported"); return; }
    setUploading(true); setError("");
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Failed to extract PDF");
      const text = input.trim() ? input + "\n\n" : "";
      setInput(text + `[Extracted from ${file.name}]:\n${data.text}`);
      textareaRef.current?.focus();
    } catch (err: any) { setError(err.message || "Failed to upload file"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function applyAgentPayload(data: AgentResponse | AgentStatusResponse) {
    if (data.resume) {
      setCurrentResume(data.resume); setCurrentResumeId(data.resumeId || data.resume.id);
      if (data.workspace?.achievementLog) setActiveTab("achievements");
      else if (data.workspace?.applicationPack) setActiveTab("cover");
      else if (data.workspace?.jobIntelligence) setActiveTab("job");
      else if (data.resume.tailoring) setActiveTab("tailor");
      else setActiveTab("dashboard");
    } else if (data.resumeId) setCurrentResumeId(data.resumeId);
    if (data.workspace) setWorkspace(data.workspace);
  }

  async function pollQueuedAgent(queuedAt: string, resumeId?: string | null) {
    const params = new URLSearchParams({ after: queuedAt }); if (resumeId) params.set("resumeId", resumeId);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt < 4 ? 1500 : 3000));
      const response = await fetch(`/api/resume-agent/status?${params.toString()}`);
      const data = await readJsonResponse(response); if (!response.ok) throw data; if (!isAgentResponse(data)) continue;
      const status = data as AgentStatusResponse; applyAgentPayload(status);
      const latestAssistant = status.latestAssistant;
      if (status.done && latestAssistant) {
        setMessages((prev) => prev.some((msg) => msg.id === latestAssistant.id) ? prev : [...prev, { id: latestAssistant.id, role: "assistant", content: latestAssistant.content, createdAt: latestAssistant.createdAt }]);
        return;
      }
    }
    setMessages((prev) => [...prev, { id: `assistant_pending_${Date.now()}`, role: "assistant", content: "The analysis is still finishing. Your workspace will pick up the result when it completes.", createdAt: new Date().toISOString() }]);
  }

  async function sendMessage(overrideText?: string) {
    const content = (overrideText || input).trim(); if (!content || loading) return;
    if (!overrideText) setInput(""); setError(""); setLoading(true);
    const userMsg = { id: `user_${Date.now()}`, role: "user" as const, content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const res = await fetch("/api/resume-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, resumeId: currentResumeId || undefined }) });
      const json = await readJsonResponse(res);
      if (!res.ok) { if (res.status === 429) { setRateLimitUntil(Date.now() + 30000); throw new Error("RATE_LIMIT"); } throw json; }
      if (!isAgentResponse(json)) throw new Error("Unexpected agent response.");
      const data = json;
      if (data.status === "queued" && data.queuedAt) { await pollQueuedAgent(data.queuedAt, data.resumeId || currentResumeId); return; }
      setMessages((prev) => [...prev, { id: `assistant_${Date.now()}`, role: "assistant" as const, content: data.assistantMessage || "Done.", createdAt: new Date().toISOString() }]);
      applyAgentPayload(data);
    } catch (caught: unknown) {
      if (caught instanceof Error && caught.message === "RATE_LIMIT") return;
      setError(getApiError(caught, "Something went wrong. Your data is saved. Try again."));
    } finally { setLoading(false); textareaRef.current?.focus(); }
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  function useCommand(command: string) { if (command.startsWith("Log achievement")) { setShowAchievementModal(true); return; } setInput(command); textareaRef.current?.focus(); }

  const hasConversation = messages.length > 0;

  return (
    <section className="no-print flex min-h-[560px] h-full flex-col border-r border-slate-200/70 bg-white">
      <div className="border-b border-slate-100 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white"><Sparkles className="h-4 w-4" /></div><span className="text-[11px] font-bold uppercase tracking-[0.17em] text-indigo-600">Career intelligence</span></div>
            <h1 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-slate-950">What are you trying to achieve?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Give CareerOS your evidence, a job, or a decision. It will keep the reasoning tied to what you can actually prove.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {COMMAND_CHIPS.map((command) => <button key={command} type="button" onClick={() => useCommand(command)} className="rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">{command}</button>)}
        </div>
      </div>

      <div className="career-scrollbar flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {!hasConversation ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles className="h-5 w-5" /></div>
            <p className="mt-4 text-sm font-semibold text-slate-900">Start with whatever you have.</p>
            <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-500">Messy notes, a PDF resume, a job description, or simply “I don’t know why I’m not getting interviews.”</p>
          </div>
        ) : null}
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "assistant" ? "mr-4" : "ml-8"}>
            <div className={`rounded-2xl px-4 py-3.5 text-sm leading-6 shadow-sm ${msg.role === "assistant" ? "border border-slate-200 bg-white text-slate-700" : "bg-slate-950 text-slate-100"}`}>
              <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${msg.role === "assistant" ? "text-indigo-500" : "text-slate-400"}`}>{msg.role === "assistant" ? "CareerOS" : "You"}</div>
              <div>{formatMessageText(msg.content)}</div>
            </div>
          </div>
        ))}
        {loading && <ThinkingAnimation />}
        <div ref={chatEndRef} />
      </div>

      {error && <div className="px-4 pb-2 sm:px-5"><Alert variant="error">{error}</Alert></div>}

      <div className="border-t border-slate-100 bg-white/95 p-4 sm:p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2 shadow-[0_8px_26px_rgba(15,23,42,0.05)] transition focus-within:border-indigo-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/[0.06]">
          <Textarea ref={textareaRef} rows={2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Paste career evidence, a job description, or ask CareerOS what to do next..." disabled={loading} className="min-h-[80px] resize-none border-0 bg-transparent p-2 shadow-none focus:ring-0" />
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-200/70 px-1 pt-2">
            <div className="flex items-center gap-2">
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} title="Upload a PDF">
                {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" />}Attach PDF
              </Button>
              <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Evidence-first</span>
            </div>
            <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span className="mr-2">Send</span><Send className="h-3.5 w-3.5" /></>}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">CareerOS can make mistakes. Verify generated claims before you send an application.</p>
      </div>
    </section>
  );
}
