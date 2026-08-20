import { describe, expect, it } from "vitest";
import { reconcileExtractedProfileWithEvidence } from "@/lib/careerpath/profile-evidence";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import { enforceCareerProfileSourceEvidence } from "@/lib/careerloop/profile-source";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import type { CareerPathProfile } from "@/lib/careerpath/types";

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

const source = "My name is Release Candidate. I am targeting Software Engineer roles. I worked at Example Labs as a Software Engineering Intern from 2025 to 2026. I built Inventory Dashboard using React and TypeScript, implemented REST APIs, and wrote 120 automated tests.";

describe("Career Memory source evidence", () => {
  it("removes extractor-only skills, metrics and employers before they become evidence", () => {
    const extracted: CareerPathProfile = {
      ...emptyProfile(source),
      personal: { name: "Release Candidate" },
      target: { role: "Software Engineer", industry: "Software", experienceLevel: "Intern" },
      skills: {
        programming: ["TypeScript"],
        frameworks: ["React", "Kubernetes"],
        tools: [], databases: [], aiTools: [], softSkills: [],
      },
      projects: [{
        name: "Inventory Dashboard",
        description: "Built Inventory Dashboard using React and TypeScript",
        techStack: ["React", "TypeScript", "Kubernetes"],
        problemSolved: "",
        features: ["REST APIs"],
        impact: "Increased revenue by 900%",
        links: [],
      }],
      experience: [{
        company: "Example Labs",
        role: "Software Engineering Intern",
        startDate: "2025",
        endDate: "2026",
        responsibilities: ["Implemented REST APIs", "Led a global optimization program"],
        achievements: ["Wrote 120 automated tests", "Increased revenue by 900%"],
      }, {
        company: "Google",
        role: "Senior Engineer",
        startDate: "2024",
        endDate: "2026",
        responsibilities: ["Led Kubernetes platform"],
        achievements: [],
      }],
    };

    const gated = reconcileExtractedProfileWithEvidence({
      message: source,
      existing: emptyProfile(),
      extracted,
    });

    expect(gated.skills.frameworks).toContain("React");
    expect(gated.skills.frameworks).not.toContain("Kubernetes");
    expect(gated.projects[0]?.techStack).not.toContain("Kubernetes");
    expect(gated.projects[0]?.impact).toBe("");
    expect(gated.experience).toHaveLength(1);
    expect(gated.experience[0]?.company).toBe("Example Labs");
    expect(gated.experience[0]?.achievements.join(" ")).toContain("120");
    expect(gated.experience[0]?.achievements.join(" ")).not.toContain("900");
    expect(gated.confidenceNotes.some((note) => note.includes("Kubernetes"))).toBe(true);
  });

  it("rechecks a persisted legacy profile against append-only raw notes", () => {
    const profile = emptyProfile(source);
    profile.skills.frameworks = ["React", "Kubernetes"];
    profile.achievements = ["Wrote 120 automated tests", "Increased revenue by 900%"];

    const gated = enforceCareerPathProfileEvidence(profile);
    expect(gated.skills.frameworks).toEqual(["React"]);
    expect(gated.achievements).toEqual(["Wrote 120 automated tests"]);
    expect(gated.rawNotes).toBe(source);
  });

  it("prevents unsupported structured CareerProfile facts from becoming provenance", () => {
    const legacy = emptyProfile(source);
    legacy.personal.name = "Release Candidate";
    legacy.target = { role: "Software Engineer", industry: "Software", experienceLevel: "Intern" };
    legacy.skills.programming = ["TypeScript"];
    legacy.skills.frameworks = ["React"];
    const career = legacyProfileToCareerProfile(legacy, "user-1");

    career.skills.push({ id: "fake-skill", name: "Kubernetes", category: "technical" });
    career.achievements.push({ id: "fake-achievement", text: "Increased revenue by 900%", proofLevel: "strong" });

    const gated = enforceCareerProfileSourceEvidence(career);
    expect(gated.skills.map((skill) => skill.name)).toContain("React");
    expect(gated.skills.map((skill) => skill.name)).not.toContain("Kubernetes");
    expect(gated.achievements.map((achievement) => achievement.text).join(" ")).not.toContain("900");
  });
});
