import { z } from "zod";

const IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "forwarded",
] as const;

function normalizeForwardedValue(header: string, value: string) {
  if (header === "forwarded") {
    const match = value.match(/for="?([^;,\"]+)/i);
    return match?.[1] || "";
  }

  return value.split(",")[0]?.trim() || "";
}

export function getClientIp(request: Request) {
  for (const header of IP_HEADERS) {
    const rawValue = request.headers.get(header);
    if (!rawValue) continue;

    const candidate = normalizeForwardedValue(header, rawValue)
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .trim();

    if (/^[a-f0-9:.]+$/i.test(candidate)) {
      return candidate;
    }
  }

  return "unknown";
}

export class RequestBodyError extends Error {
  constructor(
    public readonly code: "PAYLOAD_TOO_LARGE" | "INVALID_JSON",
    message: string,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export type LimitedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "PAYLOAD_TOO_LARGE" | "INVALID_JSON" | "VALIDATION_ERROR" };

/**
 * Streams the exact request bytes through a hard cap. This is suitable for
 * signed webhook bodies because the caller can verify the signature over the
 * original bytes without first buffering an unbounded request.
 */
export async function readBytesLimited(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declaredLengthHeader = request.headers.get("content-length");
  if (declaredLengthHeader) {
    const declaredLength = Number(declaredLengthHeader);
    if (!Number.isFinite(declaredLength) || declaredLength < 0) {
      throw new RequestBodyError("PAYLOAD_TOO_LARGE", "Request payload length is invalid.");
    }
    if (declaredLength > maxBytes) {
      throw new RequestBodyError("PAYLOAD_TOO_LARGE", "Request payload is too large.");
    }
  }

  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("payload-too-large").catch(() => undefined);
        throw new RequestBodyError("PAYLOAD_TOO_LARGE", "Request payload is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function readTextLimited(request: Request, maxBytes: number): Promise<string> {
  const bytes = await readBytesLimited(request, maxBytes);
  return new TextDecoder().decode(bytes);
}

async function readRawJson<T = unknown>(request: Request, maxBytes: number): Promise<T> {
  const raw = await readTextLimited(request, maxBytes);
  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    throw new RequestBodyError("INVALID_JSON", "Request body must be valid JSON.");
  }
}

/**
 * Reads JSON through a streaming byte cap so a missing or dishonest
 * Content-Length header cannot cause the server to buffer an unbounded body.
 * With a schema, parsing and validation are returned as a discriminated result
 * so routes cannot accidentally skip validation after enforcing the size cap.
 */
export async function readJsonLimited<T = unknown>(request: Request, maxBytes?: number): Promise<T>;
export async function readJsonLimited<S extends z.ZodTypeAny>(
  request: Request,
  maxBytes: number,
  schema: S,
): Promise<LimitedJsonResult<z.infer<S>>>;
export async function readJsonLimited<S extends z.ZodTypeAny>(
  request: Request,
  maxBytes = 50_000,
  schema?: S,
): Promise<unknown> {
  try {
    const json = await readRawJson<unknown>(request, maxBytes);
    if (!schema) return json;
    const parsed = schema.safeParse(json);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    return { ok: true, data: parsed.data };
  } catch (error) {
    if (schema && error instanceof RequestBodyError) {
      return { ok: false, code: error.code };
    }
    throw error;
  }
}
