import type { Job, JobAnalysis, Project, Resume, ResumeContent, ResumeWarning, UserVault } from "@/lib/types";

export type AgentMode = "dashboard" | "onboarding" | "job" | "resume" | "portfolio";

export type AgentIntent =
  | "build_resume"
  | "analyze_job"
  | "improve_project"
  | "check_proof"
  | "publish_portfolio"
  | "update_profile"
  | "add_project"
  | "add_skill"
  | "ask_question"
  | "unknown";

export type ScoreBand = "Weak" | "Building" | "Strong" | "Recruiter-ready";
export type ProjectHealthBand = "Too thin" | "Needs detail" | "Good" | "Strong proof";
export type ResumeQualityBand = "Not ready" | "Draft only" | "Usable" | "Strong";
export type JobFitBand = "Weak fit" | "Partial fit" | "Good fit" | "Strong fit";

export type CareerVaultReport = {
  vaultReadiness: number;
  readinessLabel: ScoreBand;
  profileCompleteness: number;
  projectDepth: number;
  proofCoverage: number;
  missingFields: string[];
  weakProjects: ProjectHealthReport[];
  strongProjects: ProjectHealthReport[];
  questionsToAsk: string[];
  nextActions: string[];
  canGenerateResume: boolean;
  blockingIssues: string[];
};

export type ProjectHealthReport = {
  projectId: string;
  title: string;
  projectHealth: number;
  healthLabel: ProjectHealthBand;
  missingDetails: string[];
  targetedQuestions: string[];
  suggestedStructure: {
    problemSolved: string;
    features: string[];
    techStack: string[];
    impact: string;
    proofNeeded: string[];
  };
  canGenerateResumeBullet: boolean;
};

export type ClaimProofItem = {
  label: string;
  url?: string;
  source: "profile" | "project" | "skill" | "experience" | "certificate" | "achievement" | "proof_link";
};

export type ClaimProofMapItem = {
  claim: string;
  source: string;
  proofFound: boolean;
  proofItems: ClaimProofItem[];
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type ProofAuditResult = {
  claimProofMap: ClaimProofMapItem[];
  unsupportedClaims: string[];
  weakClaims: string[];
  verifiedClaims: string[];
  proofScore: number;
  missingProof: string[];
  recommendations: string[];
};

export type JobFitAgentResult = JobAnalysis & {
  jobFitScore: number;
  fitLabel: JobFitBand;
  gapAnalysis: string[];
  proofWarnings: string[];
  interviewPrepSuggestions: string[];
  nextActionsBeforeApplying: string[];
};

export type ResumeAgentResult = {
  content: ResumeContent;
  warnings: ResumeWarning[];
};

export type ResumeCriticResult = {
  resumeQualityScore: number;
  qualityLabel: ResumeQualityBand;
  atsReadiness: number;
  proofBackedScore: number;
  genericLanguageIssues: string[];
  unsupportedClaims: string[];
  missingProof: string[];
  weakBullets: string[];
  recommendedEdits: string[];
  canUserDownload: boolean;
};

export type PortfolioAgentResult = {
  headline: string;
  summary: string;
  featuredProjects: {
    title: string;
    description: string;
    proofLinks: ClaimProofItem[];
  }[];
  skillsWithProof: string[];
  proofGaps: string[];
  whyHireThisCandidate: string;
  portfolioReadiness: number;
};

export type NextActionAgentResult = {
  primaryNextAction: string;
  secondaryActions: string[];
  blockedReasons: string[];
  upgradeSuggestion: string;
  learningSuggestions: string[];
  proofSuggestions: string[];
};

export type CareerProofAgentInput = {
  vault: UserVault;
  userMessage?: string;
  intent?: AgentIntent;
  currentJob?: Job | null;
  currentResume?: Resume | null;
  jobDescription?: string;
  mode?: AgentMode;
  resumeStyle?: string;
  forceResumeGeneration?: boolean;
};

export type CareerProofAgentResult = {
  mode: "vault_review" | "job_analysis" | "resume_generation" | "portfolio_review";
  intent: AgentIntent;
  vaultReport: CareerVaultReport;
  proofAudit: ProofAuditResult;
  jobFit?: JobFitAgentResult;
  projectExpansion?: ProjectHealthReport;
  resume?: ResumeAgentResult;
  resumeCritic?: ResumeCriticResult;
  portfolio?: PortfolioAgentResult;
  nextActions: NextActionAgentResult;
  blockingIssues: string[];
  warnings: string[];
};

export type AgentCardType =
  | "known_profile"
  | "missing_proof"
  | "weak_project"
  | "job_fit"
  | "resume_quality"
  | "next_action"
  | "extracted_update"
  | "warning";

export type AgentCard = {
  type: AgentCardType;
  title: string;
  body: string;
  items?: string[];
  score?: number;
};

export type SuggestedAction = {
  label: string;
  action: string;
  href?: string;
  payload?: Record<string, unknown>;
};

export type VaultUpdate =
  | { type: "profile"; data: Partial<UserVault["profile"]> }
  | { type: "education"; data: Partial<UserVault["education"][number]> & { degree: string } }
  | { type: "skill"; data: Partial<UserVault["skills"][number]> & { name: string } }
  | { type: "project"; data: Partial<Project> & { title: string } }
  | { type: "proof_link"; data: Partial<UserVault["proof_links"][number]> & { url: string } };

export type AgentCommandInput = {
  userMessage: string;
  vault: UserVault;
  currentJob?: Job | null;
  currentResume?: Resume | null;
  mode?: AgentMode;
};

export type AgentCommandOutput = {
  intent: AgentIntent;
  response: string;
  cards: AgentCard[];
  suggestedActions: SuggestedAction[];
  extractedUpdates: VaultUpdate[];
  createdJob?: Job;
  createdResume?: Resume;
  redirectTo?: string;
  needsConfirmation: boolean;
  blockingIssues: string[];
  nextBestAction: string;
  result: CareerProofAgentResult;
};
