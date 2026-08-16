import type { JobApplication, JobIntelligenceReport, ProofLevel } from "@/lib/careerpath/types";

export type JobFitDecision = "apply" | "consider" | "skip";
export type JobSource = "company_site" | "linkedin" | "indeed" | "glassdoor" | "other";

export type CareerLoopTrackingFields = {
  resumeVersion?: number;
  source?: JobSource;
  fitScore?: number;
  fitRecommendation?: JobFitDecision;
};

export type CareerLoopJobApplication = JobApplication & CareerLoopTrackingFields;

export type CareerEvidenceNode = {
  id: string;
  type: "experience" | "project" | "achievement" | "skill" | "certification";
  label: string;
  proofLevel: ProofLevel;
  skills: string[];
  claims: string[];
  evidence: string[];
  urls: string[];
};

export type CareerEvidenceGraph = {
  nodes: CareerEvidenceNode[];
  skillEvidence: Record<string, string[]>;
  stats: {
    totalNodes: number;
    verifiedNodes: number;
    strongNodes: number;
    evidenceCoverage: number;
    skillsWithEvidence: number;
  };
};

export type RequirementEvidence = {
  requirement: string;
  importance: "critical" | "high" | "medium" | "low";
  status: "verified" | "supported" | "missing";
  proofLevel?: ProofLevel;
  evidence: string[];
};

export type CareerLoopJobIntelligenceReport = JobIntelligenceReport & {
  recommendation: JobFitDecision;
  recommendationReason: string;
  requirementEvidence: RequirementEvidence[];
  fitBreakdown: {
    skills: number;
    evidence: number;
    experience: number;
    seniority: number;
  };
  riskFlags: string[];
  estimatedEffortMinutes: number;
};

export type ConversionCohort = {
  key: string;
  label: string;
  applications: number;
  interviews: number;
  offers: number;
  interviewRate: number;
  offerRate: number;
};

export type ConversionRecommendation = {
  title: string;
  explanation: string;
  action: string;
  confidence: "low" | "medium" | "high";
};

export type ConversionIntelligence = {
  northStar: {
    applications: number;
    interviews: number;
    offers: number;
    interviewRate: number;
    offerRate: number;
  };
  cohorts: {
    byRole: ConversionCohort[];
    bySource: ConversionCohort[];
    byResume: ConversionCohort[];
    byFit: ConversionCohort[];
  };
  recommendations: ConversionRecommendation[];
  learningStatus: {
    enoughData: boolean;
    minimumApplications: number;
    applicationsNeeded: number;
    message: string;
  };
};

export type CareerLoopAnalyticsData = {
  stats: {
    totalSaved: number;
    totalApplications: number;
    interviews: number;
    offers: number;
    rejections: number;
    interviewRate: number;
    offerRate: number;
  };
  charts: {
    funnelData: { name: string; value: number }[];
    timeSeriesData: { date: string; applications: number }[];
    statusData: { name: string; value: number; fill: string }[];
  };
  conversionIntelligence: ConversionIntelligence;
};
