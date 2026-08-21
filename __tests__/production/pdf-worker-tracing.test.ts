import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
const atsArtifact = readFileSync(join(root, "lib/careerpath/ats-artifact.ts"), "utf8");

describe("canonical PDF production bundle", () => {
  it("uses the documented pdf-parse Next.js/Vercel runtime dependencies", () => {
    expect(nextConfig).toContain('serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"]');
    expect(nextConfig).not.toContain("outputFileTracingIncludes");
  });

  it("boots pdf-parse through its embedded serverless worker before parsing", () => {
    expect(atsArtifact).toContain('require("pdf-parse/worker")');
    expect(atsArtifact).toContain('const { CanvasFactory, getData }');
    expect(atsArtifact).toContain("PDFParse.setWorker(getData())");
    expect(atsArtifact).toContain("CanvasFactory");
    expect(atsArtifact).toContain('const { PDFParse } = require("pdf-parse")');
    expect(atsArtifact).toContain("await parser.getText()");
    expect(atsArtifact).toContain("await parser.destroy()");
    expect(atsArtifact).not.toContain("class DOMMatrix {}");
    expect(atsArtifact).not.toContain('require("pdf-parse") as (input: Buffer)');
  });
});
