import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { detectReplies, runSequences } from "@/lib/automation";
import { sendOutreachEmail } from "@/lib/outreach-send";
import { effectivePlan, getPlan } from "@/lib/plans";

/*
 * The automation heartbeat. Call every 15 minutes (vercel.json cron).
 *  1. Detect replies in Gmail → lead moves to Responded, sequence stops.
 *  2. Send due sequence steps (Pro/Scale).
 *  3. Send due scheduled emails (Pro/Scale).
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

  const summary = { users: 0, replies: 0, sequenceEmails: 0, scheduled: 0, errors: [] as string[] };

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

  return NextResponse.json(summary);
}
