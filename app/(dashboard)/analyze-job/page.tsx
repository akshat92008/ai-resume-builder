import { redirect } from "next/navigation";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { JobAnalyzerClient } from "./JobAnalyzerClient";

export default async function AnalyzeJobPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) redirect("/login");
  return <JobAnalyzerClient />;
}
