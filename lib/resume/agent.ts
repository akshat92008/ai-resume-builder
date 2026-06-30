import { evaluateResumeCompleteness } from "./completeness";
import { extractResumeFacts } from "./extract";
import { startInterviewState, getNextInterviewQuestions, updateInterviewState } from "./interview";
import { classifyResumeIntent } from "./intent";
import { applyResumeUpdate, normalizeState } from "./reducer";
import { tailorResumeToJob } from "./tailor";
import { validateResumeTruthfulness } from "./validator";
import type { AgentResponse, InterviewState, ResumeState } from "./types";

export async function handleResumeMessage(input: {
  userMessage: string;
  currentResume?: ResumeState | null;
  interviewState?: InterviewState | null;
  activeResumeId?: string | null;
}): Promise<AgentResponse> {
  const intent = classifyResumeIntent(input.userMessage, input.currentResume);

  if (intent.type === "DOWNLOAD_OR_EXPORT") {
    return {
      type: "message",
      message: "Use the Download PDF button. I will export only the resume preview, not the chat or side panels.",
      resume: input.currentResume || undefined,
    };
  }

  if (intent.type === "INTERVIEW_REQUEST") {
    const interview = input.interviewState?.active
      ? input.interviewState
      : startInterviewState(input.currentResume || undefined);
    const questions = getNextInterviewQuestions(interview);
    return {
      type: "questions",
      message: `Absolutely. I will ask a few questions at a time and you can skip anything.\n\n${numbered(questions)}`,
      resume: input.currentResume || undefined,
      interviewState: interview,
    };
  }

  const extracted = extractResumeFacts(input.userMessage, input.currentResume);

  if (input.interviewState?.active) {
    const nextInterview = updateInterviewState(input.interviewState, extracted);
    const questions = getNextInterviewQuestions(nextInterview);
    if (nextInterview.step === "review" || !questions.length) {
      return {
        type: "questions",
        message: "I have enough to generate your first resume draft. Should I build it now?",
        resume: normalizeState(nextInterview.collectedData),
        interviewState: nextInterview,
      };
    }
    return {
      type: "questions",
      message: numbered(questions),
      resume: normalizeState(nextInterview.collectedData),
      interviewState: nextInterview,
    };
  }

  if (intent.type === "BUILD_FROM_DATA") {
    const state = generateResumeState(normalizeState(extracted), "build");
    const completeness = evaluateResumeCompleteness(state);
    if (!completeness.canGenerate) {
      return {
        type: "questions",
        message: `I can build this, but I need a few details first.\n\n${numbered(completeness.nextQuestions)}`,
        resume: input.currentResume || undefined,
        interviewState: startInterviewState(state),
        warnings: state.warnings,
      };
    }
    const validated = validateResumeTruthfulness(null, state, input.userMessage, intent);
    return {
      type: "resume",
      message: buildCreatedMessage(validated.cleanedResume),
      resume: validated.cleanedResume,
      warnings: validated.warnings,
    };
  }

  if (intent.type === "IMPROVE_EXISTING_RESUME") {
    const parsed = generateResumeState(normalizeState(extracted), "improve");
    const improved = applyResumeUpdate(parsed, {}, "improve");
    const validated = validateResumeTruthfulness(parsed, improved, input.userMessage, intent);
    return {
      type: "resume",
      message: "Improved the wording and formatting while preserving your original details. I did not add fake achievements, links, dates, or metrics.",
      resume: validated.cleanedResume,
      warnings: validated.warnings,
    };
  }

  if (intent.type === "TAILOR_TO_JOB") {
    if (!input.currentResume) {
      return {
        type: "questions",
        message: "I need a resume to tailor first. Paste your resume or career details, then share the job description.",
      };
    }
    const jobDescription = extracted.target?.jobDescription || input.userMessage;
    const tailored = tailorResumeToJob(input.currentResume, jobDescription);
    const validated = validateResumeTruthfulness(input.currentResume, tailored.resume, input.userMessage, intent);
    return {
      type: "resume",
      message: `Tailored the resume toward ${validated.cleanedResume.target.role || "the job"}. Matched: ${tailored.matchedKeywords.join(", ") || "none yet"}. Missing from your resume: ${tailored.missingKeywords.join(", ") || "none detected"}. I did not add missing skills without confirmation.`,
      resume: validated.cleanedResume,
      warnings: [...validated.warnings, ...tailored.warnings.map((message) => ({ type: "missing_info" as const, message }))],
      matchedKeywords: tailored.matchedKeywords,
      missingKeywords: tailored.missingKeywords,
    };
  }

  if (intent.type === "EDIT_COMMAND") {
    if (!input.currentResume) {
      return {
        type: "questions",
        message: "I can do that, but I need a resume first. Paste your resume or career details and I will build one safely.",
      };
    }
    if (/\badd achievements? if needed|fake|make up|invent\b/i.test(input.userMessage)) {
      return {
        type: "message",
        message: "I can make the wording stronger, but I won’t add fake achievements. Share real numbers, outcomes, users, rankings, awards, or responsibilities and I’ll turn them into strong bullets.",
        resume: input.currentResume,
      };
    }
    const edited = applyEditCommand(input.currentResume, input.userMessage);
    const validated = validateResumeTruthfulness(input.currentResume, edited, input.userMessage, intent);
    return {
      type: "resume",
      message: "Updated the requested section while preserving the rest of your resume.",
      resume: validated.cleanedResume,
      warnings: validated.warnings,
    };
  }

  if (intent.type === "ADD_TO_RESUME") {
    if (!input.currentResume) {
      const completeness = evaluateResumeCompleteness(normalizeState(extracted));
      const draft = generateResumeState(normalizeState(extracted), "build");
      return {
        type: "questions",
        message: completeness.canGenerate
          ? "I found enough detail to start a new resume around this information. Should I create a new resume draft?"
          : "I can add this, but there is no active resume yet. Should I create a new resume around this project, or do you want to paste your current resume first?",
        resume: draft.projects.length || draft.experience.length || Object.values(draft.skills).some((items) => items?.length) ? draft : undefined,
      };
    }
    const merged = applyResumeUpdate(input.currentResume, extracted, "merge");
    const generated = generateResumeState(merged, "build");
    const validated = validateResumeTruthfulness(input.currentResume, generated, input.userMessage, intent);
    return {
      type: "resume",
      message: "Added the new information and preserved the existing resume.",
      resume: validated.cleanedResume,
      warnings: validated.warnings,
    };
  }

  return {
    type: "message",
    message: "I can build, improve, tailor, edit, or export your resume. Paste career details or ask me to interview you step by step.",
    resume: input.currentResume || undefined,
  };
}

