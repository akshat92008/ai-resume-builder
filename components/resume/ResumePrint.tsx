import type { ResumeContent } from "@/lib/types";
import { ResumePreview } from "./ResumePreview";

export function ResumePrint({ content }: { content: ResumeContent }) {
  return <ResumePreview content={content} />;
}
