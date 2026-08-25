import { describe, expect, it } from "vitest";
import { isReadOnlyCareerMemoryQuery } from "@/lib/careerpath/read-only-memory";
import {
  extractJobDescription,
  routeCareerCommand,
} from "@/lib/careerpath/career-os";
import { profileSupportsJobKeyword } from "@/lib/careerpath/domain/jobs";
import {
  deterministicCommandIntent,
  isDirectJobFitQuery,
} from "@/lib/careerpath/process-intent";
import {
  looksLikeEmbeddedJobDescription,
  resolveTailoringJobDescription,
} from "@/inngest/handlers/resume-handlers";
import type { CareerProfile } from "@/lib/careerpath/types";

const novaJob = `Software Engineer — Nova Systems
Location: Remote

Requirements:
- JavaScript and TypeScript
- React and Next.js
- Node.js and REST APIs
- SQL
- Git

Preferred qualifications:
- AWS or another cloud platform
- Docker`;

describe("August 25 recording runtime regressions", () => {
  it("keeps recorded Career Memory recall variants read-only", () => {
    expect(isReadOnlyCareerMemoryQuery("What technologies do I know?")).toBe(true);
    expect(isReadOnlyCareerMemoryQuery("What projects have I built?")).toBe(true);
    expect(isReadOnlyCareerMemoryQuery("Where did I intern and when?")).toBe(true);
  });

  it("routes the recorded job-fit question as deterministic general help, not search analytics", () => {
    const prompt = "Should I apply to this role? Be specific about my strengths, gaps and overall fit.";
    expect(isDirectJobFitQuery(prompt)).toBe(true);
    expect(routeCareerCommand(prompt, { resume: {} as never }).intent).toBe("general_career_question");
  });

  it("routes impressive-without-inventing instructions to improvement, not humanize", () => {
    expect(deterministicCommandIntent(
      "Make my internship 10x more impressive without inventing facts",
      "HUMANIZE_RESUME",
    )).toBe("IMPROVE_RESUME");
  });

  it("parses role and company from the recorded em-dash job heading", () => {
    const job = extractJobDescription(novaJob);
    expect(job.title).toBe("Software Engineer");
    expect(job.company).toBe("Nova Systems");
  });

  it("treats PostgreSQL as evidence for generic SQL without promoting unrelated skills", () => {
    const profile = {
      skills: [{ name: "PostgreSQL" }],
    } as unknown as CareerProfile;
    expect(profileSupportsJobKeyword("SQL", profile)).toBe(true);
    expect(profileSupportsJobKeyword("AWS", profile)).toBe(false);
    expect(profileSupportsJobKeyword("Docker", profile)).toBe(false);
  });

  it("reuses the stored JD for short tailoring commands", () => {
    const command = "Tailor my resume for the Nova Systems role";
    expect(looksLikeEmbeddedJobDescription(command)).toBe(false);
    expect(resolveTailoringJobDescription(command, novaJob)).toBe(novaJob);
  });

  it("uses a newly pasted JD instead of stale stored job text", () => {
    const newJob = `Job Description:\nBackend Engineer | DataGrid\n\nRequirements:\n- Python\n- FastAPI\n- PostgreSQL\n- Docker\n- AWS`;
    expect(looksLikeEmbeddedJobDescription(newJob)).toBe(true);
    expect(resolveTailoringJobDescription(newJob, novaJob)).toBe(newJob);
  });
});
