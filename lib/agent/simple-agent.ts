import type { AgentCard, AgentCommandInput, AgentCommandOutput, SuggestedAction } from "@/lib/agents/types";
import { runCareerProofAgent } from "@/lib/agents/orchestrator";
import { detectAgentIntent } from "./intent";
import { extractedProfileSummary, extractVaultUpdatesFromText } from "./context";
import { defaultSuggestedActions } from "./actions";

function knownProfileCards(input: AgentCommandInput): AgentCard {
  const profile = input.vault.profile;
  return {
    type: "known_profile",
    title: "Here is what I know about you",
    body: profile.target_roles[0] ? `You are targeting ${profile.target_roles[0]}.` : "I do not know your target role yet.",
    items: [
      profile.full_name ? `Name: ${profile.full_name}` : "I do not know your name yet.",
      profile.target_roles[0] ? `Target role: ${profile.target_roles[0]}` : "Target role missing.",
      input.vault.skills.length ? `Skills: ${input.vault.skills.slice(0, 6).map((skill) => skill.name).join(", ")}` : "Skills missing.",
      input.vault.projects.length ? `Projects: ${input.vault.projects.slice(0, 3).map((project) => project.title).join(", ")}` : "Strongest project missing.",
    ],
  };
}

function responseForIntent(output: ReturnType<typeof runCareerProofAgent>, updatesCount: number) {
  if (updatesCount > 0) {
    return "I found new career details in your message. Review them and confirm before I save them to Career Memory.";
  }
  if (output.intent === "build_resume") {
    if (output.blockingIssues.length) {
      return "I can build a draft, but your resume will be weak if I generate it now. Improve the missing proof and project details first.";
    }
    return output.resume
      ? "I generated a proof-backed resume draft and ran a resume quality check."
      : "Your Career Memory is close. Run the resume generator when you are ready.";
  }
  if (output.intent === "analyze_job") {
    return output.jobFit
      ? `I found a ${output.jobFit.fitLabel.toLowerCase()} at ${output.jobFit.jobFitScore}/100. Fix the proof gaps before applying.`
      : "Paste a job description and I will map it against your proof.";
  }
  if (output.intent === "improve_project") {
    return output.projectExpansion
      ? `Your project details are ${output.projectExpansion.healthLabel.toLowerCase()}. I will ask only the most important question next.`
      : "Add or name a project first, then I can improve it with you.";
  }
  if (output.intent === "publish_portfolio") {
    return "I checked portfolio readiness. Publish only the proof-backed public profile you are comfortable sharing.";
  }
  return "I reviewed your Career Memory and found the next best improvement step.";
}

function cardsForOutput(output: ReturnType<typeof runCareerProofAgent>, input: AgentCommandInput, updatesCount: number): AgentCard[] {
  const cards: AgentCard[] = [knownProfileCards(input)];

  if (output.proofAudit.missingProof.length > 0) {
    cards.push({
      type: "missing_proof",
      title: "Claims without proof",
      body: "Proof Score measures how many resume claims have real evidence like GitHub, demos, certificates, or case studies.",
      score: output.proofAudit.proofScore,
      items: output.proofAudit.missingProof.slice(0, 4),
    });
  }

  if (output.projectExpansion) {
    cards.push({
      type: "weak_project",
      title: `Project health: ${output.projectExpansion.title}`,
      body: output.projectExpansion.canGenerateResumeBullet
        ? "This project can support an honest resume bullet, but proof may still be missing."
        : "Your project details are too thin to generate a strong resume bullet.",
      score: output.projectExpansion.projectHealth,
      items: output.projectExpansion.targetedQuestions,
    });
  }

  if (output.jobFit) {
    cards.push({
      type: "job_fit",
      title: "Job Fit Score",
      body: output.jobFit.resumeAngle,
      score: output.jobFit.jobFitScore,
      items: output.jobFit.gapAnalysis,
    });
  }

  if (output.resumeCritic) {
    cards.push({
      type: "resume_quality",
      title: "Resume quality check",
      body: output.resumeCritic.canUserDownload ? "This draft is usable." : "This resume is a draft, not recruiter-ready yet.",
      score: output.resumeCritic.resumeQualityScore,
      items: output.resumeCritic.recommendedEdits,
    });
  }

  if (updatesCount > 0) {
    cards.push({
      type: "extracted_update",
      title: "Extracted updates",
      body: "Confirm before saving important extracted data.",
      items: [`${updatesCount} update${updatesCount === 1 ? "" : "s"} ready to save.`],
    });
  }

  cards.push({
    type: "next_action",
    title: "Your next best action",
    body: output.nextActions.primaryNextAction,
    items: output.nextActions.secondaryActions,
  });

  output.warnings.forEach((warning) => {
    cards.push({ type: "warning", title: "Needs more proof", body: warning });
  });

  return cards;
}

function suggestedActions(output: ReturnType<typeof runCareerProofAgent>): SuggestedAction[] {
  const actions = defaultSuggestedActions();
  if (output.vaultReport.canGenerateResume) {
    actions.unshift({ label: "Ready to generate", action: "generate_resume", href: "/resumes/new" });
  }
  if (output.projectExpansion && !output.projectExpansion.canGenerateResumeBullet) {
    actions.unshift({ label: "Improve project now", action: "improve_project", href: "/vault" });
  }
  return actions.slice(0, 4);
}

export function runCareerProofAgentCommand(input: AgentCommandInput): AgentCommandOutput {
  const intent = detectAgentIntent(input.userMessage);
  const extractedUpdates = extractVaultUpdatesFromText(input.vault, input.userMessage);
  const result = runCareerProofAgent({
    vault: input.vault,
    userMessage: input.userMessage,
    intent,
    jobDescription: intent === "analyze_job" ? input.userMessage : undefined,
    currentJob: input.currentJob,
    currentResume: input.currentResume,
    mode: input.mode,
  });
  const summary = extractedProfileSummary(extractedUpdates);
  const extractionCards = cardsForOutput(result, input, extractedUpdates.length);
  if (summary.target || summary.skills.length || summary.projects.length) {
    extractionCards.unshift({
      type: "extracted_update",
      title: "I found this about you",
      body: "This is the new information I can save to Career Memory.",
      items: [
        summary.target ? `Target role: ${summary.target}` : "",
        summary.course ? `Course: ${summary.course}` : "",
        summary.skills.length ? `Skills: ${summary.skills.join(", ")}` : "",
        summary.projects.length ? `Projects: ${summary.projects.join(", ")}` : "",
      ].filter(Boolean),
    });
  }

  return {
    intent,
    response: responseForIntent(result, extractedUpdates.length),
    cards: extractionCards,
    suggestedActions: suggestedActions(result),
    extractedUpdates,
    needsConfirmation: extractedUpdates.length > 0,
    blockingIssues: result.blockingIssues,
    nextBestAction: result.nextActions.primaryNextAction,
    result,
  };
}
