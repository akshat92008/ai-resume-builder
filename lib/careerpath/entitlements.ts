import { getUserSubscription, type SubscriptionPlan } from "./billing";

export type PlanEntitlements = {
  plan: SubscriptionPlan;
  aiActionsPerDay: number;
  tailoringPerDay: number;
  outreachPerDay: number;
  advancedTools: boolean;
};

/**
 * Temporary full-product test mode.
 *
 * Keep this as a single explicit switch so normal commercial quotas can be
 * restored after manual feature certification without hunting through routes.
 * Auth/signup/security abuse limits do not use these entitlements and remain
 * enforced while product caps are disabled.
 */
export const PRODUCT_CAPS_DISABLED_FOR_TESTING = true;
const TESTING_EFFECTIVELY_UNLIMITED = 1_000_000;

const PLAN_LIMITS: Record<SubscriptionPlan, Omit<PlanEntitlements, "plan">> = {
  free: { aiActionsPerDay: 12, tailoringPerDay: 1, outreachPerDay: 1, advancedTools: true },
  pro: { aiActionsPerDay: 100, tailoringPerDay: 30, outreachPerDay: 20, advancedTools: true },
};

const TESTING_LIMITS: Omit<PlanEntitlements, "plan"> = {
  aiActionsPerDay: TESTING_EFFECTIVELY_UNLIMITED,
  tailoringPerDay: TESTING_EFFECTIVELY_UNLIMITED,
  outreachPerDay: TESTING_EFFECTIVELY_UNLIMITED,
  advancedTools: true,
};

export function getEntitlementsForPlan(plan: SubscriptionPlan): PlanEntitlements {
  return {
    plan,
    ...(PRODUCT_CAPS_DISABLED_FOR_TESTING ? TESTING_LIMITS : PLAN_LIMITS[plan]),
  };
}

export async function getCurrentUserEntitlements(): Promise<PlanEntitlements> {
  return getEntitlementsForPlan((await getUserSubscription()).plan);
}
