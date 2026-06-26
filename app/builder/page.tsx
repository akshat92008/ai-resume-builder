"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Briefcase, CheckCircle2, FileText, Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { ResumeDocument } from "@/components/careerpath/ResumeDocument";
import { ScorePanel } from "@/components/careerpath/ScorePanel";
import { saveCareerPathResume } from "@/lib/careerpath/client-store";
import type { BuilderMode, ChatMessage, CareerPathResume } from "@/lib/careerpath/types";
import { getApiError } from "@/lib/utils";

const modeOptions: {
  mode: BuilderMode;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    mode: "build",
    title: "Build Resume",
    description: "Start from messy notes, projects, skills, education, and links.",
    icon: FileText,
  },
  {
    mode: "improve",
    title: "Improve Resume",
    description: "Paste an existing resume and get a stronger version.",
    icon: Wand2,
  },
  {
    mode: "tailor",
    title: "Tailor to Job",
    description: "Compare your resume to a job description without fake skills.",
    icon: Briefcase,
  },
];

const progressLabels = [
  "Reading your details",
  "Finding missing information",
  "Writing your resume",
  "Checking ATS strength",
  "Preparing preview",
];

export default function BuilderPage() {
  return (
    <Suspense fallback={<BuilderShellFallback />}>
      <BuilderExperience />
    </Suspense>
  );
}

function BuilderExperience() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") as BuilderMode | null;
  const [mode, setMode] = useState<BuilderMode | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [resume, setResume] = useState<CareerPathResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completedProgress, setCompletedProgress] = useState<string[]>([]);

  useEffect(() => {
    if (initialMode && modeOptions.some((option) => option.mode === initialMode)) {
      startMode(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  const placeholder = useMemo(() => {
    if (mode === "improve") return "Paste your existing resume text...";
    if (mode === "tailor") return "Paste your resume first, then I will ask for the job description...";
    return "Type your answer or paste messy career details...";
  }, [mode]);

  async function startMode(nextMode: BuilderMode) {
    setLoading(true);
    setError("");
    setResume(null);
    setCompletedProgress([]);
    try {
      const response = await fetch("/api/builder/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        message?: string;
        session?: { messages?: ChatMessage[] };
        error?: string;
      };
      if (!response.ok || !data.sessionId) throw data;
      setMode(nextMode);
      setSessionId(data.sessionId);
      setMessages(data.session?.messages ?? [
        {
          id: "opening",
          role: "assistant",
          content: data.message ?? "Paste your details. Messy is fine.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (caught) {
      setError(getApiError(caught, "Unable to start builder."));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!sessionId || !input.trim()) return;
    const content = input.trim();
    setInput("");
    setError("");
    setLoading(true);
    setCompletedProgress([progressLabels[0]]);
    setMessages((current) => [
      ...current,
      { id: `local_${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() },
    ]);

    try {
      const response = await fetch("/api/builder/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: content }),
      });
      const data = (await response.json()) as {
        assistantMessage?: string;
        state?: string;
        resume?: CareerPathResume;
        error?: string;
      };
      if (!response.ok) throw data;
      setMessages((current) => [
        ...current,
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: data.assistantMessage ?? "",
          createdAt: new Date().toISOString(),
        },
      ]);
      if (data.resume) {
        const saved = saveCareerPathResume(data.resume);
        setResume(saved);
        setCompletedProgress(progressLabels);
      } else {
        setCompletedProgress(progressLabels.slice(0, 2));
      }
    } catch (caught) {
      setError(getApiError(caught, "I had trouble generating the resume. Your data is saved. Try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge className="bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-white">Chat {"->"} Resume {"->"} Score {"->"} Improve {"->"} PDF</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">CareerPath AI Builder</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Choose a flow, chat naturally, and let the resume agent do the heavy lifting quietly behind the scenes.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Saved resumes</Link>
          </Button>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        <section className="grid gap-4 md:grid-cols-3">
          {modeOptions.map((option) => {
            const Icon = option.icon;
            const selected = mode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => startMode(option.mode)}
                className={`rounded-lg border bg-white p-5 text-left shadow-sm transition hover:border-blue-300 ${selected ? "border-blue-500 ring-2 ring-blue-100" : ""}`}
              >
                <Icon className="h-7 w-7 text-blue-600" />
                <div className="mt-4 font-semibold text-slate-950">{option.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
              </button>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Guided chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!mode && (
                  <div className="rounded-md border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
                    Pick Build Resume, Improve Resume, or Tailor to Job to begin.
                  </div>
                )}
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <ChatLine key={message.id} message={message} />
                  ))}
                </div>
                <Textarea
                  rows={5}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={placeholder}
                  disabled={!mode || loading}
                />
                <Button onClick={sendMessage} disabled={!mode || !input.trim() || loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progressLabels.map((label) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={`h-4 w-4 ${completedProgress.includes(label) ? "text-emerald-600" : "text-slate-300"}`} />
                    <span className={completedProgress.includes(label) ? "text-slate-950" : "text-slate-500"}>{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            {resume ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm">
                  <div>
                    <div className="font-semibold text-slate-950">{resume.title}</div>
                    <div className="text-sm text-slate-500">{resume.targetRole} | Version {resume.version}</div>
                  </div>
                  <Button asChild>
                    <Link href={`/resume/${resume.id}`}>
                      Open final resume <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <ScorePanel score={resume.score} audit={resume.audit} />
                <ResumeDocument content={resume.content} />
              </>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
                <div>
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">Your resume preview will appear here.</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">CareerPath AI will ask for missing details before generating if your input is too thin.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ChatLine({ message }: { message: ChatMessage }) {
  const assistant = message.role === "assistant";
  return (
    <div className={`rounded-md p-3 text-sm leading-6 ${assistant ? "bg-blue-50 text-blue-950" : "bg-slate-100 text-slate-800"}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide">{assistant ? "CareerPath AI" : "You"}</div>
      <p className="whitespace-pre-wrap">{message.content}</p>
    </div>
  );
}

function BuilderShellFallback() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-500">Loading builder...</div>
    </div>
  );
}
