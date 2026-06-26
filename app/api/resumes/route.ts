import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { listServerResumes } from "@/lib/careerpath/db";
import { requireAppAccess } from "@/lib/careerpath/auth";

export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const resumes = await listServerResumes();
    return NextResponse.json({ resumes });
  } catch (err) {
    console.error("[api/resumes] Error:", err);
    return NextResponse.json(
      { error: { code: "LIST_FAILED", message: "Unable to load resumes.", recoverable: true } },
      { status: 500 },
    );
  }
}
