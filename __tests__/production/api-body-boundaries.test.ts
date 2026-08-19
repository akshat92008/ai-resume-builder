import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const API_ROOT = join(process.cwd(), "app", "api");
const ALLOWED_DIRECT_BODY_READS = new Set([
  // Multipart parsing is preceded by an explicit Content-Length boundary and
  // followed by an actual File.size check in this route.
  "app/api/extract-pdf/route.ts",
  // Webhook signature verification requires the exact raw provider body; this
  // route applies declared and actual byte limits before processing it.
  "app/api/razorpay/webhook/route.ts",
]);

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? routeFiles(path) : path.endsWith("route.ts") ? [path] : [];
  });
}

describe("API request-body boundaries", () => {
  it("does not introduce direct json/text/formData reads outside reviewed raw-body routes", () => {
    const violations = routeFiles(API_ROOT).flatMap((file) => {
      const path = relative(process.cwd(), file).replaceAll("\\", "/");
      if (ALLOWED_DIRECT_BODY_READS.has(path)) return [];
      const source = readFileSync(file, "utf8");
      const directRead = /\b(?:request|req)\.(?:json|text|formData)\s*\(/.test(source);
      return directRead ? [path] : [];
    });

    expect(violations).toEqual([]);
  });
});
