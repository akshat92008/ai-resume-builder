import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
const atsArtifact = readFileSync(join(root, "lib/careerpath/ats-artifact.ts"), "utf8");

describe("canonical PDF production bundle", () => {
  it("ships the lazy pdf-parse worker required by the Vercel PDF route", () => {
    expect(nextConfig).toContain('serverExternalPackages: ["pdf-parse"]');
    expect(nextConfig).toContain('"/api/resume/[id]/pdf"');
    expect(nextConfig).toContain('"./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs"');
  });

  it("keeps canonical PDF verification on the real pdf-parse v2 parser", () => {
    expect(atsArtifact).toContain('const { PDFParse } = require("pdf-parse")');
    expect(atsArtifact).toContain("await parser.getText()");
    expect(atsArtifact).toContain("await parser.destroy()");
    expect(atsArtifact).not.toContain('require("pdf-parse") as (input: Buffer)');
  });
});
