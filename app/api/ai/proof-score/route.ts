import { NextRequest, NextResponse } from "next/server";
import { analyzeProofScoreSubmission } from "@/lib/ai/nim";
import { proofScoreSubmissionSchema } from "@/lib/validations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const submission = proofScoreSubmissionSchema.parse(await req.json());
    const result = await analyzeProofScoreSubmission(submission);
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      await supabase.from("proof_score_submissions").insert({
        ...submission,
        result_json: result,
        score: result.total,
        source: submission.source || "proof-score-page",
      });
      await supabase.from("leads").insert({
        type: "proof_score",
        name: submission.name,
        email: submission.email,
        whatsapp: submission.whatsapp,
        course: submission.course,
        college: submission.college,
        role: submission.target_role,
        source: submission.source || "proof-score-page",
        metadata: { score: result.total, grade: result.grade },
        status: "new",
      });
    }

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "Enter your contact details and at least a short resume/project summary." }, { status: 400 });
  }
}
