import type {
  BuilderMode,
  BuilderSession,
  CareerPathAuditIssue,
  CareerPathProfile,
  CareerPathResume,
  CareerPathResumeAudit,
  CareerPathResumeContent,
  CareerPathResumeScore,
  CareerPathTailoringResult,
  GapReport,
  GapQuestion,
} from "./types";

const USER_ID = "careerpath-demo-user";

const SKILL_BANK = {
  programming: ["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "HTML", "CSS", "SQL"],
  frameworks: ["React", "Next.js", "Node.js", "Express", "Tailwind CSS", "Bootstrap", "Django", "Flask", "Supabase", "Firebase"],
  tools: ["Git", "GitHub", "VS Code", "Figma", "Vercel", "Netlify", "Postman", "Docker"],
  databases: ["PostgreSQL", "MySQL", "MongoDB", "SQLite", "Supabase"],
  aiTools: ["OpenAI", "ChatGPT", "NVIDIA NIM", "LangChain", "Gemini", "Claude"],
  softSkills: ["Communication", "Problem Solving", "Teamwork", "Leadership", "Adaptability"],
};

const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["React", "Next.js", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "responsive", "UI"],
  backend: ["Node.js", "Express", "SQL", "PostgreSQL", "API", "authentication", "database"],
  fullstack: ["React", "Next.js", "Node.js", "API", "Supabase", "database", "deployment"],
  ai: ["Python", "OpenAI", "LangChain", "prompt", "automation", "AI"],
  data: ["Python", "SQL", "analytics", "dashboard", "visualization"],
};

const PROJECT_HINTS = [
  { pattern: /\bai resume builder\b/i, name: "AI Resume Builder" },
  { pattern: /\bresume builder\b/i, name: "Resume Builder" },
  { pattern: /\bai tutor\b/i, name: "AI Tutor" },
  { pattern: /\btutor app\b/i, name: "Tutor App" },
  { pattern: /\bportfolio\b/i, name: "Portfolio Website" },
  { pattern: /\bplumber website\b/i, name: "Service Business Website" },
  { pattern: /\bwebsite(s)?\b/i, name: "Responsive Website" },
  { pattern: /\be[- ]?commerce\b/i, name: "E-commerce Website" },
  { pattern: /\bchatbot\b/i, name: "Chatbot" },
  { pattern: /\bdashboard\b/i, name: "Dashboard" },
];

/** Generate a plain UUID compatible with Supabase uuid primary key columns. */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function emptyCareerPathProfile(targetRole = ""): CareerPathProfile {
  const now = new Date().toISOString();
  return {
    id: createId(),
    userId: USER_ID,
    personal: {},
    target: {
      role: targetRole,
      industry: inferIndustry(targetRole),
      experienceLevel: "Student/Fresher",
    },
    education: [],
    skills: {
      programming: [],
      frameworks: [],
      tools: [],
      databases: [],
      aiTools: [],
      softSkills: [],
    },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: "",
    confidenceNotes: now ? [] : [],
  };
}

export function createBuilderSession(mode: BuilderMode, targetRole = ""): BuilderSession {
  const now = new Date().toISOString();
  const session: BuilderSession = {
    id: createId(),
    userId: USER_ID,
    mode,
    targetRole: cleanTargetRole(targetRole),
    currentStep: mode === "improve" ? "collect_profile" : targetRole ? "collect_profile" : "collect_goal",
    profile: emptyCareerPathProfile(targetRole),
    messages: [],
    missingQuestions: [],
    createdAt: now,
    updatedAt: now,
  };
  const firstMessage = getOpeningMessage(mode, targetRole);
  session.messages.push({
    id: createId(),
    role: "assistant",
    content: firstMessage,
    createdAt: now,
  });
  return session;
}

export function getOpeningMessage(mode: BuilderMode, targetRole?: string) {
  if (!targetRole && mode === "build") return "What role are you targeting?";
  if (!targetRole && mode === "tailor") return "What role or job are you targeting?";
  if (mode === "improve") return "Paste your existing resume text. Messy formatting is fine.";
  if (mode === "tailor") return "Paste your current resume text first. After that I will ask for the job description.";
  return "Paste your details. Messy is fine. Include education, skills, projects, certificates, experience, links, or anything you remember.";
}

