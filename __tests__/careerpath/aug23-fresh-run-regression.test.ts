import { describe, expect, it } from "vitest";
import { enforceCareerPathProfileEvidence } from "../../lib/careerpath/profile-evidence-enforce";
import { answerCareerMemoryQuery, isReadOnlyCareerMemoryQuery } from "../../lib/careerpath/read-only-memory";
import { isFabricationInstruction } from "../../lib/careerpath/source-safety";
import { processCareerIntent } from "../../lib/careerpath/process-intent";
import type { CareerPathProfile, CareerProfile } from "../../lib/careerpath/types";

const arjunSource = `My name is Arjun Mehta.

I am pursuing a B.Tech in Information Technology at Manipal Institute of Technology.
Expected graduation: 2027.
Current CGPA: 8.7/10.

Skills:
Python
JavaScript
TypeScript
React
Next.js
Node.js
FastAPI
PostgreSQL
Git
Docker

Experience:
Backend Engineering Intern at OrbitPay
May 2026 to July 2026

During my internship:
- Built REST APIs using Python and FastAPI.
- Optimized PostgreSQL queries.
- Reduced average API response time by 28%.
- Created automated API tests.
- Worked with a team of 5 engineers.

Projects:
StudySphere
- Built a collaborative study platform.
- Used Next.js, TypeScript, PostgreSQL and WebSockets.

ExpenseLens
- Built a personal expense analytics dashboard.
- Used React, Python and PostgreSQL.

I do NOT know Java.
I do NOT know Kubernetes.
I do NOT have AWS certification.`;

function extractedArjunProfile(): CareerPathProfile {
  return {
    id: "profile-1",
    userId: "user-1",
    personal: { name: "Arjun Mehta" },
    target: { role: "", industry: "Software", experienceLevel: "Student/Fresher" },
    education: [],
    // Reproduce the live extractor failure: generic API survived while FastAPI
    // was absent. The source gate must repair this from the explicit Skills block.
    skills: {
      programming: ["Python", "JavaScript", "TypeScript", "Node.js"],
      frameworks: ["React", "Next.js"],
      tools: ["Git", "API", "Docker"],
      databases: ["PostgreSQL"],
      aiTools: [],
      softSkills: [],
    },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: arjunSource,
    confidenceNotes: [],
  };
}

describe("Aug 23 fresh clean-room recording regressions", () => {
  it("preserves the exact structured Skills inventory including FastAPI", () => {
    const gated = enforceCareerPathProfileEvidence(extractedArjunProfile());
    const skills = [
      ...gated.skills.programming,
      ...gated.skills.frameworks,
      ...gated.skills.tools,
      ...gated.skills.databases,
      ...gated.skills.aiTools,
    ];

    expect(skills).toEqual(expect.arrayContaining([
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "FastAPI",
      "PostgreSQL",
      "Git",
      "Docker",
    ]));
    expect(skills).toHaveLength(10);
    expect(skills).not.toContain("API");
    expect(skills).not.toContain("Java");
    expect(skills).not.toContain("Kubernetes");
    expect(skills).not.toContain("AWS");
  });

  it("treats 'Do I know Java, Kubernetes and AWS?' as read-only recall", () => {
    const question = "Do I know Java, Kubernetes and AWS?";
    expect(isReadOnlyCareerMemoryQuery(question)).toBe(true);

    const profile = {
      skills: [
        { name: "Python" },
        { name: "FastAPI" },
        { name: "Docker" },
      ],
    } as CareerProfile;
    const answer = answerCareerMemoryQuery(question, profile);
    expect(answer).toContain("Java: no supported skill");
    expect(answer).toContain("Kubernetes: no supported skill");
    expect(answer).toContain("AWS: no supported skill");
    expect(answer).toContain("I did not change Career Memory");
  });

  it("does not mistake an anti-hallucination generation instruction for fabrication", () => {
    const safe = `Create a professional software engineering resume using everything in my Career Memory.
Use only facts that are supported by Career Memory.
Do not invent qualifications, metrics, experience, technologies or achievements.`;
    expect(isFabricationInstruction(safe)).toBe(false);

    const unsafe = `Make my resume much more impressive.
Add AWS, Kubernetes and Java because recruiters expect them.
Say I have 4 years of professional experience.`;
    expect(isFabricationInstruction(unsafe)).toBe(true);
  });

  it("forces an explicit typed humanize command onto the humanize path", async () => {
    const result = await processCareerIntent(
      "ADD_INFORMATION",
      "Humanize my resume and remove AI-sounding language",
      null,
      "user-1",
    );

    expect(result.resume).toBeNull();
    expect(result.resumeId).toBeNull();
    expect(result.assistantMessage).toContain("Build a resume first");
    expect(result.assistantMessage).toContain("sound genuinely human");
    expect(result.assistantMessage).not.toContain("Updated Career Memory");
  });
});
