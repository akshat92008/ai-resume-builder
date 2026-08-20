import { describe, expect, it } from "vitest";
import { enforceResumeClaimProvenance } from "@/lib/careerloop/provenance";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import type { CareerPathProfile, CareerPathResumeContent } from "@/lib/careerpath/types";

const rawNotes = [
  "My name is Release Candidate and my email is release@example.com.",
  "I live in Delhi and speak English.",
  "I am targeting Software Engineer roles.",
  "I worked at Example Labs as a Software Engineering Intern from 2025 to 2026 and implemented REST APIs.",
  "I built Inventory Dashboard using React and TypeScript.",
  "I studied B.Tech Computer Science at Example University from 2022 to 2026 with an 8.5 CGPA.",
  "I earned the Cloud Fundamentals certification from Example Academy in 2025.",
].join(" ");

function legacyProfile(): CareerPathProfile {
  return {
    id: "profile-surface",
    userId: "user-surface",
    personal: {
      name: "Release Candidate",
      email: "release@example.com",
      location: "Delhi",
    },
    target: { role: "Software Engineer", industry: "Software", experienceLevel: "Intern" },
    education: [{
      institution: "Example University",
      degree: "B.Tech",
      field: "Computer Science",
      startYear: "2022",
      endYear: "2026",
      score: "8.5 CGPA",
      location: "",
    }],
    skills: {
      programming: ["TypeScript"],
      frameworks: ["React"],
      tools: [], databases: [], aiTools: [], softSkills: [],
    },
    projects: [{
      name: "Inventory Dashboard",
      description: "Built Inventory Dashboard using React and TypeScript",
      techStack: ["React", "TypeScript"],
      problemSolved: "",
      features: [],
      impact: "",
      links: [],
    }],
    experience: [{
      company: "Example Labs",
      role: "Software Engineering Intern",
      startDate: "2025",
      endDate: "2026",
      responsibilities: ["Implemented REST APIs"],
      achievements: [],
    }],
    certifications: [{
      name: "Cloud Fundamentals",
      issuer: "Example Academy",
      date: "2025",
      credentialLink: "",
    }],
    achievements: [],
    languages: ["English"],
    rawNotes,
    confidenceNotes: [],
  };
}

describe("full resume provenance surface", () => {
  it("removes unsupported identity, shell sections, education, certification and language while preserving supported facts", () => {
    const profile = legacyProfileToCareerProfile(legacyProfile(), "user-surface");
    const content: CareerPathResumeContent = {
      header: {
        name: "Release Candidate",
        email: "release@example.com",
        phone: "+1 555 999 0000",
        location: "Delhi",
        links: {
          linkedin: "https://linkedin.com/in/fake-release-candidate",
          github: "",
          portfolio: "",
        },
      },
      summary: "Software Engineer candidate with React and TypeScript experience.",
      skills: [{ category: "Technical", items: ["React", "TypeScript", "Kubernetes"] }],
      experience: [
        {
          company: "Example Labs",
          role: "Software Engineering Intern",
          dates: "2025 - 2026",
          location: "",
          bullets: ["Implemented REST APIs"],
        },
        {
          company: "Google",
          role: "Senior Staff Engineer",
          dates: "2024 - 2026",
          location: "California",
          bullets: ["Led a global platform team"],
        },
      ],
      projects: [
        {
          name: "Inventory Dashboard",
          techStack: ["React", "TypeScript"],
          bullets: ["Built Inventory Dashboard using React and TypeScript"],
        },
        {
          name: "Secret Quantum Platform",
          techStack: ["Kubernetes"],
          bullets: ["Built a global quantum platform"],
        },
      ],
      education: [
        {
          institution: "Example University",
          degree: "B.Tech, Computer Science",
          dates: "2022 - 2026",
          score: "8.5 CGPA",
          location: "",
        },
        {
          institution: "MIT",
          degree: "PhD, Artificial Intelligence",
          dates: "2024 - 2026",
          score: "4.0 GPA",
          location: "Cambridge",
        },
      ],
      certifications: [
        { name: "Cloud Fundamentals", issuer: "Example Academy", date: "2025", link: "" },
        { name: "AWS Solutions Architect Professional", issuer: "AWS", date: "2026", link: "" },
      ],
      achievements: [],
      languages: ["English", "French"],
    };

    const result = enforceResumeClaimProvenance(content, profile);
    const rendered = JSON.stringify(result.content);

    expect(result.content.header.name).toBe("Release Candidate");
    expect(result.content.header.email).toBe("release@example.com");
    expect(result.content.header.phone).toBe("");
    expect(result.content.header.links.linkedin).toBe("");

    expect(result.content.skills.flatMap((group) => group.items)).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(result.content.skills.flatMap((group) => group.items)).not.toContain("Kubernetes");

    expect(result.content.experience).toHaveLength(1);
    expect(result.content.experience[0]?.company).toBe("Example Labs");
    expect(rendered).not.toContain("Google");

    expect(result.content.projects).toHaveLength(1);
    expect(result.content.projects[0]?.name).toBe("Inventory Dashboard");
    expect(rendered).not.toContain("Secret Quantum Platform");

    expect(result.content.education).toHaveLength(1);
    expect(result.content.education[0]?.institution).toBe("Example University");
    expect(rendered).not.toContain("MIT");

    expect(result.content.certifications).toHaveLength(1);
    expect(result.content.certifications[0]?.name).toBe("Cloud Fundamentals");
    expect(rendered).not.toContain("AWS Solutions Architect Professional");

    expect(result.content.languages).toEqual(["English"]);
    expect(result.report.removedClaims).toBeGreaterThanOrEqual(7);
  });
});
