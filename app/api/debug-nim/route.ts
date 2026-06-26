import { NextResponse } from "next/server";
import { getAiClient, getModel, GapReportSchema } from "@/lib/careerpath/llm";
import { zodResponseFormat } from "openai/helpers/zod";

export async function GET() {
  try {
    const openai = getAiClient();
    const model = getModel();

    const jsonSchema = zodResponseFormat(GapReportSchema, "gap_report").json_schema.schema;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Return a dummy gap report.",
        },
        {
          role: "user",
          content: "Profile is totally empty.",
        },
      ],
      extra_body: { nvext: { guided_json: jsonSchema } },
    } as any);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from NIM");
    }

    const parsed = JSON.parse(content);
    const result = GapReportSchema.safeParse(parsed);

    return NextResponse.json({
      success: true,
      raw: parsed,
      validated: result.success,
      errors: result.error?.issues,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
