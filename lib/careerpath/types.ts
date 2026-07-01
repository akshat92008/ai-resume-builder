import { z } from "zod";

export type BuilderMode = "build" | "improve" | "tailor";

export type BuilderState =
  | "collect_goal"
  | "collect_profile"
  | "collect_job"
  | "needs_info"
  | "ready_to_generate"
  | "generated";

export type ChatRole = "assistant" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type CareerPathProfile = {
  id: string;
  userId: string;
  personal: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  target: {
    role: string;
    industry: string;
    experienceLevel: string;
  };
  education: {
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
    score: string;
    location: string;
  }[];
  skills: {
    programming: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    aiTools: string[];
    softSkills: string[];
  };
  projects: {
    name: string;
    description: string;
    techStack: string[];
    problemSolved: string;
    features: string[];
    impact: string;
    links: string[];
  }[];
  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
    achievements: string[];
  }[];
  certifications: {
    name: string;
    issuer: string;
    date: string;
    credentialLink: string;
  }[];
  achievements: string[];
  languages: string[];
  rawNotes: string;
  confidenceNotes: string[];
  existingResumeText?: string;
};

export type CareerPathResumeContent = {
  header: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links: {
      linkedin?: string;
      github?: string;
      portfolio?: string;
    };
  };
  summary: string;
  skills: {
    category: string;
    items: string[];
  }[];
  experience: {
    company: string;
    role: string;
    dates: string;
    location?: string;
    bullets: string[];
  }[];
  projects: {
    name: string;
    techStack: string[];
    link?: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    dates?: string;
    score?: string;
    location?: string;
  }[];
  certifications: {
    name: string;
    issuer?: string;
    date?: string;
    link?: string;
  }[];
  achievements: string[];
  languages: string[];
};

export const ResumeContentSchema = z.object({
  header: z.object({
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    links: z.object({
      linkedin: z.string().optional().nullable(),
      github: z.string().optional().nullable(),
      portfolio: z.string().optional().nullable(),
    }).optional().nullable(),
  }).optional().nullable(),
  summary: z.string().max(3000).optional().nullable(),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string().max(200)),
  })).optional().nullable(),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    dates: z.string(),
    location: z.string().optional().nullable(),
    bullets: z.array(z.string().max(1000)),
  })).optional().nullable(),
  projects: z.array(z.object({
    name: z.string(),
    techStack: z.array(z.string()),
    link: z.string().optional().nullable(),
    bullets: z.array(z.string().max(1000)),
  })).optional().nullable(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    dates: z.string().optional().nullable(),
    score: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
  })).optional().nullable(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    link: z.string().optional().nullable(),
  })).optional().nullable(),
  achievements: z.array(z.string().max(1000)).optional().nullable(),
  languages: z.array(z.string().max(100)).optional().nullable(),
});

export const ResumePayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  targetRole: z.string().optional(),
  content: ResumeContentSchema.optional().nullable(),
});

export function mergeResumeContent(base: CareerPathResumeContent, patch: Partial<CareerPathResumeContent>): CareerPathResumeContent {
  return {
    ...base,
    ...patch,
    header: {
      ...base.header,
      ...patch.header,
      links: {
        ...base.header?.links,
        ...patch.header?.links,
      },
    },
    summary: patch.summary ?? base.summary ?? "",
    skills: patch.skills ?? base.skills ?? [],
    experience: patch.experience ?? base.experience ?? [],
    projects: patch.projects ?? base.projects ?? [],
    education: patch.education ?? base.education ?? [],
    certifications: patch.certifications ?? base.certifications ?? [],
    achievements: patch.achievements ?? base.achievements ?? [],
    languages: patch.languages ?? base.languages ?? [],
  };
}

export type CareerPathResumeScore = {
  overall: number;
  atsCompatibility: number;
  roleAlignment: number;
  keywordCoverage: number;
  bulletStrength: number;
  clarity: number;
  proofAndMetrics: number;
  onePageFit: number;
  formattingSafety: number;
  truthfulness: number;
};

