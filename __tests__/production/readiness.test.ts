import { describe, expect, it } from "vitest";
import { getEntitlementsForPlan } from "@/lib/careerpath/entitlements";
import { CreateJobApplicationSchema, UpdateJobApplicationSchema } from "@/lib/careerpath/job-validation";

describe("production entitlements", () => {
  it("keeps free usage deliberately constrained", () => {
    const free = getEntitlementsForPlan("free");
    expect(free.aiActionsPerDay).toBe(3);
    expect(free.tailoringPerDay).toBe(1);
    expect(free.outreachPerDay).toBe(1);
  });
  it("gives pro materially higher server-enforced quotas", () => {
    const free = getEntitlementsForPlan("free");
    const pro = getEntitlementsForPlan("pro");
    expect(pro.aiActionsPerDay).toBeGreaterThan(free.aiActionsPerDay);
    expect(pro.tailoringPerDay).toBeGreaterThan(free.tailoringPerDay);
    expect(pro.outreachPerDay).toBeGreaterThan(free.outreachPerDay);
  });
});

describe("job application validation", () => {
  it("accepts the minimum valid job payload", () => {
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", status: "saved" }).success).toBe(true);
  });
  it("rejects unsupported statuses and unsafe URL schemes", () => {
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", status: "hacked" }).success).toBe(false);
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", jobUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("strips ownership fields from PATCH payloads", () => {
    const parsed = UpdateJobApplicationSchema.parse({ status: "interview", id: "attacker-controlled", userId: "attacker-controlled" });
    expect(parsed).toEqual({ status: "interview" });
  });
});
