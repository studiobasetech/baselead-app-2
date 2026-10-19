import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { detectReplies, runSequences } from "@/lib/automation";
import { sendOutreachEmail } from "@/lib/outreach-send";
import { effectivePlan, getPlan } from "@/lib/plans";
import { sendMeetingReminders, sendWeeklyReport } from "@/lib/notify";

/*
 * The automation heartbeat. Call every 15 minutes (vercel.json cron).
 *  1. Detect replies in Gmail → lead moves to Responded, sequence stops.
 *  2. Send due sequence steps (Pro/Scale).
 *  3. Send due scheduled emails (Pro/Scale).
 *  4. Email meeting reminders (1 hour before) and the Monday weekly report.
 * Protected by CRON_SECRET: "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasAdminClient()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 503 });
  }

  const admin = createAdminClient();

  // Everyone with Gmail connected.
  const { data: gmailUsers } = await admin
    .from("integration_credentials")
    .select("user_id")
    .eq("provider", "gmail");

  const summary = { users: 0, replies: 0, sequenceEmails: 0, scheduled: 0, reminders: 0, weeklyReports: 0, errors: [] as string[] };

  for (const { user_id: userId } of gmailUsers ?? []) {
    summary.users++;

    const { data: membership } = await admin
      .from("team_members")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const { data: company } = await admin
      .from("company_profiles")
      .select("plan, billing_status, trial_ends_at")
      .or(`user_id.eq.${userId}${membership?.company_id ? `,id.eq.${membership.company_id}` : ""}`)
      .limit(1)
      .maybeSingle();

    const trialOk =
      company?.billing_status === "trialing" &&
      (!company.trial_ends_at || new Date(company.trial_ends_at).getTime() > Date.now());
    const active = company?.billing_status === "active" || trialOk;

    if (!active) continue;

    try {
      const replies = await detectReplies(admin, userId);
      summary.replies += replies.replies;
    } catch (error) {
      summary.errors.push(`replies ${userId}: ${error instanceof Error ? error.message : "failed"}`);
    }

    const plan = getPlan(effectivePlan(company?.plan, company?.billing_status));
    if (!plan.features.includes("outreach_automation")) continue;

    const sequences = await runSequences(admin, userId);
    summary.sequenceEmails += sequences.sent;
    summary.errors.push(...sequences.errors.slice(0, 3));

    const { data: scheduled } = await admin
      .from("outreach")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "scheduled")
      .is("sent_at", null)
      .lte("scheduled_at", new Date().toISOString())
      .limit(25);

    for (const item of scheduled ?? []) {
      try {
        await sendOutreachEmail(admin, item.id);
        summary.scheduled++;
      } catch (error) {
        summary.errors.push(`scheduled ${item.id}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
  }

  // 4a. Meeting reminders for everyone with a meeting in 45–60 minutes.
  const { data: soon } = await admin
    .from("calendar_events")
    .select("user_id")
    .gte("starts_at", new Date(Date.now() + 45 * 60000).toISOString())
    .lt("starts_at", new Date(Date.now() + 60 * 60000).toISOString())
    .limit(500);

  for (const userId of new Set((soon ?? []).map((event) => event.user_id as string))) {
    summary.reminders += await sendMeetingReminders(admin, userId).catch(() => 0);
  }

  // 4b. Weekly report: Mondays, first run after 13:00 UTC (morning in the Americas).
  const now = new Date();
  if (now.getUTCDay() === 1 && now.getUTCHours() === 13 && now.getUTCMinutes() < 15) {
    const { data: members } = await admin
      .from("team_members")
      .select("user_id")
      .eq("status", "active")
      .limit(2000);
    const { data: owners } = await admin.from("company_profiles").select("user_id").limit(2000);

    const everyone = new Set(
      [...(members ?? []), ...(owners ?? [])].map((row) => row.user_id as string).filter(Boolean)
    );

    for (const userId of everyone) {
      const result = await sendWeeklyReport(admin, userId).catch(() => null);
      if (result?.sent) summary.weeklyReports++;
    }
  }

  return NextResponse.json(summary);
}
