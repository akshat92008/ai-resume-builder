/**
 * Differentiation feature intent handlers for the Inngest orchestrator.
 */
import { starInterviewAgent, humanizeResumeAgent, estimateImpactAgent, analyzeCareerGapAgent, generatePersonaResumesAgent, generateATSViewAgent, generateOutreachAgent } from "@/lib/careerpath/orchestrator";
import { legacyProfileToCareerProfile, buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { saveServerResume, saveResumeVersion } from "@/lib/careerpath/db";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import type { CareerPathResume } from "@/lib/careerpath/types";

async function persistMutation(resume: CareerPathResume, expectedVersion: number) {
  resume.version = expectedVersion + 1;
  resume.updatedAt = new Date().toISOString();
  await saveServerResume(resume, resume.userId, { expectedVersion });
}

export async function handleStarInterview(currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a resume first, then I can interview you to extract the hidden value behind your experience and projects.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await starInterviewAgent(profile, currentResume.content, currentResume.targetRole, metadata);
  currentResume.starInterview = result;
  await persistMutation(currentResume, expectedVersion);
  const questionList = result.questions.map((q, i) => `${i + 1}. **${q.question}**\n   _(${q.context})_`).join("\n\n");
  return { assistantMessage: `${result.summary}\n\nAnswer any of these to strengthen your resume:\n\n${questionList}\n\nJust answer in plain language — I'll extract the key points and update your bullets.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}

export async function handleHumanizeResume(currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a resume first, then I can strip out AI-speak and make it sound genuinely human.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  await saveResumeVersion({ userId, resumeId: currentResume.id, versionName: `Before humanize v${currentResume.version}`, resumeJson: currentResume.content, reason: "Pre-humanize snapshot" });
  const result = await humanizeResumeAgent(currentResume.content, currentResume.targetRole, metadata);
  const verified = await verifyResumeCandidate({
    content: result.content,
    currentResume,
    userId,
    legacyProfile: currentResume.profile || null,
    careerProfile: currentResume.careerProfile || null,
    instruction: "Humanize the existing resume wording only. Preserve every factual boundary in Career Memory and do not introduce new claims, metrics, skills, employers, projects, or outcomes.",
    mode: "improve",
    targetRole: currentResume.targetRole,
    jobDescription: currentResume.jobDescription,
    metadata,
  });
  currentResume.humanizedResume = { ...result, content: verified.content };
  currentResume.content = verified.content;
  currentResume.careerProfile = verified.careerProfile;
  currentResume.audit = verified.audit;
  currentResume.score = verified.score;
  await persistMutation(currentResume, expectedVersion);
  const removed = verified.provenance.removedClaims;
  return { assistantMessage: `Humanized ✓ — made ${result.changes.length} change${result.changes.length !== 1 ? "s" : ""}. Removed AI clichés: ${result.clisheesRemoved.slice(0, 6).join(", ") || "none found"}.${removed ? ` The truth layer removed ${removed} unsupported claim${removed === 1 ? "" : "s"} before saving.` : ""}\n\n${result.summary}\n\nYour resume now sounds more natural while staying inside verified Career Memory.`, resume: currentResume, resumeId: currentResume.id, versionCreated: true, workspace: buildCareerWorkspaceState(currentResume) };
}

export async function handleEstimateImpact(currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a resume first, then I can analyze your bullets and suggest safe, verifiable metrics.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await estimateImpactAgent(profile, currentResume.content, currentResume.targetRole, metadata);
  currentResume.impactEstimates = result;
  await persistMutation(currentResume, expectedVersion);
  if (!result.suggestions.length) return { assistantMessage: "Your bullets already have good quantitative proof. No weak metrics detected that need estimation.", resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
  const suggestionList = result.suggestions.slice(0, 4).map((s, i) => `${i + 1}. **${s.itemName}** (${s.section})\n   Original: _"${s.bulletText.slice(0, 80)}..."_\n   Suggested: "${s.improvedBullet}"\n   Confidence: ${s.confidence} — ${s.rationale}`).join("\n\n");
  return { assistantMessage: `Found ${result.suggestions.length} bullet${result.suggestions.length !== 1 ? "s" : ""} that could use metrics. Here are conservative estimates you can verify:\n\n${suggestionList}\n\nOpen **Power Tools** to review each impact suggestion.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}

export async function handleGapAnalysis(message: string, currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a resume first, then say 'gap analysis for [target role]' to see how close you are and what to build next.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const targetRole = message.match(/gap analysis(?:\s+for)?\s+(.{3,80})/i)?.[1]?.trim() || currentResume.targetRole;
  const result = await analyzeCareerGapAgent(profile, targetRole, metadata);
  currentResume.gapAnalysis = result;
  await persistMutation(currentResume, expectedVersion);
  const gapList = result.gaps.slice(0, 4).map((g) => `• **${g.skill}** (${g.importance}) — ${g.evidence}${g.projectIdea ? `\n  _Project idea: ${g.projectIdea}_` : ""}`).join("\n");
  const status = result.readyToApply ? "✅ **Ready to apply**" : "🔧 **Focus on building proof first**";
  return { assistantMessage: `**Gap Analysis for ${targetRole}**\n\nMatch score: **${result.matchScore}/100** — ${status}\n\n${result.summary}\n\n**Gaps to address:**\n${gapList}\n\nOpen **Power Tools** for the full gap breakdown and project ideas.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}

export async function handleMultiPersona(currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a master resume first, then I can generate 3 distinctly positioned versions targeting different roles.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await generatePersonaResumesAgent(profile, currentResume.content, metadata);
  currentResume.multiPersona = result;
  await persistMutation(currentResume, expectedVersion);
  return { assistantMessage: `Generated ${result.personas.length} persona resumes from your master profile.\n\n${result.personas.map((p) => `• **${p.persona}** — ${p.whenToUse}`).join("\n")}\n\nOpen **Power Tools** to preview each persona.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}

export async function handleVisualizeATS(currentResume: CareerPathResume | null, _userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a resume first, then say 'show ATS view' to see exactly how a robot parses your resume.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  const result = await generateATSViewAgent(currentResume.content, currentResume.targetRole, metadata);
  currentResume.atsView = result;
  await persistMutation(currentResume, expectedVersion);
  const statusEmoji = result.overallATSScore >= 85 ? "✅" : result.overallATSScore >= 70 ? "⚠️" : "❌";
  return { assistantMessage: `**ATS Compatibility: ${result.overallATSScore}/100** ${statusEmoji}\n\n${result.summary}\n\n${result.criticalFailures.length > 0 ? `**${result.criticalFailures.length} critical issue${result.criticalFailures.length !== 1 ? "s" : ""} detected:** ${result.criticalFailures.join("; ")}` : "**No critical ATS failures detected.**"}\n\nOpen **Power Tools** for the full section-by-section ATS parse.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}

export async function handleGenerateOutreach(message: string, currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  if (!currentResume) return { assistantMessage: "Build a resume first, then paste a job description and say 'write cover letter' or 'write outreach' to generate your full application pack.", resume: null, resumeId: null, workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const jobDescription = message.length > 100 ? message : currentResume.jobDescription || "";
  const result = await generateOutreachAgent(profile, currentResume.content, jobDescription, currentResume.targetRole, metadata);
  currentResume.outreachPack = result;
  await persistMutation(currentResume, expectedVersion);
  return { assistantMessage: `Outreach pack ready for **${result.jobTitle || currentResume.targetRole}** at **${result.company || "the company"}**.\n\nGenerated: Cover Letter, LinkedIn DM, Cold Email, LinkedIn Message, Why-Fit Answer, Follow-up Message, ${result.interviewQuestions.length} Interview Q&As, and a preparation plan.\n\nOpen **Power Tools** to copy each outreach asset individually.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}
