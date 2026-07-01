import type {
  AchievementItem,
  AchievementLoggerResult,
  AchievementMiningResult,
  ApplicationPack,
  CareerCommandResult,
  CareerContext,
  CareerCoachNote,
  CareerGap,
  CareerHealth,
  CareerPathProfile,
  CareerPathResume,
  CareerPathResumeAudit,
  CareerProfile,
  JobIntelligenceReport,
  JobApplication,
  JobDescription,
  JobSearchInsight,
  KeywordRanking,
  LinkedInOptimization,
  ProofLevel,
  ResumeBullet,
  ResumeDocument,
  ResumeScore,
  ResumeVersionType,
  SmartResumeVersion,
} from "./types";

const VERSION_GUIDANCE: Record<ResumeVersionType, Omit<SmartResumeVersion, "versionType">> = {
  master: {
    title: "Master Resume",
    whenToUse: "Use as the complete source resume before tailoring to a specific job.",
    emphasizes: ["Complete career memory", "Reusable proof", "All credible projects and experience"],
    reduces: ["Nothing by default"],
    missing: [],
  },
  fresher: {
    title: "Fresher Resume",
    whenToUse: "Use for entry-level roles where education, projects, and proof links carry the resume.",
    emphasizes: ["Education", "Projects", "Technical skills", "Certifications"],
    reduces: ["Generic summary text", "Unsupported claims"],
    missing: [],
  },
  internship: {
    title: "Internship Resume",
    whenToUse: "Use for internship applications that need fast proof of learning and execution.",
    emphasizes: ["Role-relevant projects", "Learning speed", "Tools used", "Availability cues"],
    reduces: ["Unrelated certificates", "Weak filler skills"],
    missing: [],
  },
  frontend: {
    title: "Frontend Developer Resume",
    whenToUse: "Use for frontend internships, React roles, and UI-heavy product engineering roles.",
    emphasizes: ["React/Next.js", "Responsive UI", "User flows", "Deployed frontend projects"],
    reduces: ["Backend-only details", "Unrelated coursework"],
    missing: [],
  },
  fullstack: {
    title: "Full Stack Developer Resume",
    whenToUse: "Use when the role expects frontend, backend, database, and deployment ownership.",
    emphasizes: ["APIs", "Databases", "Authentication", "End-to-end project delivery"],
    reduces: ["Pure design language", "Unsupported platform claims"],
    missing: [],
  },
  ai_product: {
    title: "AI Product Builder Resume",
    whenToUse: "Use for AI product internships, founder office roles, product engineering, and early-stage AI startups.",
    emphasizes: ["AI projects", "Product thinking", "Shipped prototypes", "LLM/API experience"],
    reduces: ["Generic school details", "Unrelated certificates", "Weak filler skills"],
    missing: [],
  },
  startup: {
    title: "Startup Resume",
    whenToUse: "Use for small teams that value shipping speed, ownership, and practical execution.",
    emphasizes: ["Ownership", "Fast builds", "Ambiguous problem solving", "Deployment readiness"],
    reduces: ["Corporate phrasing", "Long process-heavy descriptions"],
    missing: [],
  },
  corporate: {
    title: "Corporate Resume",
    whenToUse: "Use for larger companies where ATS clarity and conservative formatting matter.",
    emphasizes: ["ATS keywords", "Readable structure", "Education", "Professional language"],
    reduces: ["Over-casual product language", "Unverified claims"],
    missing: [],
  },
  job_specific: {
    title: "Job-Specific Resume",
    whenToUse: "Use after pasting a job description and tailoring the resume to that exact role.",
    emphasizes: ["Matched keywords", "Relevant bullets", "Recruiter fit", "Risk warnings"],
    reduces: ["Irrelevant clutter", "Unsupported keywords"],
    missing: [],
  },
};

export function legacyProfileToCareerProfile(
  profile: CareerPathProfile | undefined,
  userId?: string | null,
  rawInput?: string,
): CareerProfile {
  const now = new Date().toISOString();
  const source: CareerPathProfile = profile ?? {
    id: createId(),
    userId: userId || "careerpath-demo-user",
    personal: {},
    target: { role: "", industry: "", experienceLevel: "fresher" },
    education: [],
    skills: { programming: [], frameworks: [], tools: [], databases: [], aiTools: [], softSkills: [] },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: rawInput || "",
    confidenceNotes: [],
  };

  const personal = source.personal || {} as any;
  const target = source.target || {} as any;
  const education = source.education || [];
  const experience = source.experience || [];
  const projects = source.projects || [];
  const certifications = source.certifications || [];
  const achievements = source.achievements || [];
  const languages = source.languages || [];
  const skills = source.skills || { programming: [], frameworks: [], tools: [], databases: [], aiTools: [], softSkills: [] };

  const links = [
    personal.linkedin ? link("LinkedIn", personal.linkedin, "linkedin") : null,
    personal.github ? link("GitHub", personal.github, "github") : null,
    personal.portfolio ? link("Portfolio", personal.portfolio, "portfolio") : null,
  ].filter(Boolean) as CareerProfile["links"];

  const careerProfile: CareerProfile = {
    id: source.id,
    userId: userId || source.userId || null,
    personal: {
      fullName: personal.name,
      email: personal.email,
      phone: personal.phone,
      website: personal.portfolio,
      location: personal.location,
      linkedin: personal.linkedin,
      github: personal.github,
      portfolio: personal.portfolio,
      languages,
    },
    target: {
      targetRoles: unique([target.role].filter(Boolean)),
      dreamRole: target.role,
      dreamCompanies: extractDreamCompanies(source.rawNotes || rawInput || ""),
      targetIndustries: unique([target.industry].filter(Boolean)),
      targetLocations: [],
      preferredCountries: extractPreferredCountries(source.rawNotes || rawInput || ""),
      workPreference: "any",
      remote: /\bremote\b/i.test(source.rawNotes || rawInput || ""),
      hybrid: /\bhybrid\b/i.test(source.rawNotes || rawInput || ""),
      relocation: /\brelocat(e|ion)\b/i.test(source.rawNotes || rawInput || ""),
      experienceLevel: normalizeExperienceLevel(target.experienceLevel),
    },
    preferences: {
      resumeLength: "one_page",
      writingTone: "professional",
      targetSeniority: target.experienceLevel,
      templatePreference: "ats",
      atsPreference: "balanced",
    },
    education: education.map((item: any) => ({
      id: createId(),
      institution: item.institution || "Education",
      degree: item.degree,
      field: item.field,
      branch: item.branch || item.field,
      startDate: item.startYear,
      endDate: item.endYear,
      grade: item.score,
      location: item.location,
      relevantCoursework: extractCoursework(source.rawNotes || rawInput || ""),
      awards: extractAwards(source.rawNotes || rawInput || ""),
      activities: extractActivities(source.rawNotes || rawInput || ""),
    })),
    experience: experience.map((item: any) => ({
      id: createId(),
      company: item.company || "Experience",
      title: item.role || target.role || "Contributor",
      startDate: item.startDate,
      endDate: item.endDate,
      responsibilities: item.responsibilities,
      achievements: item.achievements.map((achievement: any) => achievementItem(achievement, "strong")),
      technologies: extractKnownSkills(`${item.responsibilities?.join(" ") || ""} ${item.achievements?.join(" ") || ""}`),
      projects: extractReferencedProjectNames(item.responsibilities?.join(" ") || ""),
      metrics: extractMetrics(`${item.responsibilities?.join(" ") || ""} ${item.achievements?.join(" ") || ""}`),
      leadership: extractLeadershipSignals(`${item.responsibilities?.join(" ") || ""} ${item.achievements?.join(" ") || ""}`),
      businessImpact: item.achievements || [],
      documents: [],
      proofLevel: item.achievements.length ? "strong" : "weak",
    })),
    projects: projects.map((item: any) => ({
      id: createId(),
      name: item.name,
      description: item.description,
      problem: item.problemSolved,
      solution: item.description,
      technologies: item.techStack,
      links: (item.links || []).map((url: string) => link(url.includes("github") ? "GitHub" : "Project Link", url, url.includes("github") ? "github" : "demo")),
      github: (item.links || []).find((url: string) => /github/i.test(url)),
      liveDemo: (item.links || []).find((url: string) => !/github/i.test(url)),
      challenges: extractChallenges(item.description || item.problemSolved || ""),
      learnings: extractLearnings(source.rawNotes || rawInput || ""),
      metrics: extractMetrics(`${item.impact || ""} ${item.description || ""}`),
      tags: unique([...(item.techStack || []), target.role, target.industry].filter(Boolean)).slice(0, 8),
      achievements: buildProjectAchievements(item),
      status: inferProjectStatus(item.links, item.impact),
      proofLevel: proofFromProject(item.links, item.impact, item.techStack),
    })),
    skills: Object.entries(skills).flatMap(([category, skills]) =>
      skills.map((skillName) => ({
        id: createId(),
        name: skillName,
        category: mapSkillCategory(category),
        subcategory: mapSkillSubcategory(category),
        evidence: evidenceForSkill(skillName, source),
      })),
    ),
    certifications: certifications.map((item: any) => ({
      id: createId(),
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      expiryDate: item.expiryDate,
      credentialUrl: item.credentialLink,
    })),
    achievements: achievements.map((item: any) => achievementItem(item, "strong")),
    documents: extractDocuments(source.rawNotes || rawInput || ""),
    links,
    rawInputs: source.rawNotes || rawInput
      ? [{ id: createId(), content: [source.rawNotes, rawInput].filter(Boolean).join("\n\n"), source: "chat", createdAt: now }]
      : [],
    gaps: [],
    strengths: [],
    weaknesses: [],
    createdAt: now,
    updatedAt: now,
  };

  careerProfile.gaps = detectCareerGaps(careerProfile);
  careerProfile.strengths = detectCareerStrengths(careerProfile);
  careerProfile.weaknesses = detectCareerWeaknesses(careerProfile);
  return careerProfile;
}

