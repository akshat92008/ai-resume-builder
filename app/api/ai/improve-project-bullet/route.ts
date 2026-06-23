import { NextRequest, NextResponse } from "next/server";
import { improveProjectBullet } from "@/lib/ai/nim";
import type { Project } from "@/lib/types";
import { projectBulletSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = projectBulletSchema.parse(await req.json());
    const result = await improveProjectBullet(input.project as Project, input.targetRole);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to improve this project bullet." }, { status: 400 });
  }
}
