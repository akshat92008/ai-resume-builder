import { redirect } from "next/navigation";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, listServerResumeSummaries } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) {
    redirect("/login");
  }
  
  const userId = auth.user.id;
  
  const [resume, resumes] = await Promise.all([
    getLatestResumeForUser(userId),
    listServerResumeSummaries()
  ]);

  const workspace = buildCareerWorkspaceState(resume);

  return (
    <DashboardClient 
      initialResumes={resumes} 
      initialWorkspace={workspace} 
    />
  );
}
