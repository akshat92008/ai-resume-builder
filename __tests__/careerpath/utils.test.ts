import { describe, it, expect } from "vitest";
import { safeNextPath } from "../../lib/utils";

describe("utils", () => {
  describe("safeNextPath", () => {
    it("returns /dashboard for missing, invalid, or empty paths", () => {
      expect(safeNextPath(null)).toBe("/dashboard");
      expect(safeNextPath("")).toBe("/dashboard");
      expect(safeNextPath("dashboard")).toBe("/dashboard");
      expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    });

    it("returns /dashboard for protocol-relative paths", () => {
      expect(safeNextPath("//evil.com")).toBe("/dashboard");
      expect(safeNextPath("///evil.com")).toBe("/dashboard");
    });

    it("preserves valid internal paths", () => {
      expect(safeNextPath("/builder")).toBe("/builder");
      expect(safeNextPath("/builder?mode=improve")).toBe("/builder?mode=improve");
      expect(safeNextPath("/resume/123-456")).toBe("/resume/123-456");
      expect(safeNextPath("/")).toBe("/");
    });
  });
});
