import { describe, expect, it } from "vitest";
import { mergeDeterministicProfileEvidence } from "@/lib/careerpath/deterministic-evidence";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import type { CareerPathProfile, CareerPathResumeContent } from "@/lib/careerpath/types";

const source = "My name is Release Candidate. I am targeting Software Engineer roles. I worked at Example Labs as a Software Engineering Intern from 2025 to 2026. I built an Inventory Dashboard using React, TypeScript, Next.js and PostgreSQL, implemented REST APIs, and wrote 120 automated tests.";

function emptyProfile(): CareerPathProfile {
  return {
    id: "profile-1",
    userId: "user-1",
    personal: {},
    target: { role: "", industry: "", experienceLevel: "" },
    education: [],
    skills: { programming: [], frameworks: [], tools: [], databases: [], aiTools: [], softSkills: [] },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: "",
    confidenceNotes: [],
  };
}

function generatedDraft(): CareerPathResumeContent {
  return {
    header: { name: "Release Candidate", email: "", phone: "", location: "", links: {} },
    // This is deliberately a model-style sentence that contains the correct
    // number but has unsupported outcome language. Provenance may remove it;
    // the exact source-backed metric must still survive in its experience.
    summary: "Drove scalable engineering impact by writing 120 automated tests across a global platform.",
    skills: [
      { category: "Programming", items: ["React", "TypeScript"] },
      { category: "Frontend", items: ["Next.js"] },
      { category: "Databases", items: ["PostgreSQL"] },
    ],
    experience: [{
      company: "Example Labs",
      role: "Software Engineering Intern",
      dates: "2025 – 2026",
      bullets: [],
    }],
    projects: [{ name: "Inventory Dashboard", techStack: ["React", "TypeScript", "Next.js", "PostgreSQL"], bullets: [] }],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

describe("verified resume section-bound proof", () => {
  it("keeps explicit quantified evidence even when its generative summary sentence is removed", async () => {
    const legacyProfile = enforceCareerPathProfileEvidence(
      mergeDeterministicProfileEvidence({ message: source, profile: emptyProfile() }),
    );

    const verified = await verifyResumeCandidate({
      content: generatedDraft(),
      currentResume: null,
      userId: "user-1",
      legacyProfile,
      instruction: source,
      mode: "build",
      targetRole: "Software Engineer",
      useDeterministicAudit: true,
    });

    const experience = verified.content.experience.find((item) => item.company === "Example Labs");
    expect(experience).toBeTruthy();
    expect(experience?.bullets.join(" ")).toContain("120 automated tests");
    expect(JSON.stringify(verified.content)).toContain("120");
    expect(JSON.stringify(verified.content)).not.toContain("900");
  });

  it("does not restore unsupported quantified claims", async () => {
    const legacyProfile = enforceCareerPathProfileEvidence(
      mergeDeterministicProfileEvidence({ message: source, profile: emptyProfile() }),
    );
    const draft = generatedDraft();
    draft.experience[0].bullets = ["Increased company revenue by 900% through a global optimization program"];

    const verified = await verifyResumeCandidate({
      content: draft,
      currentResume: null,
      userId: "user-1",
      legacyProfile,
      instruction: source,
      mode: "build",
      targetRole: "Software Engineer",
      useDeterministicAudit: true,
    });

    expect(JSON.stringify(verified.content)).toContain("120");
    expect(JSON.stringify(verified.content)).not.toContain("900");
  });
});
