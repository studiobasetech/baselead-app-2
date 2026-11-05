import type { SupabaseClient, User } from "@supabase/supabase-js";
import { effectivePlan, getPlan, isBillingStatus } from "@/lib/plans";

export type CompanyOption = {
  id: string;
  name: string;
  logoUrl: string | null;
  main: boolean;
};

type Row = {
  id: string;
  company_name?: string | null;
  logo_url?: string | null;
  plan?: string | null;
  billing_status?: string | null;
  trial_ends_at?: string | null;
  parent_company_id?: string | null;
};

/**
 * The user's main company and the extra companies they created (Scale plan).
 * Uses the admin client, so it always filters by the signed-in user.
 */
export async function loadOwnedCompanies(admin: SupabaseClient, user: User) {
  const { data: main } = await admin
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Row>();

  if (!main) return { main: null, extras: [] as Row[], options: [] as CompanyOption[], limit: 1, allowed: false };

  const { data: extras } = await admin
    .from("company_profiles")
    .select("*")
    .eq("parent_company_id", main.id)
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  const status = isBillingStatus(main.billing_status) ? main.billing_status : "trialing";
  const trialOver = status === "trialing" && Boolean(main.trial_ends_at && new Date(main.trial_ends_at).getTime() <= Date.now());
  const active = (status === "active" || status === "trialing") && !trialOver;
  const plan = getPlan(effectivePlan(main.plan, status));
  const allowed = active && plan.features.includes("multi_company");

  const toOption = (row: Row, isMain: boolean): CompanyOption => ({
    id: row.id,
    name: row.company_name?.trim() || (isMain ? "My company" : "Company"),
    logoUrl: row.logo_url ?? null,
    main: isMain,
  });

  const extraRows = (extras ?? []) as Row[];

  return {
    main,
    extras: extraRows,
    options: [toOption(main, true), ...extraRows.map((row) => toOption(row, false))],
    limit: plan.companyLimit,
    allowed,
  };
}
