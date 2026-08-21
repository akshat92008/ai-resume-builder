import { describe, expect, it } from "vitest";
import {
  mergeDeterministicProfileEvidence,
  preserveDeterministicResumeEvidence,
} from "@/lib/careerpath/deterministic-evidence";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import type { CareerPathProfile, CareerPathResumeContent } from "@/lib/careerpath/types";

const source = "My name is Release Candidate. I am targeting Software Engineer roles. I worked at Example Labs as a Software Engineering Intern from 2025 to 2026. I built an Inventory Dashboard using React, TypeScript, Next.js and PostgreSQL, implemented REST APIs, and wrote 120 automated tests.";

function emptyProfile(rawNotes = ""): CareerPathProfile {
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
    rawNotes,
    confidenceNotes: [],
  };
}

function emptyResume(): CareerPathResumeContent {
  return {
    header: { name: "", email: "", phone: "", location: "", links: {} },
    summary: "",
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

describe("deterministic source evidence recovery", () => {
  it("recovers explicit new-user facts when structured AI extraction is empty", () => {
    const recovered = mergeDeterministicProfileEvidence({
      message: source,
      profile: emptyProfile(),
    });

    expect(recovered.personal.name).toBe("Release Candidate");
    expect(recovered.target.role).toBe("Software Engineer");
    expect(recovered.target.industry).toBe("Software");
    expect(recovered.skills.frameworks).toEqual(expect.arrayContaining(["React", "Next.js"]));
    expect(recovered.skills.programming).toContain("TypeScript");
    expect(recovered.skills.databases).toContain("PostgreSQL");
    expect(recovered.experience).toHaveLength(1);
    expect(recovered.experience[0]).toMatchObject({
      company: "Example Labs",
      role: "Software Engineering Intern",
      startDate: "2025",
      endDate: "2026",
    });
    expect(recovered.experience[0].responsibilities.join(" ")).toContain("Implemented REST APIs");
    expect(recovered.experience[0].achievements).toContain("Wrote 120 automated tests");
    expect(recovered.projects[0]).toMatchObject({ name: "Inventory Dashboard" });
    expect(recovered.projects[0].techStack).toEqual(expect.arrayContaining(["React", "TypeScript", "Next.js", "PostgreSQL"]));
    expect(recovered.rawNotes).toContain("120 automated tests");
  });

  it("keeps the recovered facts after the canonical raw-note evidence gate", () => {
    const recovered = mergeDeterministicProfileEvidence({
      message: source,
      profile: emptyProfile(),
    });
    recovered.skills.frameworks.push("Kubernetes");
    recovered.experience[0].achievements.push("Increased revenue by 900%");

    const gated = enforceCareerPathProfileEvidence(recovered);
    expect(gated.skills.frameworks).toContain("React");
    expect(gated.skills.frameworks).not.toContain("Kubernetes");
    expect(gated.experience[0].achievements).toContain("Wrote 120 automated tests");
    expect(gated.experience[0].achievements.join(" ")).not.toContain("900");
  });

  it("restores source-backed sections and quantified proof when the writer omits them", () => {
    const profile = enforceCareerPathProfileEvidence(
      mergeDeterministicProfileEvidence({ message: source, profile: emptyProfile() }),
    );
    const content = preserveDeterministicResumeEvidence({
      content: emptyResume(),
      profile,
      message: source,
    });

    expect(content.header.name).toBe("Release Candidate");
    expect(JSON.stringify(content.skills)).toContain("React");
    expect(content.experience).toHaveLength(1);
    expect(content.experience[0]).toMatchObject({ company: "Example Labs", role: "Software Engineering Intern" });
    expect(content.experience[0].bullets.join(" ")).toContain("120");
    expect(content.projects[0].name).toBe("Inventory Dashboard");
    expect(JSON.stringify(content)).not.toContain("900");
  });

  it("does not mistake employment years for quantified achievement evidence", () => {
    const datesOnly = "I worked at Example Labs as a Software Engineering Intern from 2025 to 2026.";
    const profile = mergeDeterministicProfileEvidence({ message: datesOnly, profile: emptyProfile() });
    const content = preserveDeterministicResumeEvidence({ content: emptyResume(), profile, message: datesOnly });

    expect(content.experience).toHaveLength(1);
    expect(content.experience[0].dates).toBe("2025 – 2026");
    expect(content.experience[0].bullets).toEqual([]);
    expect(content.achievements).toEqual([]);
  });
});
