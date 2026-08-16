import type { CareerProfile, JobDescription, KeywordRanking, ProofLevel } from "@/lib/careerpath/types";
import { analyzeJobIntelligence } from "@/lib/careerpath/domain/jobs";
import { buildCareerEvidenceGraph, findEvidenceForRequirement } from "./evidence";
import type { CareerLoopJobIntelligenceReport, RequirementEvidence } from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function proofRank(level: ProofLevel | undefined): number {
  return ({ risky: 0, weak: 1, estimated: 2, strong: 3, verified: 4 } as Record<ProofLevel, number>)[level || "weak"];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function seniorityScore(job: JobDescription, profile: CareerProfile): number {
  if (!job.seniority) return 80;
  const candidate = profile.target.experienceLevel || "student";
  const rank: Record<string, number> = { student: 0, fresher: 1, intern: 1, junior: 2, mid: 3, senior: 4, career_switcher: 2 };
  const required = job.seniority === "senior" ? 4 : job.seniority === "junior" ? 2 : job.seniority === "intern" ? 1 : 2;
  const delta = (rank[candidate] ?? 1) - required;
  if (delta >= 0) return 100;
  if (delta === -1) return 65;
  return 25;
}

function importanceFor(keyword: string, ranking: KeywordRanking[]): RequirementEvidence["importance"] {
  return ranking.find((item) => item.keyword.toLowerCase() === keyword.toLowerCase())?.importance || "medium";
}

export function analyzeCareerLoopJob(job: JobDescription, profile: CareerProfile): CareerLoopJobIntelligenceReport {
  const base = analyzeJobIntelligence(job, profile);
  const graph = buildCareerEvidenceGraph(profile);
  const requirements = unique([
    ...job.requiredTools,
    ...base.keywordRanking.filter((item) => item.importance === "critical" || item.importance === "high").map((item) => item.keyword),
    ...job.extractedSkills.slice(0, 10),
  ]).slice(0, 16);

  const requirementEvidence: RequirementEvidence[] = requirements.map((requirement) => {
    const matches = findEvidenceForRequirement(graph, requirement);
    const inMemory = profile.skills.some((skill) => skill.name.toLowerCase() === requirement.toLowerCase());
    const bestProof = matches.sort((a, b) => proofRank(b.proofLevel) - proofRank(a.proofLevel))[0]?.proofLevel;
    const status: RequirementEvidence["status"] =
      matches.some((match) => proofRank(match.proofLevel) >= proofRank("strong"))
        ? "verified"
        : matches.length || inMemory
          ? "supported"
          : "missing";
    return {
      requirement,
      importance: importanceFor(requirement, base.keywordRanking),
      status,
      proofLevel: bestProof,
      evidence: matches.flatMap((match) => [match.label, ...match.evidence, ...match.urls]).slice(0, 4),
    };
  });

  const skills = Math.round((base.matchedSkills.length / Math.max(1, job.keywords.length)) * 100);
  const highValueRequirements = requirementEvidence.filter((item) => item.importance === "critical" || item.importance === "high");
  const evidence = Math.round((highValueRequirements.filter((item) => item.status !== "missing").length / Math.max(1, highValueRequirements.length)) * 100);
  const experience = job.requiredExperience ? (profile.experience.length ? 85 : 20) : profile.experience.length ? 90 : profile.projects.length ? 70 : 45;
  const seniority = seniorityScore(job, profile);
  const fitPercentage = clamp(Math.round(skills * 0.35 + evidence * 0.3 + experience * 0.2 + seniority * 0.15));

  const criticalMissing = requirementEvidence.filter((item) => item.importance === "critical" && item.status === "missing");
  const highMissing = requirementEvidence.filter((item) => item.importance === "high" && item.status === "missing");
  const riskFlags = unique([
    ...(criticalMissing.length ? [`Missing ${criticalMissing.length} critical requirement${criticalMissing.length === 1 ? "" : "s"}: ${criticalMissing.slice(0, 3).map((item) => item.requirement).join(", ")}`] : []),
    ...(job.requiredExperience && profile.experience.length === 0 ? [`Role asks for ${job.requiredExperience}, but Career Twin has no formal experience evidence.`] : []),
    ...(seniority < 50 ? ["Target seniority appears above the evidence currently stored in Career Twin."] : []),
    ...(graph.stats.evidenceCoverage < 45 ? ["Career Twin evidence coverage is low; add GitHub, deployed work, metrics, or credential proof before relying on this fit score."] : []),
  ]);

  const recommendation: CareerLoopJobIntelligenceReport["recommendation"] =
    fitPercentage >= 75 && criticalMissing.length <= 1
      ? "apply"
      : fitPercentage >= 55 && criticalMissing.length <= 2
        ? "consider"
        : "skip";

  const recommendationReason =
    recommendation === "apply"
      ? `Strong evidence-backed fit (${fitPercentage}%). ${criticalMissing.length ? "One critical gap should be addressed honestly before applying." : "No major evidence blocker was found."}`
      : recommendation === "consider"
        ? `Mixed fit (${fitPercentage}%). Verify ${[...criticalMissing, ...highMissing].slice(0, 2).map((item) => item.requirement).join(" and ") || "the remaining gaps"} before spending time on the application.`
        : `Low evidence-backed fit (${fitPercentage}%). Your time is likely better spent on roles that match more of your proven experience.`;

  return {
    ...base,
    fitPercentage,
    recommendation,
    recommendationReason,
    requirementEvidence,
    fitBreakdown: { skills, evidence, experience, seniority },
    riskFlags,
    estimatedEffortMinutes: Math.min(20, 5 + highMissing.length * 2 + criticalMissing.length * 3),
  };
}
