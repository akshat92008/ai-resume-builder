import { describe, expect, it } from "vitest";
import { fallbackTailorResume } from "@/lib/careerpath/runtime-fallbacks";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";

const resume: CareerPathResumeContent = {
  header: { name: "Rahul Sharma", email: "", phone: "", location: "", links: {} },
  summary: "Software Engineering Intern at TechNova.",
  skills: [
    { category: "Programming", items: ["JavaScript", "TypeScript", "Node.js"] },
    { category: "Frameworks", items: ["React", "Next.js", "Express"] },
    { category: "Databases", items: ["PostgreSQL"] },
  ],
  experience: [{
    company: "TechNova",
    role: "Software Engineering Intern",
    dates: "June 2026 – August 2026",
    bullets: ["Reduced API response time by 32%"],
  }],
  projects: [],
  education: [{ institution: "Delhi Technological University", degree: "B.Tech — Computer Science", dates: "2027", score: "8.4/10", location: "" }],
  certifications: [],
  achievements: [],
  languages: [],
};

const jobDescription = `Software Engineer

Requirements:
- 3+ years of professional software engineering experience
- Strong React and TypeScript skills
- Node.js backend development
- PostgreSQL experience
- AWS
- Kubernetes
- Java
- Experience improving application performance`;

describe("recorded fallback tailoring regression", () => {
  it("reports Java and seniority as missing instead of only AWS/Kubernetes", () => {
    const result = fallbackTailorResume(resume, jobDescription);

    expect(result.matchedKeywords).toEqual(expect.arrayContaining(["React", "TypeScript", "Node.js", "PostgreSQL"]));
    expect(result.missingKeywordsNotAdded).toEqual(expect.arrayContaining([
      "AWS",
      "Kubernetes",
      "Java",
      "3+ years of professional software engineering experience",
    ]));
    expect(result.tailoredResume.skills.flatMap((group) => group.items)).not.toContain("Java");
    expect(JSON.stringify(result.tailoredResume)).not.toContain("3+ years");
  });
});
