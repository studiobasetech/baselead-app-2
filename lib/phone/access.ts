import type { SupabaseClient } from "@supabase/supabase-js";
import { getManagerAccess } from "@/lib/team-access";
import { createAdminClient } from "@/lib/supabase/admin";

export type PhoneSettings = {
  non_lead_policy: "flag" | "block";
  announcement: boolean;
  hours_start: number;
  hours_end: number;
  timezone: string;
  long_call_minutes: number;
  rep_minute_limits: Record<string, number>;
};

export const DEFAULT_PHONE_SETTINGS: PhoneSettings = {
  non_lead_policy: "flag",
  announcement: true,
  hours_start: 8,
  hours_end: 19,
  timezone: "America/Chicago",
  long_call_minutes: 45,
  rep_minute_limits: {},
};

export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

export type PhoneUsage = {
  repsWithNumbers: number;
  repsIncluded: number;
  minutesPerRep: number;
  packMinutes: number;
  allowance: number;
  used: number;
  remaining: number;
  myUsed: number;
  myLimit: number | null;
};

/** Minutes allowance and usage for the company this month (admin client: always filtered by company). */
export async function phoneUsage(companyId: string, userId: string, minutesPerRep: number, repsIncluded: number, settings: PhoneSettings): Promise<PhoneUsage> {
  const admin = createAdminClient();
  const since = periodStart();

  const [{ count: numbers }, { data: packs }, { data: calls }] = await Promise.all([
    admin.from("phone_numbers").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active").not("user_id", "is", null),
    admin.from("phone_minute_packs").select("minutes").eq("company_id", companyId).eq("period", currentPeriod()),
    admin.from("calls").select("user_id, billable_minutes").eq("company_id", companyId).gte("started_at", since).limit(20000),
  ]);

  const repsWithNumbers = numbers ?? 0;
  const packMinutes = (packs ?? []).reduce((sum, row) => sum + Number(row.minutes || 0), 0);
  // At least one rep's minutes so the owner can test before assigning numbers.
  const allowance = Math.max(1, repsWithNumbers) * minutesPerRep + packMinutes;
  const used = (calls ?? []).reduce((sum, row) => sum + Number(row.billable_minutes || 0), 0);
  const myUsed = (calls ?? []).filter((row) => row.user_id === userId).reduce((sum, row) => sum + Number(row.billable_minutes || 0), 0);
  const limit = settings.rep_minute_limits?.[userId];

  return {
    repsWithNumbers,
    repsIncluded,
    minutesPerRep,
    packMinutes,
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
    myUsed,
    myLimit: typeof limit === "number" && limit > 0 ? limit : null,
  };
}

export async function loadPhoneSettings(companyId: string): Promise<PhoneSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("phone_settings").select("*").eq("company_id", companyId).maybeSingle();
  return { ...DEFAULT_PHONE_SETTINGS, ...(data ?? {}) } as PhoneSettings;
}

/** Everything a phone route needs: who, which company, plan allowances, role. */
export async function getPhoneAccess(supabase: SupabaseClient) {
  const { access, isManager } = await getManagerAccess(supabase);
  if (!access) return null;

  return {
    access,
    isManager,
    companyId: access.company.id,
    userId: access.user.id,
    allowed: access.can("phone_calling"),
    scorecards: access.can("phone_scorecards"),
    repsIncluded: access.definition.phoneRepsIncluded,
    minutesPerRep: access.definition.phoneMinutesPerRep,
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