export function mergeCareerMemory(
  existing: CareerProfile | undefined | null,
  extracted: CareerProfile,
): CareerProfile {
  if (!existing) return extracted;
  const merged: CareerProfile = {
    ...existing,
    personal: { ...existing.personal, ...cleanEmpty(extracted.personal) },
    target: {
      ...existing.target,
      targetRoles: unique([...existing.target.targetRoles, ...extracted.target.targetRoles]),
      dreamRole: extracted.target.dreamRole || existing.target.dreamRole,
      dreamCompanies: unique([...(existing.target.dreamCompanies || []), ...(extracted.target.dreamCompanies || [])]),
      targetIndustries: unique([...existing.target.targetIndustries, ...extracted.target.targetIndustries]),
      targetLocations: unique([...existing.target.targetLocations, ...extracted.target.targetLocations]),
      preferredCountries: unique([...(existing.target.preferredCountries || []), ...(extracted.target.preferredCountries || [])]),
      targetSalary: extracted.target.targetSalary || existing.target.targetSalary,
      remote: existing.target.remote || extracted.target.remote,
      hybrid: existing.target.hybrid || extracted.target.hybrid,
      relocation: existing.target.relocation || extracted.target.relocation,
      workPreference: extracted.target.workPreference || existing.target.workPreference,
      experienceLevel: extracted.target.experienceLevel || existing.target.experienceLevel,
    },
    preferences: {
      ...existing.preferences,
      ...cleanEmpty(extracted.preferences || {}),
    },
    education: uniqueBy([...existing.education, ...extracted.education], (item) => `${item.institution}-${item.degree}`.toLowerCase()),
    experience: uniqueBy([...existing.experience, ...extracted.experience], (item) => `${item.company}-${item.title}`.toLowerCase()),
    projects: uniqueBy([...existing.projects, ...extracted.projects], (item) => item.name.toLowerCase()),
    skills: uniqueBy([...existing.skills, ...extracted.skills], (item) => item.name.toLowerCase()),
    certifications: uniqueBy([...existing.certifications, ...extracted.certifications], (item) => item.name.toLowerCase()),
    achievements: uniqueBy([...existing.achievements, ...extracted.achievements], (item) => item.text.toLowerCase()),
    documents: uniqueBy([...(existing.documents || []), ...(extracted.documents || [])], (item) => `${item.type}-${item.name}-${item.url || ""}`.toLowerCase()),
    links: uniqueBy([...existing.links, ...extracted.links], (item) => item.url.toLowerCase()),
    rawInputs: uniqueBy([...existing.rawInputs, ...extracted.rawInputs], (item) => item.content),
    gaps: [],
    strengths: [],
    weaknesses: [],
    updatedAt: new Date().toISOString(),
  };
  return refreshCareerProfileInsights(merged);
}

export function mineAchievements(profile: CareerProfile): AchievementMiningResult {
  const suggestedAchievements: AchievementItem[] = [];
  const questions: CareerGap[] = [];
  const weakBullets: string[] = [];
  const strongBullets: string[] = [];

  for (const project of profile.projects) {
    const stack = project.technologies.join(", ");
    const hasProof = project.links.length > 0 || Boolean(project.achievements.some((item) => item.metric || item.evidence));
    const bullet = `Built ${project.name}${stack ? ` using ${stack}` : ""}${project.description ? ` to ${project.description.toLowerCase()}` : " as a portfolio project"}.`;
    if (hasProof || project.technologies.length >= 2) {
      strongBullets.push(bullet);
      suggestedAchievements.push(achievementItem(bullet, hasProof ? "strong" : "estimated", project.name));
    } else {
      weakBullets.push(bullet);
      questions.push(gap("project_proof", `What tech stack, deployed link, GitHub link, or user result can prove ${project.name}?`, "high"));
    }

    if (!project.links.length) questions.push(gap("project_link", `Do you have a GitHub or live demo link for ${project.name}?`, "high"));
    if (!project.achievements.some((item) => item.impact || item.metric)) {
      questions.push(gap("project_impact", `What changed because of ${project.name}: users, time saved, workflow improved, or problem solved?`, "medium"));
    }
  }

  for (const experience of profile.experience) {
    const source = experience.achievements.length ? experience.achievements.map((item) => item.text) : experience.responsibilities;
    for (const item of source) {
      const bullet = item.match(/^(built|created|developed|designed|implemented|improved|led|supported)/i)
        ? item
        : `Delivered ${item.charAt(0).toLowerCase()}${item.slice(1)}`;
      strongBullets.push(sentenceCase(bullet));
      suggestedAchievements.push(achievementItem(sentenceCase(bullet), experience.proofLevel || "strong", experience.company));
    }
  }

  return {
    suggestedAchievements: uniqueBy(suggestedAchievements, (item) => item.text.toLowerCase()).slice(0, 8),
    questions: uniqueBy(questions, (item) => item.question).slice(0, 5),
    weakBullets: unique(weakBullets).slice(0, 6),
    strongBullets: unique(strongBullets).slice(0, 8),
  };
}

