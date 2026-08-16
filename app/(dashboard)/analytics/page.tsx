import { redirect } from "next/navigation";
import { AnalyticsClient } from "./AnalyticsClient";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { buildCareerLoopAnalyticsData } from "@/lib/careerloop/conversion";

export default async function AnalyticsPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) redirect("/login");
  return <AnalyticsClient data={buildCareerLoopAnalyticsData(await listJobApplications(auth.user.id))} />;
}
