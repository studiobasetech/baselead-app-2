import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { sendOutreachEmail } from "@/lib/outreach-send";
import { effectivePlan, getPlan } from "@/lib/plans";

/*
 * Sends scheduled outreach that is due (Pro/Scale automation).
 * Call every 15 minutes from a scheduler (vercel.json cron is included).
 * Protected by CRON_SECRET: header "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();

  const { data: due } = await admin
    .from("outreach")
    .select("id, user_id")
    .eq("status", "scheduled")
    .is("sent_at", null)
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  let sent = 0;
  const errors: string[] = [];

  for (const item of due ?? []) {
    const { data: company } = await admin
      .from("company_profiles")
      .select("plan, billing_status")
      .eq("user_id", item.user_id)
      .maybeSingle();

    const plan = getPlan(effectivePlan(company?.plan, company?.billing_status));

    if (
      company?.billing_status !== "active" ||
      !plan.features.includes("outreach_automation")
    ) {
      continue;
    }

    try {
      await sendOutreachEmail(admin, item.id);
      sent++;
    } catch (error) {
      errors.push(`${item.id}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  return NextResponse.json({ checked: due?.length ?? 0, sent, errors });
}
