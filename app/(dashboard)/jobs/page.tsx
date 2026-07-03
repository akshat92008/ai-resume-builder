import { redirect } from "next/navigation";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { JobsClient } from "./JobsClient";

export default async function JobTrackerPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) {
    redirect("/login");
  }

  const jobs = await listJobApplications(auth.user.id);

  return <JobsClient initialJobs={jobs} />;
}
