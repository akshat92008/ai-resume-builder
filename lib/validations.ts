import { z } from "zod";

const url = z.string().trim().url().or(z.literal(""));
const optionalText = z.string().trim().optional().default("");
const textArray = z.array(z.string().trim()).optional().default([]);

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: optionalText,
  city: optionalText,
  linkedin_url: url,
  github_url: url,
  portfolio_url: url,
  target_roles: textArray,
  headline: optionalText,
  summary: optionalText,
  public_slug: optionalText,
  portfolio_public: z.boolean().default(false),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(2),
  degree: z.string().trim().min(1),
  field: optionalText,
  start_year: z.coerce.number().int().min(0).max(2100).default(0),
  end_year: z.coerce.number().int().min(0).max(2100).default(0),
  score: optionalText,
  coursework: textArray,
  achievements: optionalText,
});

export const skillSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().default("other"),
  proficiency: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  proof_links: textArray,
});

export const projectSchema = z.object({
  title: z.string().trim().min(2),
  short_description: z.string().trim().min(5),
  problem_solved: optionalText,
  target_users: optionalText,
  tech_stack: textArray,
  features: textArray,
  impact: optionalText,
  github_url: url,
  live_url: url,
  screenshots_url: url,
  case_study_url: url,
  role: optionalText,
  start_date: optionalText,
  end_date: optionalText,
  status: z.enum(["completed", "in_progress", "paused"]).default("completed"),
  tags: textArray,
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  start_date: optionalText,
  end_date: optionalText,
  description: optionalText,
  responsibilities: textArray,
  achievements: textArray,
  proof_links: textArray,
  certificate_url: url,
});

export const certificateSchema = z.object({
  title: z.string().trim().min(1),
  issuer: z.string().trim().min(1),
  issue_date: optionalText,
  credential_url: url,
  related_skills: textArray,
});

export const achievementSchema = z.object({
  title: z.string().trim().min(1),
  description: optionalText,
  date: optionalText,
  proof_url: url,
  category: optionalText,
});

export const proofLinkSchema = z.object({
  title: z.string().trim().min(1),
  url,
  type: z.string().trim().default("other"),
  related_type: optionalText,
  related_id: optionalText,
  notes: optionalText,
});

export const proofScoreSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  whatsapp: z.string().trim().min(7, "WhatsApp number is required"),
  course: optionalText,
  college: optionalText,
  target_role: z.string().trim().min(2, "Target role is required"),
  resume_text: z.string().trim().min(30, "Paste at least 30 characters from your resume"),
  github_url: url,
  linkedin_url: url,
  portfolio_url: url,
  projects_text: optionalText,
  source: optionalText,
});

export const jobSchema = z.object({
  job_title: z.string().trim().min(2),
  company_name: optionalText,
  job_description: z.string().trim().min(40),
  role_category: optionalText,
  experience_level: optionalText,
  style: optionalText,
  userVault: z.unknown().optional(),
});

export const leadSchema = z.object({
  type: z.enum(["proof_score", "manual_pack", "college_pilot", "pricing_interest", "contact"]),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: optionalText,
  whatsapp: optionalText,
  course: optionalText,
  college: optionalText,
  company: optionalText,
  role: optionalText,
  message: optionalText,
  source: optionalText,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const orderCreateSchema = z.object({
  email: z.string().trim().email().optional(),
  plan: z.string().trim().min(1),
  amount_inr: z.coerce.number().int().min(0),
  provider: z.enum(["manual", "stripe", "razorpay", "lemonsqueezy"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const orderProofSchema = z.object({
  order_id: z.string().trim().min(1),
  payment_reference: z.string().trim().min(4).max(120),
  payment_proof_url: url.optional().or(z.literal("")),
});

export const adminApproveOrderSchema = z.object({
  order_id: z.string().trim().min(1),
});

export const adminRejectOrderSchema = z.object({
  order_id: z.string().trim().min(1),
  reason: optionalText,
});

export const adminLeadUpdateSchema = z.object({
  lead_id: z.string().trim().min(1),
  status: z.enum(["new", "contacted", "interested", "closed", "lost"]),
});

export const adminUserPlanUpdateSchema = z.object({
  user_id: z.string().trim().min(1),
  plan: z.enum(["free", "pro", "lifetime", "college"]),
});

export const eventTrackSchema = z.object({
  event_name: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const projectBulletSchema = z.object({
  project: z.unknown(),
  targetRole: optionalText,
});

export const testimonialSchema = z.object({
  id: optionalText,
  name: z.string().trim().min(1, "Name is required"),
  quote: z.string().trim().min(1, "Quote is required"),
  role: optionalText,
  college: optionalText,
  rating: z.coerce.number().min(1).max(5).default(5),
  public: z.boolean().default(false),
  avatar_url: url.optional().default(""),
  result: optionalText,
});

export const adminTestimonialDeleteSchema = z.object({
  id: z.string().trim().min(1),
});
