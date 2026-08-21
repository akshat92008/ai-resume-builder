import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(join(process.cwd(), ".github/workflows/core-release.yml"), "utf8");

describe("core production certification status", () => {
  it("has permission to publish an auditable commit status", () => {
    expect(workflow).toContain("statuses: write");
    expect(workflow).toContain("RELEASE_STATUS_CONTEXT: Core Commercial Release Gate");
  });

  it("publishes pending, failure, and success states", () => {
    expect(workflow).toContain('state: "pending"');
    expect(workflow).toContain('state: "failure"');
    expect(workflow).toContain('state: "success"');
  });

  it("links the release status to the exact workflow run", () => {
    expect(workflow).toContain("GITHUB_RUN_ID");
    expect(workflow).toContain("GITHUB_SHA");
    expect(workflow).toContain("statuses/${process.env.GITHUB_SHA}");
  });
});
