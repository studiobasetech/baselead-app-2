import type { SupabaseClient } from "@supabase/supabase-js";
import { getManagerAccess } from "@/lib/team-access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PHONE_ADDONS,
  PHONE_OVERAGE_DEFAULT_CAP,
  PHONE_OVERAGE_PER_MINUTE,
  effectivePlan,
  getPlan,
  isPhoneAddonKind,
  type PhoneAddonKind,
  type PlanName,
} from "@/lib/plans";

export type PhoneSettings = {
  non_lead_policy: "flag" | "block";
  announcement: boolean;
  hours_start: number;
  hours_end: number;
  timezone: string;
  long_call_minutes: number;
  rep_minute_limits: Record<string, number>;
  overage_enabled: boolean;
  overage_cap: number;
};

export const DEFAULT_PHONE_SETTINGS: PhoneSettings = {
  non_lead_policy: "flag",
  announcement: true,
  hours_start: 8,
  hours_end: 19,
  timezone: "America/Chicago",
  long_call_minutes: 45,
  rep_minute_limits: {},
  overage_enabled: false,
  overage_cap: PHONE_OVERAGE_DEFAULT_CAP,
};

export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function periodStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

/* ---------------- Add-ons ---------------- */

/** Stripe statuses where the add-on still counts (past_due = grace while the card is retried). */
export const ADDON_LIVE_STATUSES = ["active", "trialing", "past_due"];

export type ActiveAddon = {
  id: string;
  kind: PhoneAddonKind;
  quantity: number;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  /** False when the add-on is for another plan (e.g. after a downgrade). */
  applies: boolean;
};

export async function loadPhoneAddons(companyId: string): Promise<Omit<ActiveAddon, "applies">[]> {
  try {
    const { data, error } = await createAdminClient()
      .from("phone_addons")
      .select("id, kind, quantity, status, cancel_at_period_end, current_period_end")
      .eq("company_id", companyId)
      .in("status", ADDON_LIVE_STATUSES);
    if (error) return []; // table not created yet (UPDATE 15)
    return (data ?? []).filter((row) => isPhoneAddonKind(row.kind)) as Omit<ActiveAddon, "applies">[];
  } catch {
    return [];
  }
}

export type PhoneAllowance = {
  plan: PlanName;
  planLines: number;
  planMinutes: number;
  addonLines: number;
  addonMinutes: number;
  /** Lines (numbers) the company may have. */
  lines: number;
  /** Monthly minutes before one-time packs. */
  minutes: number;
  addons: ActiveAddon[];
};

export function phoneAllowance(plan: PlanName, rows: Omit<ActiveAddon, "applies">[]): PhoneAllowance {
  const definition = getPlan(plan);
  const addons = rows.map((row) => ({ ...row, applies: PHONE_ADDONS[row.kind].plans.includes(plan) }));
  let addonLines = 0;
  let addonMinutes = 0;
  for (const addon of addons) {
    if (!addon.applies) continue;
    addonLines += PHONE_ADDONS[addon.kind].lines * addon.quantity;
    addonMinutes += PHONE_ADDONS[addon.kind].minutes * addon.quantity;
  }
  return {
    plan,
    planLines: definition.phoneLinesIncluded,
    planMinutes: definition.phoneMinutesPool,
    addonLines,
    addonMinutes,
    lines: definition.phoneLinesIncluded + addonLines,
    minutes: definition.phoneMinutesPool + addonMinutes,
    addons,
  };
}

/** Calling is on with an active paid plan that includes it, or Starter + the Phone add-on. Never during the free trial. */
export function phoneAllowedFor(plan: PlanName, paidAndActive: boolean, addons: ActiveAddon[]) {
  if (!paidAndActive) return false;
  if (getPlan(plan).features.includes("phone_calling")) return true;
  return addons.some((addon) => addon.kind === "starter_phone" && addon.applies && addon.quantity > 0);
}

/* ---------------- Usage ---------------- */

export type PhoneUsage = {
  lines: number;
  planLines: number;
  addonLines: number;
  numbersInUse: number;
  planMinutes: number;
  addonMinutes: number;
  packMinutes: number;
  allowance: number;
  used: number;
  remaining: number;
  overageEnabled: boolean;
  overageCap: number;
  overageMinutes: number;
  overageCost: number;
  /** Pool is empty but automatic overage can still cover calls. */
  overageAvailable: boolean;
  myUsed: number;
  myLimit: number | null;
  addons: { kind: PhoneAddonKind; quantity: number; status: string; cancelAtPeriodEnd: boolean; applies: boolean }[];
};

type CallUsageRow = { user_id: string | null; billable_minutes: number | null; overage_minutes?: number | null };

async function monthCalls(companyId: string, since: string, until?: string): Promise<CallUsageRow[]> {
  const admin = createAdminClient();
  const query = (columns: string) => {
    let q = admin.from("calls").select(columns).eq("company_id", companyId).gte("started_at", since);
    if (until) q = q.lt("started_at", until);
    return q.limit(20000);
  };
  const withOverage = await query("user_id, billable_minutes, overage_minutes");
  if (!withOverage.error) return (withOverage.data ?? []) as unknown as CallUsageRow[];
  // Before UPDATE 15 the overage column doesn't exist yet.
  const basic = await query("user_id, billable_minutes");
  return (basic.data ?? []) as unknown as CallUsageRow[];
}

