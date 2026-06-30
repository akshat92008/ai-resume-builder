import { z } from "zod";

export const SourceConfidenceSchema = z.enum(["user_supplied", "rewritten_from_user", "inferred_safe"]);

export const MissingFieldSchema = z.object({
  field: z.string(),
  reason: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export const ResumeWarningSchema = z.object({
  type: z.enum(["missing_info", "possible_hallucination", "unsupported_claim", "empty_section_removed"]),
  message: z.string(),
});

export const ResumeStateSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string().nullable().optional(),
  title: z.string().optional(),
  candidate: z.object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  target: z.object({
    role: z.string().optional(),
    seniority: z.enum(["student", "fresher", "intern", "junior", "mid", "senior", "unknown"]).optional(),
    industry: z.string().optional(),
    jobDescription: z.string().optional(),
  }),
  summary: z.string().optional(),
  skills: z.object({
    programming: z.array(z.string()).optional(),
    frontend: z.array(z.string()).optional(),
    backend: z.array(z.string()).optional(),
    databases: z.array(z.string()).optional(),
    aiMl: z.array(z.string()).optional(),
    cloudDevOps: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
    other: z.array(z.string()).optional(),
  }),
  experience: z.array(z.object({
    id: z.string(),
    company: z.string().optional(),
    role: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    bullets: z.array(z.string()),
    sourceConfidence: SourceConfidenceSchema.optional(),
  })),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tech: z.array(z.string()).optional(),
    link: z.string().optional(),
    bullets: z.array(z.string()),
    sourceConfidence: SourceConfidenceSchema.optional(),
  })),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string().optional(),
    degree: z.string().optional(),
    field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    year: z.string().optional(),
    grade: z.string().optional(),
    location: z.string().optional(),
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
    link: z.string().optional(),
  })),
  achievements: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })),
  languages: z.array(z.string()),
  missingFields: z.array(MissingFieldSchema),
  warnings: z.array(ResumeWarningSchema),
  metadata: z.object({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    lastUserIntent: z.string().optional(),
    versionName: z.string().optional(),
  }),
});

export const InterviewStateSchema = z.object({
  active: z.boolean(),
  step: z.enum([
    "basic_info",
    "target_role",
    "education",
    "skills",
    "projects",
    "experience",
    "certifications",
    "achievements",
    "review",
    "complete",
  ]),
  collectedData: ResumeStateSchema.partial(),
  askedQuestions: z.array(z.string()),
});

export const ResumeIntentSchema = z.object({
  type: z.enum([
    "BUILD_FROM_DATA",
    "INTERVIEW_REQUEST",
    "IMPROVE_EXISTING_RESUME",
    "TAILOR_TO_JOB",
    "EDIT_COMMAND",
    "ADD_TO_RESUME",
    "DOWNLOAD_OR_EXPORT",
    "GENERAL_HELP",
  ]),
  confidence: z.number(),
  reason: z.string(),
  needsLlm: z.boolean(),
  needsCurrentResume: z.boolean(),
  hasEnoughData: z.boolean(),
});
