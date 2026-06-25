import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { NextRequest, NextResponse } from "next/server";
import { saveAdminTestimonialServer } from "@/lib/data/admin/admin-actions";
import { testimonialSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const rawData = await req.json();
    const testimonial = testimonialSchema.parse(rawData);
    const data = await saveAdminTestimonialServer(testimonial);
    return NextResponse.json({ success: true, testimonial: data });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: "Validation failed." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Unable to save testimonial." }, { status: 400 });
  }
}
