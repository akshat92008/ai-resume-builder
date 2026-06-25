"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Briefcase, CheckCircle2, FileText, Link2, Loader2, Send, ShieldAlert, Sparkles, Upload } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress, Textarea } from "@/components/ui";
import { AGENT_PLACEHOLDER } from "@/lib/agent/prompts";
import { applyVaultUpdates } from "@/lib/agent/actions";
import { runCareerProofAgentCommand } from "@/lib/agent/simple-agent";
import { runCareerProofAgent } from "@/lib/agents/orchestrator";
import { getCurrentVault, getJobs, getResumes, saveCurrentVault, saveJob, saveResume } from "@/lib/repositories";
import type { AgentCommandOutput } from "@/lib/agents/types";
import type { Job, Resume, UserVault } from "@/lib/types";

const quickCommands = [
  "Build my resume",
  "Check my proof",
  "Improve my projects",
  "Analyze a job",
  "Publish portfolio",
];

export default function DashboardPage() {
  const [vault, setVault] = useState<UserVault | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [command, setCommand] = useState("");
  const [agentOutput, setAgentOutput] = useState<AgentCommandOutput | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savingUpdates, setSavingUpdates] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("onboarding=success")) {
      setTimeout(() => setShowSuccess(true), 0);
      window.history.replaceState({}, "", "/dashboard");
    }
    async function load() {
      const [vaultData, jobData, resumeData] = await Promise.all([getCurrentVault(), getJobs(), getResumes()]);
      setVault(vaultData);
      setJobs(jobData ?? []);
      setResumes(resumeData ?? []);
    }
    load();
  }, []);

  const review = useMemo(() => (vault ? runCareerProofAgent({ vault, intent: "check_proof", mode: "dashboard" }) : null), [vault]);

  async function runCommand(message: string) {
    if (!vault) return;
    const force = message.trim().toLowerCase() === "generate draft anyway";
    const output = runCareerProofAgentCommand({ userMessage: message, vault, mode: "dashboard", force });
    setAgentOutput(output);
    setCommand("");

    if (output.intent === "analyze_job" && output.result.jobFit && output.result.jobFit.jobFitScore > 0) {
      let jobTitle = output.result.jobFit.targetTitle;
      let company = output.result.jobFit.targetCompany || "Unknown";
      
      if (!jobTitle) {
        const firstLine = message.split("\n")[0]?.trim();
        if (firstLine && firstLine.length < 80 && firstLine.length > 3) {
          const atIndex = firstLine.toLowerCase().lastIndexOf(" at ");
          if (atIndex !== -1) {
            jobTitle = firstLine.substring(0, atIndex).replace(/^(i am applying for|applying to|role of|job of)\s+/i, "").trim() || "Target Role";
            company = firstLine.substring(atIndex + 4).trim() || company;
          } else {
            jobTitle = firstLine.replace(/^(i am applying for|applying to|role of|job of)\s+/i, "").trim();
          }
        } else {
          jobTitle = "Target Role";
        }
      }

      const newJob = {
        job_title: jobTitle,
        company_name: company,
        job_description: message,
        role_category: "software",
        experience_level: "fresher",
        analysis_json: output.result.jobFit,
        fit_score: output.result.jobFit.jobFitScore,
        style: "professional",
      } as unknown as Job;
      saveJob(newJob).then((saved) => {
        if (saved) {
          setJobs((prev) => [saved, ...prev]);
          setAgentOutput((prev) => prev ? { ...prev, createdJob: saved } : prev);
        }
      });
    }

    if (output.intent === "build_resume" && output.result.resume) {
      if (output.result.vaultReport.canGenerateResume || force) {
        const newResume = {
          title: "Proof-backed Resume",
          content_json: output.result.resume.content,
          style: "professional",
          proof_score: output.result.proofAudit?.proofScore || 0,
          warnings: [],
        } as unknown as Resume;
        saveResume(newResume).then((saved) => {
          if (saved) {
            setResumes((prev) => [saved, ...prev]);
            setAgentOutput((prev) => prev ? { ...prev, createdResume: saved } : prev);
          }
        });
      }
    }
  }

  async function saveExtractedUpdates() {
    if (!vault || !agentOutput?.extractedUpdates.length) return;
    setSavingUpdates(true);
    const nextVault = applyVaultUpdates(vault, agentOutput.extractedUpdates);
    await saveCurrentVault(nextVault);
    setVault(nextVault);
    setAgentOutput(runCareerProofAgentCommand({ userMessage: "Check my proof", vault: nextVault, mode: "dashboard" }));
    setSavingUpdates(false);
  }

  if (!vault || !review) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const knownItems = [
    ["Name", vault.profile.full_name || "I do not know your name yet."],
    ["Target role", vault.profile.target_roles[0] || "I do not know which job you are applying for."],
    ["Skills", vault.skills.length ? vault.skills.slice(0, 6).map((skill) => skill.name).join(", ") : "No skills saved yet."],
    ["Strongest projects", vault.projects.length ? vault.projects.slice(0, 3).map((project) => project.title).join(", ") : "I do not know your strongest project yet."],
    ["Proof links", `${vault.proof_links.length + vault.projects.filter((project) => project.github_url || project.live_url || project.case_study_url).length} saved`],
    ["Resume status", review.vaultReport.canGenerateResume ? "Ready to generate a draft" : "Needs more proof"],
    ["Portfolio status", vault.profile.portfolio_public ? "Public" : "Private"],
  ];

  const activeOutput = agentOutput;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {showSuccess && (
        <Alert variant="success" className="bg-emerald-50 text-emerald-900 border-emerald-200">
          <strong>Your Career Memory is ready.</strong> CareerProof Agent found your first improvement steps.
        </Alert>
      )}

      <section className="rounded-lg border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
              <Bot className="h-4 w-4" />
              CareerProof Agent
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950">
              Your AI career coach is ready.
            </h1>
            <p className="mt-2 text-slate-600">
              I am an AI agent that analyzes your Career Memory. I find proof gaps in your projects and generate recruiter-ready resumes and portfolios based on your data.
            </p>
          </div>
          <div className="w-full rounded-md border border-blue-100 bg-blue-50 p-4 lg:w-80">
            <div className="text-sm font-semibold text-blue-950">Career Memory Score</div>
            <div className="mt-1 text-4xl font-bold text-blue-950">
              {review.vaultReport.vaultReadiness}<span className="text-base font-normal text-blue-700">/100</span>
            </div>
            <p className="mt-1 text-sm text-blue-900">Measures profile completeness, project depth, and proof coverage.</p>
            <Progress value={review.vaultReport.vaultReadiness} className="mt-3" />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Textarea
            rows={4}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={AGENT_PLACEHOLDER}
            className="text-base"
          />
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((item) => (
              <Button key={item} type="button" variant="outline" size="sm" onClick={() => runCommand(item)}>
                {item}
              </Button>
            ))}
            <Button type="button" size="sm" onClick={() => runCommand(command || "Run agent review")} disabled={!command.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Run agent review
            </Button>
          </div>
        </div>
      </section>

      {activeOutput && (
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Sparkles className="h-4 w-4 text-blue-600" />
                CareerProof Agent
              </div>
              <p className="mt-2 text-slate-700">{activeOutput.response}</p>
            </div>
            {activeOutput.needsConfirmation && (
              <Button onClick={saveExtractedUpdates} disabled={savingUpdates}>
                {savingUpdates ? "Saving..." : "Save to Career Memory"}
              </Button>
            )}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {activeOutput.cards.slice(0, 6).map((card, index) => (
              <div key={`${card.title}-${index}`} className="rounded-md border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-950">{card.title}</h3>
                  {typeof card.score === "number" && <Badge variant="secondary">{card.score}/100</Badge>}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                {card.items && card.items.length > 0 && (
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    {card.items.slice(0, 4).map((item) => (
                      <div key={item}>- {item}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {activeOutput.suggestedActions && activeOutput.suggestedActions.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {activeOutput.suggestedActions.map((action) => (
                <Button key={action.label} asChild variant="outline" size="sm">
                  {action.href ? (
                    <Link href={action.href}>{action.label}</Link>
                  ) : (
                    <button type="button" onClick={() => runCommand(action.action)}>
                      {action.label}
                    </button>
                  )}
                </Button>
              ))}
            </div>
          )}
          {(activeOutput.createdJob || activeOutput.createdResume) && (
            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
              {activeOutput.createdJob && (
                <Button asChild variant="default" size="sm">
                  <Link href={`/jobs/${activeOutput.createdJob.id}`}>Open Job Analysis</Link>
                </Button>
              )}
              {activeOutput.createdResume && (
                <Button asChild variant="default" size="sm">
                  <Link href={`/resumes/${activeOutput.createdResume.id}`}>Open Resume</Link>
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Here is what I know about you</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {knownItems.map(([label, value]) => (
              <div key={label} className="rounded-md border bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Your next best action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-700">{review.nextActions.primaryNextAction}</p>
              <Button asChild className="mt-4 w-full">
                <Link href="/vault">Improve before applying</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-950">
                <ShieldAlert className="h-5 w-5" />
                Missing proof
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-amber-950">
              {(review.proofAudit.missingProof.length ? review.proofAudit.missingProof : ["No major proof gaps found."]).slice(0, 5).map((item) => (
                <div key={item} className="rounded-md border border-amber-200 bg-white/70 p-3">{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ActionButton href="/vault" icon={Upload} label="Improve Career Memory" />
            <ActionButton href="/jobs/new" icon={Briefcase} label="Analyze a job" />
            <ActionButton href="/resumes/new" icon={FileText} label="Generate resume" />
            <ActionButton href="/portfolio-settings" icon={Link2} label="Publish portfolio" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent resumes/jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...resumes.slice(0, 2).map((resume) => ({ href: `/resumes/${resume.id}`, label: resume.title, meta: `Resume Quality Score: ${resume.proof_score}/100` })),
              ...jobs.slice(0, 2).map((job) => ({ href: `/jobs/${job.id}`, label: job.job_title, meta: `Job Fit Score: ${job.fit_score}/100` }))].map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href} className="block rounded-md border bg-slate-50 p-3 hover:border-blue-200">
                <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
              </Link>
            ))}
            {resumes.length === 0 && jobs.length === 0 && (
              <div className="rounded-md border border-dashed bg-slate-50 p-5 text-center text-sm text-slate-500">
                Paste a job description or generate your first proof-backed resume.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ActionButton({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Button variant="outline" className="h-auto justify-start gap-3 p-4" asChild>
      <Link href={href}>
        <Icon className="h-4 w-4" />
        <span className="text-left">{label}</span>
      </Link>
    </Button>
  );
}
