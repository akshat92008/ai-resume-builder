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
  score?: CareerPathResumeScore;
  audit?: CareerPathResumeAudit;
  jobDescription?: string;
  tailoring?: CareerPathTailoringResult;
  version: number;
  createdAt: string;
  updatedAt: string;
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
