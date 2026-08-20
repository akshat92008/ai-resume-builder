import { describe, expect, it } from "vitest";
import { z } from "zod";
import { RequestBodyError, readBytesLimited, readJsonLimited } from "../../lib/http/request";

function streamedRequest(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    // Node's fetch implementation requires duplex for a streaming request body.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("bounded request bodies", () => {
  const schema = z.object({ message: z.string().max(20) }).strict();

  it("rejects an oversized streamed JSON body without relying on Content-Length", async () => {
    const request = streamedRequest(["{\"message\":\"", "x".repeat(64), "\"}"]);
    const result = await readJsonLimited(request, 32, schema);
    expect(result).toEqual({ ok: false, code: "PAYLOAD_TOO_LARGE" });
  });

  it("rejects an oversized raw streamed body before full buffering", async () => {
    const request = streamedRequest(["a".repeat(20), "b".repeat(20), "c".repeat(20)]);
    await expect(readBytesLimited(request, 32)).rejects.toMatchObject({
      name: "RequestBodyError",
      code: "PAYLOAD_TOO_LARGE",
    } satisfies Partial<RequestBodyError>);
  });

  it("preserves exact bounded raw bytes", async () => {
    const encoder = new TextEncoder();
    const raw = "{\"event\":\"subscription.active\",\"unicode\":\"✓\"}";
    const request = streamedRequest([raw.slice(0, 12), raw.slice(12)]);
    const bytes = await readBytesLimited(request, 256);
    expect(Array.from(bytes)).toEqual(Array.from(encoder.encode(raw)));
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: "{not-json",
    });
    const result = await readJsonLimited(request, 100, schema);
    expect(result).toEqual({ ok: false, code: "INVALID_JSON" });
  });

  it("rejects unknown top-level fields when a strict schema is supplied", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: JSON.stringify({ message: "hello", admin: true }),
    });
    const result = await readJsonLimited(request, 100, schema);
    expect(result).toEqual({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("returns validated data for a bounded valid body", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
    });
    const result = await readJsonLimited(request, 100, schema);
    expect(result).toEqual({ ok: true, data: { message: "hello" } });
  });
});
