import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";
import { TRIAL_DURATION_DAYS, TRIAL_LEAD_LIMIT } from "@/lib/plans";

/*
 * New accounts start free with no plan ("inactive").
 * The owner taps "Start my 7-day free trial" → this starts the trial once.
 */
export async function POST() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!access.isOwner) {
    return NextResponse.json({ error: "Ask the workspace owner to start the free trial." }, { status: 403 });
  }
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Billing is not configured on the server yet." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("company_profiles")
    .select("id, billing_status, trial_started_at")
    .eq("id", access.company.id)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (company.trial_started_at || company.billing_status !== "inactive") {
    return NextResponse.json({ error: "Your free trial was already used. Choose a plan to continue." }, { status: 409 });
  }

  const now = new Date();
  const ends = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86400000);
  const { error } = await admin
    .from("company_profiles")
    .update({
      plan: "Starter",
      billing_status: "trialing",
      trial_started_at: now.toISOString(),
      trial_ends_at: ends.toISOString(),
      trial_lead_limit: TRIAL_LEAD_LIMIT,
    })
    .eq("id", company.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, trialEndsAt: ends.toISOString() });
}
