import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CareerPathResumeContent, CareerProfile } from "@/lib/careerpath/types";
import { inferIntentKeyword } from "@/lib/careerpath/intent-router";
import { renderResumePdf } from "@/lib/careerpath/pdf-renderer";
import { verifyExtractedResumeText, verifyResumePdfArtifact } from "@/lib/careerpath/ats-artifact";
import { enforceResumeClaimProvenance } from "@/lib/careerloop/provenance";
import { buildConversionIntelligence } from "@/lib/careerloop/conversion";
import type { JobApplication } from "@/lib/careerpath/types";

const content: CareerPathResumeContent = {
  header: {
    name: "A Candidate",
    email: "candidate@example.com",
    phone: "+91 99999 99999",
    location: "Delhi, India",
    links: {
      linkedin: "https://linkedin.com/in/candidate",
      github: "https://github.com/candidate",
      portfolio: "https://candidate.example",
    },
  },
  summary: "Backend engineer building production APIs and reliable developer tools.",
  skills: [{ category: "Engineering", items: ["Python", "FastAPI", "PostgreSQL", "Docker"] }],
  experience: [{
    company: "Amaura",
    role: "Backend Engineer",
    dates: "2025 - Present",
    location: "Delhi",
    bullets: ["Built FastAPI services and production APIs with 942 automated tests."],
  }],
  projects: [{
    name: "Agent Platform",
    techStack: ["Python", "FastAPI", "Docker"],
    link: "https://github.com/candidate/agent",
    bullets: ["Built and deployed a production AI agent backend using Python, FastAPI and Docker."],
  }],
  education: [{ institution: "Example University", degree: "BSc Computer Science", dates: "2022 - 2025", score: "8.8 CGPA", location: "Delhi" }],
  certifications: [],
  achievements: [],
  languages: ["English", "Hindi"],
};

const now = new Date().toISOString();
const profile = {
  id: "profile-1",
  userId: "user-1",
  personal: { fullName: "A Candidate" },
  target: { targetRoles: ["Backend Engineer"], targetIndustries: [], targetLocations: [], experienceLevel: "mid" },
  preferences: {},
  education: [],
  experience: [{
    id: "exp-1",
    company: "Amaura",
    title: "Backend Engineer",
    responsibilities: ["Built FastAPI services and production APIs"],
    achievements: [{ id: "a-1", text: "Maintained 942 automated tests", evidence: "CI test suite", proofLevel: "verified" }],
    technologies: ["Python", "FastAPI", "PostgreSQL"],
    metrics: ["942 automated tests"],
    leadership: [],
    businessImpact: ["Improved release reliability"],
    proofLevel: "verified",
  }],
  projects: [{
    id: "project-1",
    name: "Agent Platform",
    description: "Production AI agent backend",
    problem: "Reliable AI backend delivery",
    solution: "Built and deployed an agent backend",
    role: "Builder",
    technologies: ["Python", "FastAPI", "Docker"],
    links: [{ id: "link-1", label: "GitHub", url: "https://github.com/candidate/agent", type: "github" }],
    github: "https://github.com/candidate/agent",
    achievements: [],
    metrics: ["Deployed to production"],
    status: "deployed",
    proofLevel: "verified",
  }],
  skills: [], certifications: [], achievements: [], documents: [], links: [], rawInputs: [], gaps: [], strengths: [], weaknesses: [],
  createdAt: now, updatedAt: now,
} as CareerProfile;

function job(id: string, overrides: Partial<JobApplication>): JobApplication {
  return { id, userId: "user-1", company: "Example", role: "Backend Engineer", status: "applied", createdAt: now, updatedAt: now, ...overrides };
}

describe("ATS integrity", () => {
  it("renders an actual PDF and verifies the exact bytes by reparsing them", async () => {
    const pdf = renderResumePdf(content);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const verification = await verifyResumePdfArtifact(content, pdf);
    expect(verification.artifactScore).toBeGreaterThanOrEqual(95);
    expect(verification.verified).toBe(true);
    expect(verification.missingSections).toEqual([]);
  });

  it("fails artifact verification when important resume content is lost", () => {
    const verification = verifyExtractedResumeText(content, "A Candidate Backend engineer SUMMARY only");
    expect(verification.verified).toBe(false);
    expect(verification.artifactScore).toBeLessThan(95);
  });

  it("never reintroduces the old fabricated initial score constants", async () => {
    const handler = await readFile(new URL("../../inngest/handlers/resume-handlers.ts", import.meta.url), "utf8");
    expect(handler).not.toContain("overall: 85");
    expect(handler).not.toContain("atsCompatibility: 90");
    expect(handler).not.toContain("truthfulness: 100");
  });
});

describe("canonical intent taxonomy", () => {
  it.each([
    ["Humanize my resume", "HUMANIZE_RESUME"],
    ["Run a gap analysis for backend engineer", "GAP_ANALYSIS"],
    ["Create three persona versions", "MULTI_PERSONA"],
    ["Show me how ATS parses this resume", "VISUALIZE_ATS"],
    ["Write a recruiter DM and cold email", "GENERATE_OUTREACH"],
    ["Interview me with STAR questions", "STAR_INTERVIEW"],
  ] as const)("routes %s to %s", (message, intent) => {
    expect(inferIntentKeyword(message, true).intent).toBe(intent);
  });
});

describe("claim-level provenance", () => {
  it("keeps supported claims and strips unsupported numeric claims", () => {
    const maliciouslyImproved: CareerPathResumeContent = {
      ...content,
      experience: [{
        ...content.experience[0],
        bullets: [
          "Built FastAPI services and production APIs with 942 automated tests.",
          "Increased company revenue by 9000% and managed 400 engineers.",
        ],
      }],
    };
    const result = enforceResumeClaimProvenance(maliciouslyImproved, profile);
    expect(result.content.experience[0].bullets).toHaveLength(1);
    expect(result.content.experience[0].bullets[0]).toContain("942 automated tests");
    expect(result.report.removedClaims).toBe(1);
    expect(result.report.entries.some((entry) => !entry.supported && entry.claim.includes("9000%"))).toBe(true);
  });
});

describe("CareerLoop statistical restraint", () => {
  it("does not claim enough learning data at the old eight-application threshold", () => {
    const jobs = Array.from({ length: 8 }, (_, index) => job(String(index), { status: index % 2 ? "interview" : "rejected" }));
    const result = buildConversionIntelligence(jobs);
    expect(result.learningStatus.enoughData).toBe(false);
    expect(result.learningStatus.minimumApplications).toBe(20);
  });

  it("unlocks cautious learning only after twenty outcome-bearing applications", () => {
    const jobs = Array.from({ length: 20 }, (_, index) => job(String(index), { status: index % 4 === 0 ? "interview" : "rejected" }));
    expect(buildConversionIntelligence(jobs).learningStatus.enoughData).toBe(true);
  });
});
