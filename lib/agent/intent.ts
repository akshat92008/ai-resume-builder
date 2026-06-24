import type { AgentIntent } from "@/lib/agents/types";

export function detectAgentIntent(message: string): AgentIntent {
  const text = message.toLowerCase();
  if (!text.trim()) return "unknown";
  if (/resume|cv|ats/.test(text)) return "build_resume";
  if (/job description|jd|hiring|opening|role requires|responsibilities|analy[sz]e.*job/.test(text)) return "analyze_job";
  if (/improve|expand|rewrite|make.*stronger/.test(text) && /project|app|website|platform|os\b/.test(text)) return "improve_project";
  if (/proof|claim|verify|audit|check|trust/.test(text)) return "check_proof";
  if (/portfolio|publish|public profile/.test(text)) return "publish_portfolio";
  if (/github|linkedin|portfolio link|email|phone|city|target role|profile/.test(text)) return "update_profile";
  if (/built|created|developed|launched|project called|made/.test(text)) return "add_project";
  if (/i know|skills?|learned|good at|experienced in/.test(text)) return "add_skill";
  if (/\?$/.test(text)) return "ask_question";
  return "unknown";
}
