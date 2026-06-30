import type { MissingField, ResumeState } from "./types";

export function evaluateResumeCompleteness(extracted: Partial<ResumeState>): {
  canGenerate: boolean;
  missingFields: MissingField[];
  nextQuestions: string[];
} {
  const missingFields: MissingField[] = [];
  const hasName = Boolean(extracted.candidate?.fullName);
  const hasTarget = Boolean(extracted.target?.role);
  const skills = Object.values(extracted.skills || {}).flatMap((items) => items || []);
  const hasAnchor = Boolean(extracted.education?.length || extracted.experience?.length || extracted.projects?.length);
  const hasMeaningfulBullet = Boolean(
    extracted.experience?.some((item) => item.bullets.length) ||
    extracted.projects?.some((item) => item.bullets.length && !item.bullets.every((bullet) => /^built .+ as a project\.$/i.test(bullet))),
  );

  if (!hasName) missingFields.push(field("candidate.fullName", "Recruiters expect a name, or you can confirm that you want to leave it blank.", "high"));
  if (!hasTarget) missingFields.push(field("target.role", "A target role keeps the resume focused.", "high"));
  if (!hasAnchor) missingFields.push(field("career.anchor", "A useful resume needs at least one education item, work experience, or named project.", "high"));
  if (!skills.length) missingFields.push(field("skills", "At least one real skill is needed for a useful resume.", "high"));
  if (!hasMeaningfulBullet) missingFields.push(field("resume.bullets", "I need enough detail to write at least one meaningful bullet.", "medium"));

  const nextQuestions = missingFields.map((item) => {
    if (item.field === "candidate.fullName") return "What name should I put on the resume, or should I leave the name blank?";
    if (item.field === "target.role") return "What target role should this resume focus on?";
    if (item.field === "career.anchor") return "What is one education detail, internship/work experience, or named project I should include?";
    if (item.field === "skills") return "Which skills/tools should I include?";
    return "For your strongest project or experience, what did you build or do?";
  }).slice(0, 5);

  return {
    canGenerate: missingFields.filter((item) => item.priority === "high").length === 0 && hasMeaningfulBullet,
    missingFields,
    nextQuestions,
  };
}

function field(fieldName: string, reason: string, priority: MissingField["priority"]): MissingField {
  return { field: fieldName, reason, priority };
}
