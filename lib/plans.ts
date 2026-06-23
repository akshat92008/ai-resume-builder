import type { Order, Plan, UserVault } from "./types";

export type PlanLimits = {
  resumes: number;
  proofScoreChecks: number;
  publicPortfolios: number;
  aiGenerations: number;
  coverLetters: boolean;
  linkedinGenerator: boolean;
  footerRequired: boolean;
};

const unlimited = 9999;

export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    label: "₹0",
    description: "Lead magnet and first proof-backed profile.",
    cta: "Start Free",
    features: [
      "Free Resume Proof Score",
      "1 proof-backed resume",
      "1 public portfolio",
      "Basic JD analysis",
      "Career vault",
      "CareerProof footer on public portfolio",
    ],
  },
  {
    id: "pro",
    name: "Student Pro Early Access",
    price: 199,
    label: "₹199",
    description: "For active internship and fresher applications.",
    cta: "Upgrade to Pro",
    features: [
      "10 job-specific resumes",
      "Cover letters",
      "LinkedIn About generator",
      "Public proof portfolio",
      "Resume editing",
      "PDF export",
      "More AI generations",
      "Remove CareerProof footer optional",
    ],
  },
  {
    id: "lifetime",
    name: "Lifetime Student",
    price: 999,
    label: "₹999",
    description: "Founder access while the product is in beta.",
    cta: "Get Lifetime",
    features: [
      "Unlimited early access",
      "Unlimited resumes",
      "Unlimited portfolios/templates when available",
      "Priority features",
      "Lifetime beta founder badge",
    ],
  },
  {
    id: "college",
    name: "College Pilot",
    price: 10000,
    label: "Contact / ₹10k-₹50k pilot",
    description: "Placement readiness dashboard and proof-score report.",
    cta: "Request College Pilot",
    features: [
      "Student resume readiness audit",
      "Placement readiness dashboard",
      "Batch proof-score report",
      "Resume + portfolio workshop",
      "Admin export of candidate profiles",
    ],
  },
];

export const manualServicePacks = [
  {
    id: "resume-fix-pack",
    name: "Resume Fix Pack",
    price: 199,
    deliverables: ["Proof Score", "ATS fixes", "Rewritten project bullets", "Missing proof suggestions"],
  },
  {
    id: "careerproof-pack",
    name: "CareerProof Pack",
    price: 499,
    deliverables: ["Resume", "LinkedIn About", "Project bullet rewrite", "Portfolio structure", "Job-specific version"],
  },
  {
    id: "portfolio-build-pack",
    name: "Portfolio Build Pack",
    price: 999,
    deliverables: ["Simple public portfolio", "Project case studies", "Resume download", "GitHub/live links"],
  },
];

export function getPlanLimits(plan: Plan | string = "free"): PlanLimits {
  if (plan === "lifetime") {
    return {
      resumes: unlimited,
      proofScoreChecks: unlimited,
      publicPortfolios: unlimited,
      aiGenerations: unlimited,
      coverLetters: true,
      linkedinGenerator: true,
      footerRequired: false,
    };
  }
  if (plan === "pro") {
    return {
      resumes: 10,
      proofScoreChecks: 30,
      publicPortfolios: 1,
      aiGenerations: 60,
      coverLetters: true,
      linkedinGenerator: true,
      footerRequired: false,
    };
  }
  if (plan === "college") {
    return {
      resumes: unlimited,
      proofScoreChecks: unlimited,
      publicPortfolios: unlimited,
      aiGenerations: unlimited,
      coverLetters: true,
      linkedinGenerator: true,
      footerRequired: false,
    };
  }
  return {
    resumes: 1,
    proofScoreChecks: 3,
    publicPortfolios: 1,
    aiGenerations: 5,
    coverLetters: false,
    linkedinGenerator: false,
    footerRequired: true,
  };
}

export function canGenerateResume(plan: Plan | string, generatedCount: number) {
  return generatedCount < getPlanLimits(plan).resumes;
}

export function canRunProofScore(plan: Plan | string, checksUsed: number) {
  return checksUsed < getPlanLimits(plan).proofScoreChecks;
}

export function canRemoveFooter(plan: Plan | string) {
  return !getPlanLimits(plan).footerRequired;
}

export function getUpgradeReason(action: "resume" | "proof_score" | "footer" | "cover_letter" | "linkedin") {
  const reasons = {
    resume: "Free users get 1 resume. Upgrade for 10 job-specific resumes.",
    proof_score: "Free users get 3 proof-score checks. Upgrade for more checks.",
    footer: "Upgrade to make the CareerProof footer optional.",
    cover_letter: "Cover letters are included in Student Pro and Lifetime.",
    linkedin: "LinkedIn About generation is included in Student Pro and Lifetime.",
  };
  return reasons[action];
}

export function inferCurrentPlan(vault: UserVault, orders: Order[] = []) {
  const approved = orders.find((order) => order.status === "approved" && ["pro", "lifetime"].includes(order.plan));
  if (approved?.plan === "lifetime") return "lifetime";
  if (approved?.plan === "pro") return "pro";
  return vault.profile.plan ?? "free";
}
