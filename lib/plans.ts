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
    | "api_access";

export type PlanDefinition = {
  name: PlanName;
  monthly: number;
  yearly: number;
  leadLimit: number;
  teamLimit: number | null;
  integrationLimit: number | null;
  apiRequestLimit: number | null;
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
    apiRequestLimit: 1000,
    features: [
      "ai_lead_discovery",
      "ai_lead_scoring",
      "email_templates",
      "pipeline_management",
      "calendar_followups",
      "performance_reports",
      "api_access",
    ],
  },

  Pro: {
    name: "Pro",
    monthly: 199,
    yearly: 2029.8,
    leadLimit: 5000,
    teamLimit: 5,
    integrationLimit: null,
    apiRequestLimit: 10000,
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
      "api_access",
    ],
  },

  Scale: {
    name: "Scale",
    monthly: 399,
    yearly: 4069.8,
    leadLimit: 20000,
    teamLimit: null,
    integrationLimit: null,
    apiRequestLimit: null,
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
      "api_access",
    ],
  },
};

export const DEFAULT_PLAN: PlanName = "Pro";
export const TRIAL_PLAN: PlanName = "Starter";
export const TRIAL_DURATION_DAYS = 7;
export const TRIAL_LEAD_LIMIT = 100;

export type BillingStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export function isBillingStatus(
  value: unknown
): value is BillingStatus {
  return (
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
