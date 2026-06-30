import type { ResumeIntent, ResumeState } from "./types";

export function classifyResumeIntent(message: string, currentResume?: ResumeState | null): ResumeIntent {
  const text = message.trim().toLowerCase();
  const hasCurrentResume = Boolean(currentResume);
  const enoughData = hasLikelyResumeData(text);

  if ((text.length < 160 || !enoughData) && /\b(download|export|print|save as pdf|download pdf)\b/.test(text)) {
    return result("DOWNLOAD_OR_EXPORT", 0.96, "User asked to export or download.", false, true, hasCurrentResume);
  }

  if (/\b(ask me questions|step by step|don'?t know what to write|do not know what to write|help me fill|interview me)\b/.test(text)) {
    return result("INTERVIEW_REQUEST", 0.98, "User explicitly asked for guided questions.", false, false, false);
  }

  if (/\b(tailor|match this jd|job description|requirements|qualifications|responsibilities)\b/.test(text)) {
    return result("TAILOR_TO_JOB", 0.92, "Message references tailoring or a job description.", false, true, hasCurrentResume);
  }

  if (/^\s*improve this resume\b/.test(text) || (/\b(improve|polish|rewrite|ats friendly|make it better)\b/.test(text) && hasResumeSections(text))) {
    return result("IMPROVE_EXISTING_RESUME", 0.92, "User supplied or referenced an existing resume to improve.", false, false, enoughData);
  }

  if (/\b(add this|add it|add project|add skill|add certificate|add certification|add experience|i made a|new project)\b/.test(text)) {
    return result("ADD_TO_RESUME", 0.9, "User is adding information to the active resume.", false, hasCurrentResume, enoughData);
  }

  if (/\b(make it|make my resume|remove|shorter|one[- ]?page|one page|change target|change role|rewrite summary|rewrite projects|improve bullets|remove section|ats friendly|more confident)\b/.test(text)) {
    return result("EDIT_COMMAND", 0.86, "User gave a command for the current resume.", false, true, hasCurrentResume);
  }

  if (text.length < 80 && !enoughData) {
    return result("INTERVIEW_REQUEST", 0.72, "Message has too little information to safely build a resume.", false, false, false);
  }

  if (/\b(build|create|make|generate).{0,30}\bresume\b/.test(text) || enoughData) {
    return result("BUILD_FROM_DATA", 0.82, "User provided resume data or asked to build a resume.", false, false, enoughData);
  }

  return result("GENERAL_HELP", 0.62, "No resume-building action was clearly requested.", false, false, false);
}

function result(
  type: ResumeIntent["type"],
  confidence: number,
  reason: string,
  needsLlm: boolean,
  needsCurrentResume: boolean,
  hasEnoughData: boolean,
): ResumeIntent {
  return { type, confidence, reason, needsLlm, needsCurrentResume, hasEnoughData };
}

function hasResumeSections(text: string) {
  return /\b(name|email|education|skills|experience|projects|certifications|achievements)\s*[:\-]/i.test(text);
}

function hasLikelyResumeData(text: string) {
  const signals = [
    /\b(name|email|mail|phone|college|education|skills|projects|experience|internship)\b/.test(text),
    /\b(react|python|java|javascript|typescript|sql|figma|power bi|spring boot|node|next\.?js)\b/.test(text),
    /\b(bca|b\.?tech|mca|bsc|degree|diploma)\b/.test(text),
    /\b(want|targeting|for).{0,50}\b(role|resume|developer|analyst|designer|intern)\b/.test(text),
  ];
  return signals.filter(Boolean).length >= 2 || text.length > 180;
}
