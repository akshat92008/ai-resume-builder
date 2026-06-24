import type { JobAnalysis, ResumeContent, ResumeWarning, UserVault } from "@/lib/types";
import type { ProofAuditResult, ResumeAgentResult } from "./types";
import {
  cleanText,
  cleanTitle,
  compact,
  hasAnyProjectProof,
  hasUrl,
  isPlaceholderText,
  projectProofItems,
  unique,
} from "./utils";

function warning(type: ResumeWarning["type"], message: string, suggestedFix: string, severity: ResumeWarning["severity"] = "medium"): ResumeWarning {
  return { type, message, severity, suggestedFix };
}

function safeEmail(email: string) {
  return /demo@example\.com/i.test(email) ? "" : cleanText(email);
}

function roleLabel(vault: UserVault) {
  return cleanText(vault.profile.target_roles[0]) || "early-career technology role";
}

function summaryFromVault(vault: UserVault) {
  const profile = vault.profile;
  const existing = cleanText(profile.summary);
  if (existing && existing.length >= 80 && !isPlaceholderText(existing)) return existing;

  const skills = unique([
    ...vault.skills.map((skill) => skill.name),
    ...vault.projects.flatMap((project) => project.tech_stack),
  ]).slice(0, 5);
  const projectDirections = unique(
    vault.projects
      .map((project) => cleanText(project.short_description) || cleanText(project.problem_solved) || cleanText(project.title))
      .filter(Boolean)
      .slice(0, 2),
  );

  const skillText = skills.length ? ` using ${skills.join(", ")}` : "";
  const projectText = projectDirections.length
    ? ` Experienced in building ${projectDirections.join(" and ")} with emphasis on clean interfaces, structured data, and practical usability.`
    : " Focused on turning real project work into clear, verifiable outcomes for recruiters.";

  return `${roleLabel(vault)} candidate focused on building practical, proof-backed web and AI products${skillText}.${projectText}`;
}

function projectValue(project: UserVault["projects"][number]) {
  if (cleanText(project.problem_solved)) return project.problem_solved;
  if (cleanText(project.target_users)) return `support ${project.target_users}`;
  if (cleanText(project.short_description)) return project.short_description;
  return "";
}

function projectBullets(project: UserVault["projects"][number], targetRole: string, warnings: ResumeWarning[]) {
  const title = cleanTitle(project.title) || "Project";
  const description = cleanText(project.short_description);
  const value = cleanText(projectValue(project));
  const tech = project.tech_stack.filter(Boolean).slice(0, 5);
  const bullets: string[] = [];

  if (!description && !value) {
    warnings.push(
      warning(
        "generic_wording",
        `${title} has thin project details, so the resume uses a cautious draft bullet.`,
        "Add the problem solved, features built, tech stack, and proof link.",
      ),
    );
  }

  bullets.push(
    `Built ${description || title}${tech.length ? ` using ${tech.join(", ")}` : ""}${value && value !== description ? ` to ${value}` : ""}.`,
  );

  if (project.features.length > 0) {
    bullets.push(`Implemented ${project.features.slice(0, 3).join(", ")} as ${cleanText(project.role) || "the project builder"}.`);
  }

  if (cleanText(project.impact)) {
    bullets.push(`Documented impact: ${cleanText(project.impact)}.`);
  } else if (hasAnyProjectProof(project)) {
    bullets.push("Linked public proof so recruiters can review the implementation and project outcome.");
  } else {
    warnings.push(
      warning(
        "missing_proof",
        `${title} has no GitHub, live demo, screenshots, or case study link.`,
        "Attach one proof link before treating this resume as recruiter-ready.",
      ),
    );
  }

  if (!tech.length) {
    warnings.push(warning("missing_proof", `${title} has no tech stack listed.`, "Add the technologies you actually used."));
  }

  return bullets
    .map(cleanText)
    .filter(Boolean)
    .filter((bullet) => !isPlaceholderText(bullet))
    .slice(0, targetRole.toLowerCase().includes("technical") ? 4 : 3);
}

