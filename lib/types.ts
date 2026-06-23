export type Plan = "free" | "pro" | "lifetime" | "college";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  target_roles: string[];
  headline: string;
  summary: string;
  public_slug: string;
  portfolio_public: boolean;
  role?: "user" | "admin";
  plan?: Plan;
  plan_status?: "active" | "pending" | "expired";
  pro_until?: string | null;
  referral_code?: string;
  referred_by?: string | null;
};

export type Education = {
  id: string;
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year: number;
  score: string;
  coursework: string[];
  achievements: string;
};

export type Skill = {
  id: string;
  name: string;
  category: "frontend" | "backend" | "ai" | "data" | "design" | "marketing" | "business" | "soft" | "other";
  proficiency: "beginner" | "intermediate" | "advanced";
  proof_links: string[];
};

export type Project = {
  id: string;
  title: string;
  short_description: string;
  problem_solved: string;
  target_users: string;
  tech_stack: string[];
  features: string[];
  impact: string;
  github_url: string;
  live_url: string;
  screenshots_url: string;
  case_study_url: string;
  role: string;
  start_date: string;
  end_date: string;
  status: "completed" | "in_progress" | "paused";
  tags: string[];
};

export type Experience = {
  id: string;
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
  responsibilities: string[];
  achievements: string[];
  proof_links: string[];
  certificate_url: string;
};

export type Certificate = {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  credential_url: string;
  related_skills: string[];
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  date: string;
  proof_url: string;
  category: string;
};

export type ProofLink = {
  id: string;
  title: string;
  url: string;
  type: "github" | "live_demo" | "certificate" | "article" | "case_study" | "video" | "design" | "document" | "linkedin_post" | "other";
  related_type?: "project" | "skill" | "experience" | "certificate" | "achievement" | "profile" | "other";
  related_id?: string;
  notes: string;
};

export type UserVault = {
  profile: Profile;
  education: Education[];
  skills: Skill[];
  projects: Project[];
  experiences: Experience[];
  certificates: Certificate[];
  achievements: Achievement[];
  proof_links: ProofLink[];
};

export type JobAnalysis = {
  requiredSkills: string[];
  preferredSkills: string[];
  missingSkills: string[];
  matchingSkills: string[];
  recommendedProjects: string[];
  fitScore: number;
  resumeAngle: string;
  warnings: string[];
};

export type Job = {
  id: string;
  job_title: string;
  company_name: string;
  job_description: string;
  role_category: string;
  experience_level: string;
  analysis_json: JobAnalysis;
  fit_score: number;
  style: string;
  created_at: string;
};

export type ResumeWarning = {
  type: "unsupported_claim" | "missing_metric" | "generic_wording" | "missing_proof";
  message: string;
  severity: "high" | "medium" | "low";
  suggestedFix: string;
};

export type ResumeContent = {
  header: {
    name: string;
    email: string;
    phone: string;
    city: string;
    links: { label: string; url: string }[];
  };
  summary: string;
  skills: {
    technical: string[];
    tools: string[];
    soft: string[];
  };
  projects: {
    title: string;
    description: string;
    bullets: string[];
    techStack: string[];
    proofLinks: { label: string; url: string }[];
  }[];
  experience: {
    company: string;
    role: string;
    date: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    date: string;
    score: string;
  }[];
  certifications: {
    title: string;
    issuer: string;
    date: string;
  }[];
  achievements?: {
    title: string;
    description: string;
    proofUrl?: string;
  }[];
};

export type Resume = {
  id: string;
  job_id: string | null;
  title: string;
  style: string;
  content_json: ResumeContent;
  proof_score: number;
  warnings: ResumeWarning[];
  created_at: string;
};

export type ProofScoreBreakdown = {
  profileCompleteness: number;
  projects: number;
  proofLinks: number;
  jobMatch: number;
  resumeClarity: number;
  portfolioCompleteness: number;
};

export type ProofScoreResult = {
  total: number;
  grade: "Weak" | "Average" | "Strong" | "Excellent";
  breakdown: ProofScoreBreakdown;
  suggestions: string[];
  missingProof: string[];
  nextActions: string[];
  weakBullets: string[];
};

export type ProofScoreSubmission = {
  name: string;
  email: string;
  whatsapp: string;
  course: string;
  college: string;
  target_role: string;
  resume_text: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  projects_text: string;
  source?: string;
};

export type Lead = {
  id?: string;
  type: "proof_score" | "manual_pack" | "college_pilot" | "pricing_interest" | "contact";
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  course?: string;
  college?: string;
  company?: string;
  role?: string;
  message?: string;
  source?: string;
  status?: "new" | "contacted" | "interested" | "closed" | "lost";
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type OrderStatus = "pending" | "submitted" | "approved" | "rejected" | "failed";
export type PaymentProvider = "manual" | "stripe" | "razorpay" | "lemonsqueezy";

export type Order = {
  id: string;
  user_id?: string | null;
  email: string;
  plan: string;
  amount_inr: number;
  currency: "INR";
  provider: PaymentProvider;
  status: OrderStatus;
  payment_reference?: string;
  payment_proof_url?: string;
  checkout_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  college: string;
  quote: string;
  rating: number;
  public: boolean;
  demo?: boolean;
};
