import { getUserSubscription, type SubscriptionPlan } from "./billing";

export type PlanEntitlements = {
  plan: SubscriptionPlan;
  aiActionsPerDay: number;
  tailoringPerDay: number;
  outreachPerDay: number;
  advancedTools: boolean;
};

const PLAN_LIMITS: Record<SubscriptionPlan, Omit<PlanEntitlements, "plan">> = {
  // A complete core journey is create → humanize → improve → tailor. Keep the
  // free tier constrained, but do not block that single end-to-end workflow at
  // the fourth action after the user has already invested work in the resume.
  free: { aiActionsPerDay: 4, tailoringPerDay: 1, outreachPerDay: 1, advancedTools: true },
  pro: { aiActionsPerDay: 100, tailoringPerDay: 30, outreachPerDay: 20, advancedTools: true },
};

export function getEntitlementsForPlan(plan: SubscriptionPlan): PlanEntitlements {
  return { plan, ...PLAN_LIMITS[plan] };
}

export async function getCurrentUserEntitlements(): Promise<PlanEntitlements> {
  return getEntitlementsForPlan((await getUserSubscription()).plan);
}
