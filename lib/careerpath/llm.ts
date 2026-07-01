import OpenAI from "openai";
import { z } from "zod";

let _aiClient: OpenAI | null = null;

/**
 * Lazy-initialized AI client. Only instantiated at runtime when called,
 * never during build-time module evaluation.
 */
export function getAiClient(): OpenAI {
  if (_aiClient) return _aiClient;

  const provider = process.env.AI_PROVIDER || "nvidia";

  if (provider === "nvidia") {
    const apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY;
    const baseURL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

    if (!apiKey) {
      throw new Error(
        "NVIDIA_NIM_API_KEY (or NVIDIA_API_KEY) is required for CareerPath AI generation. " +
        "Set it in your .env.local file."
      );
    }

    _aiClient = new OpenAI({ apiKey, baseURL });
    return _aiClient;
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

/** Model to use for all CareerPath AI agent calls. */
export function getModel(fast?: boolean): string {
  if (fast) {
    return process.env.NVIDIA_NIM_MODEL_FAST || "meta/llama-3.1-8b-instruct";
  }
  return process.env.NVIDIA_NIM_MODEL || "meta/llama-3.3-70b-instruct";
}

export const ProfileSchema = z.object({
  personal: z.object({
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    github: z.string().optional().nullable(),
    portfolio: z.string().optional().nullable(),
  }),
  target: z.object({
    role: z.string(),
    industry: z.string(),
    experienceLevel: z.string(),
  }),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    startYear: z.string(),
    endYear: z.string(),
    score: z.string(),
    location: z.string(),
  })),
  skills: z.object({
    programming: z.array(z.string()),
    frameworks: z.array(z.string()),
    tools: z.array(z.string()),
    databases: z.array(z.string()),
    aiTools: z.array(z.string()),
    softSkills: z.array(z.string()),
  }),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    techStack: z.array(z.string()),
    problemSolved: z.string(),
    features: z.array(z.string()),
    impact: z.string(),
    links: z.array(z.string()),
  })),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    responsibilities: z.array(z.string()),
    achievements: z.array(z.string()),
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    credentialLink: z.string(),
  })),
  achievements: z.array(z.string()),
  languages: z.array(z.string()),
});

export const GapReportSchema = z.object({
  readyToGenerate: z.boolean(),
  criticalMissing: z.array(z.string()),
  recommendedMissing: z.array(z.string()),
  resumeRisk: z.array(z.string()),
  questionsToAsk: z.array(z.object({
    question: z.string(),
    reason: z.string(),
    priority: z.enum(["critical", "recommended"]),
  })),
});

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
    }),
  }),
  summary: z.string(),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()),
  })),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    dates: z.string(),
    location: z.string().optional().nullable(),
    bullets: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string(),
    techStack: z.array(z.string()),
    link: z.string().optional().nullable(),
    bullets: z.array(z.string()),
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    dates: z.string().optional().nullable(),
    score: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    link: z.string().optional().nullable(),
  })),
  achievements: z.array(z.string()),
  languages: z.array(z.string()),
});

export const ResumeAuditSchema = z.object({
  score: z.object({
    overall: z.number(),
    atsCompatibility: z.number(),
    roleAlignment: z.number(),
    keywordCoverage: z.number(),
    bulletStrength: z.number(),
    clarity: z.number(),
    proofAndMetrics: z.number(),
    onePageFit: z.number(),
    formattingSafety: z.number(),
    truthfulness: z.number(),
  }),
  issues: z.array(z.object({
    type: z.string(),
    section: z.string(),
    message: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })),
  recommendedFixes: z.array(z.string()),
  summary: z.string(),
});

export const TailoringResultSchema = z.object({
  matchScore: z.number(),
  matchedKeywords: z.array(z.string()),
  safeKeywordsAdded: z.array(z.string()),
  missingKeywordsNotAdded: z.array(z.string()),
  tailoringSummary: z.array(z.string()),
  tailoredResume: ResumeContentSchema,
});

// ---------------------------------------------------------------------------
// Differentiation Feature Schemas
// ---------------------------------------------------------------------------

export const StarInterviewSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    context: z.string(),
    category: z.enum(["situation", "task", "action", "result", "metric"]),
    targetBullet: z.string().optional().nullable(),
  })),
  vagueBullets: z.array(z.string()),
  summary: z.string(),
});

export const HumanizedResumeSchema = z.object({
  content: ResumeContentSchema,
  changes: z.array(z.object({
    original: z.string(),
    humanized: z.string(),
    reason: z.string(),
    section: z.string(),
  })),
  clisheesRemoved: z.array(z.string()),
  summary: z.string(),
});

export const ImpactEstimateSchema = z.object({
  suggestions: z.array(z.object({
    id: z.string(),
    bulletText: z.string(),
    suggestedMetric: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    rationale: z.string(),
    improvedBullet: z.string(),
    section: z.string(),
    itemName: z.string(),
  })),
  summary: z.string(),
});

export const GapAnalysisSchema = z.object({
  targetRole: z.string(),
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.object({
    skill: z.string(),
    importance: z.enum(["critical", "recommended", "bonus"]),
    category: z.string(),
    evidence: z.string(),
    projectIdea: z.string().optional().nullable(),
    learningResource: z.string().optional().nullable(),
  })),
  weekendProjects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    skills: z.array(z.string()),
  })),
  summary: z.string(),
  readyToApply: z.boolean(),
});

export const PersonaResumeSchema = z.object({
  persona: z.string(),
  whenToUse: z.string(),
  emphasis: z.array(z.string()),
  resume: ResumeContentSchema,
  differenceFromMaster: z.array(z.string()),
});

export const MultiPersonaSchema = z.object({
  personas: z.array(PersonaResumeSchema),
  masterRole: z.string(),
  summary: z.string(),
});

export const ATSSectionSchema = z.object({
  sectionName: z.string(),
  rawText: z.string(),
  issues: z.array(z.object({
    type: z.enum(["parse_failure", "encoding_issue", "missing_field", "formatting_risk"]),
    description: z.string(),
    severity: z.enum(["high", "medium", "low"]),
  })),
  atsScore: z.number().min(0).max(100),
});

export const ATSParseSchema = z.object({
  sections: z.array(ATSSectionSchema),
  overallATSScore: z.number().min(0).max(100),
  criticalFailures: z.array(z.string()),
  passedChecks: z.array(z.string()),
  summary: z.string(),
});

export const OutreachPackSchema = z.object({
  coverLetter: z.string(),
  recruiterDM: z.string(),
  coldEmail: z.string(),
  linkedinMessage: z.string(),
  whyFitAnswer: z.string(),
  followUpMessage: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  interviewQuestions: z.array(z.object({
    question: z.string(),
    whyAsked: z.string(),
    suggestedAnswer: z.string(),
  })),
  missingSkillsToPrepare: z.array(z.string()),
  preparationPlan: z.array(z.string()),
});
