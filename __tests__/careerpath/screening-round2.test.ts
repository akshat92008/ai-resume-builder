import { describe, expect, it } from "vitest";
import {
  dedupeSemanticAchievements,
  normalizeVerifiedResumePresentation,
  preserveVerifiedEducation,
} from "@/lib/careerpath/resume-content-normalization";
import type { CareerPathProfile, CareerPathResumeContent } from "@/lib/careerpath/types";

function profile(): CareerPathProfile {
  return {
    id: "profile-round2",
    userId: "user-round2",
    personal: { name: "Arjun Mehta" },
    target: { role: "Backend Software Engineer", industry: "Technology", experienceLevel: "fresher" },
    education: [{
      institution: "Delhi Technological University",
      degree: "B.Tech",
      field: "Computer Science",
      startYear: "",
      endYear: "2027",
      score: "",
      location: "",
    }],
    skills: {
      programming: ["TypeScript"],
      frameworks: ["Node.js", "Express"],
      tools: ["AWS", "Docker", "Git"],
      databases: ["PostgreSQL", "MongoDB"],
      aiTools: [],
      softSkills: [],
    },
    projects: [],
    experience: [],
    certifications: [],
    achievements: ["Won second place in my college hackathon with a team of four"],
    languages: [],
    rawNotes: "B.Tech Computer Science student at Delhi Technological University, graduating in 2027. Won second place in my college hackathon with a team of four.",
    confidenceNotes: [],
  };
}

function content(): CareerPathResumeContent {
  return {
    header: { name: "Arjun Mehta", email: "", phone: "", location: "", links: {} },
    summary: "",
    skills: [
      { category: "Frontend", items: ["Node.js", "Express"] },
      { category: "Tools", items: ["PostgreSQL", "AWS", "Docker", "Git"] },
    ],
    experience: [],
    projects: [],
    education: [{
      institution: "Delhi Technological University",
      degree: "B.Tech",
      dates: "",
      score: "",
      location: "",
    }],
    certifications: [],
    achievements: [
      "Won second place in the college hackathon with a team of four",
      "Won second place in my college hackathon with a team of four",
    ],
    languages: [],
  };
}

describe("screening round-two presentation regressions", () => {
  it("deduplicates near-identical achievements that differ only by articles or possessives", () => {
    expect(dedupeSemanticAchievements([
      "Won second place in the college hackathon with a team of four",
      "Won second place in my college hackathon with a team of four",
    ])).toEqual(["Won second place in the college hackathon with a team of four"]);
  });

  it("does not collapse genuinely different achievements", () => {
    expect(dedupeSemanticAchievements([
      "Won second place in my college hackathon with a team of four",
      "Won first place in an inter-college coding competition with a team of three",
    ])).toHaveLength(2);
  });

  it("restores source-backed education field and graduation year when the writer abbreviates them", () => {
    const result = preserveVerifiedEducation(content(), profile());
    expect(result.education).toHaveLength(1);
    expect(result.education[0]).toMatchObject({
      institution: "Delhi Technological University",
      degree: "B.Tech, Computer Science",
      dates: "2027",
    });
  });

  it("runs education preservation, skill categorization and achievement dedupe together", () => {
    const result = normalizeVerifiedResumePresentation(content(), profile());
    expect(result.education[0].degree).toBe("B.Tech, Computer Science");
    expect(result.education[0].dates).toBe("2027");
    expect(result.achievements).toHaveLength(1);

    const groups = new Map(result.skills.map((group) => [group.category, group.items]));
    expect(groups.get("Frameworks & Runtime")).toEqual(expect.arrayContaining(["Node.js", "Express"]));
    expect(groups.get("Databases")).toContain("PostgreSQL");
    expect(groups.get("Cloud & DevOps")).toEqual(expect.arrayContaining(["AWS", "Docker"]));
    expect(groups.get("Developer Tools")).toContain("Git");
  });
});
