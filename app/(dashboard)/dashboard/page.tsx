import { redirect } from "next/navigation";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, listServerResumeSummaries } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) redirect("/login");
  const userId = auth.user.id;
  const [resume, resumes, applications] = await Promise.all([
    getLatestResumeForUser(userId),
    listServerResumeSummaries(),
    listJobApplications(userId),
  ]);
  const workspace = buildCareerWorkspaceState(resume ? { ...resume, applications } : null);
  return <DashboardClient initialResumes={resumes} initialWorkspace={workspace} />;
}
