import { NextRequest, NextResponse } from "next/server";
import { saveAdminTestimonialServer } from "@/lib/data/admin/admin-actions";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing testimonial id" }, { status: 400 });
    }

    await saveAdminTestimonialServer({ id, approved: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to approve testimonial" }, { status: 500 });
  }
}