export function generateResumeState(state: ResumeState, mode: "build" | "improve"): ResumeState {
  const next = normalizeState(state);
  const role = next.target.role || "target role";
  next.title = next.title || `${role} Resume`;
  next.summary = next.summary || buildSummary(next);
  next.projects = next.projects.map((project) => ({
    ...project,
    bullets: project.bullets.length ? project.bullets : [`Built ${project.name} as a project.`],
  }));
  next.experience = next.experience.map((experience) => ({
    ...experience,
    bullets: experience.bullets.length ? experience.bullets : [`Supported ${experience.role || "assigned"} responsibilities${experience.company ? ` at ${experience.company}` : ""}.`],
  }));
  if (mode === "improve") return applyResumeUpdate(next, {}, "improve");
  return next;
}

function applyEditCommand(current: ResumeState, command: string): ResumeState {
  const text = command.toLowerCase();
  const update: Partial<ResumeState> = { metadata: { lastUserIntent: command } };
  if (/change (?:target )?role to\s+([a-z0-9 +#./-]{3,70})/i.test(command)) {
    update.target = { role: titleCase(command.match(/change (?:target )?role to\s+([a-z0-9 +#./-]{3,70})/i)?.[1] || "") };
  }
  if (/summary/.test(text) && /shorter|concise/.test(text)) {
    update.summary = current.summary?.split(".").slice(0, 1).join(".").trim() || current.summary;
  }
  if (/more confident|ats friendly|improve bullets|make it stronger/.test(text)) {
    return applyResumeUpdate(current, update, "improve");
  }
  if (/remove/.test(text)) {
    return applyResumeUpdate(current, update, "remove_section");
  }
  if (/one[- ]?page|shorter/.test(text)) {
    const shortened = applyResumeUpdate(current, update, "merge");
    shortened.projects = shortened.projects.map((project) => ({ ...project, bullets: project.bullets.slice(0, 2) }));
    shortened.experience = shortened.experience.map((experience) => ({ ...experience, bullets: experience.bullets.slice(0, 3) }));
    return shortened;
  }
  return applyResumeUpdate(current, update, "merge");
}

function buildSummary(state: ResumeState) {
  const role = state.target.role || "target role";
  const skills = Object.values(state.skills).flatMap((items) => items || []).slice(0, 5);
  const anchors = [
    state.experience.length ? `${state.experience.length} experience item${state.experience.length > 1 ? "s" : ""}` : "",
    state.projects.length ? `${state.projects.length} project${state.projects.length > 1 ? "s" : ""}` : "",
    state.education[0]?.degree,
  ].filter(Boolean);
  return `${state.target.seniority ? titleCase(state.target.seniority) : "Candidate"} targeting ${role}${skills.length ? ` with skills in ${skills.join(", ")}` : ""}${anchors.length ? ` and proof from ${anchors.join(", ")}` : ""}.`;
}

function buildCreatedMessage(state: ResumeState) {
  const omitted = [
    !state.candidate.phone ? "phone" : "",
    !state.candidate.linkedin ? "LinkedIn" : "",
    !state.candidate.github ? "GitHub" : "",
    !state.candidate.portfolio ? "portfolio" : "",
  ].filter(Boolean);
  return `Created a first resume draft using only the details you provided.${omitted.length ? ` I left out ${omitted.join(", ")} because you did not provide them.` : ""}`;
}

function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function titleCase(value: string) {
  return value.trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
