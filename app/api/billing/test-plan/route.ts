import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";
import { isPlanName } from "@/lib/plans";

/*
 * DEVELOPMENT ONLY: switch plans without paying, to test each level.
 * Disabled automatically in production (npm run build / deploy).
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const { plan, trial } = (await request.json().catch(() => ({}))) as {
    plan?: string;
    trial?: boolean;
  };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access || !access.isOwner) {
    return NextResponse.json({ error: "Owner only." }, { status: 403 });
  }

  if (!hasAdminClient()) {
    return NextResponse.json(
      {
        error:
          "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to use test plans.",
      },
      { status: 503 }
    );
  }

  const update = trial
    ? {
        plan: "Starter",
        billing_status: "trialing",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }
    : isPlanName(plan)
      ? { plan, billing_status: "active" }
      : null;

  if (!update) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("company_profiles")
    .update(update)
    .eq("id", access.company.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
