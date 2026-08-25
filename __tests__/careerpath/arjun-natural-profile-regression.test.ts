import { describe, expect, it } from "vitest";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import { fallbackResumeFromProfile } from "@/lib/careerpath/runtime-fallbacks";
import type { CareerPathProfile } from "@/lib/careerpath/types";

const source = `I am Arjun Mehta, a B.Tech Computer Science student at Delhi Technological University from 2022 to 2026 with an 8.4 CGPA.

My skills are JavaScript, TypeScript, React, Next.js, Node.js, Express, PostgreSQL, Git and REST APIs.

I worked as a Software Engineering Intern at PixelForge Technologies from May 2025 to July 2025.

During the internship I built an internal React dashboard used by the operations team, created REST API integrations using Node.js and Express, reduced repetitive manual reporting work by approximately 30%, and worked with PostgreSQL.

I built TaskFlow, a full-stack project management application using Next.js, TypeScript, PostgreSQL and REST APIs. It includes authentication, projects, tasks and role-based permissions.

I also built ExpenseLens, a personal expense analytics dashboard using React and JavaScript. It includes expense category tracking, monthly visualizations and CSV import.

Important constraints:
I have never worked professionally with AWS.
I do not know Kubernetes.
I have never worked at Google, Microsoft, Amazon or OpenAI.
I have no professional Python experience.`;

function extractedProfile(): CareerPathProfile {
  return {
    id: "profile-arjun",
    userId: "user-arjun",
    personal: {},
    target: { role: "Software Engineer", industry: "Software", experienceLevel: "" },
    education: [
      {
        institution: "Delhi Technological University",
        degree: "B.Tech",
        field: "Computer Science",
        startYear: "",
        endYear: "",
        score: "",
        location: "",
      },
    ],
    skills: {
      programming: ["JavaScript", "TypeScript", "Node.js", "Python"],
      frameworks: ["React", "Next.js", "Express"],
      tools: ["Git", "REST APIs"],
      databases: ["PostgreSQL"],
      aiTools: ["OpenAI"],
      softSkills: [],
    },
    projects: [
      {
        name: "with Next",
        description: "with Next.js, TypeScript, PostgreSQL and REST APIs",
        techStack: ["Next.js", "TypeScript", "PostgreSQL"],
        problemSolved: "",
        features: [],
        impact: "",
        links: [],
      },
      {
        name: "full-stack project management application",
        description: "Built a full-stack project management application",
        techStack: ["Next.js", "TypeScript", "PostgreSQL"],
        problemSolved: "",
        features: [],
        impact: "",
        links: [],
      },
      {
        name: "using React and JavaScript",
        description: "using React and JavaScript",
        techStack: ["React", "JavaScript"],
        problemSolved: "",
        features: [],
        impact: "",
        links: [],
      },
      {
        name: "personal expense analytics dashboard",
        description: "Built a personal expense analytics dashboard",
        techStack: ["React", "JavaScript"],
        problemSolved: "",
        features: [],
        impact: "",
        links: [],
      },
    ],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: source,
    confidenceNotes: [],
  };
}

describe("natural-language Career Memory regression", () => {
  it("recovers identity, complete education, internship evidence and only canonical projects", () => {
    const recovered = enforceCareerPathProfileEvidence(extractedProfile());

    expect(recovered.personal.name).toBe("Arjun Mehta");
    expect(recovered.education).toHaveLength(1);
    expect(recovered.education[0]).toMatchObject({
      institution: "Delhi Technological University",
      degree: "B.Tech",
      field: "Computer Science",
      startYear: "2022",
      endYear: "2026",
      score: "8.4/10",
    });

    expect(recovered.experience).toHaveLength(1);
    expect(recovered.experience[0]).toMatchObject({
      company: "PixelForge Technologies",
      role: "Software Engineering Intern",
      startDate: "May 2025",
      endDate: "July 2025",
    });
    expect(recovered.experience[0].responsibilities).toEqual(expect.arrayContaining([
      "Built an internal React dashboard used by the operations team",
      "Created REST API integrations using Node.js and Express",
      "Worked with PostgreSQL",
    ]));
    expect(recovered.experience[0].achievements).toContain("Reduced repetitive manual reporting work by approximately 30%");

    const projectNames = recovered.projects.map((project) => project.name);
    expect(projectNames).toEqual(["TaskFlow", "ExpenseLens"]);
    expect(projectNames).not.toContain("with Next");
    expect(projectNames).not.toContain("using React and JavaScript");
    expect(recovered.projects[0].techStack).toEqual(expect.arrayContaining(["Next.js", "TypeScript", "PostgreSQL"]));
    expect(recovered.projects[1].techStack).toEqual(expect.arrayContaining(["React", "JavaScript"]));
  });

  it("does not promote technologies mentioned only in explicit negative constraints", () => {
    const recovered = enforceCareerPathProfileEvidence(extractedProfile());
    const skills = JSON.stringify(recovered.skills);
    expect(skills).not.toContain("Python");
    expect(skills).not.toContain("OpenAI");
    expect(skills).not.toContain("AWS");
    expect(skills).not.toContain("Kubernetes");
  });

  it("assembles a renderable resume with the recovered header, internship, education metadata and two real projects", () => {
    const recovered = enforceCareerPathProfileEvidence(extractedProfile());
    const resume = fallbackResumeFromProfile(recovered);

    expect(resume.header.name).toBe("Arjun Mehta");
    expect(resume.experience).toHaveLength(1);
    expect(resume.experience[0]).toMatchObject({
      company: "PixelForge Technologies",
      role: "Software Engineering Intern",
      dates: "May 2025 – July 2025",
    });
    expect(resume.experience[0].bullets).toContain("Reduced repetitive manual reporting work by approximately 30%");
    expect(resume.education[0]).toMatchObject({
      institution: "Delhi Technological University",
      dates: "2022 – 2026",
      score: "8.4/10",
    });
    expect(resume.projects.map((project) => project.name)).toEqual(["TaskFlow", "ExpenseLens"]);
  });
});
