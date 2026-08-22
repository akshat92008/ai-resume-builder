import { describe, expect, it } from "vitest";
import { normalizeKnownResumeSkillCategories } from "@/lib/careerpath/resume-content-normalization";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";

function contentWithSkills(): CareerPathResumeContent {
  return {
    header: { name: "Arjun", email: "", phone: "", location: "", links: {} },
    summary: "",
    skills: [
      { category: "Frontend", items: ["React", "Next.js", "Express", "Node.js"] },
      { category: "Programming", items: ["TypeScript", "Python"] },
      { category: "Tools", items: ["PostgreSQL", "Docker", "Git", "GraphQL"] },
    ],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

describe("resume skill category normalization", () => {
  it("moves known technologies to deterministic categories without dropping unknown skills", () => {
    const normalized = normalizeKnownResumeSkillCategories(contentWithSkills());
    const byCategory = new Map(normalized.skills.map((group) => [group.category, group.items]));

    expect(byCategory.get("Programming")).toEqual(expect.arrayContaining(["TypeScript", "Python"]));
    expect(byCategory.get("Frameworks & Runtime")).toEqual(expect.arrayContaining(["React", "Next.js", "Express", "Node.js"]));
    expect(byCategory.get("Databases")).toContain("PostgreSQL");
    expect(byCategory.get("Cloud & DevOps")).toContain("Docker");
    expect(byCategory.get("Developer Tools")).toContain("Git");
    expect(normalized.skills.some((group) => group.items.includes("GraphQL"))).toBe(true);
    expect(normalized.skills.find((group) => group.category === "Frontend")?.items ?? []).not.toContain("Express");
  });
});
