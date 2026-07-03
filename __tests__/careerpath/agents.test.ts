import { createId, createBuilderSession } from "../../lib/careerpath/agents";

// Polyfill for crypto in Node.js environment if needed
if (typeof crypto === "undefined") {
  global.crypto = require("crypto");
}

describe("CareerPath Agents Utils", () => {
  it("should generate a valid UUID", () => {
    const id = createId();
    // Valid UUID v4 check
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("should create a builder session with correct initial state", () => {
    const session = createBuilderSession("test-user-id", "build", "Software Engineer");
    expect(session.id).toBeDefined();
    expect(session.userId).toBe("test-user-id");
    expect(session.mode).toBe("build");
    expect(session.targetRole).toBe("Software Engineer");
    expect(session.currentStep).toBe("collect_profile");
    expect(session.messages.length).toBe(1);
    expect(session.messages[0].role).toBe("assistant");
  });

  it("should not contain hardcoded demo user id", () => {
    const session = createBuilderSession("real-user-123", "build", "Frontend Developer");
    expect(session.userId).toBe("real-user-123");
    expect(session.profile.userId).toBe("real-user-123");
    // Ensure the old hardcoded value is nowhere
    expect(JSON.stringify(session)).not.toContain("careerpath-demo-user");
  });
});
