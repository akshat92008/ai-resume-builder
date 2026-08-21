import { describe, expect, it } from "vitest";
import { extractPdfText, verifyResumePdfArtifact } from "@/lib/careerpath/ats-artifact";
import { renderResumePdf } from "@/lib/careerpath/pdf-renderer";
import type { CareerPathResumeContent } from "@/lib/careerpath/types";

const content: CareerPathResumeContent = {
  header: {
    name: "Release Candidate",
    email: "release@example.com",
    phone: "",
    location: "Delhi",
    links: { linkedin: "", github: "", portfolio: "" },
  },
  summary: "Software engineering intern building reliable web products with source-backed career evidence.",
  skills: [{ category: "Engineering", items: ["React", "TypeScript", "Next.js", "PostgreSQL"] }],
  experience: [{
    company: "Example Labs",
    role: "Software Engineering Intern",
    dates: "2025 - 2026",
    bullets: ["Implemented REST APIs and wrote 120 automated tests for the inventory workflow."],
  }],
  projects: [{
    name: "Inventory Dashboard",
    techStack: ["React", "TypeScript", "Next.js", "PostgreSQL"],
    bullets: ["Built an inventory dashboard with verified source-backed project evidence."],
  }],
  education: [],
  certifications: [],
  achievements: [],
  languages: [],
};

describe("canonical resume PDF round trip", () => {
  it("renders and re-parses the generated PDF with the supported pdf-parse v2 API", async () => {
    const pdf = renderResumePdf(content);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const extracted = await extractPdfText(pdf);
    expect(extracted.toLowerCase()).toContain("release candidate");
    expect(extracted.toLowerCase()).toContain("inventory dashboard");
    expect(extracted).toContain("120");

    const verification = await verifyResumePdfArtifact(content, pdf);
    expect(verification.verified).toBe(true);
    expect(verification.artifactScore).toBeGreaterThanOrEqual(95);
    expect(verification.missingSections).toEqual([]);
    expect(verification.missingSignals).toEqual([]);
  });
});
