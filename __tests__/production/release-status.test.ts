import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github/workflows/core-release.yml"), "utf8");
const publisher = readFileSync(join(root, "scripts/publish-release-status.mjs"), "utf8");

describe("core production certification status", () => {
  it("has permission to publish an auditable commit status", () => {
    expect(workflow).toContain("statuses: write");
    expect(workflow).toContain("RELEASE_STATUS_CONTEXT: Core Commercial Release Gate");
  });

  it("publishes pending, failure, and success states through the runtime-safe helper", () => {
    expect(workflow).toContain("node scripts/publish-release-status.mjs pending");
    expect(workflow).toContain("node scripts/publish-release-status.mjs failure");
    expect(workflow).toContain("node scripts/publish-release-status.mjs success");
    expect(publisher).toContain('pending: "Exact-production certification is running"');
    expect(publisher).toContain('failure: "Exact-production certification failed"');
    expect(publisher).toContain('success: "Exact-production certification passed"');
  });

  it("links the release status to the exact commit and workflow run", () => {
    expect(publisher).toContain("GITHUB_RUN_ID");
    expect(publisher).toContain("GITHUB_SHA");
    expect(publisher).toContain("statuses/${process.env.GITHUB_SHA}");
  });

  it("fails closed when the status publisher is missing required GitHub context", () => {
    expect(publisher).toContain("Missing release status environment");
    expect(publisher).toContain("process.exitCode = 1");
  });
});
