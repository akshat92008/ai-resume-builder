import { describe, expect, it } from "vitest";
import type { CareerPathResumeContent, CareerProfile, JobApplication } from "@/lib/careerpath/types";
import { extractJobDescription } from "@/lib/careerpath/domain/jobs";
import { analyzeCareerLoopJob, buildCareerEvidenceGraph, buildConversionIntelligence, inferJobSource, validatePublicJobUrl } from "@/lib/careerloop";
import { enforceResumeClaimProvenance } from "@/lib/careerloop/provenance";

const now = new Date().toISOString();
const profile = {
  id: "profile-1",
  userId: "user-1",
  personal: { fullName: "A Candidate", github: "https://github.com/example" },
  target: { targetRoles: ["Backend Engineer"], targetIndustries: [], targetLocations: [], experienceLevel: "mid" },
  preferences: {},
  education: [],
  experience: [{
    id: "exp-1", company: "Amaura", title: "Backend Engineer",
    responsibilities: ["Built FastAPI services and production APIs"],
    achievements: [{ id: "a-1", text: "Shipped a Python API", evidence: "repository tests", proofLevel: "verified" }],
    technologies: ["Python", "FastAPI", "PostgreSQL"], metrics: ["942 automated tests"], leadership: [], businessImpact: ["Improved release reliability"], proofLevel: "verified",
  }],
  projects: [{
    id: "project-1", name: "Agent Platform", description: "Production AI agent backend", technologies: ["Python", "Docker", "FastAPI"],
    links: [{ id: "link-1", label: "GitHub", url: "https://github.com/example/agent", type: "github" }], github: "https://github.com/example/agent",
    achievements: [], metrics: ["Deployed to production"], status: "deployed", proofLevel: "verified",
  }],
  skills: [
    { id: "s-1", name: "Python", category: "technical", evidence: ["Agent Platform"] },
    { id: "s-2", name: "FastAPI", category: "technical", evidence: ["Agent Platform"] },
    { id: "s-3", name: "Docker", category: "tool", evidence: ["Agent Platform"] },
  ],
  certifications: [], achievements: [], documents: [],
  links: [{ id: "github", label: "GitHub", url: "https://github.com/example", type: "github" }],
  rawInputs: [], gaps: [], strengths: [], weaknesses: [], createdAt: now, updatedAt: now,
} as CareerProfile;

function job(id: string, overrides: Partial<JobApplication>): JobApplication {
  return { id, userId: "user-1", company: "Example", role: "Backend Engineer", status: "applied", createdAt: now, updatedAt: now, ...overrides };
}

describe("Career Twin", () => {
  it("builds an evidence graph from real career assets", () => {
    const graph = buildCareerEvidenceGraph(profile);
    expect(graph.stats.totalNodes).toBeGreaterThan(0);
    expect(graph.stats.verifiedNodes).toBeGreaterThan(0);
    expect(graph.skillEvidence.python?.length).toBeGreaterThan(0);
    expect(graph.stats.evidenceCoverage).toBeGreaterThan(50);
  });
});

