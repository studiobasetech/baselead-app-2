/* =========================================================
   BASELEAD PLAN & ENTITLEMENTS
   Central source of truth for plan capabilities.

   Payment is intentionally NOT part of this system yet.
   The active plan is stored on the workspace/company and
   can later be driven by Stripe subscription state.
========================================================= */

export type PlanName = "Starter" | "Pro" | "Scale";

export type PlanFeature =
  | "ai_lead_discovery"
  | "ai_lead_scoring"
  | "email_templates"
  | "pipeline_management"
  | "calendar_followups"
  | "performance_reports"
  | "advanced_ai_lead_discovery"
  | "ai_recommendations"
  | "outreach_automation"
  | "advanced_pipeline"
  | "advanced_reports"
  | "integrations_webhooks"
  | "priority_support"
  | "advanced_ai_recommendations"
  | "advanced_automation"
  | "team_permissions"
  | "custom_reports"
  | "api_access"
  | "multi_company"
  | "phone_calling"
  | "phone_scorecards";

export type PlanDefinition = {
  name: PlanName;
  monthly: number;
  yearly: number;
  leadLimit: number;
  teamLimit: number | null;
  integrationLimit: number | null;
  apiRequestLimit: number | null;
  /** Active outreach campaigns allowed at the same time (null = unlimited). */
  campaignLimit: number | null;
  /** Decision-maker lookups per month. */
  contactLookupLimit: number;
  /** Companies (workspaces) one account can run. */
  companyLimit: number;
  /** Built-in calling: phone lines (one number each) included (0 = no calling). */
  phoneLinesIncluded: number;
  /** Calling minutes per month, one pool shared by the whole team. */
  phoneMinutesPool: number;
  features: readonly PlanFeature[];
};

export const PLAN_DEFINITIONS: Record<
  PlanName,
  PlanDefinition
> = {
  Starter: {
    name: "Starter",
    monthly: 79,
    yearly: 805.8,
    leadLimit: 1000,
    teamLimit: 3,
    integrationLimit: 5,
    apiRequestLimit: 0,
    campaignLimit: 3,
    contactLookupLimit: 50,
    companyLimit: 1,
    phoneLinesIncluded: 0,
    phoneMinutesPool: 0,
    features: [
      "ai_lead_discovery",
      "ai_lead_scoring",
      "email_templates",
      "pipeline_management",
      "calendar_followups",
      "performance_reports",
    ],
  },

  Pro: {
    name: "Pro",
    monthly: 199,
    yearly: 2029.8,
    leadLimit: 5000,
    teamLimit: 5,
    integrationLimit: null,
    apiRequestLimit: 0,
    campaignLimit: 25,
    contactLookupLimit: 500,
    companyLimit: 1,
    phoneLinesIncluded: 3,
    phoneMinutesPool: 3000,
    features: [
      "ai_lead_discovery",
      "ai_lead_scoring",
      "email_templates",
      "pipeline_management",
      "calendar_followups",
      "performance_reports",
      "advanced_ai_lead_discovery",
      "ai_recommendations",
      "outreach_automation",
      "advanced_pipeline",
      "advanced_reports",
      "integrations_webhooks",
      "priority_support",
      "phone_calling",
    ],
  },

  Scale: {
    name: "Scale",
    monthly: 399,
    yearly: 4069.8,
    leadLimit: 20000,
    teamLimit: null,
    integrationLimit: null,
    apiRequestLimit: 100000,
    campaignLimit: null,
    contactLookupLimit: 2000,
    companyLimit: 5,
    phoneLinesIncluded: 10,
    phoneMinutesPool: 8000,
    features: [
      "ai_lead_discovery",
      "ai_lead_scoring",
      "email_templates",
      "pipeline_management",
      "calendar_followups",
      "performance_reports",
      "advanced_ai_lead_discovery",
      "ai_recommendations",
      "outreach_automation",
      "advanced_pipeline",
      "advanced_reports",
      "integrations_webhooks",
      "priority_support",
      "advanced_ai_recommendations",
      "advanced_automation",
      "team_permissions",
      "custom_reports",
      "api_access",
      "multi_company",
      "phone_calling",
      "phone_scorecards",
    ],
  },
};

export const DEFAULT_PLAN: PlanName = "Starter";
export const TRIAL_PLAN: PlanName = "Starter";
export const TRIAL_DURATION_DAYS = 7;
export const TRIAL_LEAD_LIMIT = 100;

