import { applyResumeUpdate } from "./reducer";
import { emptyResumeState } from "./types";
import type { InterviewState, ResumeState } from "./types";

const STEP_ORDER: InterviewState["step"][] = [
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
];

export function startInterviewState(current?: Partial<ResumeState>): InterviewState {
  return {
    active: true,
    step: "basic_info",
    collectedData: current || emptyResumeState(),
    askedQuestions: [],
  };
}

export function getNextInterviewQuestions(state: InterviewState): string[] {
  const data = state.collectedData;
  const questionsByStep: Record<InterviewState["step"], string[]> = {
    basic_info: [
      "What full name should I use?",
      "Which email or phone number do you want included? You can skip contact details.",
      "Should I include a location? You can skip this.",
    ],
    target_role: [
      "What role are you targeting?",
      "Are you a student, fresher, intern, junior, mid, or senior candidate?",
    ],
    education: [
      "What is your degree or course?",
      "Which college/university and graduation year should I include?",
      "What branch/field and grade should I include, if any?",
    ],
    skills: [
      "Which programming languages, frameworks, tools, databases, or AI tools do you know?",
      "Which 5-8 skills are strongest for your target role?",
    ],
    projects: [
      "What are your project names?",
      "For each project, what did it do?",
      "Which tech did you use in each project? Links are optional.",
    ],
    experience: [
      "Do you have internships, jobs, freelance, or volunteer experience?",
      "If yes, what company, role, dates, and responsibilities should I include?",
    ],
    certifications: [
      "Any certifications to include? Name, issuer, date, and link are optional.",
      "You can say skip if there are none.",
    ],
    achievements: [
      "Any real achievements, awards, rankings, users, outcomes, or metrics to include?",
      "You can skip this if you do not have proof yet.",
    ],
    review: [
      "I have enough to generate your first resume draft. Should I build it now?",
    ],
    complete: [],
  };

  return questionsByStep[state.step].filter((question) => !state.askedQuestions.includes(question)).slice(0, 5);
}

export function updateInterviewState(
  interview: InterviewState,
  extracted: Partial<ResumeState>,
): InterviewState {
  const merged = applyResumeUpdate(interview.collectedData as ResumeState, extracted, "merge");
  const next = advanceStep(interview.step, merged);
  return {
    active: next !== "complete",
    step: next,
    collectedData: merged,
    askedQuestions: [...interview.askedQuestions, ...getNextInterviewQuestions(interview)],
  };
}

function advanceStep(step: InterviewState["step"], data: ResumeState): InterviewState["step"] {
  if (step === "basic_info" && data.candidate.fullName) return "target_role";
  if (step === "target_role" && data.target.role) return "education";
  if (step === "education" && data.education.length) return "skills";
  if (step === "skills" && Object.values(data.skills).some((items) => items?.length)) return "projects";
  if (step === "projects" && data.projects.length) return "experience";
  if (step === "experience") return "certifications";
  if (step === "certifications") return "achievements";
  if (step === "achievements") return "review";
  if (step === "review") return "complete";
  return STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)];
}
