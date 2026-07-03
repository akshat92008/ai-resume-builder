import { redirect } from "next/navigation";
import { AnalyticsClient } from "./AnalyticsClient";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications } from "@/lib/careerpath/db-jobs";

export default async function AnalyticsPage() {
  const auth = await requireAppAccess();
  if (!auth.ok) {
    redirect("/login");
  }

  const user = auth.user;
  const jobs = await listJobApplications(user.id);
  
  const totalApplications = jobs.filter(j => j.status !== 'saved').length;
  const interviews = jobs.filter(j => j.status === 'interview' || j.stage?.toLowerCase().includes('interview')).length;
  const offers = jobs.filter(j => j.status === 'offer').length;
  const rejections = jobs.filter(j => j.status === 'rejected').length;

  const interviewRate = totalApplications > 0 ? (interviews / totalApplications) * 100 : 0;
  const offerRate = interviews > 0 ? (offers / interviews) * 100 : 0;

  const funnelData = [
    { name: "Applied", value: totalApplications },
    { name: "Interview", value: interviews },
    { name: "Offer", value: offers },
  ];

  const timeSeriesData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const appsOnDate = jobs.filter(j => j.appliedAt && j.appliedAt.startsWith(dateStr)).length;
    timeSeriesData.push({
      date: dateStr.substring(5),
      applications: appsOnDate
    });
  }

  const statusData = [
    { name: "Saved", value: jobs.filter(j => j.status === 'saved').length, fill: "#cbd5e1" },
    { name: "Applied", value: jobs.filter(j => j.status === 'applied').length, fill: "#60a5fa" },
    { name: "Interviewing", value: jobs.filter(j => j.status === 'interview').length, fill: "#fbbf24" },
    { name: "Offered", value: jobs.filter(j => j.status === 'offer').length, fill: "#34d399" },
    { name: "Rejected", value: jobs.filter(j => j.status === 'rejected').length, fill: "#f87171" },
  ].filter(d => d.value > 0);

  const data = {
    stats: {
      totalSaved: jobs.filter(j => j.status === 'saved').length,
      totalApplications,
      interviews,
      offers,
      rejections,
      interviewRate: Math.round(interviewRate),
      offerRate: Math.round(offerRate),
    },
    charts: {
      funnelData,
      timeSeriesData,
      statusData
    }
  };

  return <AnalyticsClient data={data} />;
}
