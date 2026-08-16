import type { JobApplication } from "@/lib/careerpath/types";
import type { CareerLoopAnalyticsData, CareerLoopJobApplication, ConversionCohort, ConversionIntelligence, JobSource } from "./types";

const APPLIED_STATUSES = new Set(["applied", "follow_up_needed", "interview", "rejected", "offer", "ghosted"]);
const MIN_LEARNING_SAMPLE = 20;
const MIN_COHORT_SAMPLE = 8;
const HIGH_CONFIDENCE_COHORT_SAMPLE = 20;

export function inferJobSource(jobUrl?: string | null): JobSource {
  if (!jobUrl) return "other";
  try {
    const host = new URL(jobUrl).hostname.toLowerCase();
    if (host.includes("linkedin.")) return "linkedin";
    if (host.includes("indeed.")) return "indeed";
    if (host.includes("glassdoor.")) return "glassdoor";
    return "company_site";
  } catch {
    return "other";
  }
}

function isInterview(job: JobApplication) {
  return job.status === "interview" || job.status === "offer" || Boolean(job.outcome?.gotInterview || job.outcome?.offer);
}

function isOffer(job: JobApplication) {
  return job.status === "offer" || Boolean(job.outcome?.offer);
}

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

/** 95% Wilson score interval for a binomial proportion. */
function wilson(successes: number, total: number) {
  if (total <= 0) return { low: 0, high: 1 };
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

function cohortFromJobs(key: string, label: string, jobs: CareerLoopJobApplication[]): ConversionCohort {
  const interviews = jobs.filter(isInterview).length;
  const offers = jobs.filter(isOffer).length;
  return {
    key,
    label,
    applications: jobs.length,
    interviews,
    offers,
    interviewRate: pct(interviews, jobs.length),
    offerRate: pct(offers, jobs.length),
  };
}

function groupedCohorts(jobs: CareerLoopJobApplication[], keyFor: (job: CareerLoopJobApplication) => [string, string] | null): ConversionCohort[] {
  const groups = new Map<string, { label: string; jobs: CareerLoopJobApplication[] }>();
  for (const job of jobs) {
    const key = keyFor(job);
    if (!key) continue;
    const [groupKey, label] = key;
    const existing = groups.get(groupKey) || { label, jobs: [] };
    existing.jobs.push(job);
    groups.set(groupKey, existing);
  }
  return [...groups.entries()]
    .map(([key, group]) => cohortFromJobs(key, group.label, group.jobs))
    .sort((a, b) => b.applications - a.applications || b.interviewRate - a.interviewRate);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildConversionIntelligence(input: JobApplication[]): ConversionIntelligence {
  const jobs = input as CareerLoopJobApplication[];
  const applied = jobs.filter((job) => APPLIED_STATUSES.has(job.status));
  const interviews = applied.filter(isInterview).length;
  const offers = applied.filter(isOffer).length;

  const byRole = groupedCohorts(applied, (job) => [job.role.trim().toLowerCase(), job.role.trim() || "Unknown role"]);
  const bySource = groupedCohorts(applied, (job) => {
    const source = job.source || inferJobSource(job.jobUrl);
    return [source, titleCase(source)];
  });
  const byResume = groupedCohorts(applied, (job) => {
    if (!job.resumeId) return null;
    const version = job.resumeVersion ? ` v${job.resumeVersion}` : "";
    return [`${job.resumeId}:${job.resumeVersion || 0}`, `Resume${version}`];
  });
  const byFit = groupedCohorts(applied.filter((job) => typeof job.fitScore === "number"), (job) => {
    const score = job.fitScore || 0;
    if (score >= 75) return ["strong", "Strong fit (75–100)"];
    if (score >= 55) return ["mixed", "Mixed fit (55–74)"];
    return ["low", "Low fit (<55)"];
  });

  const recommendations: ConversionIntelligence["recommendations"] = [];
  if (applied.length < MIN_LEARNING_SAMPLE) {
    recommendations.push({
      title: "Build the learning loop",
      explanation: `CareerLoop has ${applied.length} outcome-bearing application${applied.length === 1 ? "" : "s"}. That is not enough evidence to confidently optimize your strategy yet.`,
      action: `Track ${MIN_LEARNING_SAMPLE - applied.length} more applications and update every reply/interview outcome.`,
      confidence: "low",
    });
  }

  const comparable = (cohorts: ConversionCohort[]) => cohorts.filter((cohort) => cohort.applications >= MIN_COHORT_SAMPLE);
  const compareDimension = (cohorts: ConversionCohort[], title: string, actionPrefix: string) => {
    const eligible = comparable(cohorts).sort((a, b) => b.interviewRate - a.interviewRate);
    if (eligible.length < 2) return;
    const best = eligible[0];
    const worst = eligible[eligible.length - 1];
    const rateGap = best.interviewRate - worst.interviewRate;
    if (rateGap < 10) return;

    const bestInterval = wilson(best.interviews, best.applications);
    const worstInterval = wilson(worst.interviews, worst.applications);
    const intervalsSeparated = bestInterval.low > worstInterval.high;
    const minimumSample = Math.min(best.applications, worst.applications);

    // Do not label noisy small-cohort differences as high confidence. Even
    // when the observed percentages look dramatic, uncertainty remains wide.
    const confidence: "low" | "medium" | "high" =
      minimumSample >= HIGH_CONFIDENCE_COHORT_SAMPLE && intervalsSeparated
        ? "high"
        : minimumSample >= MIN_COHORT_SAMPLE
          ? "medium"
          : "low";

    recommendations.push({
      title,
      explanation: `${best.label} has a ${best.interviewRate}% recorded interview rate (${best.interviews}/${best.applications}) versus ${worst.label} at ${worst.interviewRate}% (${worst.interviews}/${worst.applications}). This is observational correlation, not proof that the segment caused the difference.`,
      action: `${actionPrefix} ${best.label} as a limited experiment while continuing to track outcomes before making a permanent strategy change.`,
      confidence,
    });
  };

  // Segment optimization only begins after there is enough overall history to
  // avoid turning early random outcomes into product recommendations.
  if (applied.length >= MIN_LEARNING_SAMPLE) {
    compareDimension(byRole, "Your target roles may be converting differently", "Test focusing more applications on");
    compareDimension(bySource, "Application source may matter for your search", "Test prioritizing");
    compareDimension(byResume, "One resume version may be outperforming another", "Use more of");
    compareDimension(byFit, "Higher-fit applications may be producing different outcomes", "Prioritize");
  }

  const scoredJobs = applied.filter((job) => typeof job.fitScore === "number");
  const lowFitCount = scoredJobs.filter((job) => (job.fitScore || 0) < 55).length;
  if (scoredJobs.length >= 12 && lowFitCount / scoredJobs.length >= 0.4) {
    recommendations.push({
      title: "A large share of effort is going into low-fit roles",
      explanation: `${lowFitCount} of ${scoredJobs.length} scored applications were below 55% fit when submitted.`,
      action: "Test Apply/Skip before tailoring and redirect some time toward stronger evidence-backed opportunities.",
      confidence: scoredJobs.length >= 25 ? "high" : "medium",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      title: "Keep collecting clean outcome data",
      explanation: "No segment has enough reliable separation yet to justify a strategy change.",
      action: "Continue targeted applications and update statuses consistently so CareerLoop can learn from your real outcomes.",
      confidence: "low",
    });
  }

  return {
    northStar: {
      applications: applied.length,
      interviews,
      offers,
      interviewRate: pct(interviews, applied.length),
      offerRate: pct(offers, applied.length),
    },
    cohorts: { byRole, bySource, byResume, byFit },
    recommendations: recommendations.slice(0, 5),
    learningStatus: {
      enoughData: applied.length >= MIN_LEARNING_SAMPLE,
      minimumApplications: MIN_LEARNING_SAMPLE,
      applicationsNeeded: Math.max(0, MIN_LEARNING_SAMPLE - applied.length),
      message: applied.length >= MIN_LEARNING_SAMPLE
        ? `CareerLoop has enough baseline outcomes to begin cautious segment experiments. Cohorts still need at least ${MIN_COHORT_SAMPLE} observations each, and recommendations remain observational rather than causal.`
        : `Track ${Math.max(0, MIN_LEARNING_SAMPLE - applied.length)} more outcome-bearing applications to unlock strategy comparisons.`,
    },
  };
}

export function buildCareerLoopAnalyticsData(input: JobApplication[]): CareerLoopAnalyticsData {
  const jobs = input as CareerLoopJobApplication[];
  const totalApplications = jobs.filter((job) => APPLIED_STATUSES.has(job.status)).length;
  const interviews = jobs.filter((job) => APPLIED_STATUSES.has(job.status) && isInterview(job)).length;
  const offers = jobs.filter((job) => APPLIED_STATUSES.has(job.status) && isOffer(job)).length;
  const rejections = jobs.filter((job) => job.status === "rejected" || job.outcome?.rejected).length;

  const timeSeriesData: CareerLoopAnalyticsData["charts"]["timeSeriesData"] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const iso = date.toISOString().split("T")[0];
    timeSeriesData.push({
      date: iso.substring(5),
      applications: jobs.filter((job) => job.appliedAt?.startsWith(iso)).length,
    });
  }

  const statusData = [
    { name: "Saved", value: jobs.filter((job) => job.status === "saved").length, fill: "#cbd5e1" },
    { name: "Applied", value: jobs.filter((job) => job.status === "applied").length, fill: "#60a5fa" },
    { name: "Interviewing", value: jobs.filter((job) => job.status === "interview").length, fill: "#fbbf24" },
    { name: "Offered", value: jobs.filter((job) => job.status === "offer").length, fill: "#34d399" },
    { name: "Rejected", value: jobs.filter((job) => job.status === "rejected").length, fill: "#f87171" },
  ].filter((item) => item.value > 0);

  return {
    stats: {
      totalSaved: jobs.filter((job) => job.status === "saved").length,
      totalApplications,
      interviews,
      offers,
      rejections,
      interviewRate: Math.round(pct(interviews, totalApplications)),
      offerRate: Math.round(pct(offers, interviews)),
    },
    charts: {
      funnelData: [
        { name: "Applied", value: totalApplications },
        { name: "Interview", value: interviews },
        { name: "Offer", value: offers },
      ],
      timeSeriesData,
      statusData,
    },
    conversionIntelligence: buildConversionIntelligence(jobs),
  };
}
