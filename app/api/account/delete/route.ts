import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, stripeRequest } from "@/lib/stripe";

/*
 * Permanently deletes the signed-in user, their workspace (if owner)
 * and all its data. Requires { confirm: "DELETE" }.
 */
export async function POST(request: Request) {
  const { confirm } = (await request.json().catch(() => ({}))) as {
    confirm?: string;
  };

  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }

  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "Account deletion is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("company_profiles")
    .select("id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Stop billing first.
  if (company?.stripe_subscription_id && isStripeConfigured()) {
    try {
      await stripeRequest("POST", `subscriptions/${company.stripe_subscription_id}/cancel`);
    } catch (error) {
      console.error("Stripe cancel on delete failed:", error);
    }
  }

  const byUser = [
    "api_keys",
    "calendar_events",
    "outreach",
    "webhooks",
    "user_settings",
    "connected_integrations",
    "integration_credentials",
    "team_members",
    "searches",
    "leads",
  ];

  for (const table of byUser) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) console.error(`Delete ${table}:`, error.message);
  }

  if (company?.id) {
    for (const table of ["team_invitations", "team_members", "calendar_events", "leads"]) {
      const { error } = await admin.from(table).delete().eq("company_id", company.id);
      if (error) console.error(`Delete ${table} by company:`, error.message);
    }

    await admin.from("company_profiles").delete().eq("id", company.id);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
