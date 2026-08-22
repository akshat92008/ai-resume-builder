import { describe, expect, it } from "vitest";
import { inferIntentKeyword } from "@/lib/careerpath/intent-router";
import { processCareerIntent } from "@/lib/careerpath/process-intent";
import { isReadOnlyCareerMemoryQuery } from "@/lib/careerpath/read-only-memory";
import { stripUnsourcedProfileLocations } from "@/lib/careerpath/location-evidence";
import {
  dedupeResumeSectionBullets,
  stripUnsupportedDurationClaims,
} from "@/lib/careerpath/reliability-normalization";
import type { CareerPathProfile, CareerPathResumeContent } from "@/lib/careerpath/types";

const RAHUL_SOURCE = `My name is Rahul Sharma.

I am a final-year B.Tech Computer Science student at Delhi Technological University and I graduate in 2027.

I am looking for backend software developer roles.

My skills are JavaScript, TypeScript, Node.js, Express, PostgreSQL, React, Git and Docker.

I built a project called TaskFlow using Node.js, Express and PostgreSQL. It allows users to create, update and delete tasks.

I also completed a 2-month software development internship at TechNova where I worked on backend APIs.

Build my Career Memory from this information.`;

function content(): CareerPathResumeContent {
  return {
    header: { name: "Rahul Sharma", email: "", phone: "", location: "", links: {} },
    summary: "Highly motivated and detail-oriented Backend Software Developer with 2+ years of experience in Node.js, Express, and PostgreSQL.",
    skills: [],
    experience: [{
      role: "Software Development Intern",
      company: "TechNova",
      dates: "",
      bullets: ["Worked on backend APIs", "Completed a 2-month internship"],
    }],
    projects: [{
      name: "TaskFlow",
      techStack: ["Node.js", "Express", "PostgreSQL"],
      bullets: [
        "Designed and developed a task management system using Node.js, Express, and PostgreSQL, enabling users to create, update, and delete tasks with ease.",
        "A task management system using Node.js, Express and PostgreSQL",
        "Built a project called TaskFlow using Node.js, Express and PostgreSQL. It allows users to create, update and delete tasks",
      ],
    }],
    education: [{
      institution: "Delhi Technological University",
      degree: "B.Tech, Computer Science",
      dates: "2027",
      location: "Delhi",
    }],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

function locationProfile(): CareerPathProfile {
  return {
    personal: {},
    education: [{ institution: "Delhi Technological University", location: "Delhi" }],
    experience: [],
  } as unknown as CareerPathProfile;
}

describe("basic Rahul screening reliability", () => {
  it("treats Career Memory inspection as a deterministic read", () => {
    const message = "Show me everything you currently know about me from Career Memory.";
    expect(isReadOnlyCareerMemoryQuery(message)).toBe(true);
    expect(inferIntentKeyword(message, true)).toMatchObject({
      intent: "GENERAL_HELP",
      confidence: 1,
    });
  });

  it("executor refuses to mutate even when a read is misrouted as ADD_INFORMATION", async () => {
    const result = await processCareerIntent(
      "ADD_INFORMATION",
      "Show me everything you currently know about me from Career Memory.",
      null,
      "user-rahul",
    );
    expect(result.resume).toBeNull();
    expect(result.resumeId).toBeNull();
    expect(result.assistantMessage).toContain("Career Memory is empty");
  });

  it("does not let a 2-month internship support 2+ years of experience", () => {
    const result = stripUnsupportedDurationClaims(content(), RAHUL_SOURCE);
    expect(result.removedClaims).toBe(1);
    expect(result.content.summary).not.toMatch(/2\+\s*years/i);
  });

  it("keeps duration language when the same unit and specificity are explicitly sourced", () => {
    const candidate = content();
    candidate.summary = "Backend developer with 2 months of internship experience.";
    const result = stripUnsupportedDurationClaims(candidate, RAHUL_SOURCE);
    expect(result.removedClaims).toBe(0);
    expect(result.content.summary).toContain("2 months");
  });

  it("deduplicates the three TaskFlow paraphrases inside the same project", () => {
    const result = dedupeResumeSectionBullets(content());
    expect(result.projects[0].bullets).toHaveLength(1);
    expect(result.projects[0].bullets[0]).toMatch(/Task|task management/i);
  });

  it("does not infer Delhi as education location from the university name", () => {
    const result = stripUnsourcedProfileLocations(locationProfile(), RAHUL_SOURCE);
    expect(result.education[0].location).toBe("");
  });

  it("keeps an education location when the user explicitly supplies it", () => {
    const result = stripUnsourcedProfileLocations(
      locationProfile(),
      `${RAHUL_SOURCE}\nEducation location: Delhi.`,
    );
    expect(result.education[0].location).toBe("Delhi");
  });
});
