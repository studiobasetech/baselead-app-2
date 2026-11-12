import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTelnyxConfigured } from "@/lib/phone/telnyx";
import { loadPhoneSettings, phoneUsage } from "@/lib/phone/access";
import { phoneRoute } from "../_shared";

// What the in-app phone needs to know about the signed-in rep.
export async function GET() {
  const { error, phone } = await phoneRoute();
  if (error) return error;

  const configured = isTelnyxConfigured();
  if (!phone.allowed) {
    return NextResponse.json({
      allowed: false,
      configured,
      isManager: phone.isManager,
      plan: phone.access.plan,
      // Starter owners/managers with a paid plan can add Phone for $29/month.
      canAddStarterPhone: phone.access.plan === "Starter" && phone.paidAndActive,
      isTrial: phone.access.isTrial,
    });
  }

  const admin = createAdminClient();
  const settings = await loadPhoneSettings(phone.companyId);
  const [usage, { data: number }, { data: policy }] = await Promise.all([
    phoneUsage(phone.companyId, phone.userId, phone.allowance, settings),
    admin.from("phone_numbers").select("phone_number").eq("company_id", phone.companyId).eq("user_id", phone.userId).eq("status", "active").maybeSingle(),
    admin.from("phone_policy_acceptances").select("accepted_at").eq("company_id", phone.companyId).eq("user_id", phone.userId).maybeSingle(),
  ]);

  return NextResponse.json({
    allowed: true,
    configured,
    isManager: phone.isManager,
    plan: phone.access.plan,
    scorecards: phone.scorecards,
    myNumber: number?.phone_number ?? null,
    policyAccepted: Boolean(policy),
    usage,
    settings: {
      non_lead_policy: settings.non_lead_policy,
      announcement: settings.announcement,
      hours_start: settings.hours_start,
      hours_end: settings.hours_end,
      timezone: settings.timezone,
      long_call_minutes: settings.long_call_minutes,
      rep_minute_limits: phone.isManager ? settings.rep_minute_limits : {},
      overage_enabled: settings.overage_enabled,
      overage_cap: settings.overage_cap,
    },
  });
}