export function inferIntent(message: string): { intent: BuilderMode; targetRole: string; confidence: number; nextAction: string } {
  const text = message.toLowerCase();
  const intent: BuilderMode = text.includes("tailor") || text.includes("job description")
    ? "tailor"
    : text.includes("improve") || text.includes("existing resume")
      ? "improve"
      : "build";
  return {
    intent,
    targetRole: extractTargetRole(message),
    confidence: text.length > 10 ? 0.86 : 0.62,
    nextAction: intent === "tailor" ? "collect_resume_and_job" : "collect_profile_data",
  };
}

export function extractProfileData(input: string, existing = emptyCareerPathProfile(), targetRole = existing.target.role): CareerPathProfile {
  const text = input.trim();
  const profile = cloneProfile(existing);
  profile.target.role = cleanTargetRole(targetRole || profile.target.role || extractTargetRole(text));
  profile.target.industry = inferIndustry(profile.target.role);
  profile.rawNotes = [profile.rawNotes, text].filter(Boolean).join("\n\n");

  extractPersonal(text, profile);
  extractEducation(text, profile);
  extractSkills(text, profile);
  extractProjects(text, profile);
  extractExperience(text, profile);
  extractCertifications(text, profile);
  extractAchievementsAndLanguages(text, profile);

  const hasExistingResumeShape = /(education|experience|projects|skills|summary|certifications)/i.test(text) && text.length > 220;
  if (hasExistingResumeShape) profile.existingResumeText = [profile.existingResumeText, text].filter(Boolean).join("\n\n");

  if (!profile.personal.name && /\bmy name is\b/i.test(text)) {
    const name = text.match(/\bmy name is\s+([a-z][a-z\s.'-]{1,50})/i)?.[1]?.trim();
    if (name) profile.personal.name = titleCase(name);
  }

  return profile;
}

export function detectGaps(profile: CareerPathProfile, mode: BuilderMode): GapReport {
  const criticalMissing: string[] = [];
  const recommendedMissing: string[] = [];
  const resumeRisk: string[] = [];
  const questionsToAsk: GapQuestion[] = [];

  if (!profile.target.role) {
    criticalMissing.push("target role");
    questionsToAsk.push({
      question: "What role are you targeting?",
      reason: "The resume needs a clear role angle.",
      priority: "critical",
    });
  }

  if (!profile.education.length && !profile.projects.length && !profile.experience.length) {
    criticalMissing.push("education, project, or experience");
    resumeRisk.push("There is not enough career material to build a useful resume.");
    questionsToAsk.push({
      question: "Share at least one education detail, project, or work experience.",
      reason: "A useful resume needs one credible anchor.",
      priority: "critical",
    });
  }

  if (!profile.education.length && profile.target.experienceLevel.toLowerCase().includes("student")) {
    criticalMissing.push("education details");
    questionsToAsk.push({
      question: "What is your education institution, degree or course, and graduation year?",
      reason: "Education is important for student and fresher resumes.",
      priority: "critical",
    });
  }

  if (!profile.personal.github && !profile.personal.linkedin && !profile.personal.portfolio) {
    recommendedMissing.push("GitHub, LinkedIn, or portfolio link");
    questionsToAsk.push({
      question: "Do you have GitHub, LinkedIn, or portfolio links?",
      reason: "Links make technical resumes more credible.",
      priority: "recommended",
    });
  }

  const projectMissingDepth = profile.projects.some((project) => !project.techStack.length || !project.problemSolved);
  if (profile.projects.length && projectMissingDepth) {
    recommendedMissing.push("project tech stack or problem solved");
    resumeRisk.push("Projects need stronger proof and context.");
    questionsToAsk.push({
      question: "For your strongest project, what problem did it solve and what tech stack did you use?",
      reason: "Project proof is the strongest material for freshers.",
      priority: "critical",
    });
  }

  if (mode === "improve" && !profile.existingResumeText && profile.rawNotes.length < 220) {
    criticalMissing.push("existing resume text");
    questionsToAsk.push({
      question: "Paste more of your existing resume so I can audit and rewrite it.",
      reason: "Improvement works best when I can see the current resume.",
      priority: "critical",
    });
  }

  const uniqueQuestions = uniqueBy(questionsToAsk, (item) => item.question).slice(0, 4);
  const readyToGenerate =
    !!profile.target.role &&
    (profile.education.length > 0 || profile.projects.length > 0 || profile.experience.length > 0) &&
    !(mode === "improve" && !profile.existingResumeText && profile.rawNotes.length < 140);

  return {
    readyToGenerate,
    criticalMissing: unique(criticalMissing),
    recommendedMissing: unique(recommendedMissing),
    resumeRisk: unique(resumeRisk),
    questionsToAsk: readyToGenerate ? uniqueQuestions.slice(0, 3) : uniqueQuestions,
  };
}

export function writeResume(profile: CareerPathProfile, mode: BuilderMode, jobDescription = ""): CareerPathResumeContent {
  const role = profile.target.role || extractTargetRole(jobDescription) || "Entry-Level Role";
  const supportedRoleKeywords = getSupportedRoleKeywords(profile, role, jobDescription);
  const projectFirst = profile.experience.length === 0;
  const skillGroups = buildSkillGroups(profile, supportedRoleKeywords);
  const projects = profile.projects.map((project) => ({
    name: project.name,
    techStack: project.techStack,
    link: project.links[0],
    bullets: mineProjectBullets(project, role),
  }));

  return {
    header: {
      name: profile.personal.name || "",
      email: profile.personal.email || "",
      phone: profile.personal.phone || "",
      location: profile.personal.location || "",
      links: {
        linkedin: profile.personal.linkedin || "",
        github: profile.personal.github || "",
        portfolio: profile.personal.portfolio || "",
      },
    },
    summary: buildSummary(profile, role, supportedRoleKeywords),
    skills: skillGroups,
    experience: profile.experience.map((experience) => ({
      company: experience.company,
      role: experience.role || role,
      dates: [experience.startDate, experience.endDate].filter(Boolean).join(" - "),
      bullets: mineExperienceBullets(experience, role),
    })),
    projects: projectFirst ? projects : projects.slice(0, 3),
    education: profile.education.map((education) => ({
      institution: education.institution,
      degree: [education.degree, education.field].filter(Boolean).join(", "),
      dates: [education.startYear, education.endYear].filter(Boolean).join(" - "),
      score: education.score,
      location: education.location,
    })),
    certifications: profile.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      date: certification.date,
      link: certification.credentialLink,
    })),
    achievements: profile.achievements,
    languages: profile.languages,
  };
}

