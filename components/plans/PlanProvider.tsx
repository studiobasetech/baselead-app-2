"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/components/lib/supabase";
import {
  DEFAULT_PLAN,
  getPlan,
  hasPlanFeature,
  isPlanName,
  type PlanDefinition,
  type PlanFeature,
  type PlanName,
} from "@/lib/plans";

type BillingStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

type PlanContextValue = {
  plan: PlanName;
  definition: PlanDefinition;
  loading: boolean;
  companyId: string | null;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  trialLeadLimit: number;
  trialLeadsUsed: number;
  trialLeadsRemaining: number;
  isTrial: boolean;
  trialExpired: boolean;
  can: (feature: PlanFeature) => boolean;
  refreshPlan: () => Promise<void>;
};

const PlanContext =
  createContext<PlanContextValue | null>(null);

function normalizeBillingStatus(
  value: unknown
): BillingStatus {
  if (
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid"
  ) {
    return value;
  }

  return "trialing";
}

async function resolveCompanyId(
  userId: string
): Promise<string | null> {
  const { data: ownedCompany } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedCompany?.id) {
    return String(ownedCompany.id);
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return membership?.company_id
    ? String(membership.company_id)
    : null;
}

export function PlanProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [plan, setPlan] =
    useState<PlanName>(DEFAULT_PLAN);

  const [companyId, setCompanyId] =
    useState<string | null>(null);

  const [billingStatus, setBillingStatus] =
    useState<BillingStatus>("trialing");

  const [trialEndsAt, setTrialEndsAt] =
    useState<string | null>(null);

  const [trialLeadLimit, setTrialLeadLimit] =
    useState(100);

  const [trialLeadsUsed, setTrialLeadsUsed] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const loadPlan = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCompanyId(null);
        setPlan(DEFAULT_PLAN);
        setBillingStatus("trialing");
        setTrialEndsAt(null);
        setTrialLeadLimit(100);
        setTrialLeadsUsed(0);
        return;
      }

      const resolvedCompanyId =
        await resolveCompanyId(user.id);

      setCompanyId(resolvedCompanyId);

      if (!resolvedCompanyId) {
        setPlan(DEFAULT_PLAN);
        setBillingStatus("trialing");
        setTrialEndsAt(null);
        setTrialLeadLimit(100);
        setTrialLeadsUsed(0);
        return;
      }

      const { data, error } = await supabase
        .from("company_profiles")
        .select(
          "plan, billing_status, trial_ends_at, trial_lead_limit"
        )
        .eq("id", resolvedCompanyId)
        .maybeSingle();

      if (error) {
        console.error(
          "Plan could not be loaded:",
          error
        );

        setPlan(DEFAULT_PLAN);
        return;
      }

      const nextPlan = isPlanName(data?.plan)
        ? data.plan
        : DEFAULT_PLAN;

      const nextBillingStatus =
        normalizeBillingStatus(
          data?.billing_status
        );

      const nextTrialLimit =
        typeof data?.trial_lead_limit === "number"
          ? data.trial_lead_limit
          : 100;

      setPlan(nextPlan);
      setBillingStatus(nextBillingStatus);
      setTrialEndsAt(
        typeof data?.trial_ends_at === "string"
          ? data.trial_ends_at
          : null
      );
      setTrialLeadLimit(nextTrialLimit);

      const { count } = await supabase
        .from("leads")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id);

      setTrialLeadsUsed(count ?? 0);
    } catch (error) {
      console.error(
        "Plan provider error:",
        error
      );

      setPlan(DEFAULT_PLAN);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const isTrial =
    billingStatus === "trialing";

  const trialExpired =
    isTrial &&
    Boolean(
      trialEndsAt &&
        new Date(trialEndsAt).getTime() <=
          Date.now()
    );

  const trialLeadsRemaining = Math.max(
    0,
    trialLeadLimit - trialLeadsUsed
  );

  const value = useMemo<PlanContextValue>(
    () => ({
      plan: isTrial ? "Starter" : plan,
      definition: getPlan(isTrial ? "Starter" : plan),
      loading,
      companyId,
      billingStatus,
      trialEndsAt,
      trialLeadLimit,
      trialLeadsUsed,
      trialLeadsRemaining,
      isTrial,
      trialExpired,
      can: (feature) =>
        !trialExpired &&
        (billingStatus === "trialing" ||
          billingStatus === "active") &&
        hasPlanFeature(
          isTrial ? "Starter" : plan,
          feature
        ),
      refreshPlan: loadPlan,
    }),
    [
      plan,
      loading,
      companyId,
      billingStatus,
      trialEndsAt,
      trialLeadLimit,
      trialLeadsUsed,
      trialLeadsRemaining,
      isTrial,
      trialExpired,
      loadPlan,
    ]
  );

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error(
      "usePlan must be used inside PlanProvider."
    );
  }

  return context;
}