export function generateResumeWithAgent(
  vault: UserVault,
  jobAnalysis?: JobAnalysis | null,
  proofAudit?: ProofAuditResult | null,
  style = "ATS Formal",
): ResumeAgentResult {
  const warnings: ResumeWarning[] = [];
  const profile = vault.profile;

  if (!cleanText(profile.full_name)) {
    warnings.push(warning("missing_proof", "Name is missing from the resume header.", "Add your legal or preferred professional name.", "high"));
  }
  if (!safeEmail(profile.email)) {
    warnings.push(warning("missing_proof", "Email is missing from the resume header.", "Add a professional email address.", "medium"));
  }
  if (!cleanText(profile.city)) {
    warnings.push(warning("missing_proof", "Location is missing from the resume header.", "Add city or preferred work location if you want it shown.", "low"));
  }

  const recommendedIds = jobAnalysis?.recommendedProjects ?? [];
  const selectedProjects = [
    ...vault.projects.filter((project) => recommendedIds.includes(project.id)),
    ...vault.projects.filter((project) => !recommendedIds.includes(project.id)),
  ].slice(0, style === "Technical Heavy" ? 4 : 3);

  const targetRole = roleLabel(vault);
  const technicalSkills = unique(vault.skills.filter((skill) => skill.category !== "soft").map((skill) => skill.name)).slice(0, 14);
  const tools = unique(vault.projects.flatMap((project) => project.tech_stack)).slice(0, 12);

  if (technicalSkills.length < 2 && tools.length < 2) {
    warnings.push(warning("generic_wording", "Resume has too few real skills to look strong.", "Add at least two skills supported by project work.", "high"));
  }

  proofAudit?.unsupportedClaims.forEach((claim) => {
    warnings.push(warning("unsupported_claim", `${claim} appears unsupported by proof.`, "Remove the claim or add real evidence.", "high"));
  });

  const content: ResumeContent = {
    header: {
      name: cleanText(profile.full_name),
      email: safeEmail(profile.email),
      phone: cleanText(profile.phone),
      city: cleanText(profile.city),
      links: compact([
        hasUrl(profile.linkedin_url) ? { label: "LinkedIn", url: profile.linkedin_url } : null,
        hasUrl(profile.github_url) ? { label: "GitHub", url: profile.github_url } : null,
        hasUrl(profile.portfolio_url) ? { label: "Portfolio", url: profile.portfolio_url } : null,
      ]),
    },
    summary: summaryFromVault(vault),
    skills: {
      technical: technicalSkills,
      tools,
      soft: vault.skills.filter((skill) => skill.category === "soft").map((skill) => skill.name).slice(0, 5),
    },
    projects: selectedProjects
      .map((project) => ({
        title: cleanTitle(project.title),
        description: cleanText(project.short_description),
        bullets: projectBullets(project, targetRole, warnings),
        techStack: project.tech_stack.filter(Boolean),
        proofLinks: projectProofItems(project).map((proof) => ({ label: proof.label, url: proof.url ?? "" })).filter((proof) => hasUrl(proof.url)),
      }))
      .filter((project) => cleanText(project.title) && project.bullets.length > 0),
    experience: vault.experiences
      .filter((experience) => cleanText(experience.company) || cleanText(experience.role))
      .map((experience) => ({
        company: cleanText(experience.company),
        role: cleanText(experience.role),
        date: [cleanText(experience.start_date), cleanText(experience.end_date)].filter(Boolean).join(" - "),
        bullets: [...experience.responsibilities, ...experience.achievements]
          .map(cleanText)
          .filter(Boolean)
          .filter((item) => !isPlaceholderText(item))
          .slice(0, 4),
      })),
    education: vault.education
      .filter((education) => cleanText(education.institution) || cleanText(education.degree))
      .map((education) => ({
        institution: cleanText(education.institution),
        degree: [cleanText(education.degree), cleanText(education.field)].filter(Boolean).join(" - "),
        date: [education.start_year || "", education.end_year || ""].filter(Boolean).join(" - "),
        score: cleanText(education.score),
      })),
    certifications: vault.certificates
      .filter((certificate) => cleanText(certificate.title))
      .map((certificate) => {
        if (!hasUrl(certificate.credential_url)) {
          warnings.push(warning("missing_proof", `${certificate.title} has no credential URL.`, "Add the certificate credential link.", "low"));
        }
        return {
          title: cleanText(certificate.title),
          issuer: cleanText(certificate.issuer),
          date: cleanText(certificate.issue_date),
        };
      }),
    achievements: vault.achievements
      .filter((achievement) => cleanText(achievement.title))
      .map((achievement) => ({
        title: cleanText(achievement.title),
        description: cleanText(achievement.description),
        proofUrl: hasUrl(achievement.proof_url) ? achievement.proof_url : undefined,
      })),
  };

  return sanitizeResumeResult({ content, warnings }, vault, jobAnalysis, proofAudit);
}

