import { describe, expect, it } from "vitest";
import { evaluateResumeCompleteness } from "../../lib/resume/completeness";
import { extractResumeFacts } from "../../lib/resume/extract";
import { handleResumeMessage } from "../../lib/resume/agent";
import { classifyResumeIntent } from "../../lib/resume/intent";
import { deriveRenderableResume } from "../../lib/resume/render";
import { validateResumeTruthfulness } from "../../lib/resume/validator";
import { normalizeState } from "../../lib/resume/reducer";

describe("Resume brain truthfulness", () => {
  it("does not hallucinate when info is missing", async () => {
    const input = "Build my resume. I am Rohit. I know Python and AI. I made some projects. I want data analyst role.";
    const extracted = normalizeState(extractResumeFacts(input));
    const completeness = evaluateResumeCompleteness(extracted);
    const response = await handleResumeMessage({ userMessage: input });

    expect(completeness.canGenerate).toBe(false);
    expect(response.type).toBe("questions");
    expect(response.resume).toBeUndefined();
    expect(JSON.stringify(response)).not.toMatch(/example@email|123-456|Anytown University|Fake Certification|AI Intern/i);
  });

  it("starts interview mode without generating placeholders", async () => {
    const response = await handleResumeMessage({
      userMessage: "I don't know what to write in my resume. Ask me questions and build it step by step.",
    });

    expect(response.type).toBe("questions");
    expect(response.interviewState?.active).toBe(true);
    expect(response.message.split("\n").filter((line) => /^\d+\./.test(line)).length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(response)).not.toMatch(/YOUR NAME|Your Phone Number/i);
  });

  it("improves Priya resume while preserving all supplied facts", async () => {
    const input = `Improve this resume:
Name: Priya Sharma
Email: priya@email.com
Education: BCA, 2023
Skills: HTML CSS JS React
Experience: Intern at WebSoft
I made websites and worked with team.
Projects:
Weather app
Todo app
Blog website`;

    const response = await handleResumeMessage({ userMessage: input });
    const resume = response.resume!;
    const text = JSON.stringify(resume);

    expect(response.type).toBe("resume");
    expect(resume.candidate.fullName).toBe("Priya Sharma");
    expect(resume.candidate.email).toBe("priya@email.com");
    expect(text).toContain("BCA");
    expect(text).toContain("2023");
    expect(text).toContain("HTML");
    expect(text).toContain("CSS");
    expect(text).toContain("JavaScript");
    expect(text).toContain("React");
    expect(text).toContain("Websoft");
    expect(text).toContain("Weather App");
    expect(text).toContain("Todo App");
    expect(text).toContain("Blog Website");
    expect(text).not.toContain("AI Intern");
    expect(deriveRenderableResume(resume).skills.every((group) => group.items.length > 0)).toBe(true);
  });

  it("builds detailed messy data without applying all tech to all projects", async () => {
    const input = `name - devansh rawat
mail devrawat@gmail.com phone 9876543210
college amity btech cse 2025
skills react node js express mongo db sql git docker little aws
internship startup called rapidcart june 2024 to aug 2024 backend intern made api fixed bugs helped payment thing
projects
1 chat app socket io node react
2 expense tracker mern charts auth
3 resume maker next js ai api pdf download
want backend developer resume make it good and ats friendly`;

    const response = await handleResumeMessage({ userMessage: input });
    const resume = response.resume!;

    expect(response.type).toBe("resume");
    expect(resume.candidate.fullName).toBe("Devansh Rawat");
    expect(resume.candidate.email).toBe("devrawat@gmail.com");
    expect(resume.projects.map((project) => project.name)).toEqual(["Chat App", "Expense Tracker", "Resume Maker"]);
    expect(resume.projects[0].tech).toEqual(expect.arrayContaining(["Socket.io", "Node.js", "React"]));
    expect(resume.projects[0].tech).not.toContain("Next.js");
    expect(resume.projects[2].tech).toEqual(expect.arrayContaining(["Next.js", "AI APIs"]));
    expect(JSON.stringify(resume)).not.toMatch(/example@email|Anytown|N\/A/i);
  });

  it("refuses to add fake achievements", async () => {
    const current = normalizeState(extractResumeFacts("Name: Asha Mehta\nSkills: React\nProjects:\nPortfolio website react"));
    const response = await handleResumeMessage({
      userMessage: "Make my resume stronger. You can add achievements if needed.",
      currentResume: current,
    });

    expect(response.message).toMatch(/won.t add fake achievements/i);
    expect(JSON.stringify(response.resume)).not.toMatch(/Developer of the Year|increased .*%/i);
  });

  it("tailors to JD without adding missing skills or losing projects", async () => {
    const build = await handleResumeMessage({
      userMessage: "Build resume for Neha Kapoor. She is a frontend developer with React, Next.js, TypeScript, Tailwind, Redux, REST APIs. She has 1 year internship experience at PixelCraft Studio. Projects: SaaS dashboard, ecommerce frontend, AI chatbot UI. Education: B.Tech IT 2024.",
    });
    const tailored = await handleResumeMessage({
      userMessage: `Now tailor this resume for this job:
Frontend Developer Intern
Requirements:
React.js, TypeScript, responsive design, REST APIs, Git, Tailwind CSS, component-based architecture, performance optimization.`,
      currentResume: build.resume!,
    });
    const text = JSON.stringify(tailored.resume);

    expect(tailored.matchedKeywords).toEqual(expect.arrayContaining(["React", "TypeScript", "REST APIs", "Tailwind CSS"]));
    expect(tailored.missingKeywords).toEqual(expect.arrayContaining(["Git"]));
    expect(text).toContain("Redux");
    expect(text).toContain("SaaS Dashboard");
    expect(text).toContain("Ecommerce Frontend");
    expect(text).toContain("AI Chatbot UI");
    expect(text).not.toMatch(/example@email|increased .*%/i);
  });

  it("does not create a fake full resume when adding a project without current resume", async () => {
    const response = await handleResumeMessage({
      userMessage: "I made a study app. It has login, dashboard, notes upload, AI summary, quiz, progress tracking. I used Next.js, Supabase, Tailwind, Gemini API. Add it to my resume.",
    });

    expect(response.type).toBe("questions");
    expect(response.message).toMatch(/no active resume|new resume/i);
    expect(JSON.stringify(response.resume)).toContain("AI Study App");
  });

  it("removes placeholders and empty sections", () => {
    const state = normalizeState({
      candidate: { fullName: "Your Name", email: "example@email.com", location: "Anytown" },
      skills: { tools: [], databases: [] },
      projects: [{ id: "p1", name: "Portfolio", bullets: ["Built Portfolio as a project."], tech: [] }],
    });
    const validation = validateResumeTruthfulness(null, state, "", classifyResumeIntent("help"));
    const rendered = deriveRenderableResume(validation.cleanedResume);

    expect(JSON.stringify(rendered)).not.toMatch(/Your Name|example@email|Anytown|N\/A/i);
    expect(rendered.skills).toEqual([]);
  });

  it("keeps separate resumes isolated", async () => {
    const karan = (await handleResumeMessage({ userMessage: "Name: Karan Malhotra\nWant Java backend developer resume\nSkills Java Spring Boot MySQL Docker\nProjects:\nInventory API Spring Boot MySQL" })).resume!;
    const sneha = (await handleResumeMessage({ userMessage: "Name: Sneha Iyer\nWant UI/UX designer resume\nSkills Figma design systems\nProjects:\nMobile app redesign Figma" })).resume!;
    const imran = (await handleResumeMessage({ userMessage: "Name: Imran Khan\nWant data analyst resume\nSkills Excel SQL Power BI Python\nProjects:\nSales dashboard Power BI SQL" })).resume!;

    expect(JSON.stringify(sneha)).not.toMatch(/Java|Spring Boot|MySQL/);
    expect(JSON.stringify(imran)).not.toMatch(/Figma|Design Systems/);
    expect(JSON.stringify(karan)).not.toMatch(/Power BI/);
  });
});
