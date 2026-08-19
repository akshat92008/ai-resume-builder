import { describe, expect, it } from "vitest";
import { sanitizeLogContext, sanitizeLogValue } from "@/lib/observability/logger";

describe("production log sanitization", () => {
  it("redacts sensitive keys recursively", () => {
    const result = sanitizeLogContext({
      requestId: "req_123",
      authorization: "Bearer top-secret",
      nested: {
        password: "hunter2",
        payload: { private: "resume contents" },
        safeCount: 4,
      },
    });

    expect(result.requestId).toBe("req_123");
    expect(result.authorization).toBe("[REDACTED]");
    expect(result.nested).toEqual({
      password: "[REDACTED]",
      payload: "[REDACTED]",
      safeCount: 4,
    });
  });

  it("redacts common secrets and email addresses in free-form strings", () => {
    const result = sanitizeLogValue(
      "Contact person@example.com using Bearer abc.def.ghi and secret_testcredential123",
    );

    expect(result).not.toContain("person@example.com");
    expect(result).not.toContain("abc.def.ghi");
    expect(result).not.toContain("secret_testcredential123");
    expect(result).toContain("[REDACTED_EMAIL]");
  });

  it("truncates unexpectedly large strings", () => {
    const result = sanitizeLogValue("x".repeat(5_000));
    expect(typeof result).toBe("string");
    expect((result as string).length).toBeLessThan(2_100);
    expect(result).toContain("[TRUNCATED]");
  });
});
