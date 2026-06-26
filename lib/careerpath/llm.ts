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
export function getModel(): string {
  return process.env.NVIDIA_NIM_MODEL || "meta/llama-3.3-70b-instruct";
}

export const ProfileSchema = z.object({
  personal: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
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
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.object({
      linkedin: z.string().optional(),
      github: z.string().optional(),
      portfolio: z.string().optional(),
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
    location: z.string().optional(),
    bullets: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string(),
    techStack: z.array(z.string()),
    link: z.string().optional(),
    bullets: z.array(z.string()),
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    dates: z.string().optional(),
    score: z.string().optional(),
    location: z.string().optional(),
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
    link: z.string().optional(),
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
