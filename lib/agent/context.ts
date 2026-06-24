import type { Project, Skill, UserVault } from "@/lib/types";
import type { VaultUpdate } from "@/lib/agents/types";
import { cleanText, unique } from "@/lib/agents/utils";

const KNOWN_SKILLS: { name: string; category: Skill["category"] }[] = [
  { name: "React", category: "frontend" },
  { name: "Next.js", category: "frontend" },
  { name: "TypeScript", category: "frontend" },
  { name: "JavaScript", category: "frontend" },
  { name: "Node.js", category: "backend" },
  { name: "Express", category: "backend" },
  { name: "Python", category: "backend" },
  { name: "Java", category: "backend" },
  { name: "SQL", category: "data" },
  { name: "Postgres", category: "data" },
  { name: "Supabase", category: "backend" },
  { name: "Firebase", category: "backend" },
  { name: "Tailwind", category: "frontend" },
  { name: "HTML", category: "frontend" },
  { name: "CSS", category: "frontend" },
  { name: "AI APIs", category: "ai" },
  { name: "AI", category: "ai" },
  { name: "Machine Learning", category: "ai" },
  { name: "OpenAI", category: "ai" },
  { name: "Gemini", category: "ai" },
  { name: "GitHub", category: "other" },
  { name: "Figma", category: "design" },
  { name: "Power BI", category: "data" },
];

const FEATURE_PATTERNS = [
  "upload PDFs",
  "AI chat",
  "ask questions",
  "authentication",
  "dashboard",
  "file upload",
  "payments",
  "database",
  "admin panel",
  "resume builder",
  "job analysis",
  "portfolio",
];

function titleCaseRole(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0]?.toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

function skillMatches(text: string, skill: string) {
  const lower = text.toLowerCase();
  const normalized = skill.toLowerCase();
  if (normalized === "ai apis") return /ai api|ai apis|gemini|openai|llm|api integration/.test(lower);
  return lower.includes(normalized);
}

export function extractSkillsFromText(text: string): { name: string; category: Skill["category"] }[] {
  return KNOWN_SKILLS.filter((skill) => skillMatches(text, skill.name)).filter((skill, index, arr) => {
    if (skill.name === "AI" && arr.some((item) => item.name === "AI APIs" || item.name === "Machine Learning")) return false;
    return arr.findIndex((item) => item.name.toLowerCase() === skill.name.toLowerCase()) === index;
  });
}

function extractTargetRole(goal: string, text: string) {
  const combined = `${goal}. ${text}`;
  const patterns = [
    /(?:want to get|want|get|targeting|apply(?:ing)? for|looking for|interested in)\s+(?:an?\s+)?([a-z0-9 .+#/-]+?)(?:\s+internship|\s+role|\s+job|\s+placement|\.|,|$)/i,
    /(?:target role is|role:)\s*([a-z0-9 .+#/-]+?)(?:\.|,|$)/i,
  ];
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match?.[1]) {
      const role = titleCaseRole(match[1].replace(/\b(get|a|an|the)\b/gi, "").trim());
      if (role) return /internship/i.test(combined) && !/intern/i.test(role) ? `${role} Intern` : role;
    }
  }

  if (/ai|machine learning|llm|gemini|openai/i.test(combined)) return /internship/i.test(combined) ? "AI Engineer Intern" : "AI Engineer";
  if (/full.?stack/i.test(combined)) return /internship/i.test(combined) ? "Full-Stack Developer Intern" : "Full-Stack Developer";
  if (/frontend|react|next\.?js/i.test(combined)) return /internship/i.test(combined) ? "Frontend Developer Intern" : "Frontend Developer";
  return "";
}

function splitProjectTitles(value: string) {
  return value
    .split(/\s+and\s+|,|;/i)
    .map((title) => title.replace(/\b(using|with|where|that)\b.*$/i, "").trim())
    .filter((title) => /^[A-Z0-9][A-Za-z0-9 .'-]{2,}$/.test(title))
    .slice(0, 4);
}

function extractProjectTitles(text: string, vault: UserVault) {
  const titles = new Set<string>();
  const patterns = [
    /(?:built|created|developed|launched|made)\s+(.+?)(?:\s+using|\s+with|\s+where|\s+that|\.|$)/gi,
    /project called\s+(.+?)(?:\s+using|\s+with|\s+where|\s+that|\.|$)/gi,
  ];

  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      splitProjectTitles(match[1] ?? "").forEach((title) => titles.add(title));
    }
  });

  vault.projects.forEach((project) => {
    if (project.title && text.toLowerCase().includes(project.title.toLowerCase())) titles.add(project.title);
  });

  return Array.from(titles);
}

function extractProjectDescription(text: string, title: string) {
  const titleIndex = text.toLowerCase().indexOf(title.toLowerCase());
  if (titleIndex < 0) return "";
  const afterTitle = text.slice(titleIndex + title.length).replace(/^[,:\s-]+/, "");
  const sentence = afterTitle.split(/[.?!]\s/)[0]?.trim() ?? "";
  const cleaned = sentence.replace(/\s+using\s+.+$/i, "").trim();
  if (cleaned.length >= 16) return cleaned;
  if (/lets|helps|where|platform|app|tool|system/i.test(text)) return text.trim();
  return "";
}

function extractFeatures(text: string) {
  const lower = text.toLowerCase();
  return FEATURE_PATTERNS.filter((feature) => lower.includes(feature.toLowerCase()));
}

function extractUrls(text: string) {
  return Array.from(text.matchAll(/https?:\/\/[^\s)]+/gi)).map((match) => match[0].replace(/[.,]$/, ""));
}