export type CareerPathAuditIssue = {
  type: string;
  section: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type CareerPathResumeAudit = {
  score: CareerPathResumeScore;
  issues: CareerPathAuditIssue[];
  recommendedFixes: string[];
  summary: string;
};

export type CareerPathResume = {
  id: string;
  userId: string;
  profileId?: string;
  title: string;
  targetRole: string;
  mode: BuilderMode;
  status: "draft" | "needs_info" | "generated" | "audited" | "final";
  content: CareerPathResumeContent;
  profile?: CareerPathProfile;
  careerProfile?: CareerProfile;
  resumeDocument?: ResumeDocument;
  applicationPack?: ApplicationPack;
  applications?: JobApplication[];
  jobSearchInsights?: JobSearchInsight[];
  score?: CareerPathResumeScore;
  audit?: CareerPathResumeAudit;
  jobDescription?: string;
  tailoring?: CareerPathTailoringResult;
  version: number;
  createdAt: string;
  updatedAt: string;
  // Differentiation feature results
  starInterview?: StarInterviewResult;
  humanizedResume?: HumanizedResume;
  impactEstimates?: ImpactEstimateResult;
  gapAnalysis?: GapAnalysisResult;
  multiPersona?: MultiPersonaResult;
  atsView?: ATSParseResult;
  outreachPack?: OutreachPack;
};

export type GapQuestion = {
  question: string;
  reason: string;
  priority: "critical" | "recommended";
};

export type GapReport = {
  readyToGenerate: boolean;
  criticalMissing: string[];
  recommendedMissing: string[];
  resumeRisk: string[];
  questionsToAsk: GapQuestion[];
};

export type BuilderSession = {
  id: string;
  userId: string;
  mode: BuilderMode;
  targetRole: string;
  currentStep: BuilderState;
  profile: CareerPathProfile;
  messages: ChatMessage[];
  missingQuestions: GapQuestion[];
  resumeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerPathTailoringResult = {
  matchScore: number;
  matchedKeywords: string[];
  safeKeywordsAdded: string[];
  missingKeywordsNotAdded: string[];
  tailoringSummary: string[];
  tailoredResume: CareerPathResumeContent;
};

export type ProofLevel = "verified" | "strong" | "estimated" | "weak" | "risky";

export type EducationItem = {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  location?: string;
  notes?: string;
};

export type ExperienceItem = {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  responsibilities: string[];
  achievements: AchievementItem[];
  technologies: string[];
  proofLevel?: ProofLevel;
};

export type ProjectItem = {
  id: string;
  name: string;
  description?: string;
  role?: string;
  technologies: string[];
  links: LinkItem[];
  achievements: AchievementItem[];
  status?: "idea" | "built" | "deployed" | "users" | "revenue" | "archived";
  proofLevel?: ProofLevel;
};

export type SkillItem = {
  id: string;
  name: string;
  category?: "technical" | "soft" | "tool" | "language" | "domain";
  proficiency?: "beginner" | "intermediate" | "advanced" | "expert";
  evidence?: string[];
};

export type CertificationItem = {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  credentialUrl?: string;
  skills?: string[];
};

export type AchievementItem = {
  id: string;
  text: string;
  metric?: string;
  context?: string;
  impact?: string;
  evidence?: string;
  proofLevel: ProofLevel;
};

export type LinkItem = {
  id: string;
  label: string;
  url: string;
  type?: "linkedin" | "github" | "portfolio" | "demo" | "certificate" | "other";
};

export type RawCareerInput = {
  id: string;
  content: string;
  source?: "chat" | "resume_upload" | "manual" | "job_description";
  createdAt: string;
};

export type CareerGap = {
  id: string;
  area: string;
  question: string;
  importance: "low" | "medium" | "high";
  status: "open" | "answered" | "ignored";
};

export type CareerStrength = {
  id: string;
  title: string;
  explanation: string;
  relatedItems: string[];
};

export type CareerWeakness = {
  id: string;
  title: string;
  explanation: string;
  suggestedFix: string;
};

export type CareerProfile = {
  id: string;
  userId?: string | null;
  personal: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  target: {
    targetRoles: string[];
    targetIndustries: string[];
    targetLocations: string[];
    workPreference?: "remote" | "hybrid" | "onsite" | "any";
    experienceLevel?: "student" | "fresher" | "intern" | "junior" | "mid" | "senior" | "career_switcher";
  };
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  certifications: CertificationItem[];
  achievements: AchievementItem[];
  links: LinkItem[];
  rawInputs: RawCareerInput[];
  gaps: CareerGap[];
  strengths: CareerStrength[];
  weaknesses: CareerWeakness[];
  createdAt: string;
  updatedAt: string;
};

export type AchievementMiningResult = {
  suggestedAchievements: AchievementItem[];
  questions: CareerGap[];
  weakBullets: string[];
  strongBullets: string[];
};

export type ResumeVersionType =
  | "master"
  | "fresher"
  | "internship"
  | "frontend"
  | "fullstack"
  | "ai_product"
  | "startup"
  | "corporate"
  | "job_specific";

export type ResumeSection = {
  id: string;
  type:
    | "summary"
    | "skills"
    | "experience"
    | "projects"
    | "education"
    | "certifications"
    | "achievements"
    | "links";
  title: string;
  order: number;
  content: unknown;
};

export type ResumeBullet = {
  id: string;
  text: string;
  sourceType: "experience" | "project" | "achievement" | "education" | "skill";
  sourceId?: string;
  proofLevel: ProofLevel;
  riskFlags: string[];
};

export type ResumeScore = {
  overall: number;
  roleMatch: number;
  keywordMatch: number;
  proofStrength: number;
  readability: number;
  seniorityFit: number;
  atsCompatibility: number;
  explanation: string;
};

export type ResumeDocument = {
  id: string;
  profileId: string;
  title: string;
  targetRole?: string;
  versionType: ResumeVersionType;
  sections: ResumeSection[];
  bullets: ResumeBullet[];
  score?: ResumeScore;
  createdAt: string;
  updatedAt: string;
};

export type SmartResumeVersion = {
  versionType: ResumeVersionType;
  title: string;
  whenToUse: string;
  emphasizes: string[];
  reduces: string[];
  missing: string[];
};

export type JobDescription = {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  rawText: string;
  extractedSkills: string[];
  responsibilities: string[];
  requiredExperience?: string;
  seniority?: string;
  keywords: string[];
  createdAt: string;
};

export type TailoringResult = {
  resume: ResumeDocument;
  matchScore: ResumeScore;
  keywordMatches: string[];
  missingKeywords: string[];
  suggestedImprovements: string[];
  riskWarnings: string[];
  recruiterSummary: string;
};

export type InterviewQuestion = {
  question: string;
  whyAsked: string;
  suggestedAnswer: string;
};

export type ApplicationPack = {
  id: string;
  jobId: string;
  resumeId: string;
  coverLetter: string;
  recruiterDM: string;
  coldEmail: string;
  linkedinMessage: string;
  whyFitAnswer: string;
  interviewQuestions: InterviewQuestion[];
  missingSkills: string[];
  preparationPlan: string[];
  followUpMessage: string;
  createdAt: string;
};

export type JobApplicationStatus =
  | "saved"
  | "applied"
  | "follow_up_needed"
  | "interview"
  | "rejected"
  | "offer"
  | "ghosted";

export type JobApplication = {
  id: string;
  userId?: string | null;
  company: string;
  role: string;
  jobUrl?: string;
  jobDescriptionId?: string;
  resumeId?: string;
  applicationPackId?: string;
  status: JobApplicationStatus;
  appliedAt?: string;
  followUpAt?: string;
  notes?: string;
  outcome?: {
    gotReply?: boolean;
    gotInterview?: boolean;
    rejected?: boolean;
    offer?: boolean;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type JobSearchInsight = {
  id: string;
  type:
    | "resume_issue"
    | "targeting_issue"
    | "keyword_issue"
    | "proof_issue"
    | "follow_up_issue"
    | "skill_gap"
    | "positive_signal";
  title: string;
  explanation: string;
  suggestedAction: string;
  priority: "low" | "medium" | "high";
};

export type CareerCommandIntent =
  | "build_career_profile"
  | "answer_interview_questions"
  | "generate_resume"
  | "generate_resume_version"
  | "tailor_resume_to_job"
  | "generate_application_pack"
  | "track_job_application"
  | "analyze_job_search"
  | "improve_resume"
  | "general_career_question";

export type CareerContext = {
  profile?: CareerProfile | null;
  resume?: CareerPathResume | null;
  applications?: JobApplication[];
};

export type CareerCommandResult = {
  intent: CareerCommandIntent;
  shouldGenerateResume: boolean;
  shouldTailor: boolean;
  shouldGenerateApplicationPack: boolean;
  shouldTrackApplication: boolean;
  shouldAnalyzeSearch: boolean;
  suggestedResponse: string;
};

export type CareerWorkspaceState = {
  careerProfile?: CareerProfile | null;
  mining?: AchievementMiningResult | null;
  smartVersions?: SmartResumeVersion[];
  applicationPack?: ApplicationPack | null;
  applications?: JobApplication[];
  insights?: JobSearchInsight[];
  jobDescription?: JobDescription | null;
  command?: CareerCommandResult | null;
};

// ---------------------------------------------------------------------------
// Chat-first Agent Types
// ---------------------------------------------------------------------------

export type AgentIntent =
  | "CREATE_RESUME"
  | "IMPROVE_RESUME"
  | "TAILOR_TO_JOB"
  | "GENERATE_RESUME_VERSION"
  | "GENERATE_APPLICATION_PACK"
  | "TRACK_JOB_APPLICATION"
  | "ANALYZE_JOB_SEARCH"
  | "ADD_INFORMATION"
  | "REWRITE_SECTION"
  | "ASK_MISSING_INFO"
  | "GENERATE_PDF"
  | "GENERAL_HELP"
  // Differentiation features
  | "STAR_INTERVIEW"
  | "HUMANIZE_RESUME"
  | "ESTIMATE_IMPACT"
  | "GAP_ANALYSIS"
  | "MULTI_PERSONA"
  | "VISUALIZE_ATS"
  | "GENERATE_OUTREACH";

export type ResumeMessage = {
  id: string;
  userId: string;
  resumeId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string;
  createdAt: string;
};

export type ResumeVersion = {
  id: string;
  userId: string;
  resumeId: string;
  versionName?: string;
  resumeJson: CareerPathResumeContent;
  reason?: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Differentiation Feature Result Types
// ---------------------------------------------------------------------------

/** STAR Interviewer — follow-up questions to extract hidden value */
export type StarInterviewQuestion = {
  id: string;
  question: string;
  context: string; // why this question matters
  category: "situation" | "task" | "action" | "result" | "metric";
  targetBullet?: string; // which existing bullet this will improve
};

export type StarInterviewResult = {
  questions: StarInterviewQuestion[];
  vagueBullets: string[]; // bullets that triggered the questions
  summary: string;
};

/** Anti-BS Authenticity Engine — humanized resume */
export type HumanizedChange = {
  original: string;
  humanized: string;
  reason: string; // e.g. "Removed AI cliché: spearheaded"
  section: string;
};

export type HumanizedResume = {
  content: CareerPathResumeContent;
  changes: HumanizedChange[];
  clisheesRemoved: string[];
  summary: string;
};

/** Quantitative Impact Estimator */
export type ImpactSuggestion = {
  id: string;
  bulletText: string; // original weak bullet
  suggestedMetric: string; // e.g. "reduced load time by ~40%"
  confidence: "high" | "medium" | "low";
  rationale: string; // why this estimate is reasonable
  improvedBullet: string; // full rewritten bullet
  section: string;
  itemName: string;
};

export type ImpactEstimateResult = {
  suggestions: ImpactSuggestion[];
  summary: string;
};

/** Strategic Career Gap Analyzer */
export type SkillGap = {
  skill: string;
  importance: "critical" | "recommended" | "bonus";
  category: string;
  evidence: string; // why this skill matters for the role
  projectIdea?: string; // weekend project to fill the gap
  learningResource?: string;
};

export type GapAnalysisResult = {
  targetRole: string;
  matchScore: number; // 0–100
  strengths: string[];
  gaps: SkillGap[];
  weekendProjects: { title: string; description: string; skills: string[] }[];
  summary: string;
  readyToApply: boolean;
};

/** Multi-Persona Resume Generator */
export type PersonaResume = {
  persona: string; // e.g. "Frontend Developer"
  whenToUse: string;
  emphasis: string[];
  resume: CareerPathResumeContent;
  differenceFromMaster: string[];
};

export type MultiPersonaResult = {
  personas: PersonaResume[];
  masterRole: string;
  summary: string;
};

/** ATS Visualizer */
export type ATSSection = {
  sectionName: string;
  rawText: string; // what ATS would extract
  issues: {
    type: "parse_failure" | "encoding_issue" | "missing_field" | "formatting_risk";
    description: string;
    severity: "high" | "medium" | "low";
  }[];
  atsScore: number; // 0–100 for this section
};

export type ATSParseResult = {
  sections: ATSSection[];
  overallATSScore: number;
  criticalFailures: string[];
  passedChecks: string[];
  summary: string;
};

/** Networking / Outreach Generator */
export type OutreachPack = {
  coverLetter: string;
  recruiterDM: string;
  coldEmail: string;
  linkedinMessage: string;
  whyFitAnswer: string;
  followUpMessage: string;
  jobTitle: string;
  company: string;
  interviewQuestions: { question: string; whyAsked: string; suggestedAnswer: string }[];
  missingSkillsToPrepare: string[];
  preparationPlan: string[];
};