/** Minutes allowance and usage for the company this month (admin client: always filtered by company). */
export async function phoneUsage(companyId: string, userId: string, allowance: PhoneAllowance, settings: PhoneSettings): Promise<PhoneUsage> {
  const admin = createAdminClient();

  const [{ count: numbers }, { data: packs }, calls] = await Promise.all([
    admin.from("phone_numbers").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active"),
    admin.from("phone_minute_packs").select("minutes").eq("company_id", companyId).eq("period", currentPeriod()),
    monthCalls(companyId, periodStart()),
  ]);

  const packMinutes = (packs ?? []).reduce((sum, row) => sum + Number(row.minutes || 0), 0);
  const total = allowance.minutes + packMinutes;
  const used = calls.reduce((sum, row) => sum + Number(row.billable_minutes || 0), 0);
  const overageMinutes = calls.reduce((sum, row) => sum + Number(row.overage_minutes || 0), 0);
  const myUsed = calls.filter((row) => row.user_id === userId).reduce((sum, row) => sum + Number(row.billable_minutes || 0), 0);
  const limit = settings.rep_minute_limits?.[userId];
  const cap = Number(settings.overage_cap) || 0;
  const overageEnabled = Boolean(settings.overage_enabled);
  const overageCost = Math.round(overageMinutes * PHONE_OVERAGE_PER_MINUTE * 100) / 100;

  return {
    lines: allowance.lines,
    planLines: allowance.planLines,
    addonLines: allowance.addonLines,
    numbersInUse: numbers ?? 0,
    planMinutes: allowance.planMinutes,
    addonMinutes: allowance.addonMinutes,
    packMinutes,
    allowance: total,
    used,
    remaining: Math.max(0, total - used),
    overageEnabled,
    overageCap: cap,
    overageMinutes,
    overageCost,
    overageAvailable: overageEnabled && (overageMinutes + 1) * PHONE_OVERAGE_PER_MINUTE <= cap,
    myUsed,
    myLimit: typeof limit === "number" && limit > 0 ? limit : null,
    addons: allowance.addons.map((a) => ({ kind: a.kind, quantity: a.quantity, status: a.status, cancelAtPeriodEnd: a.cancel_at_period_end, applies: a.applies })),
  };
}

export async function loadPhoneSettings(companyId: string): Promise<PhoneSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("phone_settings").select("*").eq("company_id", companyId).maybeSingle();
  const merged = { ...DEFAULT_PHONE_SETTINGS, ...(data ?? {}) } as PhoneSettings;
  merged.overage_cap = Number(merged.overage_cap) || PHONE_OVERAGE_DEFAULT_CAP;
  return merged;
}

/** Everything a phone route needs: who, which company, plan allowances, role. */
export async function getPhoneAccess(supabase: SupabaseClient) {
  const { access, isManager } = await getManagerAccess(supabase);
  if (!access) return null;

  const paidAndActive = access.active && !access.isTrial;
  const allowance = phoneAllowance(access.plan, await loadPhoneAddons(access.company.id));

  return {
    access,
    isManager,
    companyId: access.company.id,
    userId: access.user.id,
    paidAndActive,
    allowed: phoneAllowedFor(access.plan, paidAndActive, allowance.addons),
    scorecards: access.can("phone_scorecards"),
    allowance,
  };
}

/** Same check for server-side events (Telnyx webhook) where there is no signed-in user. */
export async function companyPhoneAccess(companyId: string) {
  const admin = createAdminClient();
  const { data: company } = await admin.from("company_profiles").select("*").eq("id", companyId).maybeSingle();
  if (!company) return { allowed: false, allowance: phoneAllowance("Starter", []), billingCompanyId: companyId, customerId: null as string | null };
  let billing = company;
  if (company.parent_company_id) {
    const { data: parent } = await admin.from("company_profiles").select("*").eq("id", company.parent_company_id).maybeSingle();
    if (parent) billing = parent;
  }
  const status = billing.billing_status;
  const plan = effectivePlan(billing.plan, status);
  const allowance = phoneAllowance(plan, await loadPhoneAddons(companyId));
  return {
    allowed: phoneAllowedFor(plan, status === "active", allowance.addons),
    allowance,
    billingCompanyId: billing.id as string,
    customerId: (billing.stripe_customer_id as string | null) ?? null,
  };
}

/** Is this time outside the company's business hours (or on a weekend)? */
export function isAfterHours(date: Date, settings: PhoneSettings) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone || "America/Chicago",
      weekday: "short",
      hour: "numeric",
      hour12: false,
    }).formatToParts(date);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12) % 24;
    if (weekday === "Sat" || weekday === "Sun") return true;
    return hour < settings.hours_start || hour >= settings.hours_end;
  } catch {
    return false;
  }
}
