import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../../app/api/resume/[id]/route";

vi.mock("../../lib/careerpath/db", () => ({
  getServerResume: vi.fn(),
  saveServerResume: vi.fn(),
  saveResumeVersion: vi.fn(),
  deleteServerResume: vi.fn(),
  getSupabaseUser: vi.fn().mockResolvedValue({ id: "user_1" }),
  ResumeConflictError: class ResumeConflictError extends Error {},
}));

vi.mock("../../lib/careerpath/agents", () => ({
  auditResume: vi.fn().mockReturnValue({ score: { overall: 85 } }),
}));

vi.mock("../../lib/careerpath/auth", () => ({
  requireAppAccess: vi.fn().mockResolvedValue({ ok: true, user: { id: "user_1" } }),
  requireAiAccess: vi.fn().mockResolvedValue({ ok: true, user: { id: "user_1" } }),
}));

import { getServerResume, saveResumeVersion, saveServerResume } from "../../lib/careerpath/db";
import { auditResume } from "../../lib/careerpath/agents";

const existingResume = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  userId: "user_1",
  title: "Software Engineer",
  targetRole: "Software Engineer",
  mode: "build",
  version: 5,
  score: { overall: 90 },
  audit: { summary: "Good" },
  content: {
    header: { name: "Candidate", links: {} },
    summary: "Old summary",
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
  },
  status: "final",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Resume Security & PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects attempts to override protected score/version fields", async () => {
    (getServerResume as any).mockResolvedValueOnce(existingResume);

    const request = new Request("http://localhost/api/resume/123e4567-e89b-12d3-a456-426614174000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Senior Software Engineer",
        score: { overall: 100 },
        version: 99,
        content: { summary: "New summary" },
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: existingResume.id }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("INVALID_INPUT");
    expect(saveResumeVersion).not.toHaveBeenCalled();
    expect(saveServerResume).not.toHaveBeenCalled();
  });

  it("increments version server-side and uses optimistic concurrency for a valid edit", async () => {
    (getServerResume as any).mockResolvedValueOnce(existingResume);

    const request = new Request("http://localhost/api/resume/123e4567-e89b-12d3-a456-426614174000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Senior Software Engineer",
        content: { summary: "New summary" },
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: existingResume.id }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getServerResume).toHaveBeenCalledWith(existingResume.id, "user_1");
    expect(saveResumeVersion).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user_1",
      resumeId: existingResume.id,
      resumeJson: expect.objectContaining({ summary: "Old summary" }),
    }));

    const savedArg = (saveServerResume as any).mock.calls[0][0];
    expect(savedArg.version).toBe(6);
    expect(savedArg.status).toBe("final");
    expect(savedArg.title).toBe("Senior Software Engineer");
    expect(savedArg.content.summary).toBe("New summary");
    expect(savedArg.content.experience).toBeDefined();
    expect(savedArg.content.header).toBeDefined();
    expect(savedArg.score.overall).toBe(85);
    expect(json.resume.version).toBe(6);
    expect(saveServerResume).toHaveBeenCalledWith(
      expect.objectContaining({ id: existingResume.id, version: 6 }),
      "user_1",
      { expectedVersion: 5 },
    );
  });

  it("accepts a full generated-content round trip when the database job description is null", async () => {
    const generatedResume = {
      ...existingResume,
      jobDescription: null,
      content: {
        header: { name: "Release Candidate", email: "", phone: "", location: "", links: {} },
        summary: "Software engineering intern",
        skills: [{ category: "Programming", items: ["React", "TypeScript"] }],
        experience: [{
          company: "Example Labs",
          role: "Software Engineering Intern",
          dates: "2025 – 2026",
          bullets: ["Wrote 120 automated tests"],
        }],
        projects: [{ name: "Inventory Dashboard", techStack: ["React", "TypeScript"], bullets: [] }],
        education: [],
        certifications: [],
        achievements: [],
        languages: [],
      },
    };
    (getServerResume as any).mockResolvedValueOnce(generatedResume);

    const editedContent = structuredClone(generatedResume.content);
    editedContent.experience[0].bullets.push(
      "Increased company revenue by 900% through a global optimization program",
    );

    const request = new Request(`http://localhost/api/resume/${generatedResume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editedContent }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: generatedResume.id }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(auditResume).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: [expect.objectContaining({
          bullets: expect.arrayContaining(["Increased company revenue by 900% through a global optimization program"]),
        })],
      }),
      "Software Engineer",
      "",
    );
    expect(json.resume.content.experience[0].bullets.join(" ")).toContain("900%");
    expect(saveServerResume).toHaveBeenCalledWith(
      expect.objectContaining({ version: 6 }),
      "user_1",
      { expectedVersion: 5 },
    );
  });

  it("returns 404 if getServerResume returns null (RLS protection)", async () => {
    (getServerResume as any).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/resume/123e4567-e89b-12d3-a456-426614174000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hacked Title" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("RESUME_NOT_FOUND");
    expect(saveServerResume).not.toHaveBeenCalled();
  });
});