export function auditResume(content: CareerPathResumeContent, targetRole: string, jobDescription = ""): CareerPathResumeAudit {
  const issues: CareerPathAuditIssue[] = [];
  const allText = resumeToText(content).toLowerCase();
  const roleKeywords = targetKeywords(targetRole, jobDescription);
  const matchedKeywords = roleKeywords.filter((keyword) => allText.includes(keyword.toLowerCase()));
  const hasContact = Boolean(content.header.email || content.header.phone);
  const hasProofLink = Boolean(content.header.links.github || content.header.links.portfolio || content.projects.some((project) => project.link));
  const projectBulletCount = content.projects.reduce((sum, project) => sum + project.bullets.length, 0);
  const hasUnsupportedMetrics = /\b\d{2,}%|\b\d{4,}\s+(users|students|customers|downloads)\b/i.test(allText);
  const wordCount = resumeToText(content).split(/\s+/).filter(Boolean).length;

  if (!hasContact) {
    issues.push({
      type: "missing_contact",
      section: "Header",
      message: "Add an email or phone number before sending the resume.",
      severity: "medium",
    });
  }
  if (!hasProofLink) {
    issues.push({
      type: "missing_proof",
      section: "Header/Projects",
      message: "Add GitHub, portfolio, or project links if available.",
      severity: "medium",
    });
  }
  if (content.projects.length && projectBulletCount < content.projects.length * 2) {
    issues.push({
      type: "weak_bullet",
      section: "Projects",
      message: "Project bullets need more detail about problem solved, features, or stack.",
      severity: "medium",
    });
  }
  if (matchedKeywords.length < Math.min(4, roleKeywords.length)) {
    issues.push({
      type: "role_alignment",
      section: "Skills",
      message: "The resume could align more tightly with the target role using supported keywords.",
      severity: "low",
    });
  }
  if (hasUnsupportedMetrics) {
    issues.push({
      type: "unsupported_metric",
      section: "Projects/Experience",
      message: "Large metrics should stay only if the user can prove them.",
      severity: "high",
    });
  }

  const score: CareerPathResumeScore = {
    atsCompatibility: clampScore(88 - (wordCount > 650 ? 8 : 0)),
    roleAlignment: clampScore(58 + matchedKeywords.length * 7 + (targetRole ? 8 : 0)),
    keywordCoverage: clampScore(roleKeywords.length ? Math.round((matchedKeywords.length / roleKeywords.length) * 100) : 72),
    bulletStrength: clampScore(58 + projectBulletCount * 4 + content.experience.reduce((sum, item) => sum + item.bullets.length, 0) * 4),
    clarity: clampScore(76 + (content.summary.length > 40 ? 8 : 0) - (content.summary.length > 420 ? 12 : 0)),
    proofAndMetrics: clampScore(52 + (hasProofLink ? 18 : 0) + (content.projects.some((project) => project.bullets.some((bullet) => /built|created|developed|implemented|designed/i.test(bullet))) ? 12 : 0)),
    onePageFit: clampScore(94 - Math.max(0, wordCount - 520) / 8),
    formattingSafety: 96,
    truthfulness: clampScore(hasUnsupportedMetrics ? 72 : 96),
    overall: 0,
  };
  score.overall = Math.round(
    (score.atsCompatibility + score.roleAlignment + score.keywordCoverage + score.bulletStrength + score.clarity + score.proofAndMetrics + score.onePageFit + score.formattingSafety + score.truthfulness) / 9,
  );

  return {
    score,
    issues,
    recommendedFixes: buildRecommendedFixes(issues, content),
    summary: `Resume Score: ${score.overall}/100. Treat this as practical guidance, not a hiring guarantee.`,
  };
}