function proofTypeFromUrl(url: string) {
  if (/github\.com/i.test(url)) return "github" as const;
  if (/linkedin\.com/i.test(url)) return "linkedin_post" as const;
  if (/youtu|loom|video/i.test(url)) return "video" as const;
  return "other" as const;
}

export function extractVaultUpdatesFromText(vault: UserVault, message: string, goal = "", weakProject?: Project | null): VaultUpdate[] {
  const updates: VaultUpdate[] = [];
  const text = cleanText(message);
  if (!text) return updates;

  const targetRole = extractTargetRole(goal, text);
  const profileData: Partial<UserVault["profile"]> = {};
  if (targetRole) profileData.target_roles = [targetRole];
  if (text.length >= 80) profileData.summary = text;

  const urls = extractUrls(text);
  urls.forEach((url) => {
    if (/github\.com/i.test(url)) profileData.github_url = url;
    if (/linkedin\.com/i.test(url)) profileData.linkedin_url = url;
    if (/portfolio|vercel|netlify|github\.io/i.test(url)) profileData.portfolio_url = url;
  });
  if (Object.keys(profileData).length > 0) updates.push({ type: "profile", data: profileData });

  const courseMatch = text.match(/\b(BCA|MCA|B\.?Tech|BTech|B\.?Sc|BSc|BBA|MBA|B\.?E|BE)\b/i);
  if (courseMatch?.[1]) {
    updates.push({
      type: "education",
      data: {
        degree: courseMatch[1].replace(/\./g, "").toUpperCase(),
      },
    });
  }

  extractSkillsFromText(text).forEach((skill) => {
    updates.push({
      type: "skill",
      data: {
        name: skill.name,
        category: skill.category,
        proficiency: "beginner",
        proof_links: [],
      },
    });
  });

  const techStack = extractSkillsFromText(text)
    .map((skill) => skill.name)
    .filter((skill) => !["AI", "GitHub"].includes(skill));
  const features = extractFeatures(text);

  const titles = extractProjectTitles(text, vault);
  
  if (titles.length === 0 && weakProject && (features.length > 0 || techStack.length > 0 || text.length > 20)) {
    // Conversational update: apply to the weak project
    const data: Partial<Project> & { title: string } = {
      title: weakProject.title,
      short_description: text,
      problem_solved: text,
      tech_stack: techStack.length ? techStack : undefined,
      features: features.length ? features : undefined,
    } as any;
    const github = urls.find((url) => /github\.com/i.test(url));
    const live = urls.find((url) => !/github\.com|linkedin\.com/i.test(url));
    if (github) data.github_url = github;
    if (live) data.live_url = live;
    updates.push({ type: "project", data });
  } else {
    titles.forEach((title) => {
      const description = extractProjectDescription(text, title);
      const data: Partial<Project> & { title: string } = {
        title,
        short_description: description,
        problem_solved: description,
        tech_stack: techStack,
        features,
        status: "completed",
      };
      const github = urls.find((url) => /github\.com/i.test(url));
      const live = urls.find((url) => !/github\.com|linkedin\.com/i.test(url));
      if (github) data.github_url = github;
      if (live) data.live_url = live;
      updates.push({ type: "project", data });
    });
  }

  urls.forEach((url) => {
    updates.push({
      type: "proof_link",
      data: {
        url,
        title: /github\.com/i.test(url) ? "GitHub proof" : /linkedin\.com/i.test(url) ? "LinkedIn proof" : "Proof link",
        type: proofTypeFromUrl(url),
        notes: "Saved from CareerProof Agent",
      },
    });
  });

  return dedupeUpdates(updates);
}

export function extractedProfileSummary(updates: VaultUpdate[]) {
  const profileUpdate = updates.find((update): update is Extract<VaultUpdate, { type: "profile" }> => update.type === "profile");
  const educationUpdate = updates.find((update): update is Extract<VaultUpdate, { type: "education" }> => update.type === "education");
  const target = profileUpdate?.data.target_roles?.[0];
  const course = educationUpdate?.data.degree;
  const skills = unique(updates.filter((update) => update.type === "skill").map((update) => update.data.name));
  const projects = unique(updates.filter((update) => update.type === "project").map((update) => update.data.title));
  return { target, course, skills, projects };
}

function dedupeUpdates(updates: VaultUpdate[]) {
  const seen = new Set<string>();
  return updates.filter((update) => {
    const key =
      update.type === "profile"
        ? `profile:${JSON.stringify(update.data)}`
        : update.type === "education"
          ? `education:${update.data.degree.toLowerCase()}`
        : update.type === "proof_link"
          ? `proof:${update.data.url.toLowerCase()}`
          : update.type === "skill"
            ? `skill:${update.data.name.toLowerCase()}`
            : `project:${update.data.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
