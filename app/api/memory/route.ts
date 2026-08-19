import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, saveServerResume } from "@/lib/careerpath/db";
import type { CareerProfile } from "@/lib/careerpath/types";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
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
  rawInputs: z.array(z.unknown()).max(200).optional(),
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

    const raw = await req.text().catch(() => "");
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Career Memory updates must be 100 KB or smaller." } },
        { status: 413 },
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Provide a valid JSON object." } },
        { status: 400 },
      );
    }

    const parsed = EditableCareerProfileSchema.safeParse(decoded);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "One or more Career Memory fields are invalid." } },
        { status: 400 },
      );
    }

    let resume = await getLatestResumeForUser(userId);
    if (!resume) {
      resume = {
        id: crypto.randomUUID(),
        userId,
        title: "Career Memory",
        targetRole: "Unknown",
        mode: "build",
        status: "draft",
        version: 1,
        content: { header: { name: "User", email: "", phone: "", location: "", links: {} } } as unknown as import("@/lib/careerpath/types").CareerPathResumeContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    resume.careerProfile = {
      ...existingProfile,
      ...parsed.data,
      id: existingProfile.id || crypto.randomUUID(),
      userId,
      createdAt: existingProfile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as CareerProfile;
    resume.updatedAt = new Date().toISOString();

    await saveServerResume(resume, userId);
    return NextResponse.json({ success: true, careerProfile: resume.careerProfile });
  } catch (error) {
    logger.error("[memory-put] Failed to update career memory", { error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update Career Memory." } },
      { status: 500 },
    );
  }
}
