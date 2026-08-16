import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_RESPONSE_BYTES = 750_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 5;

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function mappedIpv4(address: string): string | null {
  const match = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return match?.[1] || null;
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  const mapped = mappedIpv4(normalized);
  if (mapped) return isPrivateIpv4(mapped);
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("ff");
}

export function validatePublicJobUrl(raw: string): URL {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Job URL must use http or https.");
  if (url.username || url.password) throw new Error("Job URLs with embedded credentials are not allowed.");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private/local URLs are not allowed.");
  }
  if (isIP(host) && isPrivateAddress(host)) throw new Error("Private/local URLs are not allowed.");
  return url;
}

async function assertPublicDns(url: URL) {
  if (isIP(url.hostname)) return;
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("The job URL resolves to a private or unavailable network address.");
  }
}

async function readLimitedBody(response: Response): Promise<string> {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_RESPONSE_BYTES) throw new Error("Job page is too large to analyze safely.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Job page is too large to analyze safely.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findJobPosting(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return record;
  for (const child of Object.values(record)) {
    const found = findJobPosting(child);
    if (found) return found;
  }
  return null;
}

function structuredJobText(html: string): string | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1].trim());
      const job = findJobPosting(parsed);
      if (!job) continue;
      const hiring = job.hiringOrganization as Record<string, unknown> | undefined;
      const location = job.jobLocation as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
      const firstLocation = Array.isArray(location) ? location[0] : location;
      const address = firstLocation?.address as Record<string, unknown> | undefined;
      const text = [
        job.title ? `Title: ${String(job.title)}` : "",
        hiring?.name ? `Company: ${String(hiring.name)}` : "",
        address?.addressLocality ? `Location: ${String(address.addressLocality)}` : "",
        typeof job.description === "string" ? stripHtml(job.description) : "",
        typeof job.qualifications === "string" ? `Qualifications: ${stripHtml(job.qualifications)}` : "",
        typeof job.responsibilities === "string" ? `Responsibilities: ${stripHtml(job.responsibilities)}` : "",
      ].filter(Boolean).join("\n");
      if (text.length >= 120) return text;
    } catch {
      // Ignore malformed JSON-LD and use visible page text instead.
    }
  }
  return null;
}

async function fetchPublicPage(start: URL, signal: AbortSignal): Promise<{ response: Response; finalUrl: URL }> {
  let current = start;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await assertPublicDns(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal,
      headers: {
        "user-agent": "CareerOS-JobAnalyzer/1.0 (+https://amauralabs.com)",
        accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      if (redirect === MAX_REDIRECTS) throw new Error("Job page redirected too many times.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Job page returned an invalid redirect.");
      current = validatePublicJobUrl(new URL(location, current).toString());
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error("Job page redirected too many times.");
}

export async function extractJobTextFromUrl(rawUrl: string): Promise<{ text: string; finalUrl: string }> {
  const url = validatePublicJobUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { response, finalUrl } = await fetchPublicPage(url, controller.signal);
    if (!response.ok) throw new Error(`Job page returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) throw new Error("Job URL did not return a readable web page.");
    const html = await readLimitedBody(response);
    const text = structuredJobText(html) || stripHtml(html);
    if (text.length < 120) throw new Error("Could not extract enough job-description text. Paste the job description instead.");
    return { text: text.slice(0, 50_000), finalUrl: finalUrl.toString() };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Job page timed out. Paste the job description instead.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
