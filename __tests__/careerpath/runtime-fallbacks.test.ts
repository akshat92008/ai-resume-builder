import { describe, expect, it } from "vitest";
import {
  fallbackHumanizedResume,
  fallbackImproveResume,
  fallbackResumeAudit,
  fallbackResumeFromProfile,
  fallbackTailorResume,
  isRuntimeFallbackContent,
} from "@/lib/careerpath/runtime-fallbacks";
import {
  createEmptyResumeContent,
  normalizeResumeContent,
} from "@/lib/careerpath/resume-content-normalization";
import type { CareerPathProfile } from "@/lib/careerpath/types";

function profile(): CareerPathProfile {
  return {
    id: "profile-1",
    userId: "user-1",
    personal: { name: "Release Candidate" },
    target: { role: "Software Engineer", industry: "Software", experienceLevel: "Intern" },
    education: [],
    skills: {
      programming: ["TypeScript"],
      frameworks: ["React", "Next.js"],
      tools: [],
      databases: ["PostgreSQL"],
      aiTools: [],
      softSkills: [],
    },
    projects: [{
      name: "Inventory Dashboard",
      description: "Built Inventory Dashboard using React, TypeScript, Next.js and PostgreSQL",
      techStack: ["React", "TypeScript", "Next.js", "PostgreSQL"],
      problemSolved: "",
      features: ["Implemented REST APIs"],
      impact: "Wrote 120 automated tests",
      links: [],
    }],
    experience: [{
      company: "Example Labs",
      role: "Software Engineering Intern",
      startDate: "2025",
      endDate: "2026",
      responsibilities: ["Implemented REST APIs"],
      achievements: ["Wrote 120 automated tests"],
    }],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: "I wrote 120 automated tests at Example Labs.",
    confidenceNotes: [],
  };
}

describe("runtime AI fallbacks", () => {
  it("builds a truthful source-only resume when the writer is unavailable", () => {
    const content = fallbackResumeFromProfile(profile());
    const text = JSON.stringify(content).toLowerCase();

    expect(text).toContain("react");
    expect(text).toContain("typescript");
    expect(text).toContain("120");
    expect(text).toContain("example labs");
    expect(text).not.toContain("firebase");
    expect(isRuntimeFallbackContent(content)).toBe(true);
  });

  it("audits deterministically without changing factual content", () => {
    const content = fallbackResumeFromProfile(profile());
    const before = JSON.stringify(content);
    const audit = fallbackResumeAudit(content, "Software Engineer", "React TypeScript Firebase");

    expect(audit.score.truthfulness).toBe(100);
    expect(audit.score.overall).toBeGreaterThan(0);
    expect(JSON.stringify(content)).toBe(before);
  });

  it("tailor fallback reports known missing job skills but never injects them", () => {
    const content = fallbackResumeFromProfile(profile());
    const tailored = fallbackTailorResume(content, "React TypeScript Firebase");
    const text = JSON.stringify(tailored.tailoredResume).toLowerCase();

    expect(tailored.matchedKeywords).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(tailored.missingKeywordsNotAdded).toContain("Firebase");
    expect(tailored.safeKeywordsAdded).toEqual([]);
    expect(text).not.toContain("firebase");
    expect(isRuntimeFallbackContent(tailored.tailoredResume)).toBe(true);
  });

  it("improve and humanize fallbacks are safe no-op clones and stay marked degraded", () => {
    const content = fallbackResumeFromProfile(profile());
    const improved = fallbackImproveResume(content);
    const humanized = fallbackHumanizedResume(content);

    expect(improved).toEqual(content);
    expect(improved).not.toBe(content);
    expect(humanized.content).toEqual(content);
    expect(humanized.changes).toEqual([]);
    expect(humanized.clisheesRemoved).toEqual([]);
    expect(isRuntimeFallbackContent(improved)).toBe(true);
    expect(isRuntimeFallbackContent(humanized.content)).toBe(true);
  });
});

describe("resume content normalization", () => {
  it("turns a legacy header-only Career Memory row into a complete render-safe shape", () => {
    const normalized = normalizeResumeContent({
      header: { name: "User", links: {} },
    });

    expect(normalized.header.name).toBe("User");
    expect(normalized.summary).toBe("");
    expect(normalized.skills).toEqual([]);
    expect(normalized.experience).toEqual([]);
    expect(normalized.projects).toEqual([]);
    expect(normalized.education).toEqual([]);
    expect(normalized.certifications).toEqual([]);
    expect(normalized.achievements).toEqual([]);
    expect(normalized.languages).toEqual([]);
  });

  it("creates new Career Memory drafts in the same complete shape", () => {
    const content = createEmptyResumeContent("User");
    expect(content.header.name).toBe("User");
    expect(content.skills).toEqual([]);
    expect(content.projects).toEqual([]);
    expect(content.experience).toEqual([]);
  });
});