export function createResumeDocumentFromResume(
  resume: CareerPathResume,
  profile: CareerProfile,
  versionType: ResumeVersionType = "master",
): ResumeDocument {
  const now = new Date().toISOString();
  const bullets: ResumeBullet[] = [];
  const sections = [
    section("summary", "Summary", 1, resume.content.summary),
    section("skills", "Skills", 2, resume.content.skills),
    section("experience", "Experience", 3, resume.content.experience),
    section("projects", "Projects", 4, resume.content.projects),
    section("education", "Education", 5, resume.content.education),
    section("certifications", "Certifications", 6, resume.content.certifications),
    section("achievements", "Achievements", 7, resume.content.achievements),
    section("links", "Links", 8, resume.content.header.links),
  ].filter((item) => hasSectionContent(item.content));

  for (const project of resume.content.projects) {
    const source = profile.projects.find((item) => item.name.toLowerCase() === project.name.toLowerCase());
    for (const text of project.bullets) {
      bullets.push(bullet(text, "project", source?.id, source?.proofLevel || inferProofLevel(text, project.link)));
    }
  }
  for (const experience of resume.content.experience) {
    const source = profile.experience.find((item) => item.company.toLowerCase() === experience.company.toLowerCase());
    for (const text of experience.bullets) {
      bullets.push(bullet(text, "experience", source?.id, source?.proofLevel || inferProofLevel(text)));
    }
  }
  for (const text of resume.content.achievements) {
    bullets.push(bullet(text, "achievement", undefined, inferProofLevel(text)));
  }

  return {
    id: resume.id,
    profileId: profile.id,
    title: resume.title,
    targetRole: resume.targetRole,
    versionType,
    sections,
    bullets,
    score: toReadinessScore(resume.audit, resume.tailoring?.matchScore),
    createdAt: resume.createdAt || now,
    updatedAt: resume.updatedAt || now,
  };
}

export function generateSmartResumeVersions(resume: CareerPathResume, profile: CareerProfile): SmartResumeVersion[] {
  const missing = profile.gaps.filter((item) => item.status === "open").map((item) => item.area).slice(0, 4);
  return (Object.entries(VERSION_GUIDANCE) as [ResumeVersionType, Omit<SmartResumeVersion, "versionType">][])
    .map(([versionType, item]) => ({
      versionType,
      ...item,
      missing: missing.length ? missing : item.missing,
    }))
    .filter((item) => item.versionType !== "job_specific" || Boolean(resume.jobDescription));
}

