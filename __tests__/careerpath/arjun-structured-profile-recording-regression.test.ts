import { describe, expect, it } from "vitest";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import { fallbackResumeFromProfile } from "@/lib/careerpath/runtime-fallbacks";
import { answerCareerMemoryQuery } from "@/lib/careerpath/read-only-memory";
import { isDirectInternshipRecall } from "@/lib/careerpath/process-intent";
import {
  looksLikeComprehensiveStructuredCareerProfile,
  looksLikeStructuredCareerProfile,
  repairStructuredResumeMemorySnapshot,
} from "@/lib/careerpath/structured-profile-recovery";
import type { CareerPathProfile, CareerPathResume } from "@/lib/careerpath/types";

const source = `Name: Arjun Mehta
Email: use an inbox you actually control

Education:
B.Tech Computer Science, Delhi Technological University
2022-2026
CGPA: 8.4/10

Skills:
JavaScript
TypeScript
React
Next.js
Node.js
Express
PostgreSQL
Git
REST APIs

Experience:
Software Engineering Intern – PixelForge Technologies
May 2025 – July 2025
Built an internal React dashboard used by the operations team.
Created REST API integrations using Node.js and Express.
Reduced repetitive manual reporting work by approximately 30%.
Worked with PostgreSQL for application data.

Projects:
1. TaskFlow
Full-stack project management application.
Built with Next.js, TypeScript, PostgreSQL and REST APIs.
Includes authentication, projects, tasks and role-based permissions.

2. ExpenseLens
Personal expense analytics dashboard.
Built using React and JavaScript.
Includes category tracking, monthly visualizations and CSV import.

Important negative facts:
I have NEVER worked professionally with AWS.
I do NOT know Kubernetes.
I have NEVER worked at Google, Microsoft, Amazon or OpenAI.
I have no professional Python experience.`;

function noisyProfile(): CareerPathProfile {
  const project = (name: string, description = name): CareerPathProfile["projects"][number] => ({
    name,
    description,
    techStack: [],
    problemSolved: "",
    features: [],
    impact: "",
    links: [],
  });

  return {
    id: "profile-arjun-structured",
    userId: "user-arjun-structured",
    personal: { email: "use an inbox you actually control" },
    target: { role: "", industry: "Software", experienceLevel: "student" },
    education: [],
    skills: {
      programming: ["JavaScript", "TypeScript", "Node.js", "Python"],
      frameworks: ["React", "Next.js", "Express"],
      tools: ["Git", "REST APIs", "Kubernetes", "AWS"],
      databases: ["PostgreSQL"],
      aiTools: ["OpenAI"],
      softSkills: [],
    },
    projects: [
      project("1. TaskFlow"),
      project("Full-stack project management application"),
      project("Built with Next.js"),
      project("Includes authentication"),
      project("2. ExpenseLens"),
      project("Personal expense analytics dashboard"),
      project("Built using React and JavaScript"),
      project("Includes category tracking"),
    ],
    experience: [],
    certifications: [],
    achievements: [
      "Built an internal React dashboard used by the operations team",
      "Created REST API integrations using Node.js and Express",
      "Reduced repetitive manual reporting work by approximately 30%",
      "Worked with PostgreSQL for application data",
    ],
    languages: [],
    rawNotes: source,
    confidenceNotes: [],
  };
}

