import { emptyResumeState, createResumeId } from "./types";
import type { ResumeState } from "./types";

const SKILLS: Array<{ canonical: string; aliases: string[]; group: keyof ResumeState["skills"] }> = [
  { canonical: "HTML", aliases: ["html"], group: "frontend" },
  { canonical: "CSS", aliases: ["css"], group: "frontend" },
  { canonical: "JavaScript", aliases: ["javascript", "js"], group: "programming" },
  { canonical: "TypeScript", aliases: ["typescript", "ts"], group: "programming" },
  { canonical: "React", aliases: ["react", "react.js", "reactjs"], group: "frontend" },
  { canonical: "Next.js", aliases: ["next.js", "next js", "nextjs"], group: "frontend" },
  { canonical: "Redux", aliases: ["redux"], group: "frontend" },
  { canonical: "Tailwind CSS", aliases: ["tailwind", "tailwind css"], group: "frontend" },
  { canonical: "Responsive Design", aliases: ["responsive design", "responsive"], group: "frontend" },
  { canonical: "Node.js", aliases: ["node.js", "node js", "node"], group: "backend" },
  { canonical: "Express", aliases: ["express", "express.js"], group: "backend" },
  { canonical: "REST APIs", aliases: ["rest api", "rest apis", "api", "apis"], group: "backend" },
  { canonical: "Socket.io", aliases: ["socket io", "socket.io"], group: "backend" },
  { canonical: "Python", aliases: ["python"], group: "programming" },
  { canonical: "Java", aliases: ["java"], group: "programming" },
  { canonical: "Spring Boot", aliases: ["spring boot"], group: "backend" },
  { canonical: "SQL", aliases: ["sql"], group: "databases" },
  { canonical: "MySQL", aliases: ["mysql", "my sql"], group: "databases" },
  { canonical: "MongoDB", aliases: ["mongodb", "mongo db", "mongo"], group: "databases" },
  { canonical: "MERN", aliases: ["mern"], group: "backend" },
  { canonical: "Supabase", aliases: ["supabase"], group: "backend" },
  { canonical: "Firebase", aliases: ["firebase"], group: "backend" },
  { canonical: "Git", aliases: ["git"], group: "tools" },
  { canonical: "GitHub", aliases: ["github"], group: "tools" },
  { canonical: "Docker", aliases: ["docker"], group: "cloudDevOps" },
  { canonical: "AWS", aliases: ["aws"], group: "cloudDevOps" },
  { canonical: "Power BI", aliases: ["power bi", "powerbi"], group: "tools" },
  { canonical: "Excel", aliases: ["excel"], group: "tools" },
  { canonical: "Figma", aliases: ["figma"], group: "tools" },
  { canonical: "Gemini API", aliases: ["gemini api", "gemini"], group: "aiMl" },
  { canonical: "NVIDIA NIM", aliases: ["nvidia nim"], group: "aiMl" },
  { canonical: "AI APIs", aliases: ["ai api", "ai apis", "ai"], group: "aiMl" },
  { canonical: "Charts", aliases: ["charts", "chart"], group: "frontend" },
  { canonical: "Authentication", aliases: ["auth", "authentication", "login"], group: "backend" },
];

export function extractResumeFacts(message: string, currentState?: ResumeState | null): Partial<ResumeState> {
  const state = emptyResumeState();
  state.id = currentState?.id || createResumeId();
  const text = message.trim();
  const lower = text.toLowerCase();

  extractCandidate(text, state);
  extractTarget(text, state);
  extractSkillsFromText(text, state);
  extractEducation(text, state);
  extractExperience(text, state);
  extractProjects(text, state);
  extractCertifications(text, state);
  extractAchievements(text, state);
  extractJobDescription(text, state);

  state.metadata.updatedAt = new Date().toISOString();
  return stripEmptyState(state);
}

export function extractSkillsFromText(text: string, state: ResumeState, nearText = text) {
  for (const skill of SKILLS) {
    if (skill.aliases.some((alias) => hasAlias(nearText, alias))) {
      state.skills[skill.group] = unique([...(state.skills[skill.group] || []), skill.canonical]);
    }
  }
  if (/\bdesign systems?\b/i.test(nearText)) {
    state.skills.other = unique([...(state.skills.other || []), "Design Systems"]);
  }
}