export function sanitizeResumeResult(
  result: ResumeAgentResult,
  vault: UserVault,
  jobAnalysis?: JobAnalysis | null,
  proofAudit?: ProofAuditResult | null,
): ResumeAgentResult {
  const fallback = generateResumeWithAgentInternal(vault, jobAnalysis, proofAudit);
  const content = result.content;
  const warnings = [...(result.warnings ?? [])];

  if (!content.header) content.header = fallback.content.header;
  content.header.name = cleanText(content.header.name) || fallback.content.header.name;
  content.header.email = safeEmail(content.header.email);
  content.header.phone = cleanText(content.header.phone);
  content.header.city = cleanText(content.header.city);
  content.header.links = (content.header.links ?? []).filter((link) => hasUrl(link.url));

  if (!cleanText(content.summary) || isPlaceholderText(content.summary) || content.summary.length < 60) {
    content.summary = fallback.content.summary;
    warnings.push(warning("generic_wording", "Resume summary was too generic and was replaced with a safer proof-backed version.", "Add a stronger profile summary in Career Memory."));
  }

  content.projects = (content.projects ?? [])
    .map((project) => ({
      ...project,
      title: cleanTitle(project.title),
      description: cleanText(project.description),
      techStack: unique(project.techStack ?? []),
      proofLinks: (project.proofLinks ?? []).filter((link) => hasUrl(link.url)),
      bullets: (project.bullets ?? []).map(cleanText).filter((bullet) => bullet && !isPlaceholderText(bullet)),
    }))
    .filter((project) => project.title && project.bullets.length > 0);

  if (content.projects.length === 0 && fallback.content.projects.length > 0) {
    content.projects = fallback.content.projects;
  }

  content.skills = content.skills ?? fallback.content.skills;
  content.skills.technical = unique((content.skills.technical ?? []).map(cleanText).filter(Boolean));
  content.skills.tools = unique((content.skills.tools ?? []).map(cleanText).filter(Boolean));
  content.skills.soft = unique((content.skills.soft ?? []).map(cleanText).filter(Boolean));

  content.experience = (content.experience ?? []).map((experience) => ({
    ...experience,
    company: cleanText(experience.company),
    role: cleanText(experience.role),
    date: cleanText(experience.date),
    bullets: (experience.bullets ?? []).map(cleanText).filter((bullet) => bullet && !isPlaceholderText(bullet)),
  })).filter((experience) => experience.company || experience.role || experience.bullets.length);

  content.education = content.education ?? [];
  content.certifications = content.certifications ?? [];
  content.achievements = content.achievements ?? [];

  return { content, warnings: warnings.filter((item, index, arr) => arr.findIndex((other) => other.message === item.message) === index) };
}

function generateResumeWithAgentInternal(
  vault: UserVault,
  jobAnalysis?: JobAnalysis | null,
  proofAudit?: ProofAuditResult | null,
): ResumeAgentResult {
  const warnings: ResumeWarning[] = [];
  const profile = vault.profile;
  return {
    content: {
      header: {
        name: cleanText(profile.full_name),
        email: safeEmail(profile.email),
        phone: cleanText(profile.phone),
        city: cleanText(profile.city),
        links: compact([
          hasUrl(profile.linkedin_url) ? { label: "LinkedIn", url: profile.linkedin_url } : null,
          hasUrl(profile.github_url) ? { label: "GitHub", url: profile.github_url } : null,
          hasUrl(profile.portfolio_url) ? { label: "Portfolio", url: profile.portfolio_url } : null,
        ]),
      },
      summary: summaryFromVault(vault),
      skills: {
        technical: unique(vault.skills.filter((skill) => skill.category !== "soft").map((skill) => skill.name)).slice(0, 14),
        tools: unique(vault.projects.flatMap((project) => project.tech_stack)).slice(0, 12),
        soft: vault.skills.filter((skill) => skill.category === "soft").map((skill) => skill.name).slice(0, 5),
      },
      projects: vault.projects.slice(0, 3).map((project) => ({
        title: cleanTitle(project.title),
        description: cleanText(project.short_description),
        bullets: projectBullets(project, roleLabel(vault), warnings),
        techStack: project.tech_stack,
        proofLinks: projectProofItems(project).map((proof) => ({ label: proof.label, url: proof.url ?? "" })).filter((proof) => hasUrl(proof.url)),
      })).filter((project) => project.title && project.bullets.length > 0),
      experience: [],
      education: vault.education.map((education) => ({
        institution: cleanText(education.institution),
        degree: [cleanText(education.degree), cleanText(education.field)].filter(Boolean).join(" - "),
        date: [education.start_year || "", education.end_year || ""].filter(Boolean).join(" - "),
        score: cleanText(education.score),
      })),
      certifications: vault.certificates.map((certificate) => ({
        title: cleanText(certificate.title),
        issuer: cleanText(certificate.issuer),
        date: cleanText(certificate.issue_date),
      })),
      achievements: vault.achievements.map((achievement) => ({
        title: cleanText(achievement.title),
        description: cleanText(achievement.description),
        proofUrl: hasUrl(achievement.proof_url) ? achievement.proof_url : undefined,
      })),
    },
    warnings,
  };
}
