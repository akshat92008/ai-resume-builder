import { describe, expect, it } from "vitest";
import { inferIntentKeyword } from "@/lib/careerpath/intent-router";
import { answerCareerMemoryQuery, isReadOnlyCareerMemoryQuery } from "@/lib/careerpath/read-only-memory";
import type { CareerProfile } from "@/lib/careerpath/types";

const profile: CareerProfile = {
  id: "profile-rahul",
  userId: "user-rahul",
  personal: { fullName: "Rahul Sharma" },
  target: {
    targetRoles: ["Software Engineer"],
    targetIndustries: [],
    targetLocations: [],
  },
  preferences: {},
  education: [{
    id: "edu-dtu",
    institution: "Delhi Technological University",
    degree: "B.Tech",
    field: "Computer Science and Engineering",
    startDate: "2023",
    endDate: "2027",
    grade: "8.6/10",
  }],
  experience: [{
    id: "exp-technova",
    company: "TechNova",
    title: "Software Engineering Intern",
    startDate: "May 2026",
    endDate: "July 2026",
    responsibilities: [
      "Built 6 reusable frontend components.",
      "Reduced dashboard loading time from 4.2 seconds to 2.1 seconds.",
      "Collaborated with 3 engineers.",
    ],
    achievements: [],
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Supabase"],
    metrics: ["6 reusable frontend components", "4.2 seconds to 2.1 seconds", "3 engineers"],
  }],
  projects: [],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "PostgreSQL",
    "Supabase",
    "Git",
    "REST APIs",
    "Docker",
  ].map((name, index) => ({ id: `skill-${index}`, name })),
  certifications: [{ id: "cert-aws", name: "AWS Cloud Practitioner", issuer: "AWS", date: "June 2026" }],
  achievements: [],
  documents: [],
  links: [],
  rawInputs: [],
  gaps: [],
  strengths: [],
  weaknesses: [],
  createdAt: "2026-08-22T00:00:00.000Z",
  updatedAt: "2026-08-22T00:00:00.000Z",
};

const MANUAL_READ_PROMPTS = [
  "What university do I attend?",
  "What was my internship duration?",
  "What measurable impact did I have during my internship?",
  "List every skill you currently know about me.",
  "What is my current CGPA?",
  "What are my skills?",
  "When did I work at TechNova?",
  "What certifications do I have?",
  "Tell me what you remember about my TechNova internship.",
];

describe("manual Career Memory recall regressions", () => {
  it.each(MANUAL_READ_PROMPTS)("routes %s as a deterministic read", (message) => {
    expect(isReadOnlyCareerMemoryQuery(message)).toBe(true);
    expect(inferIntentKeyword(message, true)).toMatchObject({
      intent: "GENERAL_HELP",
      confidence: 1,
    });
  });

  it("returns the stored university without onboarding questions", () => {
    const answer = answerCareerMemoryQuery("What university do I attend?", profile);
    expect(answer).toContain("Delhi Technological University");
    expect(answer).not.toMatch(/target role|experience level|preferred industry/i);
  });

  it("returns exact internship dates without inventing a computed duration", () => {
    const answer = answerCareerMemoryQuery("What was my internship duration?", profile);
    expect(answer).toContain("May 2026 – July 2026");
    expect(answer).not.toMatch(/2\.5 months/i);
  });

  it("lists stored skills exactly instead of invoking resume generation", () => {
    const answer = answerCareerMemoryQuery("List every skill you currently know about me.", profile);
    expect(answer).toContain("TypeScript");
    expect(answer).toContain("REST APIs");
    expect(answer).toContain("Docker");
  });

  it("returns the updated academic score from Career Memory", () => {
    expect(answerCareerMemoryQuery("What is my current CGPA?", profile)).toContain("8.6/10");
  });

  it("keeps measurable impact bound to stored TechNova evidence", () => {
    const answer = answerCareerMemoryQuery("What measurable impact did I have during my internship?", profile);
    expect(answer).toContain("4.2 seconds to 2.1 seconds");
    expect(answer).toContain("6 reusable frontend components");
    expect(answer).toContain("3 engineers");
  });
});
