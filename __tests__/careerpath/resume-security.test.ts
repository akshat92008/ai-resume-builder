import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../../app/api/resume/[id]/route";

vi.mock("../../lib/careerpath/db", () => ({
  getServerResume: vi.fn(),
  saveServerResume: vi.fn(),
  deleteServerResume: vi.fn(),
}));

vi.mock("../../lib/careerpath/agents", () => ({
  auditResume: vi.fn().mockReturnValue({ score: { overall: 85 } }),
}));

import { getServerResume, saveServerResume } from "../../lib/careerpath/db";

describe("Resume Security & PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves protected fields (status, version) on PATCH", async () => {
    const existingResume = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user_1",
      title: "Software Engineer",
      targetRole: "Software Engineer",
      version: 5,
      score: { overall: 90 },
      audit: { summary: "Good" },
      content: { summary: "Old summary" },
      status: "final",
    };

    (getServerResume as any).mockResolvedValueOnce(existingResume);

    const request = new Request("http://localhost/api/resume/123e4567-e89b-12d3-a456-426614174000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Senior Software Engineer", // valid edit
        score: { overall: 100 }, // malicious override attempt
        version: 99, // malicious override attempt
        content: { summary: "New summary" },
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: existingResume.id }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    
    // Check saveServerResume was called with preserved fields
    const savedArg = (saveServerResume as any).mock.calls[0][0];
    
    // Zod strips 'score' and 'version' from payload, so ...resume preserves the original ones, 
    // but the route explicitly generates a new audit & score.
    // So the version should remain 5, and status should remain "final"
    expect(savedArg.version).toBe(5);
    expect(savedArg.status).toBe("final");
    expect(savedArg.title).toBe("Senior Software Engineer");
    expect(savedArg.content.summary).toBe("New summary");
    // The route explicitly updates the score based on the new audit, not from the payload
    expect(savedArg.score.overall).toBe(85);
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
