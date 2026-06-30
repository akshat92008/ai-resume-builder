/**
 * Resume Brain — Core Types
 *
 * Canonical structured resume state with provenance tracking,
 * interview mode, intent classification, and validation types.
 */

import type { CareerPathResumeContent } from "@/lib/careerpath/types";

// ---------------------------------------------------------------------------
// Resume State
// ---------------------------------------------------------------------------

export type SourceConfidence =
  | "user_supplied"
  | "rewritten_from_user"
  | "inferred_safe";

export type ResumeState = {
  id?: string;
  ownerId?: string | null;
  title?: string;

  candidate: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };

  target: {
    role?: string;
    seniority?: "student" | "fresher" | "intern" | "junior" | "mid" | "senior" | "unknown";
    industry?: string;
    jobDescription?: string;
  };

  summary?: string;

  skills: {
    programming?: string[];
    frontend?: string[];
    backend?: string[];
    databases?: string[];
    aiMl?: string[];
    cloudDevOps?: string[];
    tools?: string[];
    softSkills?: string[];
    other?: string[];
  };

  experience: Array<{
    id: string;
    company?: string;
    role?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets: string[];
    sourceConfidence?: SourceConfidence;
  }>;

  projects: Array<{
    id: string;
    name: string;
    description?: string;
    tech?: string[];
    link?: string;
    bullets: string[];
    sourceConfidence?: SourceConfidence;
  }>;

  education: Array<{
    id: string;
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    year?: string;
    grade?: string;
    location?: string;
  }>;

  certifications: Array<{
    id: string;
    name: string;
    issuer?: string;
    date?: string;
    link?: string;
  }>;

  achievements: Array<{
    id: string;
    text: string;
  }>;

  languages: string[];

  missingFields: MissingField[];

  warnings: ResumeWarning[];

  metadata: {
    createdAt?: string;
    updatedAt?: string;
    lastUserIntent?: string;
    versionName?: string;
  };
};

// ---------------------------------------------------------------------------
// Missing Field / Warning
// ---------------------------------------------------------------------------