export function extractJobDescription(rawText: string): JobDescription {
  const now = new Date().toISOString();
  const title = rawText.match(/\b(?:title|role|position)\s*[:\-]\s*([^\n]{3,80})/i)?.[1]?.trim();
  const company = rawText.match(/\bcompany\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim();
  const location = rawText.match(/\blocation\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim();
  const skills = extractKnownSkills(rawText);
  const salaryClues = rawText.match(/(?:\$|rs\.?|inr|usd|lpa|salary|compensation)[^\n.]{0,80}/gi) ?? [];
  const niceToHaveSkills = extractNiceToHaveSkills(rawText, skills);
  const responsibilities = rawText
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => /\b(build|develop|design|work|collaborate|implement|maintain|create|support|own)\b/i.test(line))
    .slice(0, 8);
  const seniority = /\bsenior|lead|principal\b/i.test(rawText)
    ? "senior"
    : /\bintern|internship\b/i.test(rawText)
      ? "intern"
      : /\bjunior|entry[- ]level|fresher\b/i.test(rawText)
        ? "junior"
        : undefined;

  return {
    id: createId(),
    title,
    company,
    location,
    rawText,
    extractedSkills: skills,
    responsibilities,
    hiddenExpectations: extractHiddenExpectations(rawText),
    requiredExperience: rawText.match(/\b\d\+?\s+years?[^\n.]{0,60}/i)?.[0],
    seniority,
    salaryClues: unique(salaryClues.map((item) => item.trim())).slice(0, 4),
    requiredTools: skills.filter((skill) => /\b(tool|tools|stack|must|required|experience with|proficient)\b/i.test(rawText.slice(Math.max(0, rawText.toLowerCase().indexOf(skill.toLowerCase()) - 80), rawText.toLowerCase().indexOf(skill.toLowerCase()) + 120))).slice(0, 10),
    niceToHaveSkills,
    industry: inferIndustry(rawText),
    keywords: unique([...skills, ...niceToHaveSkills, ...extractRoleKeywords(rawText)]).slice(0, 18),
    createdAt: now,
  };
}

export function analyzeJobIntelligence(job: JobDescription, profile: CareerProfile): JobIntelligenceReport {
  const memorySkillNames = profile.skills.map((skill) => skill.name.toLowerCase());
  const matchedSkills = job.keywords.filter((keyword) => memorySkillNames.includes(keyword.toLowerCase()));
  const missingSkills = job.keywords.filter((keyword) => !memorySkillNames.includes(keyword.toLowerCase())).slice(0, 8);
  const hasExperience = profile.experience.length > 0;
  const missingExperience = [
    job.requiredExperience && !hasExperience ? job.requiredExperience : "",
    job.seniority === "senior" && !["senior", "mid"].includes(profile.target.experienceLevel || "") ? "senior-level ownership evidence" : "",
    job.responsibilities.some((item) => /\blead|mentor|own\b/i.test(item)) && !profile.experience.some((item) => item.leadership?.length) ? "leadership or ownership examples" : "",
  ].filter(Boolean);
  const keywordRanking: KeywordRanking[] = job.keywords.map((keyword, index) => ({
    keyword,
    importance: index < 4 ? "critical" : index < 8 ? "high" : index < 13 ? "medium" : "low",
    presentInCareerMemory: memorySkillNames.includes(keyword.toLowerCase()),
  }));
  const fitPercentage = clamp(Math.round(
    35 +
    (matchedSkills.length / Math.max(1, job.keywords.length)) * 45 +
    (profile.projects.length ? 8 : 0) +
    (hasExperience ? 7 : 0) -
    missingExperience.length * 5,
  ), 0, 100);

  return {
    job,
    fitPercentage,
    matchedSkills,
    missingSkills,
    missingExperience,
    keywordRanking,
    hiddenExpectations: job.hiddenExpectations,
    salaryClues: job.salaryClues,
    requiredTools: job.requiredTools,
    niceToHaveSkills: job.niceToHaveSkills,
    industry: job.industry,
  };
}

export function generateApplicationPack(
  profile: CareerProfile,
  resume: CareerPathResume,
  job: JobDescription,
): ApplicationPack {
  const now = new Date().toISOString();
  const name = profile.personal.fullName || "the candidate";
  const role = job.title || resume.targetRole || profile.target.targetRoles[0] || "this role";
  const company = job.company || "your team";
  const assets = profile.strengths.map((item) => item.title).slice(0, 3);
  const missingSkills = job.keywords.filter((keyword) => !profile.skills.some((skill) => skill.name.toLowerCase() === keyword.toLowerCase())).slice(0, 6);

  return {
    id: createId(),
    jobId: job.id,
    resumeId: resume.id,
    coverLetter: `Dear ${company} team,\n\nI am excited to apply for ${role}. My strongest fit comes from ${assets.join(", ") || "hands-on project work and a proof-based resume"}. I have focused on truthful, role-relevant work using ${profile.skills.map((skill) => skill.name).slice(0, 6).join(", ") || "practical tools"} and would welcome the chance to bring that execution mindset to ${company}.\n\nBest,\n${name}`,
    recruiterDM: `Hi, I found the ${role} opening at ${company}. My background includes ${assets[0] || "hands-on project work"} and I would love to be considered. Happy to share my resume.`,
    coldEmail: `Subject: Application for ${role}\n\nHi ${company} team,\n\nI am applying for ${role}. My resume highlights ${assets.join(", ") || "project-based proof"} and role-relevant skills without unsupported claims. I would be grateful for the opportunity to discuss how I can contribute.\n\nBest,\n${name}`,
    linkedinMessage: `Hi, I saw the ${role} role at ${company}. I am interested and have relevant proof from ${assets[0] || "recent project work"}. Could I share my resume?`,
    whyFitAnswer: `I am a fit for ${role} because my resume is built around ${assets.join(", ") || "practical, proof-backed work"} and the skills I can truthfully support: ${profile.skills.map((skill) => skill.name).slice(0, 8).join(", ") || "project execution and learning speed"}.`,
    interviewQuestions: [],
    missingSkills,
    preparationPlan: [
      "Review every resume claim and remove anything you cannot support.",
      missingSkills.length ? `Decide whether to learn or explicitly leave out ${missingSkills.slice(0, 2).join(" and ")}.` : "Send the tailored resume with the cover letter.",
      "Add GitHub/demo links before sending if available.",
    ],
    followUpMessage: `Hi, I wanted to follow up on my application for ${role}. I remain very interested in ${company} and would be happy to share any additional details about my projects or resume.`,
    createdAt: now,
  };
}

export function createJobApplicationFromCommand(
  input: string,
  userId: string | null,
  resume?: CareerPathResume | null,
  job?: JobDescription | null,
): JobApplication {
  const now = new Date().toISOString();
  const company = job?.company || input.match(/\b(?:company|at)\s*[:\-]?\s*([a-z0-9 &.'-]{2,70})/i)?.[1]?.trim() || "Saved Company";
  const role = job?.title || input.match(/\b(?:role|position|for)\s*[:\-]?\s*([a-z0-9 +#./-]{3,80})/i)?.[1]?.trim() || resume?.targetRole || "Target Role";
  const jobUrl = input.match(/https?:\/\/[^\s)]+/i)?.[0];
  const applied = /\b(applied|submitted|sent)\b/i.test(input);
  return {
    id: createId(),
    userId,
    company: titleCase(company),
    role: titleCase(role),
    jobUrl,
    jobDescriptionId: job?.id,
    resumeId: resume?.id,
    status: applied ? "applied" : "saved",
    appliedAt: applied ? now : undefined,
    followUpAt: applied ? addDaysIso(5) : undefined,
    notes: input,
    createdAt: now,
    updatedAt: now,
  };
}

export function analyzeJobSearchPerformance(
  applications: JobApplication[],
  resumes: ResumeDocument[],
): JobSearchInsight[] {
  const insights: JobSearchInsight[] = [];
  const applied = applications.filter((item) => ["applied", "follow_up_needed", "interview", "rejected", "offer", "ghosted"].includes(item.status));
  const interviews = applications.filter((item) => item.status === "interview" || item.outcome?.gotInterview);
  const rejected = applications.filter((item) => item.status === "rejected" || item.outcome?.rejected);
  const avgProof = Math.round(resumes.reduce((sum, resume) => sum + (resume.score?.proofStrength || 0), 0) / Math.max(1, resumes.length));

  if (applied.length >= 5 && interviews.length === 0) {
    insights.push(insight("resume_issue", "Applications are not converting yet", `You have ${applied.length} applied roles and no interviews recorded. The resume may still be too generic or low-proof.`, "Tailor each resume to the job and add project links or proof details.", "high"));
  }
  if (avgProof > 0 && avgProof < 70) {
    insights.push(insight("proof_issue", "Proof strength is holding the resume back", "Several bullets still need links, metrics, technical detail, or clearer outcomes.", "Add GitHub/demo links and one confirmed result for your strongest project.", "high"));
  }
  if (applications.filter((item) => item.status === "saved").length > applied.length) {
    insights.push(insight("follow_up_issue", "Saved jobs are piling up", "You have more saved roles than submitted applications.", "Generate application packs for saved jobs and apply in batches.", "medium"));
  }
  if (interviews.length > 0 && rejected.length >= interviews.length) {
    insights.push(insight("positive_signal", "The resume is getting some attention", "You are reaching interviews, so the next bottleneck may be interview storytelling or technical preparation.", "Practice project walkthroughs and common role-specific questions.", "medium"));
  }
  if (!insights.length) {
    insights.push(insight("positive_signal", "Your job search loop is ready", "Start tracking applications so CareerPath AI can learn from outcomes.", "Apply with tailored versions and update statuses after each response.", "low"));
  }
  return insights;
}

export function routeCareerCommand(input: string, context: CareerContext = {}): CareerCommandResult {
  const text = input.toLowerCase();
  const wantsPack = /\b(application pack|prepare everything|cover letter|recruiter|cold email|linkedin message)\b/.test(text);
  const wantsTrack = /\b(track|applied|application status|follow up|follow-up|saved this job)\b/.test(text);
  const wantsAnalyze = /\b(not getting interviews|why.*interviews|analy[sz]e.*job search|last \d+ applications|0 replies|no replies)\b/.test(text);
  const wantsTailor = /\b(tailor|job description|match this jd|jd:|requirements|qualifications)\b/.test(text);
  const wantsVersion = /\b(master|fresher|internship|frontend|full stack|ai product|startup|corporate).*\b(resume|version)\b/.test(text);
  const wantsImprove = /\b(improve|stronger|better|ats|polish|rewrite)\b/.test(text);
  const wantsLinkedIn = /\blinkedin\b/.test(text) && /\b(optimi[sz]e|profile|headline|about|featured|seo)\b/.test(text);
  const wantsAchievementLog = isAchievementLogInput(input);
  const careerData = /\b(i am|i built|i made|i know|project|certificate|education|college|intern|fresher|student|optimized|improved|shipped|launched|reduced|increased|won|published)\b/.test(text) || input.length > 140;

  if (wantsPack) return command("generate_application_pack", false, true, true, false, false, "I will tailor the resume and prepare the full application pack.");
  if (wantsTrack) return command("track_job_application", false, false, false, true, false, "I will save this as a tracked application.");
  if (wantsAnalyze) return command("analyze_job_search", false, false, false, false, true, "I will analyze your application outcomes and suggest a strategy adjustment.");
  if (wantsTailor) return command("tailor_resume_to_job", false, true, false, false, false, "I will tailor your resume to this job without adding unsupported keywords.");
  if (wantsVersion) return command("generate_resume_version", true, false, false, false, false, "I will generate a smarter resume version for this use case.");
  if (wantsImprove) return command("improve_resume", false, false, false, false, false, "I will improve the current resume using proof-based edits.");
  if (wantsLinkedIn) return command("optimize_linkedin", false, false, false, false, false, "I will generate LinkedIn sections from Career Memory.");
  if (wantsAchievementLog) return command("log_achievement", true, false, false, false, false, "I will save this achievement to career memory and turn it into a stronger bullet.", true);
  if (careerData || !context.resume) return command("build_career_profile", true, false, false, false, false, "I will update your career memory and build a resume from it.");
  return command("general_career_question", false, false, false, false, false, "Ask me to build, tailor, pack, track, or analyze your job search.");
}

export function buildCareerWorkspaceState(resume: CareerPathResume | null | undefined, rawInput?: string) {
  if (!resume) {
    return {
      careerProfile: null,
      mining: null,
      smartVersions: [],
      jobIntelligence: null,
      applicationPack: null,
      applications: [],
      insights: [],
      linkedInOptimization: null,
      careerHealth: null,
      coachNotes: [],
      achievementLog: null,
      jobDescription: null,
      command: null,
    };
  }
  const profile = refreshCareerProfileInsights(resume.careerProfile || legacyProfileToCareerProfile(resume.profile, resume.userId, rawInput));
  const resumeDocument = resume.resumeDocument || createResumeDocumentFromResume(resume, profile, resume.jobDescription ? "job_specific" : "master");
  const applications = resume.applications || [];
  const jobDescription = resume.jobDescription ? extractJobDescription(resume.jobDescription) : null;
  const jobIntelligence = jobDescription ? analyzeJobIntelligence(jobDescription, profile) : null;
  const insights = resume.jobSearchInsights || analyzeJobSearchPerformance(applications, [resumeDocument]);
  const mining = mineAchievements(profile);
  return {
    careerProfile: profile,
    mining,
    smartVersions: generateSmartResumeVersions(resume, profile),
    jobIntelligence,
    applicationPack: resume.applicationPack || null,
    applications,
    insights,
    linkedInOptimization: generateLinkedInOptimization(profile, resume, jobDescription || undefined),
    careerHealth: buildCareerHealth(profile, resume, applications, insights),
    coachNotes: generateCareerCoachNotes(profile, resume, jobIntelligence, insights),
    achievementLog: rawInput && isAchievementLogInput(rawInput) ? previewAchievementLog(profile, rawInput) : null,
    jobDescription,
    command: null,
  };
}

export function refreshCareerProfileInsights(profile: CareerProfile): CareerProfile {
  const next: CareerProfile = {
    ...profile,
    preferences: profile.preferences || {
      resumeLength: "one_page",
      writingTone: "professional",
      templatePreference: "ats",
      atsPreference: "balanced",
    },
    documents: profile.documents || [],
    personal: {
      ...profile.personal,
      languages: profile.personal.languages || [],
    },
    target: {
      ...profile.target,
      dreamCompanies: profile.target.dreamCompanies || [],
      preferredCountries: profile.target.preferredCountries || [],
    },
  };
  next.gaps = detectCareerGaps(next);
  next.strengths = detectCareerStrengths(next);
  next.weaknesses = detectCareerWeaknesses(next);
  return next;
}

export function isAchievementLogInput(input: string): boolean {
  return /\b(log|achievement|accomplished|today|shipped|launched|optimized|improved|reduced|increased|won|published|fixed|delivered)\b/i.test(input) &&
    /\b(built|made|created|optimized|improved|reduced|increased|won|published|fixed|delivered|launched|shipped|completed)\b/i.test(input);
}

export function applyAchievementLog(profile: CareerProfile, note: string): { profile: CareerProfile; result: AchievementLoggerResult } {
  const result = previewAchievementLog(profile, note);
  const linkedProjectNames = new Set(result.linkedProjectIds);
  const updatedProjects = profile.projects.map((project) => {
    if (!linkedProjectNames.has(project.id)) return project;
    return {
      ...project,
      achievements: uniqueBy([...project.achievements, result.achievement], (item) => item.text.toLowerCase()),
      metrics: unique([...(project.metrics || []), ...extractMetrics(note)]),
      tags: unique([...(project.tags || []), ...result.linkedSkills]).slice(0, 10),
    };
  });
  const rawInput = { id: createId(), content: note, source: "manual" as const, createdAt: new Date().toISOString() };
  const updatedProfile = refreshCareerProfileInsights({
    ...profile,
    projects: updatedProjects,
    achievements: uniqueBy([...profile.achievements, result.achievement], (item) => item.text.toLowerCase()),
    rawInputs: uniqueBy([...profile.rawInputs, rawInput], (item) => item.content),
    updatedAt: new Date().toISOString(),
  });
  return { profile: updatedProfile, result };
}

export function previewAchievementLog(profile: CareerProfile, note: string): AchievementLoggerResult {
  const linkedSkills = profile.skills
    .filter((skill) => new RegExp(`\\b${escapeRegExp(skill.name)}\\b`, "i").test(note))
    .map((skill) => skill.name)
    .slice(0, 8);
  const linkedProjects = profile.projects.filter((project) => new RegExp(`\\b${escapeRegExp(project.name)}\\b`, "i").test(note));
  const context = linkedProjects[0]?.name || profile.experience.find((item) => new RegExp(`\\b${escapeRegExp(item.company)}\\b`, "i").test(note))?.company;
  const achievement = {
    ...achievementItem(stripAchievementPrefix(note), inferProofLevel(note), context),
    metric: extractMetrics(note)[0],
    impact: extractImpactPhrase(note),
  };
  const suggestedResumeBullet = professionalizeCareerBullet(achievement.text, profile.target.targetRoles[0] || profile.target.dreamRole || "target role");

  return {
    achievement,
    suggestedResumeBullet,
    linkedSkills,
    linkedProjectIds: linkedProjects.map((project) => project.id),
    memoryUpdates: [
      "Saved as a standalone achievement",
      linkedProjects.length ? `Linked to ${linkedProjects.map((project) => project.name).join(", ")}` : "Ready to link to a project or experience",
      linkedSkills.length ? `Linked skills: ${linkedSkills.join(", ")}` : "No existing skills matched yet",
      "Suggested a stronger resume bullet",
    ],
  };
}

export function generateLinkedInOptimization(
  profile: CareerProfile,
  resume: CareerPathResume,
  job?: JobDescription,
): LinkedInOptimization {
  const role = job?.title || resume.targetRole || profile.target.targetRoles[0] || "Career Builder";
  const skills = profile.skills.map((skill) => skill.name);
  const featured = [
    ...profile.projects.slice(0, 3).map((project) => `${project.name}${project.liveDemo ? ` - ${project.liveDemo}` : project.github ? ` - ${project.github}` : ""}`),
    ...profile.certifications.slice(0, 2).map((cert) => cert.name),
  ].filter(Boolean);
  const proof = profile.strengths.map((item) => item.title).slice(0, 2).join(" and ");
  return {
    headline: `${role} | ${skills.slice(0, 4).join(" | ") || "Project-focused career profile"}`,
    about: `I am building toward ${role} with a career memory grounded in ${proof || "projects, skills, and measurable achievements"}. My strongest evidence includes ${featured.slice(0, 2).join(", ") || "hands-on work and proof-backed learning"}.`,
    experienceUpdates: resume.content.experience.flatMap((item) => item.bullets.slice(0, 2)).slice(0, 6),
    skills: unique([...skills, ...(job?.keywords || [])]).slice(0, 25),
    featured,
    keywords: unique([role, ...(job?.keywords || []), ...skills]).slice(0, 20),
    seoNotes: [
      "Use the target role in the headline and About section.",
      "Pin strongest projects, certificates, or portfolio links in Featured.",
      "Keep skills aligned with evidence already stored in Career Memory.",
    ],
  };
}

export function buildCareerHealth(
  profile: CareerProfile,
  resume: CareerPathResume,
  applications: JobApplication[],
  insights: JobSearchInsight[],
): CareerHealth {
  const memorySignals = [
    Boolean(profile.personal.email || profile.personal.phone),
    profile.education.length > 0,
    profile.experience.length > 0,
    profile.projects.length > 0,
    profile.skills.length >= 5,
    profile.achievements.length > 0,
    profile.links.length > 0,
    profile.target.targetRoles.length > 0,
  ];
  const memoryCompleteness = Math.round((memorySignals.filter(Boolean).length / memorySignals.length) * 100);
  const resumeScore = resume.score?.overall || resume.resumeDocument?.score?.overall || 0;
  const skillGapCount = profile.gaps.filter((gapItem) => /skill|proof|impact|target/i.test(gapItem.area)).length;
  const recentActivity = [
    resume.updatedAt ? `Resume updated ${new Date(resume.updatedAt).toLocaleDateString("en-US")}` : "",
    applications[0] ? `${applications[0].company} application ${applications[0].status.replaceAll("_", " ")}` : "",
    insights[0]?.title || "",
  ].filter(Boolean);
  const latestDocuments = [
    resume.title,
    ...(profile.documents || []).slice(0, 4).map((document) => document.name),
  ].filter(Boolean);
  return {
    overall: Math.round((memoryCompleteness + resumeScore + Math.max(0, 100 - skillGapCount * 12)) / 3),
    memoryCompleteness,
    resumeScore,
    applicationCount: applications.length,
    skillGapCount,
    recentActivity,
    latestDocuments,
  };
}

export function generateCareerCoachNotes(
  profile: CareerProfile,
  resume: CareerPathResume,
  jobIntelligence: JobIntelligenceReport | null,
  insights: JobSearchInsight[],
): CareerCoachNote[] {
  const notes: CareerCoachNote[] = [];
  if (jobIntelligence?.missingSkills.length) {
    notes.push(coachNote(
      "Missing job keywords",
      `The job asks for ${jobIntelligence.missingSkills.slice(0, 3).join(", ")} and Career Memory does not prove them yet.`,
      "Add proof if you truly have it, or leave those keywords out of the tailored resume.",
      "high",
    ));
  }
  if (profile.weaknesses.some((item) => /Impact/.test(item.title))) {
    notes.push(coachNote(
      "Resume lacks quantified impact",
      "Several achievements still read as activity rather than outcome.",
      "Log results such as users, time saved, performance improved, or workflow changed.",
      "high",
    ));
  }
  if (!profile.links.some((item) => item.type === "github" || item.type === "portfolio" || item.type === "demo")) {
    notes.push(coachNote(
      "Proof links are thin",
      "Recruiters get less confidence when projects have no GitHub, demo, portfolio, or certificate link.",
      "Add at least one proof link to the strongest project.",
      "medium",
    ));
  }
  if ((resume.score?.overall || 0) >= 80 && profile.gaps.length <= 2) {
    notes.push(coachNote(
      "Ready for targeted applications",
      "Your resume score and memory completeness are strong enough to start applying selectively.",
      "Tailor the resume for each job and track every application outcome.",
      "medium",
    ));
  }
  for (const insightItem of insights.slice(0, 2)) {
    notes.push(coachNote(insightItem.title, insightItem.explanation, insightItem.suggestedAction, insightItem.priority));
  }
  if (!notes.length) {
    notes.push(coachNote(
      "Build the memory foundation",
      "CareerPath AI needs a little more career data before it can coach precisely.",
      "Add one project, one achievement, and your target role.",
      "low",
    ));
  }
  return uniqueBy(notes, (item) => item.title).slice(0, 6);
}

function detectCareerGaps(profile: CareerProfile): CareerGap[] {
  const gaps: CareerGap[] = [];
  if (!profile.personal.email && !profile.personal.phone) gaps.push(gap("contact", "What email or phone number should recruiters use?", "high"));
  if (!profile.links.some((item) => item.type === "github" || item.type === "portfolio")) gaps.push(gap("proof_links", "Do you have GitHub, portfolio, certificate, or deployed project links?", "high"));
  if (!profile.documents.length && !profile.links.some((item) => item.type === "certificate")) gaps.push(gap("documents", "Do you want to attach certificates, transcripts, portfolio PDFs, or reference letters?", "low"));
  if (!profile.education.length && ["student", "fresher", "intern"].includes(profile.target.experienceLevel || "")) gaps.push(gap("education", "What is your education institution, degree/course, and graduation year?", "high"));
  for (const project of profile.projects.slice(0, 3)) {
    if (!project.links.length) gaps.push(gap("project_links", `Do you have a GitHub or live demo link for ${project.name}?`, "high"));
    if (!project.achievements.some((item) => item.metric || item.impact)) gaps.push(gap("project_impact", `What problem did ${project.name} solve, and do you have any result or user feedback?`, "medium"));
  }
  if (!profile.target.targetRoles.length) gaps.push(gap("target_role", "What roles are you targeting first?", "high"));
  return uniqueBy(gaps, (item) => item.question).slice(0, 6);
}

function detectCareerStrengths(profile: CareerProfile) {
  const strengths = [];
  if (profile.projects.length) {
    strengths.push({
      id: createId(),
      title: `${profile.projects.length} project${profile.projects.length > 1 ? "s" : ""} ready for positioning`,
      explanation: "Projects are strong proof for students, freshers, self-taught builders, and career switchers.",
      relatedItems: profile.projects.map((item) => item.id),
    });
  }
  const technicalSkills = profile.skills.filter((item) => item.category === "technical" || item.category === "tool");
  if (technicalSkills.length) {
    strengths.push({
      id: createId(),
      title: `${technicalSkills.slice(0, 4).map((item) => item.name).join(", ")} skill cluster`,
      explanation: "These skills can anchor role-specific resume versions when backed by projects.",
      relatedItems: technicalSkills.map((item) => item.id),
    });
  }
  if (profile.achievements.length) {
    strengths.push({
      id: createId(),
      title: `${profile.achievements.length} reusable achievement${profile.achievements.length > 1 ? "s" : ""}`,
      explanation: "Achievements can be reused across resumes, LinkedIn, cover letters, and application answers.",
      relatedItems: profile.achievements.map((item) => item.id),
    });
  }
  return strengths;
}

function detectCareerWeaknesses(profile: CareerProfile) {
  const weaknesses = [];
  if (profile.gaps.some((item) => item.area.includes("proof"))) {
    weaknesses.push({
      id: createId(),
      title: "Proof links are thin",
      explanation: "Recruiters may hesitate if projects have no GitHub, demo, certificate, or outcome evidence.",
      suggestedFix: "Add links or one confirmed implementation detail for each top project.",
    });
  }
  if (!profile.projects.some((item) => item.achievements.some((achievement) => achievement.metric || achievement.impact))) {
    weaknesses.push({
      id: createId(),
      title: "Impact is not quantified yet",
      explanation: "The resume can stay truthful, but it needs context such as users, testers, pages, time saved, or workflow improved.",
      suggestedFix: "Answer the achievement questions for your strongest project.",
    });
  }
  return weaknesses;
}

function toReadinessScore(audit?: CareerPathResumeAudit, tailoringScore?: number): ResumeScore {
  const score = audit?.score;
  const roleMatch = score?.roleAlignment ?? tailoringScore ?? 65;
  const keywordMatch = score?.keywordCoverage ?? tailoringScore ?? 62;
  const proofStrength = score?.proofAndMetrics ?? 58;
  const readability = score?.clarity ?? 72;
  const seniorityFit = score?.onePageFit ?? 74;
  const atsCompatibility = score?.atsCompatibility ?? 88;
  const overall = score?.overall ?? Math.round((roleMatch + keywordMatch + proofStrength + readability + seniorityFit + atsCompatibility) / 6);
  return {
    overall,
    roleMatch,
    keywordMatch,
    proofStrength,
    readability,
    seniorityFit,
    atsCompatibility,
    explanation: `Career Readiness Score: ${overall}/100. Improve it by increasing proof, role alignment, and supported keyword coverage.`,
  };
}

function buildProjectAchievements(project: CareerPathProfile["projects"][number]): AchievementItem[] {
  const achievements: AchievementItem[] = [];
  if (project.problemSolved) achievements.push(achievementItem(`Designed ${project.name} around ${project.problemSolved}.`, "strong", project.name));
  if (project.features.length) achievements.push(achievementItem(`Implemented ${project.features.slice(0, 3).join(", ")} in ${project.name}.`, "strong", project.name));
  if (project.impact) achievements.push(achievementItem(project.impact, "strong", project.name));
  if (!achievements.length && project.description) achievements.push(achievementItem(project.description, project.techStack.length ? "estimated" : "weak", project.name));
  return achievements;
}

function proofFromProject(links: string[], impact: string, techStack: string[]): ProofLevel {
  if (links.some((item) => /github|demo|vercel|netlify|app\./i.test(item)) && impact) return "verified";
  if (links.length || impact) return "strong";
  if (techStack.length >= 2) return "estimated";
  return "weak";
}

function inferProofLevel(text: string, link?: string | null): ProofLevel {
  if (link) return "verified";
  if (/\b\d+%|\b\d+\s+(users|testers|customers|pages|projects|hours)\b/i.test(text)) return "estimated";
  if (/\b(built|developed|implemented|designed|deployed)\b/i.test(text) && /\b(using|with|react|next|supabase|api|sql|tailwind)\b/i.test(text)) return "strong";
  if (/\b(best|amazing|expert|world-class|guaranteed)\b/i.test(text)) return "risky";
  return "weak";
}

function inferProjectStatus(links: string[], impact: string): CareerProfile["projects"][number]["status"] {
  if (/revenue|paid|sales/i.test(impact)) return "revenue";
  if (/\busers?|testers?|customers?\b/i.test(impact)) return "users";
  if (links.some((item) => /vercel|netlify|render|app\.|demo/i.test(item))) return "deployed";
  return "built";
}

function extractKnownSkills(text: string) {
  const skills = [
    "React", "Next.js", "TypeScript", "JavaScript", "Python", "Node.js", "Express", "Supabase",
    "Firebase", "PostgreSQL", "SQL", "Tailwind CSS", "Figma", "Git", "GitHub", "API", "NVIDIA NIM",
    "OpenAI", "LangChain", "Docker", "HTML", "CSS",
  ];
  return skills.filter((skill) => new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i").test(text));
}

function extractRoleKeywords(text: string) {
  return (text.match(/\b(frontend|backend|full[- ]?stack|ai|product|internship|intern|responsive|dashboard|authentication|database|deployment|startup)\b/gi) ?? [])
    .map((item) => item.replace(/full[- ]?stack/i, "Full Stack"))
    .map(titleCase);
}

function evidenceForSkill(skill: string, profile: CareerPathProfile) {
  return profile.projects
    .filter((project) => project.techStack.some((item) => item.toLowerCase() === skill.toLowerCase()))
    .map((project) => project.name);
}

function mapSkillCategory(category: string): "technical" | "soft" | "tool" | "language" | "domain" {
  if (category === "softSkills") return "soft";
  if (category === "tools" || category === "aiTools") return "tool";
  if (category === "programming") return "technical";
  return "domain";
}

function mapSkillSubcategory(category: string): NonNullable<CareerProfile["skills"][number]["subcategory"]> {
  if (category === "programming") return "programming";
  if (category === "frameworks") return "framework";
  if (category === "databases") return "database";
  if (category === "aiTools") return "ai";
  if (category === "softSkills") return "soft";
  return "tool";
}

function inferIndustry(text: string) {
  const lower = text.toLowerCase();
  if (/\b(ai|llm|machine learning|ml|data)\b/.test(lower)) return "AI / Software";
  if (/\bfrontend|backend|full[- ]?stack|software|developer|engineer\b/.test(lower)) return "Software";
  if (/\bfinance|bank|fintech|trading\b/.test(lower)) return "Finance";
  if (/\bhealth|medical|clinic|hospital\b/.test(lower)) return "Healthcare";
  if (/\bedtech|education|school|learning\b/.test(lower)) return "Education";
  if (/\becommerce|retail|marketplace\b/.test(lower)) return "Commerce";
  return "";
}

function extractDreamCompanies(text: string) {
  const match = text.match(/\b(?:dream company|target companies|preferred companies)\s*[:\-]\s*([^\n.]{2,160})/i)?.[1];
  return match ? splitList(match).slice(0, 8) : [];
}

function extractPreferredCountries(text: string) {
  const match = text.match(/\b(?:preferred countries|target countries|countries)\s*[:\-]\s*([^\n.]{2,160})/i)?.[1];
  return match ? splitList(match).slice(0, 8) : [];
}

function extractCoursework(text: string) {
  const match = text.match(/\b(?:coursework|courses)\s*[:\-]\s*([^\n.]{2,180})/i)?.[1];
  return match ? splitList(match).slice(0, 10) : [];
}

function extractAwards(text: string) {
  return (text.match(/\b(?:award|won|winner|ranked|honou?r|scholarship)[^\n.]{2,120}/gi) ?? [])
    .map(sentenceCase)
    .slice(0, 6);
}

function extractActivities(text: string) {
  const match = text.match(/\b(?:activities|clubs|societies)\s*[:\-]\s*([^\n.]{2,180})/i)?.[1];
  return match ? splitList(match).slice(0, 8) : [];
}

function extractReferencedProjectNames(text: string) {
  return (text.match(/\b(?:project|product|app|website|dashboard)\s+([a-z0-9 &.'-]{3,50})/gi) ?? [])
    .map((item) => titleCase(item.replace(/\b(project|product|app|website|dashboard)\b/i, "").trim()))
    .filter(Boolean)
    .slice(0, 6);
}

function extractMetrics(text: string) {
  return unique(text.match(/\b(?:\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s*(?:users|customers|students|testers|hours|days|weeks|months|seconds|minutes|requests|pages|features|projects|dollars|usd|inr|lpa))\b/gi) ?? [])
    .slice(0, 8);
}

function extractLeadershipSignals(text: string) {
  return (text.match(/\b(?:led|mentored|managed|coordinated|owned|trained|organized)[^\n.]{2,120}/gi) ?? [])
    .map(sentenceCase)
    .slice(0, 6);
}

function extractChallenges(text: string) {
  return (text.match(/\b(?:challenge|blocked|difficult|issue|problem)[^\n.]{2,120}/gi) ?? [])
    .map(sentenceCase)
    .slice(0, 4);
}

function extractLearnings(text: string) {
  return (text.match(/\b(?:learned|learning|improved my understanding|figured out)[^\n.]{2,120}/gi) ?? [])
    .map(sentenceCase)
    .slice(0, 4);
}

function extractDocuments(text: string): CareerProfile["documents"] {
  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return urls
    .filter((url) => /\.(pdf|docx?|pptx?|xlsx?)(?:$|\?)/i.test(url) || /\b(certificate|transcript|portfolio|resume)\b/i.test(url))
    .map((url) => ({
      id: createId(),
      name: url.split("/").pop()?.replace(/[?#].*$/, "") || "Career Document",
      type: /certificate/i.test(url) ? "certificate" as const : /transcript/i.test(url) ? "transcript" as const : /portfolio/i.test(url) ? "portfolio" as const : /resume/i.test(url) ? "resume" as const : "pdf" as const,
      url,
      createdAt: new Date().toISOString(),
    }));
}

function extractNiceToHaveSkills(text: string, requiredSkills: string[]) {
  const niceSections = (text.match(/(?:nice to have|preferred|bonus|plus)[^\n.]{0,220}/gi) ?? []).join(" ");
  return extractKnownSkills(niceSections).filter((skill) => !requiredSkills.includes(skill)).slice(0, 8);
}

function extractHiddenExpectations(text: string) {
  const expectations = [
    /\bfast[- ]paced|startup|ambiguous|ownership\b/i.test(text) ? "High ownership in ambiguous environments" : "",
    /\bcross[- ]functional|stakeholder|collaborate\b/i.test(text) ? "Cross-functional communication" : "",
    /\bscale|performance|latency|reliability\b/i.test(text) ? "Performance and reliability mindset" : "",
    /\bmentor|lead|review\b/i.test(text) ? "Leadership beyond individual contribution" : "",
    /\bcustomer|user|client\b/i.test(text) ? "User or customer empathy" : "",
  ];
  return expectations.filter(Boolean);
}

function stripAchievementPrefix(note: string) {
  return note
    .replace(/^\s*(log\s+)?(achievement|accomplishment|today)\s*[:\-]?\s*/i, "")
    .trim();
}

function extractImpactPhrase(text: string) {
  return text.match(/\b(?:reduced|increased|improved|saved|grew|cut|boosted|optimized)[^\n.]{2,140}/i)?.[0];
}

function professionalizeCareerBullet(text: string, role: string) {
  const clean = stripAchievementPrefix(text).replace(/\s+/g, " ").trim();
  const startsWithAction = /^(built|created|developed|designed|implemented|improved|optimized|reduced|increased|launched|shipped|led|delivered|fixed)\b/i.test(clean);
  const actioned = startsWithAction ? clean : `Delivered ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
  const suffix = /\b(for|using|with|to)\b/i.test(actioned) ? "" : ` for ${role.toLowerCase()} proof`;
  return sentenceCase(`${actioned}${suffix}`);
}

function coachNote(title: string, message: string, action: string, priority: CareerCoachNote["priority"]): CareerCoachNote {
  return { id: createId(), title, message, action, priority };
}

function section(type: ResumeDocument["sections"][number]["type"], title: string, order: number, content: unknown) {
  return { id: createId(), type, title, order, content };
}

function bullet(text: string, sourceType: ResumeBullet["sourceType"], sourceId: string | undefined, proofLevel: ProofLevel): ResumeBullet {
  return {
    id: createId(),
    text,
    sourceType,
    sourceId,
    proofLevel,
    riskFlags: proofLevel === "weak" || proofLevel === "risky" ? ["Needs proof: add metric, link, result, or technical detail."] : [],
  };
}

function achievementItem(text: string, proofLevel: ProofLevel, context?: string): AchievementItem {
  return {
    id: createId(),
    text: sentenceCase(text),
    context,
    proofLevel,
  };
}

function link(label: string, url: string, type: NonNullable<CareerProfile["links"][number]["type"]>) {
  return { id: createId(), label, url, type };
}

function gap(area: string, question: string, importance: CareerGap["importance"]): CareerGap {
  return { id: createId(), area, question, importance, status: "open" };
}

function insight(type: JobSearchInsight["type"], title: string, explanation: string, suggestedAction: string, priority: JobSearchInsight["priority"]): JobSearchInsight {
  return { id: createId(), type, title, explanation, suggestedAction, priority };
}

function command(
  intent: CareerCommandResult["intent"],
  shouldGenerateResume: boolean,
  shouldTailor: boolean,
  shouldGenerateApplicationPack: boolean,
  shouldTrackApplication: boolean,
  shouldAnalyzeSearch: boolean,
  suggestedResponse: string,
  shouldLogAchievement = false,
): CareerCommandResult {
  return { intent, shouldGenerateResume, shouldTailor, shouldGenerateApplicationPack, shouldTrackApplication, shouldAnalyzeSearch, shouldLogAchievement, suggestedResponse };
}

function normalizeExperienceLevel(value: string | undefined): CareerProfile["target"]["experienceLevel"] {
  const text = (value || "").toLowerCase();
  if (text.includes("switch")) return "career_switcher";
  if (text.includes("student")) return "student";
  if (text.includes("intern")) return "intern";
  if (text.includes("junior")) return "junior";
  if (text.includes("mid")) return "mid";
  if (text.includes("senior")) return "senior";
  return "fresher";
}

function hasSectionContent(content: unknown) {
  if (Array.isArray(content)) return content.length > 0;
  if (content && typeof content === "object") return Object.values(content).some(Boolean);
  return Boolean(content);
}

function cleanEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "" && item !== null)) as Partial<T>;
}

function splitList(value: string) {
  return unique(value.split(/,|;|\||\band\b/i).map((item) => titleCase(item.trim())).filter(Boolean));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function sentenceCase(value: string) {
  const clean = value.trim().replace(/[.!?]*$/, ".");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 && /^[A-Z0-9.+#-]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
