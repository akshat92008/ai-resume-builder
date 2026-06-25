import { NextResponse } from "next/server";
import { listServerResumes } from "@/lib/careerpath/db";

export async function GET() {
  try {
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
