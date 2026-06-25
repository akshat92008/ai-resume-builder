import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { NextRequest, NextResponse } from "next/server";
import { deleteAdminTestimonialServer } from "@/lib/data/admin/admin-actions";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing testimonial id" }, { status: 400 });
    }

    await deleteAdminTestimonialServer(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reject testimonial" }, { status: 500 });
  }
}
