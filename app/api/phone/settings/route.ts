import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPhoneSettings } from "@/lib/phone/access";
import { phoneRoute, planRequired } from "../_shared";

export async function GET() {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  return NextResponse.json({ settings: await loadPhoneSettings(phone.companyId) });
}

// Managers change the phone rules.
export async function PUT(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.allowed) return planRequired();
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can change phone rules." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const current = await loadPhoneSettings(phone.companyId);
  const hour = (value: unknown, fallback: number) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n >= 0 && n <= 24 ? n : fallback;
  };

  let limits = current.rep_minute_limits;
  if (body.rep_minute_limits !== undefined) {
    if (!phone.scorecards) return NextResponse.json({ error: "Per-rep limits are included in the Scale plan." }, { status: 403 });
    limits = {};
    for (const [userId, minutes] of Object.entries((body.rep_minute_limits ?? {}) as Record<string, unknown>)) {
      const n = Math.round(Number(minutes));
      if (n > 0) limits[userId] = n;
    }
  }

  const next = {
    company_id: phone.companyId,
    non_lead_policy: body.non_lead_policy === "block" ? "block" : body.non_lead_policy === "flag" ? "flag" : current.non_lead_policy,
    announcement: typeof body.announcement === "boolean" ? body.announcement : current.announcement,
    hours_start: hour(body.hours_start, current.hours_start),
    hours_end: hour(body.hours_end, current.hours_end),
    timezone: typeof body.timezone === "string" && body.timezone.length < 60 ? body.timezone : current.timezone,
    long_call_minutes: Math.min(240, Math.max(5, Math.round(Number(body.long_call_minutes ?? current.long_call_minutes)) || 45)),
    rep_minute_limits: limits,
    updated_at: new Date().toISOString(),
  };

  const { error: saveError } = await createAdminClient().from("phone_settings").upsert(next);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ success: true, settings: next });
}
