import { z } from "zod";

export const JobApplicationStatusSchema = z.enum(["saved", "applied", "follow_up_needed", "interview", "rejected", "offer", "ghosted"]);
export const JobSourceSchema = z.enum(["company_site", "linkedin", "indeed", "glassdoor", "other"]);
export const JobFitRecommendationSchema = z.enum(["apply", "consider", "skip"]);

const optionalUrl = z.string().trim().max(2048).refine((value) => value === "" || /^https:\/\//i.test(value), "Job URL must use https").optional();
const nullableDateTime = z.string().datetime().nullish();
const nullableUuid = z.string().uuid().nullish();

export const CreateJobApplicationSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  jobUrl: optionalUrl,
  notes: z.string().max(10_000).optional(),
  status: JobApplicationStatusSchema.default("saved"),
  resumeId: z.string().uuid().optional(),
  resumeVersion: z.number().int().positive().max(10_000).optional(),
  source: JobSourceSchema.optional(),
  fitScore: z.number().int().min(0).max(100).optional(),
  fitRecommendation: JobFitRecommendationSchema.optional(),
}).strict();

export const UpdateJobApplicationSchema = z.object({
  company: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(160).optional(),
  jobUrl: optionalUrl.nullable(),
  jobDescriptionId: nullableUuid,
  resumeId: nullableUuid,
  resumeVersion: z.number().int().positive().max(10_000).nullish(),
  source: JobSourceSchema.nullish(),
  fitScore: z.number().int().min(0).max(100).nullish(),
  fitRecommendation: JobFitRecommendationSchema.nullish(),
  applicationPackId: nullableUuid,
  status: JobApplicationStatusSchema.optional(),
  appliedAt: nullableDateTime,
  followUpAt: nullableDateTime,
  notes: z.string().max(10_000).nullish(),
  stage: z.string().trim().max(120).nullish(),
  salaryMin: z.number().nonnegative().nullish(),
  salaryMax: z.number().nonnegative().nullish(),
  currency: z.string().trim().max(10).nullish(),
  bonus: z.number().nonnegative().nullish(),
  equity: z.number().nonnegative().nullish(),
  benefits: z.array(z.string().trim().max(160)).max(50).nullish(),
  location: z.string().trim().max(200).nullish(),
  workType: z.string().trim().max(80).nullish(),
  offerDeadline: nullableDateTime,
  outcome: z.object({ gotReply: z.boolean().optional(), gotInterview: z.boolean().optional(), rejected: z.boolean().optional(), offer: z.boolean().optional(), reason: z.string().max(1000).optional() }).strict().nullish(),
}).strict();
