import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { NextRequest, NextResponse } from "next/server";
import { deleteAdminTestimonialServer } from "@/lib/data/admin/admin-actions";
import { adminTestimonialDeleteSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const { id } = adminTestimonialDeleteSchema.parse(await req.json());
    await deleteAdminTestimonialServer(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
