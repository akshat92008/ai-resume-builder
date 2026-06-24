import { NextRequest, NextResponse } from "next/server";
import { saveAdminTestimonialServer } from "@/lib/data/admin/admin-actions";

export async function POST(req: NextRequest) {
  try {
    const testimonial = await req.json();
    const data = await saveAdminTestimonialServer(testimonial);
    return NextResponse.json({ success: true, testimonial: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
