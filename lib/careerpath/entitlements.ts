import { getUserSubscription, type SubscriptionPlan } from "./billing";

export type PlanEntitlements = {
  plan: SubscriptionPlan;
  aiActionsPerDay: number;
  tailoringPerDay: number;
  outreachPerDay: number;
  advancedTools: boolean;
};

const PLAN_LIMITS: Record<SubscriptionPlan, Omit<PlanEntitlements, "plan">> = {
  // A real first session includes onboarding corrections plus create → humanize
  // → improve → tailor. Deterministic Career Memory reads and safety refusals do
  // not consume this budget, but four AI actions was still too small for a
  // customer to complete and verify one end-to-end workflow.
  free: { aiActionsPerDay: 12, tailoringPerDay: 1, outreachPerDay: 1, advancedTools: true },
  pro: { aiActionsPerDay: 100, tailoringPerDay: 30, outreachPerDay: 20, advancedTools: true },
};

export function getEntitlementsForPlan(plan: SubscriptionPlan): PlanEntitlements {
  return { plan, ...PLAN_LIMITS[plan] };
}

export async function getCurrentUserEntitlements(): Promise<PlanEntitlements> {
  return getEntitlementsForPlan((await getUserSubscription()).plan);
}
