/**
 * Differentiation feature intent handlers for the Inngest orchestrator.
 * Handles: STAR_INTERVIEW, HUMANIZE_RESUME, ESTIMATE_IMPACT, GAP_ANALYSIS,
 * MULTI_PERSONA, VISUALIZE_ATS, GENERATE_OUTREACH.
 */

import {
  starInterviewAgent,
  humanizeResumeAgent,
  estimateImpactAgent,
  analyzeCareerGapAgent,
  generatePersonaResumesAgent,
  generateATSViewAgent,
  generateOutreachAgent,
} from "@/lib/careerpath/orchestrator";
import { legacyProfileToCareerProfile, buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { saveServerResume, saveResumeVersion } from "@/lib/careerpath/db";
import { decorateResumeForCareerOS } from "./shared";
import type { CareerPathResume } from "@/lib/careerpath/types";

// ---------------------------------------------------------------------------
// STAR INTERVIEW
// ---------------------------------------------------------------------------

export async function handleStarInterview(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a resume first, then I can interview you to extract the hidden value behind your experience and projects.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile =
    currentResume.careerProfile ||
    legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await starInterviewAgent(
    profile,
    currentResume.content,
    currentResume.targetRole,
    metadata,
  );
  currentResume.starInterview = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const questionList = result.questions
    .map(
      (q, i) =>
        `${i + 1}. **${q.question}**\n   _(${q.context})_`,
    )
    .join("\n\n");
  return {
    assistantMessage: `${result.summary}\n\nAnswer any of these to strengthen your resume:\n\n${questionList}\n\nJust answer in plain language — I'll extract the key points and update your bullets.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

// ---------------------------------------------------------------------------
// HUMANIZE RESUME
// ---------------------------------------------------------------------------

export async function handleHumanizeResume(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a resume first, then I can strip out AI-speak and make it sound genuinely human.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before humanize v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-humanize snapshot",
  });

  const result = await humanizeResumeAgent(
    currentResume.content,
    currentResume.targetRole,
    metadata,
  );
  currentResume.humanizedResume = result;
  currentResume.content = result.content;
  currentResume.version += 1;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const changeCount = result.changes.length;
  const clicheList = result.clisheesRemoved
    .slice(0, 6)
    .join(", ");
  return {
    assistantMessage: `Humanized ✓ — made ${changeCount} change${changeCount !== 1 ? "s" : ""}. Removed AI clichés: ${clicheList || "none found"}.\n\n${result.summary}\n\nYour resume now sounds like it was written by a human, not an AI.`,
    resume: currentResume,
    resumeId: currentResume.id,
    versionCreated: true,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

// ---------------------------------------------------------------------------
// ESTIMATE IMPACT
// ---------------------------------------------------------------------------

export async function handleEstimateImpact(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a resume first, then I can analyze your bullets and suggest safe, verifiable metrics.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile =
    currentResume.careerProfile ||
    legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await estimateImpactAgent(
    profile,
    currentResume.content,
    currentResume.targetRole,
    metadata,
  );
  currentResume.impactEstimates = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  if (!result.suggestions.length) {
    return {
      assistantMessage:
        "Your bullets already have good quantitative proof. No weak metrics detected that need estimation.",
      resume: currentResume,
      resumeId: currentResume.id,
      workspace: buildCareerWorkspaceState(currentResume),
    };
  }

  const suggestionList = result.suggestions
    .slice(0, 4)
    .map(
      (s, i) =>
        `${i + 1}. **${s.itemName}** (${s.section})\n   Original: _"${s.bulletText.slice(0, 80)}..."_\n   Suggested: "${s.improvedBullet}"\n   Confidence: ${s.confidence} — ${s.rationale}`,
    )
    .join("\n\n");

  return {
    assistantMessage: `Found ${result.suggestions.length} bullet${result.suggestions.length !== 1 ? "s" : ""} that could use metrics. Here are conservative estimates you can verify:\n\n${suggestionList}\n\nCheck the **Impact Estimator** tab to accept or reject each suggestion.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

// ---------------------------------------------------------------------------
// GAP ANALYSIS
// ---------------------------------------------------------------------------

export async function handleGapAnalysis(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a resume first, then say 'gap analysis for [target role]' to see how close you are and what to build next.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile =
    currentResume.careerProfile ||
    legacyProfileToCareerProfile(currentResume.profile, userId);
  const targetRole =
    message
      .match(/gap analysis(?:\s+for)?\s+(.{3,80})/i)?.[1]
      ?.trim() || currentResume.targetRole;
  const result = await analyzeCareerGapAgent(
    profile,
    targetRole,
    metadata,
  );
  currentResume.gapAnalysis = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const gapList = result.gaps
    .slice(0, 4)
    .map(
      (g) =>
        `• **${g.skill}** (${g.importance}) — ${g.evidence}${g.projectIdea ? `\n  _Project idea: ${g.projectIdea}_` : ""}`,
    )
    .join("\n");
  const status = result.readyToApply
    ? "✅ **Ready to apply**"
    : "🔧 **Focus on building proof first**";

  return {
    assistantMessage: `**Gap Analysis for ${targetRole}**\n\nMatch score: **${result.matchScore}/100** — ${status}\n\n${result.summary}\n\n**Gaps to address:**\n${gapList}\n\nCheck the **Gap Analysis** tab for the full breakdown and project ideas.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

// ---------------------------------------------------------------------------
// MULTI PERSONA
// ---------------------------------------------------------------------------

export async function handleMultiPersona(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a master resume first, then I can generate 3 distinctly positioned versions targeting different roles.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile =
    currentResume.careerProfile ||
    legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await generatePersonaResumesAgent(
    profile,
    currentResume.content,
    metadata,
  );
  currentResume.multiPersona = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const personaList = result.personas
    .map((p) => `• **${p.persona}** — ${p.whenToUse}`)
    .join("\n");
  return {
    assistantMessage: `Generated ${result.personas.length} persona resumes from your master profile.\n\n${personaList}\n\nCheck the **Personas** tab to preview each version and save the ones you want to use.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

// ---------------------------------------------------------------------------
// VISUALIZE ATS
// ---------------------------------------------------------------------------

export async function handleVisualizeATS(
  currentResume: CareerPathResume | null,
  _userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a resume first, then say 'show ATS view' to see exactly how a robot parses your resume.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const result = await generateATSViewAgent(
    currentResume.content,
    currentResume.targetRole,
    metadata,
  );
  currentResume.atsView = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const criticalIssues = result.criticalFailures.length;
  const statusEmoji =
    result.overallATSScore >= 85
      ? "✅"
      : result.overallATSScore >= 70
        ? "⚠️"
        : "❌";
  return {
    assistantMessage: `**ATS Compatibility: ${result.overallATSScore}/100** ${statusEmoji}\n\n${result.summary}\n\n${criticalIssues > 0 ? `**${criticalIssues} critical issue${criticalIssues !== 1 ? "s" : ""} detected:** ${result.criticalFailures.join("; ")}` : "**No critical ATS failures detected.**"}\n\nCheck the **ATS View** tab to see a full section-by-section parse breakdown.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

// ---------------------------------------------------------------------------
// GENERATE OUTREACH
// ---------------------------------------------------------------------------

export async function handleGenerateOutreach(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage:
        "Build a resume first, then paste a job description and say 'write cover letter' or 'write outreach' to generate your full application pack.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile =
    currentResume.careerProfile ||
    legacyProfileToCareerProfile(currentResume.profile, userId);
  const jobDescription =
    message.length > 100
      ? message
      : currentResume.jobDescription || "";
  const result = await generateOutreachAgent(
    profile,
    currentResume.content,
    jobDescription,
    currentResume.targetRole,
    metadata,
  );
  currentResume.outreachPack = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  return {
    assistantMessage: `Outreach pack ready for **${result.jobTitle || currentResume.targetRole}** at **${result.company || "the company"}**.\n\nGenerated: Cover Letter, LinkedIn DM, Cold Email, LinkedIn Message, Why-Fit Answer, Follow-up Message, ${result.interviewQuestions.length} Interview Q&As, and a preparation plan.\n\nCheck the **Outreach** tab to copy each piece individually.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}