export type BillingStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export function isBillingStatus(
  value: unknown
): value is BillingStatus {
  return (
    value === "inactive" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid"
  );
}

export function isTrialExpired(
  trialEndsAt: string | null | undefined
): boolean {
  if (!trialEndsAt) return false;

  return new Date(trialEndsAt).getTime() <= Date.now();
}

export function getTrialLeadsRemaining(
  leadsUsed: number,
  trialLeadLimit = TRIAL_LEAD_LIMIT
): number {
  return Math.max(0, trialLeadLimit - leadsUsed);
}
export function isPlanName(value: unknown): value is PlanName {
  return (
    value === "Starter" ||
    value === "Pro" ||
    value === "Scale"
  );
}

export function getPlan(
  value: unknown,
): PlanDefinition {
  return PLAN_DEFINITIONS[
    isPlanName(value) ? value : DEFAULT_PLAN
  ];
}

export function hasPlanFeature(
  plan: PlanName | unknown,
  feature: PlanFeature,
): boolean {
  return getPlan(plan).features.includes(feature);
}

export function getLeadLimit(
  plan: PlanName | unknown,
): number {
  return getPlan(plan).leadLimit;
}

export function getTeamLimit(
  plan: PlanName | unknown,
): number | null {
  return getPlan(plan).teamLimit;
}

export function getIntegrationLimit(
  plan: PlanName | unknown,
): number | null {
  return getPlan(plan).integrationLimit;
}

/** The plan whose rules apply right now (trials use Starter rules). */
export function effectivePlan(
  plan: unknown,
  billingStatus: unknown
): PlanName {
  if (billingStatus === "trialing") return TRIAL_PLAN;
  return isPlanName(plan) ? plan : TRIAL_PLAN;
}

/** Human-readable name of the cheapest plan that includes a feature. */
export function minimumPlanFor(feature: PlanFeature): PlanName {
  return (["Starter", "Pro", "Scale"] as PlanName[]).find((name) =>
    PLAN_DEFINITIONS[name].features.includes(feature)
  ) ?? "Scale";
}

export function getCampaignLimit(plan: PlanName | unknown): number | null {
  return getPlan(plan).campaignLimit;
}

/* ---------------------------------------------------------
   Built-in calling (Telnyx): add-ons and extras we sell.
   Our cost: $1.15 per number/month + ~$0.014 per minute (with AI summary).
--------------------------------------------------------- */

export type PhoneAddonKind = "starter_phone" | "extra_line" | "power_line";

export type PhoneAddon = {
  kind: PhoneAddonKind;
  name: string;
  /** Monthly price in USD. */
  price: number;
  /** Lines (numbers) it adds. */
  lines: number;
  /** Minutes it adds to the team pool each month. */
  minutes: number;
  /** Plans that can buy it. */
  plans: PlanName[];
  description: string;
};

export const PHONE_ADDONS: Record<PhoneAddonKind, PhoneAddon> = {
  starter_phone: {
    kind: "starter_phone",
    name: "Phone for Starter",
    price: 29,
    lines: 1,
    minutes: 1000,
    plans: ["Starter"],
    description: "1 phone line + 1,000 minutes a month",
  },
  extra_line: {
    kind: "extra_line",
    name: "Extra line",
    price: 15,
    lines: 1,
    minutes: 500,
    plans: ["Pro", "Scale"],
    description: "1 more number + 500 minutes to the team pool",
  },
  power_line: {
    kind: "power_line",
    name: "Power line",
    price: 59,
    lines: 1,
    minutes: 2500,
    plans: ["Pro", "Scale"],
    description: "1 more number + 2,500 minutes (~170 calls a day) for heavy callers",
  },
};

export function isPhoneAddonKind(value: unknown): value is PhoneAddonKind {
  return value === "starter_phone" || value === "extra_line" || value === "power_line";
}

/** One-time pack added to this month's pool. */
export const PHONE_MINUTES_PACK = { minutes: 1000, price: 20 };
/** Automatic overage (opt-in, with a spending cap). */
export const PHONE_OVERAGE_PER_MINUTE = 0.02;
export const PHONE_OVERAGE_DEFAULT_CAP = 50;
/** Managers are alerted when the pool reaches these percentages. */
export const PHONE_USAGE_ALERTS = [80, 100] as const;
