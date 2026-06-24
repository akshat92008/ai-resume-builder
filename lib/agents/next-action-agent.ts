import type { CareerVaultReport, JobFitAgentResult, NextActionAgentResult, PortfolioAgentResult, ProofAuditResult, ResumeCriticResult } from "./types";

export function chooseNextAction({
  vaultReport,
  proofAudit,
  jobFit,
  resumeCritic,
  portfolio,
  plan,
}: {
  vaultReport: CareerVaultReport;
  proofAudit: ProofAuditResult;
  jobFit?: JobFitAgentResult;
  resumeCritic?: ResumeCriticResult;
  portfolio?: PortfolioAgentResult;
  plan?: string;
}): NextActionAgentResult {
  const blockedReasons = [...vaultReport.blockingIssues];
  const proofSuggestions = proofAudit.missingProof.slice(0, 4);
  const secondaryActions = [
    ...vaultReport.nextActions.slice(0, 3),
    ...(jobFit?.nextActionsBeforeApplying.slice(0, 2) ?? []),
    ...(resumeCritic?.recommendedEdits.slice(0, 2) ?? []),
  ].filter(Boolean);

  let primaryNextAction =
    vaultReport.questionsToAsk[0] ||
    proofSuggestions[0] ||
    jobFit?.nextActionsBeforeApplying[0] ||
    resumeCritic?.recommendedEdits[0] ||
    "Run a job description analysis before applying.";

  if (blockedReasons.length > 0) primaryNextAction = blockedReasons[0];
  else if (resumeCritic && resumeCritic.resumeQualityScore < 60) primaryNextAction = "Improve before applying: fix the resume quality warnings first.";
  else if (jobFit && jobFit.jobFitScore < 65) primaryNextAction = jobFit.nextActionsBeforeApplying[0] || "Close the job fit gaps before applying.";
  else if (portfolio && portfolio.portfolioReadiness < 65) primaryNextAction = "Publish or improve your recruiter portfolio.";

  return {
    primaryNextAction,
    secondaryActions: Array.from(new Set(secondaryActions)).slice(0, 5),
    blockedReasons,
    upgradeSuggestion: plan === "free" ? "" : "",
    learningSuggestions: jobFit?.missingSkills.slice(0, 3).map((skill) => `Build one small proof project for ${skill}.`) ?? [],
    proofSuggestions,
  };
}
