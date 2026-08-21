import type { PlanId } from "@/lib/credits";

export const TIER_ORDER: PlanId[] = ["free", "starter", "pro", "business"];

/** Whether a template requiring `tierRequired` is locked for someone on
 * `userPlan`. Previously lived only inline in the templates display page —
 * extracted because the same check needs to be enforced server-side too
 * (see /api/templates/use), where it actually matters for security: a
 * locked template hidden in the UI is not the same as one a direct API
 * call can't bypass. Admins always pass, matching the page's existing
 * behavior. */
export function isTemplateLocked(tierRequired: string, userPlan: string, isAdmin: boolean): boolean {
  if (isAdmin) return false;
  const requiredIndex = TIER_ORDER.indexOf(tierRequired as PlanId);
  const userIndex = TIER_ORDER.indexOf(userPlan as PlanId);
  // An unrecognized tier value should never grant access silently — treat
  // an unknown required tier as maximally restrictive rather than as -1
  // comparing favorably against everything.
  if (requiredIndex === -1) return true;
  return requiredIndex > userIndex;
}
