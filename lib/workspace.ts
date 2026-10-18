import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  effectivePlan,
  getPlan,
  isBillingStatus,
  minimumPlanFor,
  TRIAL_LEAD_LIMIT,
  type BillingStatus,
  type PlanDefinition,
  type PlanFeature,
  type PlanName,
} from "@/lib/plans";

export type WorkspaceCompany = {
  id: string;
  user_id: string;
  plan: string | null;
  billing_status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_lead_limit: number | null;
};

export type WorkspaceAccess = {
  user: User;
  company: WorkspaceCompany;
  isOwner: boolean;
  plan: PlanName;
  definition: PlanDefinition;
  billingStatus: BillingStatus;
  isTrial: boolean;
  trialExpired: boolean;
  active: boolean;
  leadLimit: number;
  can: (feature: PlanFeature) => boolean;
};

const COMPANY_COLUMNS =
  "id, user_id, plan, billing_status, trial_started_at, trial_ends_at, trial_lead_limit";

/**
 * Loads the signed-in user's workspace (owned or joined) and the
 * plan rules that apply to it. Returns null when not signed in.
 */
export async function getWorkspaceAccess(
  supabase: SupabaseClient
): Promise<WorkspaceAccess | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: company } = await supabase
    .from("company_profiles")
    .select(COMPANY_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle<WorkspaceCompany>();

  let isOwner = Boolean(company);

  if (!company) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membership?.company_id) {
      const { data } = await supabase
        .from("company_profiles")
        .select(COMPANY_COLUMNS)
        .eq("id", membership.company_id)
        .maybeSingle<WorkspaceCompany>();

      company = data;
      isOwner = false;
    }
  }

  if (!company) return null;

  const billingStatus: BillingStatus = isBillingStatus(company.billing_status)
    ? company.billing_status
    : "trialing";

  const isTrial = billingStatus === "trialing";

  const trialExpired =
    isTrial &&
    Boolean(
      company.trial_ends_at &&
        new Date(company.trial_ends_at).getTime() <= Date.now()
    );

  const active =
    (billingStatus === "active" || isTrial) && !trialExpired;

  const plan = effectivePlan(company.plan, billingStatus);
  const definition = getPlan(plan);

  const leadLimit = isTrial
    ? company.trial_lead_limit && company.trial_lead_limit > 0
      ? company.trial_lead_limit
      : TRIAL_LEAD_LIMIT
    : definition.leadLimit;

  return {
    user,
    company,
    isOwner,
    plan,
    definition,
    billingStatus,
    isTrial,
    trialExpired,
    active,
    leadLimit,
    can: (feature) => active && definition.features.includes(feature),
  };
}

/** Standard JSON body for a blocked plan feature. */
export function planRequiredBody(feature: PlanFeature) {
  const required = minimumPlanFor(feature);

  return {
    success: false,
    code: "PLAN_REQUIRED",
    requiredPlan: required,
    error: `This feature is available on the ${required} plan or higher.`,
  };
}
