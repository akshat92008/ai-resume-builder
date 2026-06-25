import type { AgentIntent, CareerProofAgentInput, CareerProofAgentResult } from "./types";
import { inspectCareerVault } from "./career-vault-agent";
import { auditProof } from "./proof-auditor-agent";
import { expandProjectWithAgent } from "./project-expander-agent";
import { analyzeJobFit } from "./job-fit-agent";
import { generateResumeWithAgent } from "./resume-agent";
import { critiqueResumeWithAgent } from "./resume-critic-agent";
import { reviewPortfolioWithAgent } from "./portfolio-agent";
import { chooseNextAction } from "./next-action-agent";

function inferIntent(message = "", fallback: AgentIntent = "check_proof"): AgentIntent {
  const text = message.toLowerCase();
  if (/resume|cv/.test(text)) return "build_resume";
  if (/job description|jd|analy[sz]e.*job|role/.test(text)) return "analyze_job";
  if (/improve|expand|rewrite/.test(text) && /project/.test(text)) return "improve_project";
  if (/proof|claim|verify|audit|check/.test(text)) return "check_proof";
  if (/portfolio|publish/.test(text)) return "publish_portfolio";
  if (/github|linkedin|profile|about myself|target/.test(text)) return "update_profile";
  if (/built|created|developed|project/.test(text)) return "add_project";
  if (/skill|know|learned/.test(text)) return "add_skill";
  if (message.trim()) return "ask_question";
  return fallback;
}

export function runCareerProofAgent(input: CareerProofAgentInput): CareerProofAgentResult {
  const intent = input.intent ?? inferIntent(input.userMessage);
  const vaultReport = inspectCareerVault(input.vault);
  const proofAudit = auditProof(input.vault, input.currentResume?.content_json ?? null, input.currentJob?.analysis_json ?? null);
  const weakProject = vaultReport.weakProjects[0];
  const project = weakProject ? input.vault.projects.find((item) => item.id === weakProject.projectId) : null;
  const projectExpansion = project ? expandProjectWithAgent(project, input.vault.profile.target_roles[0] ?? "") : undefined;
  const jobDescription = input.jobDescription ?? input.currentJob?.job_description ?? "";
  const shouldAnalyzeJob = intent === "analyze_job" || Boolean(input.currentJob) || Boolean(jobDescription);
  const jobFit = shouldAnalyzeJob ? analyzeJobFit(input.vault, jobDescription, proofAudit) : undefined;

  const blockingIssues = [...vaultReport.blockingIssues];
  const warnings: string[] = [];

  if (!input.vault.profile.email) warnings.push("Email is missing. I can draft the resume, but add email before applying.");
  if (proofAudit.proofScore < 50) warnings.push("Needs more proof: important claims are not connected to GitHub, demos, certificates, or case studies.");

  const shouldGenerateResume = intent === "build_resume";
  const canGenerate = vaultReport.canGenerateResume;
  const actuallyGenerate = shouldGenerateResume && (canGenerate || input.forceResumeGeneration);
  const resume = actuallyGenerate
    ? generateResumeWithAgent(input.vault, jobFit ?? input.currentJob?.analysis_json ?? null, proofAudit, input.resumeStyle)
    : undefined;
  const resumeCritic = resume ? critiqueResumeWithAgent(resume.content, input.vault, auditProof(input.vault, resume.content, jobFit ?? null)) : undefined;
  const portfolio = intent === "publish_portfolio" || input.mode === "portfolio" ? reviewPortfolioWithAgent(input.vault, proofAudit) : undefined;
  const nextActions = chooseNextAction({
    vaultReport,
    proofAudit,
    jobFit,
    resumeCritic,
    portfolio,
    plan: input.vault.profile.plan,
  });

  if (shouldGenerateResume && !canGenerate && actuallyGenerate) {
    warnings.push("I generated a thin draft, but your resume is very weak. Please add more projects and skills to your Career Memory before applying.");
  }
  if (shouldGenerateResume && !canGenerate && !actuallyGenerate) {
    warnings.push("Your resume will be weak if I generate it now. Please add more projects and skills to your Career Memory before generating, or type 'Generate draft anyway'.");
  }
  if (resumeCritic && resumeCritic.resumeQualityScore < 60) {
    warnings.push("This resume is usable as a draft, but not yet recruiter-ready.");
  }

  const mode =
    intent === "build_resume"
      ? "resume_generation"
      : shouldAnalyzeJob
        ? "job_analysis"
        : intent === "publish_portfolio"
          ? "portfolio_review"
          : "vault_review";

  return {
    mode,
    intent,
    vaultReport,
    proofAudit,
    jobFit,
    projectExpansion,
    resume,
    resumeCritic,
    portfolio,
    nextActions,
    blockingIssues: shouldGenerateResume && !canGenerate ? blockingIssues : [],
    warnings: Array.from(new Set(warnings)),
  };
}