describe("Aug 25 structured production recording regression", () => {
  it("recognizes the payload as comprehensive structured Career Memory", () => {
    expect(looksLikeStructuredCareerProfile(source)).toBe(true);
    expect(looksLikeComprehensiveStructuredCareerProfile(source)).toBe(true);
  });

  it("recovers the exact canonical profile instead of 8 fragment projects", () => {
    const recovered = enforceCareerPathProfileEvidence(noisyProfile());

    expect(recovered.personal.name).toBe("Arjun Mehta");
    expect(recovered.personal.email).toBeUndefined();
    expect(recovered.education).toEqual([
      expect.objectContaining({
        institution: "Delhi Technological University",
        degree: "B.Tech",
        field: "Computer Science",
        startYear: "2022",
        endYear: "2026",
        score: "8.4/10",
      }),
    ]);

    expect(recovered.experience).toEqual([
      expect.objectContaining({
        company: "PixelForge Technologies",
        role: "Software Engineering Intern",
        startDate: "May 2025",
        endDate: "July 2025",
      }),
    ]);
    expect(recovered.experience[0].responsibilities).toEqual(expect.arrayContaining([
      "Built an internal React dashboard used by the operations team",
      "Created REST API integrations using Node.js and Express",
      "Worked with PostgreSQL for application data",
    ]));
    expect(recovered.experience[0].achievements).toContain(
      "Reduced repetitive manual reporting work by approximately 30%",
    );

    expect(recovered.projects.map((project) => project.name)).toEqual(["TaskFlow", "ExpenseLens"]);
    expect(recovered.projects[0].description).toBe("Full-stack project management application");
    expect(recovered.projects[0].techStack).toEqual(expect.arrayContaining([
      "Next.js",
      "TypeScript",
      "PostgreSQL",
      "REST APIs",
    ]));
    expect(recovered.projects[1].description).toBe("Personal expense analytics dashboard");
    expect(recovered.projects[1].techStack).toEqual(expect.arrayContaining(["React", "JavaScript"]));
    expect(recovered.achievements).toEqual([]);

    const skills = JSON.stringify(recovered.skills);
    expect(skills).not.toContain("Python");
    expect(skills).not.toContain("OpenAI");
    expect(skills).not.toContain("AWS");
    expect(skills).not.toContain("Kubernetes");
  });

  it("produces exactly one education, one internship and two projects downstream", () => {
    const recovered = enforceCareerPathProfileEvidence(noisyProfile());
    const career = legacyProfileToCareerProfile(recovered, recovered.userId, source);
    const resume = fallbackResumeFromProfile(recovered);

    expect(career.education).toHaveLength(1);
    expect(career.experience).toHaveLength(1);
    expect(career.projects.map((project) => project.name)).toEqual(["TaskFlow", "ExpenseLens"]);
    expect(career.achievements).toHaveLength(0);

    expect(resume.header.name).toBe("Arjun Mehta");
    expect(resume.education).toHaveLength(1);
    expect(resume.experience).toHaveLength(1);
    expect(resume.projects.map((project) => project.name)).toEqual(["TaskFlow", "ExpenseLens"]);
  });

  it("repairs the old corrupted in-memory CareerProfile for read-only recall", () => {
    const noisy = noisyProfile();
    const now = new Date().toISOString();
    const corruptedResume: CareerPathResume = {
      id: "resume-corrupted",
      userId: noisy.userId,
      title: "Corrupted resume",
      targetRole: "",
      mode: "build",
      status: "final",
      content: fallbackResumeFromProfile(noisy),
      profile: noisy,
      careerProfile: legacyProfileToCareerProfile(noisy, noisy.userId, source),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const repaired = repairStructuredResumeMemorySnapshot(corruptedResume)!;
    expect(repaired.careerProfile?.education).toHaveLength(1);
    expect(repaired.careerProfile?.experience).toHaveLength(1);
    expect(repaired.careerProfile?.projects.map((project) => project.name)).toEqual(["TaskFlow", "ExpenseLens"]);
    expect(repaired.careerProfile?.achievements).toHaveLength(0);

    const answer = answerCareerMemoryQuery("Where did I intern and when?", repaired.careerProfile);
    expect(answer).toContain("Software Engineering Intern");
    expect(answer).toContain("PixelForge Technologies");
    expect(answer).toContain("May 2025 – July 2025");
  });

  it("routes the exact recorded internship recall away from mutation/AI handlers", () => {
    expect(isDirectInternshipRecall("Where did I intern and when?")).toBe(true);
  });
});
