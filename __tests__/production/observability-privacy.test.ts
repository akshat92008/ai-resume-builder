import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/observability/client-error/route";

const validTelemetry = {
  source: "window-error",
  errorName: "TypeError",
  fingerprint: "a".repeat(64),
  route: "/app",
};

describe("browser observability privacy boundary", () => {
  it("rejects raw error messages or other unknown fields", async () => {
    const response = await POST(new Request("https://example.com/api/observability/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validTelemetry, message: "sensitive resume content" }),
    }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects oversized telemetry before any logging path", async () => {
    const response = await POST(new Request("https://example.com/api/observability/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validTelemetry, digest: "x".repeat(5_000) }),
    }));

    expect(response.status).toBe(413);
    const payload = await response.json();
    expect(payload.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
