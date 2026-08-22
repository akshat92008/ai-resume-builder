import { describe, expect, it } from "vitest";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import type { CareerPathProfile } from "@/lib/careerpath/types";

const source = `My name is Rahul Sharma.

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
- Added authentication and role-based access.
- Deployed the application to Vercel.

WeatherDash
- Built a weather dashboard using React.
- Integrated a public weather API.
- Added responsive layouts for mobile and desktop.

I do NOT have AWS certification.
I do NOT know Kubernetes.
I have never worked professionally with Java.`;

function profile(): CareerPathProfile {
  return {
    id: "profile-1",
    userId: "user-1",
    personal: { name: "Rahul Sharma" },
    target: { role: "", industry: "Software", experienceLevel: "" },
    education: [],
    skills: {
      programming: ["JavaScript", "TypeScript", "Node.js"],
      frameworks: ["React", "Next.js", "Express"],
      tools: ["Git", "API"],
      databases: ["PostgreSQL"],
      aiTools: [],
      softSkills: [],
    },
    // These three rows reproduce the bad deterministic fallback visible in the recording.
    projects: [
      { name: "REST APIs", description: "Built REST APIs using Node.js and Express", techStack: ["Node.js", "Express"], problemSolved: "", features: [], impact: "", links: [] },
      { name: "full-stack task management application", description: "Built a full-stack task management application", techStack: [], problemSolved: "", features: [], impact: "", links: [] },
      { name: "weather dashboard", description: "Built a weather dashboard using React", techStack: ["React"], problemSolved: "", features: [], impact: "", links: [] },
    ],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: source,
    confidenceNotes: [],
  };
}

describe("recorded structured Career Memory regression", () => {
  it("recovers education, internship and named projects from the exact manual-test format", () => {
    const recovered = enforceCareerPathProfileEvidence(profile());

    expect(recovered.education).toHaveLength(1);
    expect(recovered.education[0]).toMatchObject({
      institution: "Delhi Technological University",
      degree: "B.Tech",
      field: "Computer Science",
      endYear: "2027",
      score: "8.4/10",
    });

    expect(recovered.experience).toHaveLength(1);
    expect(recovered.experience[0]).toMatchObject({
      company: "TechNova",
      role: "Software Engineering Intern",
      startDate: "June 2026",
      endDate: "August 2026",
    });
    expect(recovered.experience[0].responsibilities).toEqual(expect.arrayContaining([
      "Built REST APIs using Node.js and Express",
      "Improved database queries in PostgreSQL",
    ]));
    expect(recovered.experience[0].achievements).toEqual(expect.arrayContaining([
      "Reduced API response time by 32%",
      "Worked with a team of 4 engineers",
    ]));

    expect(recovered.projects.map((item) => item.name)).toEqual(["TaskFlow", "WeatherDash"]);
    expect(recovered.projects[0].techStack).toEqual(expect.arrayContaining(["Next.js", "TypeScript", "PostgreSQL"]));
    expect(recovered.projects[1].techStack).toContain("React");
    expect(JSON.stringify(recovered)).not.toContain('"name":"REST APIs"');
  });

  it("does not turn explicitly denied technologies into positive skills", () => {
    const recovered = enforceCareerPathProfileEvidence(profile());
    const skills = JSON.stringify(recovered.skills);
    expect(skills).not.toContain("AWS");
    expect(skills).not.toContain("Kubernetes");
    expect(skills).not.toContain("Java\"");
  });
});