export function improveResume(content: CareerPathResumeContent, audit: CareerPathResumeAudit, targetRole: string): CareerPathResumeContent {
  const role = targetRole || "target role";
  const improved: CareerPathResumeContent = JSON.parse(JSON.stringify(content));

  improved.summary = tightenSummary(improved.summary, role);
  improved.projects = improved.projects.map((project) => ({
    ...project,
    bullets: unique(
      project.bullets.map((bullet) => professionalizeBullet(bullet, role)).concat(
        project.bullets.length < 2 ? [`Built ${project.name} with ${project.techStack.join(", ") || "a practical technical stack"} to solve a clearly defined user workflow.`] : [],
      ),
    ).slice(0, 3),
  }));
  improved.experience = improved.experience.map((experience) => ({
    ...experience,
    bullets: experience.bullets.map((bullet) => professionalizeBullet(bullet, role)).slice(0, 4),
  }));

  if (audit.issues.some((issue) => issue.type === "role_alignment")) {
    improved.skills = improved.skills.map((group) => ({
      ...group,
      items: unique(group.items).slice(0, 12),
    }));
  }

  return improved;
}

export function tailorResume(
  resume: CareerPathResume,
  profile: CareerPathProfile | undefined,
  jobDescription: string,
): CareerPathTailoringResult {
  const sourceText = [resumeToText(resume.content), profile?.rawNotes ?? ""].join("\n").toLowerCase();
  const jdKeywords = targetKeywords(resume.targetRole, jobDescription);
  const matchedKeywords = jdKeywords.filter((keyword) => sourceText.includes(keyword.toLowerCase()));
  const missingKeywordsNotAdded = jdKeywords.filter((keyword) => !sourceText.includes(keyword.toLowerCase())).slice(0, 8);
  const tailoredResume: CareerPathResumeContent = JSON.parse(JSON.stringify(resume.content));
  const safeKeywordsAdded = matchedKeywords.filter((keyword) => !resumeToText(tailoredResume).toLowerCase().includes(keyword.toLowerCase()));

  tailoredResume.summary = buildTailoredSummary(tailoredResume.summary, resume.targetRole, matchedKeywords);
  tailoredResume.skills = tailoredResume.skills.map((group) => ({
    ...group,
    items: reorderByKeywords(group.items, matchedKeywords),
  }));
  tailoredResume.projects = tailoredResume.projects.map((project) => ({
    ...project,
    bullets: reorderByKeywords(project.bullets, matchedKeywords).map((bullet) => professionalizeBullet(bullet, resume.targetRole)),
  }));

  const matchScore = clampScore(48 + matchedKeywords.length * 6 + (tailoredResume.projects.length ? 8 : 0));

  return {
    matchScore,
    matchedKeywords,
    safeKeywordsAdded,
    missingKeywordsNotAdded,
    tailoringSummary: [
      "Reordered supported skills and bullets toward the job description.",
      "Rewrote the summary around the target role without adding unsupported claims.",
      missingKeywordsNotAdded.length ? "Left unsupported job keywords out of the resume." : "No major unsupported keywords found.",
    ],
    tailoredResume,
  };
}