describe("claim provenance", () => {
  it("removes unsupported outcome embellishment even when vocabulary overlaps", () => {
    const evidenceProfile = {
      ...profile,
      projects: [{
        ...profile.projects[0],
        name: "Inventory Dashboard",
        description: "Built React dashboard for inventory tracking",
        technologies: ["React"],
        metrics: [],
      }],
      skills: [...profile.skills, { id: "react", name: "React", category: "technical", evidence: ["Inventory Dashboard"] }],
    } as CareerProfile;
    const content: CareerPathResumeContent = {
      header: { name: "A Candidate", links: {} },
      summary: "Engineer building React inventory dashboards.",
      skills: [{ category: "Technical", items: ["React", "CUDA"] }],
      experience: [],
      projects: [{
        name: "Inventory Dashboard",
        techStack: ["React"],
        bullets: [
          "Built React dashboard for inventory tracking",
          "Built React inventory dashboard that optimized warehouse operations and improved fulfillment efficiency",
        ],
      }],
      education: [],
      certifications: [],
      achievements: [],
      languages: [],
    };

    const verified = enforceResumeClaimProvenance(content, evidenceProfile);
    expect(verified.content.projects[0].bullets).toEqual(["Built React dashboard for inventory tracking"]);
    expect(verified.content.skills[0].items).toEqual(["React"]);
    expect(verified.report.entries.some((entry) => entry.claim.includes("optimized warehouse") && !entry.supported)).toBe(true);
  });

  it("rejects invented numeric signals", () => {
    const content: CareerPathResumeContent = {
      header: { name: "A Candidate", links: {} },
      summary: "Backend engineer working with Python and FastAPI.",
      skills: [{ category: "Backend", items: ["Python", "FastAPI"] }],
      experience: [{
        company: "Amaura",
        role: "Backend Engineer",
        dates: "2025–2026",
        bullets: ["Built FastAPI services and production APIs", "Increased API throughput by 900%"],
      }],
      projects: [], education: [], certifications: [], achievements: [], languages: [],
    };
    const verified = enforceResumeClaimProvenance(content, profile);
    expect(verified.content.experience[0].bullets).toEqual(["Built FastAPI services and production APIs"]);
    expect(verified.report.entries.some((entry) => entry.reasons.some((reason) => reason.includes("900%")))).toBe(true);
  });
});

describe("Apply / Skip intelligence", () => {
  it("recommends strong evidence-backed roles without inventing missing skills", () => {
    const jd = extractJobDescription(`Title: Backend Engineer\nCompany: Stripe\nRequired: Python, FastAPI, Docker.\nBuild and maintain production APIs.\n3 years of backend experience.`);
    const report = analyzeCareerLoopJob(jd, profile);
    expect(report.fitPercentage).toBeGreaterThanOrEqual(55);
    expect(report.recommendation).not.toBe("skip");
    expect(report.requirementEvidence.some((item) => item.requirement.toLowerCase() === "python" && item.status !== "missing")).toBe(true);
  });

  it("skips roles with little evidence", () => {
    const jd = extractJobDescription(`Title: Principal ML Engineer\nRequired: Kubernetes, AWS, TensorFlow, CUDA, Spark.\nSenior role owning large-scale ML infrastructure.`);
    const report = analyzeCareerLoopJob(jd, { ...profile, skills: [], experience: [], projects: [], target: { ...profile.target, experienceLevel: "fresher" } });
    expect(report.recommendation).toBe("skip");
    expect(report.riskFlags.length).toBeGreaterThan(0);
  });
});

describe("conversion learning", () => {
  it("uses interviews per application as the north-star metric", () => {
    const intelligence = buildConversionIntelligence([
      job("1", { status: "interview", role: "Backend Engineer", jobUrl: "https://company.com/jobs/1" }),
      job("2", { status: "rejected", role: "Backend Engineer", jobUrl: "https://company.com/jobs/2" }),
      job("3", { status: "interview", role: "Backend Engineer", jobUrl: "https://company.com/jobs/3" }),
      job("4", { status: "rejected", role: "ML Engineer", jobUrl: "https://linkedin.com/jobs/4" }),
    ]);
    expect(intelligence.northStar.applications).toBe(4);
    expect(intelligence.northStar.interviews).toBe(2);
    expect(intelligence.northStar.interviewRate).toBe(50);
  });

  it("infers employer career sites separately from aggregators", () => {
    expect(inferJobSource("https://linkedin.com/jobs/123")).toBe("linkedin");
    expect(inferJobSource("https://careers.example.com/role")).toBe("company_site");
  });
});

describe("job URL safety", () => {
  it("blocks local/private URLs before any fetch", () => {
    expect(() => validatePublicJobUrl("http://localhost:3000/secret")).toThrow();
    expect(() => validatePublicJobUrl("http://127.0.0.1/internal")).toThrow();
    expect(() => validatePublicJobUrl("https://user:pass@example.com/jobs/1")).toThrow();
    expect(validatePublicJobUrl("https://example.com/jobs/1").hostname).toBe("example.com");
  });
});