export type MissingField = {
  field: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type ResumeWarning = {
  type:
    | "missing_info"
    | "possible_hallucination"
    | "unsupported_claim"
    | "empty_section_removed";
  message: string;
};

// ---------------------------------------------------------------------------
// Intent Classification
// ---------------------------------------------------------------------------

export type ResumeIntentType =
  | "BUILD_FROM_DATA"
  | "INTERVIEW_REQUEST"
  | "IMPROVE_EXISTING_RESUME"
  | "TAILOR_TO_JOB"
  | "EDIT_COMMAND"
  | "ADD_TO_RESUME"
  | "DOWNLOAD_OR_EXPORT"
  | "GENERAL_HELP";

export type ResumeIntent = {
  type: ResumeIntentType;
  confidence: number;
  reason: string;
  needsLlm: boolean;
  needsCurrentResume: boolean;
  hasEnoughData: boolean;
};

// ---------------------------------------------------------------------------
// Interview State
// ---------------------------------------------------------------------------

export type InterviewStep =
  | "basic_info"
  | "target_role"
  | "education"
  | "skills"
  | "projects"
  | "experience"
  | "certifications"
  | "achievements"
  | "review"
  | "complete";

export type InterviewState = {
  active: boolean;
  step: InterviewStep;
  collectedData: Partial<ResumeState>;
  askedQuestions: string[];
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationIssue = {
  field: string;
  type:
    | "placeholder_detected"
    | "fake_url"
    | "fake_email"
    | "fake_phone"
    | "fake_institution"
    | "fake_certification"
    | "fake_achievement"
    | "unsupported_metric"
    | "empty_section"
    | "generic_hallucination"
    | "data_not_in_source";
  message: string;
  autoFixed: boolean;
};

export type ValidationResult = {
  isValid: boolean;
  issues: ValidationIssue[];
  cleanedResume: ResumeState;
  warnings: ResumeWarning[];
};

// ---------------------------------------------------------------------------
// Agent Response
// ---------------------------------------------------------------------------

export type AgentResponse = {
  type: "resume" | "questions" | "message" | "error";
  message: string;
  resume?: ResumeState;
  interviewState?: InterviewState;
  warnings?: ResumeWarning[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
};

// ---------------------------------------------------------------------------
// Converters — ResumeState ↔ CareerPathResumeContent
// ---------------------------------------------------------------------------

/**
 * Convert ResumeState to the existing CareerPathResumeContent format
 * used by ResumeDocument for rendering.
 */
export function resumeStateToContent(state: ResumeState): CareerPathResumeContent {
  const skillGroups: CareerPathResumeContent["skills"] = [];

  const skillMap: Record<string, string[] | undefined> = {
    "Programming": state.skills.programming,
    "Frontend": state.skills.frontend,
    "Backend": state.skills.backend,
    "Databases": state.skills.databases,
    "AI/ML": state.skills.aiMl,
    "Cloud & DevOps": state.skills.cloudDevOps,
    "Tools": state.skills.tools,
    "Soft Skills": state.skills.softSkills,
    "Other": state.skills.other,
  };

  for (const [category, items] of Object.entries(skillMap)) {
    if (items && items.length > 0) {
      skillGroups.push({ category, items });
    }
  }

  return {
    header: {
      name: state.candidate.fullName || "",
      email: state.candidate.email || "",
      phone: state.candidate.phone || "",
      location: state.candidate.location || "",
      links: {
        linkedin: state.candidate.linkedin || "",
        github: state.candidate.github || "",
        portfolio: state.candidate.portfolio || "",
      },
    },
    summary: state.summary || "",
    skills: skillGroups,
    experience: state.experience.map((exp) => ({
      company: exp.company || "",
      role: exp.role || "",
      dates: [exp.startDate, exp.endDate].filter(Boolean).join(" – "),
      location: exp.location,
      bullets: exp.bullets,
    })),
    projects: state.projects.map((proj) => ({
      name: proj.name,
      techStack: proj.tech || [],
      link: proj.link,
      bullets: proj.bullets,
    })),
    education: state.education.map((edu) => ({
      institution: edu.institution || "",
      degree: [edu.degree, edu.field].filter(Boolean).join(", "),
      dates: edu.year || [edu.startDate, edu.endDate].filter(Boolean).join(" – ") || undefined,
      score: edu.grade,
      location: edu.location,
    })),
    certifications: state.certifications.map((cert) => ({
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
      link: cert.link,
    })),
    achievements: state.achievements.map((a) => a.text),
    languages: state.languages,
  };
}

/**
 * Convert existing CareerPathResumeContent back to ResumeState.
 * Used when importing/improving an existing resume.
 */
export function contentToResumeState(
  content: CareerPathResumeContent,
  meta?: { id?: string; targetRole?: string }
): ResumeState {
  const skills: ResumeState["skills"] = {};

  for (const group of content.skills) {
    const cat = group.category.toLowerCase();
    if (cat.includes("programming") || cat.includes("language")) {
      skills.programming = [...(skills.programming || []), ...group.items];
    } else if (cat.includes("frontend") || cat.includes("framework")) {
      skills.frontend = [...(skills.frontend || []), ...group.items];
    } else if (cat.includes("backend")) {
      skills.backend = [...(skills.backend || []), ...group.items];
    } else if (cat.includes("database")) {
      skills.databases = [...(skills.databases || []), ...group.items];
    } else if (cat.includes("ai") || cat.includes("ml")) {
      skills.aiMl = [...(skills.aiMl || []), ...group.items];
    } else if (cat.includes("cloud") || cat.includes("devops")) {
      skills.cloudDevOps = [...(skills.cloudDevOps || []), ...group.items];
    } else if (cat.includes("tool")) {
      skills.tools = [...(skills.tools || []), ...group.items];
    } else if (cat.includes("soft")) {
      skills.softSkills = [...(skills.softSkills || []), ...group.items];
    } else {
      skills.other = [...(skills.other || []), ...group.items];
    }
  }

  return {
    id: meta?.id,
    candidate: {
      fullName: content.header.name || undefined,
      email: content.header.email || undefined,
      phone: content.header.phone || undefined,
      location: content.header.location || undefined,
      linkedin: content.header.links?.linkedin || undefined,
      github: content.header.links?.github || undefined,
      portfolio: content.header.links?.portfolio || undefined,
    },
    target: {
      role: meta?.targetRole,
    },
    summary: content.summary || undefined,
    skills,
    experience: content.experience.map((exp, i) => ({
      id: `exp_${i}`,
      company: exp.company || undefined,
      role: exp.role || undefined,
      location: exp.location || undefined,
      startDate: exp.dates?.split(/\s*[-–—]\s*/)?.[0] || undefined,
      endDate: exp.dates?.split(/\s*[-–—]\s*/)?.[1] || undefined,
      bullets: exp.bullets,
      sourceConfidence: "user_supplied" as const,
    })),
    projects: content.projects.map((proj, i) => ({
      id: `proj_${i}`,
      name: proj.name,
      tech: proj.techStack?.length ? proj.techStack : undefined,
      link: proj.link || undefined,
      bullets: proj.bullets,
      sourceConfidence: "user_supplied" as const,
    })),
    education: content.education.map((edu, i) => ({
      id: `edu_${i}`,
      institution: edu.institution || undefined,
      degree: edu.degree?.split(",")[0]?.trim() || undefined,
      field: edu.degree?.split(",").slice(1).join(",")?.trim() || undefined,
      year: edu.dates || undefined,
      grade: edu.score || undefined,
      location: edu.location || undefined,
    })),
    certifications: content.certifications.map((cert, i) => ({
      id: `cert_${i}`,
      name: cert.name,
      issuer: cert.issuer || undefined,
      date: cert.date || undefined,
      link: cert.link || undefined,
    })),
    achievements: content.achievements.map((text, i) => ({
      id: `ach_${i}`,
      text,
    })),
    languages: content.languages,
    missingFields: [],
    warnings: [],
    metadata: {},
  };
}

/** Generate a unique ID */
export function createResumeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Create an empty ResumeState */
export function emptyResumeState(): ResumeState {
  return {
    candidate: {},
    target: {},
    skills: {},
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
    missingFields: [],
    warnings: [],
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };
}
