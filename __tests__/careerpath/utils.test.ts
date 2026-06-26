import { describe, it, expect } from "vitest";
import { safeNextPath } from "../../lib/utils";

describe("utils", () => {
  describe("safeNextPath", () => {
    it("returns /app for missing, invalid, or empty paths", () => {
      expect(safeNextPath(null)).toBe("/app");
      expect(safeNextPath("")).toBe("/app");
      expect(safeNextPath("dashboard")).toBe("/app");
      expect(safeNextPath("https://evil.com")).toBe("/app");
    });

    it("returns /app for protocol-relative paths", () => {
      expect(safeNextPath("//evil.com")).toBe("/app");
      expect(safeNextPath("///evil.com")).toBe("/app");
    });

    it("preserves valid internal paths", () => {
      expect(safeNextPath("/app")).toBe("/app");
      expect(safeNextPath("/app?mode=improve")).toBe("/app?mode=improve");
      expect(safeNextPath("/resume/123-456")).toBe("/resume/123-456");
      expect(safeNextPath("/")).toBe("/");
    });
  });
});
