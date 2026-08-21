import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, ResumeConflictError, saveServerResume } from "@/lib/careerpath/db";
import type { CareerProfile } from "@/lib/careerpath/types";
import { createEmptyResumeContent } from "@/lib/careerpath/resume-content-normalization";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

export const runtime = "edge";

const MAX_BODY_BYTES = 100_000;
const EditableCareerProfileSchema = z.object({
  personal: z.record(z.string(), z.unknown()).optional(),
  target: z.record(z.string(), z.unknown()).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  education: z.array(z.unknown()).max(100).optional(),
  experience: z.array(z.unknown()).max(100).optional(),
  projects: z.array(z.unknown()).max(100).optional(),
  skills: z.array(z.unknown()).max(300).optional(),
  certifications: z.array(z.unknown()).max(100).optional(),
  achievements: z.array(z.unknown()).max(200).optional(),
  documents: z.array(z.unknown()).max(100).optional(),
  links: z.array(z.unknown()).max(100).optional(),
  // rawInputs is deliberately not client-editable. The server appends the exact
  // authenticated manual mutation below so provenance history cannot be forged.
  gaps: z.array(z.unknown()).max(200).optional(),
  strengths: z.array(z.unknown()).max(200).optional(),
  weaknesses: z.array(z.unknown()).max(200).optional(),
}).strict();

export async function PUT(req: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const rateLimit = await checkRateLimit(userId, getClientIp(req), "memory_update", 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many memory updates. Please try again later.", recoverable: true } },
        { status: 429 },
      );
    }

    const parsed = await readJsonLimited(req, MAX_BODY_BYTES, EditableCareerProfileSchema);
    if (!parsed.ok) {
      const status = parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      const message = parsed.code === "PAYLOAD_TOO_LARGE"
        ? "Career Memory updates must be 100 KB or smaller."
        : "One or more Career Memory fields are invalid.";
      return NextResponse.json({ error: { code: parsed.code, message } }, { status });
    }

    let resume = await getLatestResumeForUser(userId);
    const existingResume = resume;
    const expectedVersion = existingResume?.version;
    const now = new Date().toISOString();
    if (!resume) {
      resume = {
        id: crypto.randomUUID(),
        userId,
        title: "Career Memory",
        targetRole: "Unknown",
        mode: "build",
        status: "draft",
        version: 1,
        content: createEmptyResumeContent("User"),
        createdAt: now,
        updatedAt: now,
      };
    }

    const existingProfile = resume.careerProfile || {
      id: crypto.randomUUID(),
      userId,
      personal: {},
      target: { targetRoles: [], targetIndustries: [], targetLocations: [] },
      preferences: {},
      education: [], experience: [], projects: [], skills: [], certifications: [], achievements: [],
      documents: [], links: [], rawInputs: [], gaps: [], strengths: [], weaknesses: [],
      createdAt: now,
      updatedAt: now,
    };

    const manualEvidence = {
      id: crypto.randomUUID(),
      content: JSON.stringify(parsed.data),
      source: "manual" as const,
      createdAt: now,
    };

    resume.careerProfile = {
      ...existingProfile,
      ...parsed.data,
      rawInputs: [...(existingProfile.rawInputs || []), manualEvidence].slice(-200),
      id: existingProfile.id || crypto.randomUUID(),
      userId,
      createdAt: existingProfile.createdAt || now,
      updatedAt: now,
    } as CareerProfile;
    resume.updatedAt = now;
    if (expectedVersion !== undefined) resume.version = expectedVersion + 1;

    await saveServerResume(
      resume,
      userId,
      expectedVersion !== undefined ? { expectedVersion } : {},
    );
    return NextResponse.json({ success: true, careerProfile: resume.careerProfile, resumeVersion: resume.version });
  } catch (error) {
    if (error instanceof ResumeConflictError) {
      return NextResponse.json(
        { error: { code: "RESUME_CONFLICT", message: "Career Memory changed while your update was being saved. Reload and retry.", recoverable: true } },
        { status: 409 },
      );
    }
    logger.error("[memory-put] Failed to update career memory", { error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update Career Memory." } },
      { status: 500 },
    );
  }
}
