import { activeCompanyIdServer } from "@/lib/active-company";
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
  /** Set on extra companies (Scale): billing comes from this main company. */
  parent_company_id?: string | null;
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
  /** The main company that pays (itself, or the parent of an extra company). */
  billingCompanyId: string;
};

// "*" so this keeps working before and after UPDATE_11 (parent_company_id).
const COMPANY_COLUMNS = "*";

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

  const activeId = await activeCompanyIdServer();
  let company: WorkspaceCompany | null = null;
  let isOwner = false;

  // 1) The company the user switched to (must be theirs or one they belong to).
  if (activeId) {
    const { data: selected } = await supabase
      .from("company_profiles")
      .select(COMPANY_COLUMNS)
      .eq("id", activeId)
      .maybeSingle<WorkspaceCompany & { owner_user_id?: string | null }>();
    if (selected) {
      if (selected.user_id === user.id || selected.owner_user_id === user.id) {
        company = selected;
        isOwner = true;
      } else {
        const { data: member } = await supabase
          .from("team_members")
          .select("role")
          .eq("company_id", selected.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (member) {
          company = selected;
          isOwner = member.role === "owner";
        }
      }
    }
  }

  // 2) Their own main company.
  if (!company) {
    const { data } = await supabase
      .from("company_profiles")
      .select(COMPANY_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle<WorkspaceCompany>();
    company = data;
    isOwner = Boolean(data);
  }

  // 3) A company they joined as a team member.
  if (!company) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("company_id, role")
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
      isOwner = membership.role === "owner";
    }
  }

  if (!company) return null;

  // Extra companies use the plan and billing of their main company.
  let billing: WorkspaceCompany = company;
  if (company.parent_company_id) {
    const { data: parent } = await supabase
      .from("company_profiles")
      .select(COMPANY_COLUMNS)
      .eq("id", company.parent_company_id)
      .maybeSingle<WorkspaceCompany>();
    if (parent) billing = parent;
  }

  const billingStatus: BillingStatus = isBillingStatus(billing.billing_status)
    ? billing.billing_status
    : "trialing";

  const isTrial = billingStatus === "trialing";

  const trialExpired =
    isTrial &&
    Boolean(
      billing.trial_ends_at &&
        new Date(billing.trial_ends_at).getTime() <= Date.now()
    );

  const active =
    (billingStatus === "active" || isTrial) && !trialExpired;

  const plan = effectivePlan(billing.plan, billingStatus);
  const definition = getPlan(plan);

  const leadLimit = isTrial
    ? billing.trial_lead_limit && billing.trial_lead_limit > 0
      ? billing.trial_lead_limit
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
    billingCompanyId: billing.id,
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
