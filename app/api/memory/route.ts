import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, saveServerResume } from "@/lib/careerpath/db";
import type { CareerProfile } from "@/lib/careerpath/types";
import { randomUUID } from "crypto";

export async function PUT(req: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
    
    const updates = await req.json() as Partial<CareerProfile>;
    
    let resume = await getLatestResumeForUser(userId);
    
    // If no resume exists, we should create a basic one to hold the profile
    if (!resume) {
      resume = {
        id: randomUUID(),
        userId,
        title: "Career Memory",
        targetRole: "Unknown",
        mode: "build",
        status: "draft",
        version: 1,
        content: { header: { name: "User", email: "", phone: "", location: "" } },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    const existingProfile = resume.careerProfile || { skills: [], experience: [], projects: [], achievements: [], gaps: [] };
    
    resume.careerProfile = {
      ...existingProfile,
      ...updates
    };
    
    await saveServerResume(resume);
    
    return NextResponse.json({ success: true, careerProfile: resume.careerProfile });
  } catch (err) {
    console.error("[memory-put] Error:", err);
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
  }
}
