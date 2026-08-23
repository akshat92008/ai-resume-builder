import { describe, expect, it } from "vitest";
import { createResumeRecord } from "@/lib/careerpath/agents";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import { reconcileVerifiedTailoringResult } from "@/lib/careerpath/tailoring-verification";
import { fallbackTailorResume } from "@/lib/careerpath/runtime-fallbacks";
import type { CareerPathProfile, CareerPathResumeContent } from "@/lib/careerpath/types";

const rawNotes = `My name is Rahul Sharma.

I am pursuing a B.Tech in Computer Science at Delhi Technological University.
Expected graduation: 2027.
Current CGPA: 8.4/10.

Skills:
JavaScript
TypeScript
React
Next.js
Node.js
Express
PostgreSQL
Git

Experience:
Software Engineering Intern at TechNova
June 2026 to August 2026

During the internship:
- Built REST APIs using Node.js and Express.
- Improved database queries in PostgreSQL.
- Reduced API response time by 32%.
- Worked with a team of 4 engineers.

Projects:
TaskFlow
- Built a full-stack task management application.
- Used Next.js, TypeScript and PostgreSQL.

WeatherDash
- Built a weather dashboard using React.
- Integrated a public weather API.

I do NOT have AWS certification.
I do NOT know Kubernetes.
I have never worked professionally with Java.`;

const jobDescription = `Software Engineer

Requirements:
- 3+ years of professional software engineering experience
- Strong React and TypeScript skills
- Node.js backend development
- PostgreSQL experience
- AWS
- Kubernetes
- Java
- Experience improving application performance`;

function profile(): CareerPathProfile {
  return {
    id: "profile-rahul",
    userId: "user-rahul",
    personal: { name: "Rahul Sharma" },
    target: { role: "Software Engineer", industry: "Software", experienceLevel: "Student/Fresher" },
    education: [{
      institution: "Delhi Technological University",
      degree: "B.Tech",
      field: "Computer Science",
      startYear: "",
      endYear: "2027",
      score: "8.4/10",
      location: "",
    }],
    skills: {
      programming: ["JavaScript", "TypeScript", "Node.js"],
      frameworks: ["React", "Next.js", "Express"],
      tools: ["Git", "API"],
      databases: ["PostgreSQL"],
      aiTools: [],
      softSkills: [],
    },
    projects: [
      { name: "TaskFlow", description: "Built a full-stack task management application.", techStack: ["Next.js", "TypeScript", "PostgreSQL"], problemSolved: "", features: [], impact: "", links: [] },
      { name: "WeatherDash", description: "Built a weather dashboard using React.", techStack: ["React", "API"], problemSolved: "", features: ["Integrated a public weather API"], impact: "", links: [] },
    ],
    experience: [{
      company: "TechNova",
      role: "Software Engineering Intern",
      startDate: "June 2026",
      endDate: "August 2026",
      responsibilities: [
        "Built REST APIs using Node.js and Express",
        "Improved database queries in PostgreSQL",
        "Worked with a team of 4 engineers",
      ],
      achievements: ["Reduced API response time by 32%"],
    }],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes,
    confidenceNotes: [],
  };
}

function contaminatedContent(): CareerPathResumeContent {
  return {
    header: { name: "Rahul Sharma", email: "", phone: "", location: "", links: {} },
    summary: "Software engineering intern at TechNova with React, TypeScript, Node.js and PostgreSQL experience.",
    skills: [
      { category: "Programming", items: ["TypeScript", "JavaScript"] },
      { category: "Frameworks & Runtime", items: ["Node.js", "React", "Next.js", "Express"] },
      { category: "Databases", items: ["PostgreSQL"] },
      { category: "Developer Tools", items: ["Git"] },
      { category: "Programming", items: ["Java"] },
      { category: "Tools", items: ["API"] },
    ],
    experience: [
      {
        company: "TechNova",
        role: "Software Engineering Intern",
        dates: "June 2026 - August 2026",
        bullets: [
          "Built REST APIs using Node.js and Express",
          "Improved database queries in PostgreSQL",
          "Worked with a team of 4 engineers",
          "Reduced API response time by 32%",
        ],
      },
      { company: "TechNova", role: "Software Engineer", dates: "", bullets: [] },
    ],
    projects: [
      { name: "TaskFlow", techStack: ["Next.js", "TypeScript", "PostgreSQL"], bullets: ["Built a full-stack task management application"] },
      { name: "WeatherDash", techStack: ["React", "API"], bullets: ["Built a weather dashboard using React", "Integrated a public weather API"] },
    ],
    education: [{ institution: "Delhi Technological University", degree: "B.Tech, Computer Science", dates: "2027", score: "8.4/10", location: "" }],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

describe("Aug 23 tailoring truth boundary", () => {
  it("does not let job-description facts survive as candidate skills or employment", async () => {
    const legacy = profile();
    const careerProfile = legacyProfileToCareerProfile(legacy, legacy.userId, legacy.rawNotes);
    const polluted = contaminatedContent();
    const currentResume = createResumeRecord({
      userId: legacy.userId,
      mode: "tailor",
      targetRole: "Software Engineer",
      content: polluted,
      profile: legacy,
      jobDescription,
    });
    currentResume.careerProfile = careerProfile;

    const verified = await verifyResumeCandidate({
      content: polluted,
      currentResume,
      userId: legacy.userId,
      legacyProfile: legacy,
      careerProfile,
      instruction: jobDescription,
      mode: "tailor",
      targetRole: "Software Engineer",
      jobDescription,
    });

    const skills = verified.content.skills.flatMap((group) => group.items);
    expect(skills).not.toContain("Java");
    expect(skills).not.toContain("AWS");
    expect(skills).not.toContain("Kubernetes");
    expect(verified.content.experience).toHaveLength(1);
    expect(verified.content.experience[0]).toMatchObject({
      company: "TechNova",
      role: "Software Engineering Intern",
    });
    expect(JSON.stringify(verified.careerProfile)).not.toContain('"name":"Java"');
  });

  it("recomputes Studio match metadata from the final verified resume", async () => {
    const legacy = profile();
    const careerProfile = legacyProfileToCareerProfile(legacy, legacy.userId, legacy.rawNotes);
    const polluted = contaminatedContent();
    const currentResume = createResumeRecord({
      userId: legacy.userId,
      mode: "tailor",
      targetRole: "Software Engineer",
      content: polluted,
      profile: legacy,
      jobDescription,
    });
    currentResume.careerProfile = careerProfile;
    const verified = await verifyResumeCandidate({
      content: polluted,
      currentResume,
      userId: legacy.userId,
      legacyProfile: legacy,
      careerProfile,
      instruction: jobDescription,
      mode: "tailor",
      targetRole: "Software Engineer",
      jobDescription,
    });

    const providerMetadata = {
      ...fallbackTailorResume(polluted, jobDescription),
      matchScore: 0.6,
      missingKeywordsNotAdded: ["3+ years of professional software engineering experience"],
    };
    const reconciled = reconcileVerifiedTailoringResult(providerMetadata, verified.content, jobDescription);

    expect(reconciled.matchScore).toBe(50);
    expect(reconciled.matchedKeywords).toEqual(expect.arrayContaining(["React", "TypeScript", "Node.js", "PostgreSQL"]));
    expect(reconciled.missingKeywordsNotAdded).toEqual(expect.arrayContaining([
      "AWS",
      "Kubernetes",
      "Java",
      "3+ years of professional software engineering experience",
    ]));
    expect(reconciled.safeKeywordsAdded).toEqual([]);
  });
});