export function extractKnownSkills(text: string): string[] {
  const temp = emptyResumeState();
  extractSkillsFromText(text, temp);
  return unique(Object.values(temp.skills).flatMap((items) => items || []));
}

function extractCandidate(text: string, state: ResumeState) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\s-]?){9,14}\d/)?.[0]?.trim();
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const github = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const portfolio = urls.find((url) => !/linkedin|github/i.test(url));
  const location = text.match(/\b(?:location|city)\s*[:\-]\s*([a-z\s,.-]{2,50})/i)?.[1]?.trim();
  const name =
    text.match(/\bname\s*[:\-]\s*([a-z][a-z\s.'-]{1,60})(?:\n|$)/i)?.[1]?.trim() ||
    text.match(/\bmy name is\s+([a-z][a-z\s.'-]{1,60})(?:[.,\n]|$)/i)?.[1]?.trim() ||
    text.match(/\b(?:build resume for|resume for|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?:[.,\n]|$)/)?.[1]?.trim() ||
    safeIamName(text);

  if (name) state.candidate.fullName = titleCase(name);
  if (email) state.candidate.email = email;
  if (phone) state.candidate.phone = phone;
  if (location) state.candidate.location = titleCase(location);
  if (linkedin) state.candidate.linkedin = linkedin;
  if (github) state.candidate.github = github;
  if (portfolio) state.candidate.portfolio = portfolio;
}

function extractTarget(text: string, state: ResumeState) {
  const roleCandidates = [
    text.match(/\bwant\s+(?:a|an)?\s*([a-z0-9 +#./-]{3,70}?)\s+(?:role|resume|position|job)\b/i)?.[1],
    text.match(/\btarget(?:ing)?\s+(?:a|an)?\s*([a-z0-9 +#./-]{3,70})(?:[.,\n]|$)/i)?.[1],
    text.match(/\b(?:for|as)\s+(?:a|an)?\s*([a-z0-9 +#./-]{3,70}?)\s+(?:resume|role|position|job)\b/i)?.[1],
    text.match(/\b(?:she is|he is|i am|i'm)\s+(?:a|an)?\s*([a-z0-9 +#./-]{3,50}?(?:developer|engineer|designer|analyst|intern))(?:\s+with|[.,\n]|$)/i)?.[1],
  ].filter(Boolean) as string[];
  const role = roleCandidates.find((item) => /developer|engineer|designer|analyst|intern|backend|frontend|full[- ]?stack|data|ui|ux/i.test(item));
  if (role) state.target.role = titleCase(cleanRole(role));
  if (/\bstudent\b/i.test(text)) state.target.seniority = "student";
  else if (/\bfresher\b/i.test(text)) state.target.seniority = "fresher";
  else if (/\bintern(ship)?\b/i.test(text)) state.target.seniority = "intern";
  else if (/\bjunior\b/i.test(text)) state.target.seniority = "junior";
  else if (/\bsenior\b/i.test(text)) state.target.seniority = "senior";
}

function extractEducation(text: string, state: ResumeState) {
  const degree = normalizeDegree(text.match(/\b(B\.?Tech|BTech|BCA|MCA|B\.?Sc|BSc|Diploma|B\.?Des|M\.?Tech)\b/i)?.[1]);
  const year = text.match(/\b(20[1-4]\d)\b/)?.[1];
  const college =
    text.match(/\b(?:college|university|school|institution)\s*[:\-]?\s*([a-z0-9 &.'-]{3,80})(?=\s+(?:b\.?tech|btech|bca|mca|b\.?sc|bsc|diploma|\d{4})|[,\n.]|$)/i)?.[1]?.trim() ||
    text.match(/\bcollege\s+([a-z0-9 &.'-]{3,50})\s+(?:b\.?tech|btech|bca|mca|b\.?sc|bsc|diploma)\b/i)?.[1]?.trim();
  const field = normalizeField(text.match(/\b(?:b\.?tech|btech|bca|mca|b\.?sc|bsc|diploma)\s+([a-z]{2,30})(?=\s+\d{4}|[,\n.]|$)/i)?.[1]);
  const educationLine = text.match(/\beducation\s*[:\-]\s*([^\n]+)/i)?.[1];
  const lineDegree = normalizeDegree(educationLine?.match(/\b(B\.?Tech|BTech|BCA|MCA|B\.?Sc|BSc|Diploma|B\.?Des|M\.?Tech)\b/i)?.[1]);
  const lineYear = educationLine?.match(/\b(20[1-4]\d)\b/)?.[1];

  const finalDegree = degree || lineDegree;
  const finalYear = year || lineYear;
  if (finalDegree || college || finalYear) {
    state.education.push({
      id: createResumeId(),
      institution: college ? titleCase(college) : undefined,
      degree: finalDegree,
      field,
      year: finalYear,
    });
  }
}

function extractExperience(text: string, state: ResumeState) {
  const explicitExperience = text.match(/\bexperience\s*[:\-]\s*([^\n]+)/i)?.[1];
  const internship = text.match(/\binternship\b[^\n.]{0,160}/i)?.[0];
  const internAt = text.match(/\b(intern(?:ship)?(?:\s+experience)?\s+at\s+[a-z0-9 &.'-]{2,80})/i)?.[1];
  const source = explicitExperience || internship || internAt;
  if (!source && !/\bintern at\b/i.test(text)) return;

  const company =
    source?.match(/\bat\s+([a-z0-9 &.'-]{2,70})(?=\s+(?:january|february|march|april|may|june|july|august|sep|oct|nov|dec|\d|backend|frontend|as|made|worked|fixed|helped)|[.,\n]|$)/i)?.[1]?.trim() ||
    source?.match(/\bcalled\s+([a-z0-9 &.'-]{2,70})(?=\s+(?:january|february|march|april|may|june|july|august|sep|oct|nov|dec|\d|backend|frontend|as|made|worked|fixed|helped)|[.,\n]|$)/i)?.[1]?.trim() ||
    text.match(/\bintern at\s+([a-z0-9 &.'-]{2,70})(?=[.,\n]|$)/i)?.[1]?.trim();
  const role =
    text.match(/\b(backend|frontend|full[- ]?stack|data|ui\/ux|software)\s+intern\b/i)?.[0] ||
    (/\bintern\b/i.test(source || text) ? "Intern" : undefined);
  const dates = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+20\d{2}\s+(?:to|-|–)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+20\d{2}/i);
  const bullets = extractExperienceBullets(text);

  if (company || role || bullets.length) {
    state.experience.push({
      id: createResumeId(),
      company: company ? titleCase(company) : undefined,
      role: role ? titleCase(role) : undefined,
      startDate: dates ? titleCase(`${dates[1]} ${dates[0].match(/20\d{2}/)?.[0] || ""}`.trim()) : undefined,
      endDate: dates ? titleCase(`${dates[2]} ${dates[0].match(/20\d{2}$/)?.[0] || ""}`.trim()) : undefined,
      bullets,
      sourceConfidence: "user_supplied",
    });
  }
}

function extractProjects(text: string, state: ResumeState) {
  const rawProjectSection = text.match(/\bprojects?\s*(?::|-|\n)\s*([\s\S]+)/i)?.[1];
  const projectSection = rawProjectSection?.split(/\b(?:Education|Skills|Experience|Certifications|Achievements)\s*:/i)[0];
  const projectLines: string[] = [];
  if (projectSection) {
    for (const raw of projectSection.split(/\n+/)) {
      const line = raw.trim();
      if (!line || /^(education|skills|experience|certifications|achievements)\b/i.test(line)) break;
      if (/^(want|target|make it|create|build)\b/i.test(line)) break;
      const commaItems = line.includes(",") && !/^\d+/.test(line)
        ? line.split(",").map((item) => item.trim()).filter(Boolean)
        : [line];
      projectLines.push(...commaItems);
    }
  }
  const madeProject = text.match(/\bi made\s+(?:an?\s+)?([a-z0-9 &.'-]{3,60}?app)\b/i)?.[1];
  if (madeProject && !/\bsome projects?\b/i.test(madeProject)) projectLines.push(madeProject);

  for (const line of projectLines.slice(0, 8)) {
    const clean = line.replace(/^\d+[\).]?\s*/, "").replace(/^[-*]\s*/, "").trim();
    if (!clean || /\bsome projects?\b/i.test(clean)) continue;
    let name = inferProjectName(clean);
    if (!name) continue;
    const tech = extractProjectTech(clean);
    const featureText = projectFeatureText(text, clean);
    if (/^Study App$/i.test(name) && /\b(ai summary|gemini|quiz)\b/i.test(`${featureText} ${text}`)) name = "AI Study App";
    const featureTech = extractProjectTech(featureText);
    state.projects.push({
      id: createResumeId(),
      name,
      description: inferProjectDescription(featureText),
      tech: unique([...tech, ...featureTech]),
      bullets: buildProjectBullets(name, featureText, unique([...tech, ...featureTech])),
      sourceConfidence: "user_supplied",
    });
  }
}

function extractCertifications(text: string, state: ResumeState) {
  const certLine = text.match(/\b(?:certificate|certification)\s*[:\-]\s*([^\n]+)/i)?.[1];
  if (!certLine) return;
  const name = certLine.split(/,|\(|\d{4}/)[0]?.trim();
  if (name && !/^certification$/i.test(name)) {
    state.certifications.push({ id: createResumeId(), name: titleCase(name), date: certLine.match(/\b20[1-4]\d\b/)?.[0] });
  }
}

function extractAchievements(text: string, state: ResumeState) {
  const achievementLine = text.match(/\b(?:achievement|award|won|ranked)\s*[:\-]?\s*([^\n.]{5,140})/i)?.[1];
  if (achievementLine) state.achievements.push({ id: createResumeId(), text: sentenceCase(achievementLine) });
}

function extractJobDescription(text: string, state: ResumeState) {
  if (/\b(job description|requirements|qualifications|responsibilities)\b/i.test(text)) {
    state.target.jobDescription = text;
  }
}

function buildProjectBullets(name: string, source: string, tech: string[]) {
  const bullets: string[] = [];
  const features = featurePhrases(source);
  if (features.length) bullets.push(`Built ${name} with ${features.slice(0, 3).join(", ")}.`);
  else bullets.push(`Built ${name} as a project.`);
  if (tech.length) bullets.push(`Used ${tech.slice(0, 5).join(", ")} for the project implementation.`);
  return unique(bullets).slice(0, 2);
}

function extractExperienceBullets(text: string) {
  const bullets: string[] = [];
  if (/\bmade websites?\b/i.test(text)) bullets.push("Built and updated websites based on assigned requirements.");
  if (/\bworked with team\b/i.test(text)) bullets.push("Collaborated with team members on project delivery and fixes.");
  if (/\bmade api|built api|apis?\b/i.test(text)) bullets.push("Built and supported backend APIs.");
  if (/\bfixed bugs?\b/i.test(text)) bullets.push("Fixed bugs and improved backend reliability.");
  if (/\bpayment\b/i.test(text)) bullets.push("Helped with payment-related backend functionality.");
  return unique(bullets).slice(0, 4);
}

function extractProjectTech(text: string) {
  const temp = emptyResumeState();
  extractSkillsFromText(text, temp, text);
  const skills = Object.values(temp.skills).flatMap((items) => items || []);
  if (/\bmern\b/i.test(text)) return unique([...skills, "MongoDB", "Express", "React", "Node.js"]);
  return unique(skills);
}

function projectFeatureText(fullText: string, projectLine: string) {
  if (projectLine.split(/\s+/).length <= 4 && !/\b(using|used|with|built in)\b/i.test(projectLine)) return projectLine;
  const sentences = fullText.split(/(?<=[.!?])\s+|\n+/);
  const projectWord = projectLine.split(/\s+/).find((word) => word.length > 3) || projectLine;
  return sentences.filter((sentence) => sentence.toLowerCase().includes(projectWord.toLowerCase()) || /\bit has\b|\bi used\b/i.test(sentence)).join(" ") || projectLine;
}

function inferProjectName(line: string) {
  const beforeUsing = line.split(/\s+(?:using|used|with|in)\s+/i)[0].replace(/[.;:,]+$/g, "");
  const words = beforeUsing.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const stopAt = words.findIndex((word) => /^(mern|socket|node|react|next|express|mongo|sql|charts|auth|api|pdf|download|tailwind|supabase|gemini)$/i.test(word));
  const nameWords = (stopAt > 0 ? words.slice(0, stopAt) : words).slice(0, 5);
  let name = nameWords.join(" ");
  if (/\bstudy app\b/i.test(name) && /ai summary|gemini|quiz/i.test(line)) name = "AI Study App";
  return titleCase(name);
}

function inferProjectDescription(text: string) {
  const features = featurePhrases(text);
  return features.length ? `Includes ${features.slice(0, 4).join(", ")}.` : undefined;
}

function featurePhrases(text: string) {
  const features = [
    ["login", /\blogin\b/i],
    ["dashboard", /\bdashboard\b/i],
    ["notes upload", /\bnotes? upload\b|\bupload\b/i],
    ["AI summary", /\bai summary\b|\bsummary\b/i],
    ["quiz", /\bquiz\b/i],
    ["progress tracking", /\bprogress tracking\b|\bprogress\b/i],
    ["charts", /\bcharts?\b/i],
    ["authentication", /\bauth\b|\bauthentication\b/i],
    ["PDF download", /\bpdf download\b|\bpdf\b/i],
    ["payment support", /\bpayment\b/i],
  ] as const;
  return features.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function stripEmptyState(state: ResumeState): Partial<ResumeState> {
  return {
    id: state.id,
    candidate: cleanObject(state.candidate),
    target: cleanObject(state.target),
    skills: cleanSkills(state.skills),
    experience: state.experience,
    projects: state.projects,
    education: state.education,
    certifications: state.certifications,
    achievements: state.achievements,
    languages: state.languages,
    missingFields: [],
    warnings: [],
    metadata: state.metadata,
  };
}

function cleanSkills(skills: ResumeState["skills"]) {
  return Object.fromEntries(Object.entries(skills).filter(([, value]) => Array.isArray(value) && value.length > 0)) as ResumeState["skills"];
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as T;
}

function safeIamName(text: string) {
  const match = text.match(/\bi am\s+([a-z][a-z.'-]{1,25})(?:[.,\n]|$)/i)?.[1];
  if (!match || /^(a|an|student|fresher|intern|developer|designer|analyst|engineer)$/i.test(match)) return undefined;
  return match;
}

function normalizeDegree(value?: string) {
  if (!value) return undefined;
  const lower = value.toLowerCase().replace(/\./g, "");
  if (lower === "btech") return "B.Tech";
  if (lower === "bca") return "BCA";
  if (lower === "mca") return "MCA";
  if (lower === "bsc") return "B.Sc";
  if (lower === "mtech") return "M.Tech";
  return titleCase(value);
}

function normalizeField(value?: string) {
  if (!value) return undefined;
  if (/^cse$/i.test(value)) return "Computer Science Engineering";
  if (/^it$/i.test(value)) return "Information Technology";
  return titleCase(value);
}

function cleanRole(role: string) {
  return role.replace(/\b(resume|role|position|job)\b/gi, "").replace(/\s+/g, " ").trim();
}

function hasAlias(text: string, alias: string) {
  return new RegExp(`\\b${escapeRegExp(alias).replace(/\\ /g, "\\s+")}\\b`, "i").test(text);
}

function titleCase(value: string) {
  return value.trim().split(/\s+/).map((word) => {
    if (/^(UI|UX|AI|API|REST|CSS|HTML|SQL|AWS|BCA|MCA|IT|CSE)$/i.test(word)) return word.toUpperCase();
    if (/^saas$/i.test(word)) return "SaaS";
    if (/^(js)$/i.test(word)) return "JavaScript";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

function sentenceCase(value: string) {
  const clean = value.trim().replace(/[.!?]*$/, ".");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