export function createResumeRecord(input: {
  mode: BuilderMode;
  targetRole: string;
  content: CareerPathResumeContent;
  profile?: CareerPathProfile;
  jobDescription?: string;
  version?: number;
  title?: string;
}): CareerPathResume {
  const now = new Date().toISOString();
  const audit = auditResume(input.content, input.targetRole, input.jobDescription);
  return {
    id: createId(),
    userId: USER_ID,
    profileId: input.profile?.id,
    title: input.title || `${input.targetRole || "CareerPath"} Resume`,
    targetRole: input.targetRole || "Target Role",
    mode: input.mode,
    status: "final",
    content: input.content,
    profile: input.profile,
    score: audit.score,
    audit,
    jobDescription: input.jobDescription,
    version: input.version ?? 1,
    createdAt: now,
    updatedAt: now,
  };
}

function extractPersonal(text: string, profile: CareerPathProfile) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\s-]?){9,14}\d/)?.[0]?.trim();
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const github = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const portfolio = urls.find((url) => !/linkedin|github/i.test(url));
  const location = text.match(/\b(?:location|city)\s*[:\-]\s*([a-z\s,.-]{2,50})/i)?.[1]?.trim();
  const explicitName = text.match(/\bname\s*[:\-]\s*([a-z][a-z\s.'-]{1,50})/i)?.[1]?.trim();

  if (email) profile.personal.email = email;
  if (phone) profile.personal.phone = phone;
  if (linkedin) profile.personal.linkedin = linkedin;
  if (github) profile.personal.github = github;
  if (portfolio) profile.personal.portfolio = portfolio;
  if (location) profile.personal.location = titleCase(location);
  if (explicitName && explicitName.length < 60) profile.personal.name = titleCase(explicitName);
}

function extractEducation(text: string, profile: CareerPathProfile) {
  const lower = text.toLowerCase();
  const degree = lower.includes("bca")
    ? "BCA"
    : lower.includes("b.tech") || lower.includes("btech")
      ? "B.Tech"
      : lower.includes("b.sc") || lower.includes("bsc")
        ? "B.Sc"
        : lower.includes("mca")
          ? "MCA"
          : lower.includes("diploma")
            ? "Diploma"
            : "";
  const institution = text.match(/\b(?:college|school|university|institution)\s*[:\-]?\s*([a-z0-9 &.'-]{3,80})/i)?.[1]?.trim() ?? "";
  const year = text.match(/\b(20[2-4]\d|19[9]\d)\b/)?.[1] ?? "";
  const score = text.match(/\b(?:cgpa|gpa|percentage|score|marks)\s*[:\-]?\s*([0-9.]+%?|[0-9.]+\/10)/i)?.[1] ?? "";
  if (degree || institution) {
    upsertProfileItem(profile.education, {
      institution: titleCase(institution),
      degree,
      field: inferField(text),
      startYear: "",
      endYear: year,
      score,
      location: "",
    }, (item) => `${item.institution}-${item.degree}`);
  }
}

function extractSkills(text: string, profile: CareerPathProfile) {
  for (const [category, skills] of Object.entries(SKILL_BANK)) {
    const key = category as keyof CareerPathProfile["skills"];
    for (const skill of skills) {
      const pattern = new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i");
      if (pattern.test(text)) {
        profile.skills[key] = unique([...profile.skills[key], skill]);
      }
    }
  }
}

function extractProjects(text: string, profile: CareerPathProfile) {
  const links = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  let hintedProjects = 0;
  for (const hint of PROJECT_HINTS) {
    if (hint.name === "Resume Builder" && /\bai resume builder\b/i.test(text)) continue;
    if (!hint.pattern.test(text)) continue;
    hintedProjects += 1;
    const techStack = detectTechStack(text);
    const project = {
      name: hint.name,
      description: sentenceForHint(text, hint.name),
      techStack,
      problemSolved: extractProblemSolved(text),
      features: extractFeatures(text),
      impact: extractImpact(text),
      links,
    };
    upsertProfileItem(profile.projects, project, (item) => item.name.toLowerCase());
  }

  if (hintedProjects > 0) return;

  const projectLines = text.split(/\n+/).filter((line) => /\b(project|built|made|created|developed)\b/i.test(line));
  for (const line of projectLines.slice(0, 4)) {
    const name = line.match(/(?:project|built|made|created|developed)\s*[:\-]?\s*([a-z0-9 &.'-]{3,60})/i)?.[1]?.trim();
    if (!name) continue;
    if (name.length > 46 || /\b(and|then|also|did|made)\b/i.test(name)) continue;
    upsertProfileItem(profile.projects, {
      name: titleCase(name.split(/ using | with | in /i)[0] || name),
      description: line.trim(),
      techStack: detectTechStack(line),
      problemSolved: extractProblemSolved(line),
      features: extractFeatures(line),
      impact: extractImpact(line),
      links,
    }, (item) => item.name.toLowerCase());
  }
}

function extractExperience(text: string, profile: CareerPathProfile) {
  const internship = text.match(/\b(?:intern|internship)\b/i);
  const company = text.match(/\b(?:at|company)\s+([a-z0-9 &.'-]{2,60})/i)?.[1]?.trim() ?? "";
  if (internship || company) {
    upsertProfileItem(profile.experience, {
      company: titleCase(company),
      role: internship ? "Intern" : "",
      startDate: "",
      endDate: "",
      responsibilities: extractFeatures(text),
      achievements: extractImpact(text) ? [extractImpact(text)] : [],
    }, (item) => `${item.company}-${item.role}`);
  }
}

function extractCertifications(text: string, profile: CareerPathProfile) {
  const lower = text.toLowerCase();
  const certificates = [
    lower.includes("cs50p") ? { name: "CS50P: Introduction to Programming with Python", issuer: "CS50", date: "", credentialLink: "" } : null,
    lower.includes("certificate") || lower.includes("certification")
      ? {
          name: titleCase(text.match(/\b(?:certificate|certification)\s*(?:in|for|:)?\s*([a-z0-9 &.'+-]{3,70})/i)?.[1]?.trim() || "Certification"),
          issuer: "",
          date: text.match(/\b20[2-4]\d\b/)?.[0] || "",
          credentialLink: text.match(/https?:\/\/[^\s)]+/i)?.[0] || "",
        }
      : null,
  ].filter(Boolean) as CareerPathProfile["certifications"];
  for (const certification of certificates) {
    upsertProfileItem(profile.certifications, certification, (item) => item.name.toLowerCase());
  }
}

function extractAchievementsAndLanguages(text: string, profile: CareerPathProfile) {
  const achievementLine = text.match(/\b(?:achievement|award|won|ranked)\b[^\n.]{3,120}/i)?.[0];
  if (achievementLine) profile.achievements = unique([...profile.achievements, sentenceCase(achievementLine)]);

  for (const language of ["English", "Hindi", "Spanish", "French", "German"]) {
    if (new RegExp(`\\b${language}\\b`, "i").test(text)) {
      profile.languages = unique([...profile.languages, language]);
    }
  }
}

function mineProjectBullets(project: CareerPathProfile["projects"][number], role: string) {
  const stack = project.techStack.join(", ");
  const bullets = [
    `Built ${project.name}${stack ? ` using ${stack}` : ""} for ${role.toLowerCase()} portfolio proof.`,
  ];
  if (project.problemSolved) bullets.push(`Designed the project around ${project.problemSolved.toLowerCase()}.`);
  if (project.features.length) bullets.push(`Implemented ${project.features.slice(0, 3).join(", ")} with clear user flows.`);
  if (project.impact) bullets.push(`Documented outcome: ${project.impact}.`);
  return unique(bullets).slice(0, 3);
}

function mineExperienceBullets(experience: CareerPathProfile["experience"][number], role: string) {
  const source = experience.achievements.length ? experience.achievements : experience.responsibilities;
  const bullets = source.length
    ? source.map((item) => professionalizeBullet(item, role))
    : [`Supported ${role.toLowerCase()} work through assigned responsibilities and project delivery.`];
  return unique(bullets).slice(0, 4);
}

function buildSummary(profile: CareerPathProfile, role: string, keywords: string[]) {
  const strongest = [
    profile.projects.length ? `${profile.projects.length} project${profile.projects.length > 1 ? "s" : ""}` : "",
    profile.education[0]?.degree,
    keywords.slice(0, 4).join(", "),
  ].filter(Boolean);
  return `${profile.target.experienceLevel || "Early-career"} candidate targeting ${role}. Brings ${strongest.join("; ") || "practical learning, project work, and a willingness to build proof-backed skills"}. Focused on clear, truthful, ATS-friendly applications built from real work.`;
}

function buildSkillGroups(profile: CareerPathProfile, supportedKeywords: string[]) {
  const groups = [
    { category: "Programming", items: profile.skills.programming },
    { category: "Frameworks", items: profile.skills.frameworks },
    { category: "Tools", items: profile.skills.tools },
    { category: "Databases", items: profile.skills.databases },
    { category: "AI Tools", items: profile.skills.aiTools },
    { category: "Soft Skills", items: profile.skills.softSkills },
  ]
    .map((group) => ({ ...group, items: reorderByKeywords(unique([...group.items, ...supportedKeywords.filter((keyword) => group.items.includes(keyword))]), supportedKeywords) }))
    .filter((group) => group.items.length);
  return groups.length ? groups : [{ category: "Skills", items: ["Project execution", "Problem solving", "Learning agility"] }];
}

function getSupportedRoleKeywords(profile: CareerPathProfile, role: string, jobDescription: string) {
  const allSkills = Object.values(profile.skills).flat();
  const keywords = targetKeywords(role, jobDescription);
  return unique([...allSkills.filter((skill) => keywords.some((keyword) => keyword.toLowerCase() === skill.toLowerCase())), ...allSkills.slice(0, 6)]);
}

function targetKeywords(role: string, jobDescription = "") {
  const text = `${role} ${jobDescription}`.toLowerCase();
  const roleSet = Object.entries(ROLE_KEYWORDS).flatMap(([key, words]) => (text.includes(key) ? words : []));
  const knownSkills = Object.values(SKILL_BANK).flat().filter((skill) => new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i").test(`${role} ${jobDescription}`));
  const jdTerms = (jobDescription.match(/\b(react|next\.?js|typescript|javascript|python|sql|api|supabase|firebase|node\.?js|tailwind|git|github|responsive|frontend|backend|full[- ]?stack|figma)\b/gi) ?? []).map(normalizeSkillName);
  return unique([...roleSet, ...knownSkills, ...jdTerms]).slice(0, 16);
}

function buildRecommendedFixes(issues: CareerPathAuditIssue[], content: CareerPathResumeContent) {
  const fixes: string[] = issues.map((issue) => {
    if (issue.type === "missing_contact") return "Add email or phone number to the header.";
    if (issue.type === "missing_proof") return "Add GitHub, portfolio, certificate, or live project links.";
    if (issue.type === "weak_bullet") return "Strengthen project bullets with problem, stack, and result.";
    if (issue.type === "role_alignment") return "Bring supported target-role skills higher in the skills and summary sections.";
    return "Review unsupported claims before applying.";
  });
  if (!content.education.length) fixes.push("Add education details if you are a student or fresher.");
  return unique(fixes).slice(0, 5);
}

function professionalizeBullet(bullet: string, role: string) {
  const trimmed = bullet.replace(/^[-*]\s*/, "").trim();
  if (!trimmed) return `Built role-relevant project work for ${role}.`;
  const startsWithAction = /^(built|created|developed|designed|implemented|improved|analyzed|managed|supported|wrote|deployed)\b/i.test(trimmed);
  const actioned = startsWithAction ? trimmed : `Built ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
  return sentenceCase(actioned.replace(/\bvery\b|\breally\b|\bamazing\b|\bbest\b/gi, "").replace(/\s+/g, " "));
}

function tightenSummary(summary: string, role: string) {
  const clean = summary.replace(/\bpassionate\b|\bhardworking\b|\bdynamic\b/gi, "").replace(/\s+/g, " ").trim();
  if (!clean) return `Truthful, project-focused candidate targeting ${role}, with resume content built from real education, skills, projects, and proof links.`;
  return clean.length > 300 ? `${clean.slice(0, 297).trim()}...` : clean;
}

function buildTailoredSummary(summary: string, role: string, keywords: string[]) {
  const keywordText = keywords.slice(0, 5).join(", ");
  const base = tightenSummary(summary, role).replace(/\.$/, "");
  return `${base}. Tailored for ${role}${keywordText ? ` with supported experience in ${keywordText}` : ""}.`;
}

function resumeToText(content: CareerPathResumeContent) {
  return [
    content.header.name,
    content.header.email,
    content.header.phone,
    content.header.location,
    content.summary,
    ...content.skills.flatMap((group) => [group.category, ...group.items]),
    ...content.projects.flatMap((project) => [project.name, ...project.techStack, ...project.bullets]),
    ...content.experience.flatMap((experience) => [experience.company, experience.role, ...experience.bullets]),
    ...content.education.flatMap((education) => [education.institution, education.degree, education.score ?? ""]),
    ...content.certifications.flatMap((certification) => [certification.name, certification.issuer ?? ""]),
    ...content.achievements,
    ...content.languages,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractTargetRole(message: string) {
  const target = message.match(/\b(?:for|as|targeting|role)\s+(?:a|an|the)?\s*([a-z0-9 +#./-]{3,60})(?:\.|,|\n|$)/i)?.[1]?.trim();
  if (target) return cleanTargetRole(target);
  if (/frontend/i.test(message)) return "Frontend Intern";
  if (/backend/i.test(message)) return "Backend Intern";
  if (/full[- ]?stack/i.test(message)) return "Full Stack Intern";
  if (/\bai\b|machine learning|ml\b/i.test(message)) return "AI Intern";
  return "";
}

function cleanTargetRole(role: string) {
  const cleaned = role.replace(/\b(resume|job|internship|position)\b/gi, "").replace(/\s+/g, " ").trim();
  return cleaned ? titleCase(cleaned) : "";
}

function inferIndustry(role: string) {
  if (/developer|engineer|frontend|backend|full|software|ai|data|web/i.test(role)) return "Software";
  if (/design|ui|ux/i.test(role)) return "Design";
  if (/marketing|sales/i.test(role)) return "Business";
  return "";
}

function inferField(text: string) {
  if (/computer|cs|bca|software|it\b/i.test(text)) return "Computer Science";
  if (/commerce|business/i.test(text)) return "Commerce";
  return "";
}

function detectTechStack(text: string) {
  return unique(Object.values(SKILL_BANK).flat().filter((skill) => new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i").test(text)));
}

function extractFeatures(text: string) {
  const featureWords = ["auth", "login", "dashboard", "chat", "upload", "contact form", "responsive", "seo", "api", "payment", "search"];
  return featureWords.filter((feature) => new RegExp(`\\b${escapeRegExp(feature)}\\b`, "i").test(text)).map(titleCase);
}

function extractProblemSolved(text: string) {
  return text.match(/\b(?:solved|helps?|for)\s+([^.\n]{8,90})/i)?.[1]?.trim() ?? "";
}

function extractImpact(text: string) {
  return text.match(/\b(?:impact|result|outcome)\s*[:\-]?\s*([^.\n]{5,100})/i)?.[1]?.trim() ?? "";
}

function sentenceForHint(text: string, name: string) {
  const sentence = text.split(/[.\n]/).find((item) => item.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
  return sentence?.trim() || name;
}

function cloneProfile(profile: CareerPathProfile) {
  return JSON.parse(JSON.stringify(profile)) as CareerPathProfile;
}

function upsertProfileItem<T>(items: T[], item: T, key: (item: T) => string) {
  const itemKey = key(item);
  const existingIndex = items.findIndex((existing) => key(existing) === itemKey);
  if (existingIndex >= 0) {
    items[existingIndex] = mergeObjects(items[existingIndex], item);
  } else {
    items.push(item);
  }
}

function mergeObjects<T>(left: T, right: T): T {
  const merged: Record<string, unknown> = { ...(left as Record<string, unknown>) };
  for (const [key, value] of Object.entries(right as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] as string[] : []), ...value]);
    } else if (value) {
      merged[key] = value;
    }
  }
  return merged as T;
}

function reorderByKeywords(items: string[], keywords: string[]) {
  return [...items].sort((a, b) => scoreKeyword(b, keywords) - scoreKeyword(a, keywords));
}

function scoreKeyword(value: string, keywords: string[]) {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase())) ? 1 : 0;
}

function normalizeSkillName(value: string) {
  const lower = value.toLowerCase().replace(/\s+/g, " ");
  if (/next/.test(lower)) return "Next.js";
  if (/node/.test(lower)) return "Node.js";
  if (/tailwind/.test(lower)) return "Tailwind CSS";
  if (/full/.test(lower)) return "Full Stack";
  return titleCase(value);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 && /^[A-Z0-9.+#-]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

function sentenceCase(value: string) {
  const clean = value.trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[.!?]*$/, ".") : clean;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
