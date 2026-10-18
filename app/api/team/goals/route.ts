import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getManagerAccess } from "@/lib/team-access";

// Owner sets a monthly revenue goal for a rep.
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { access } = await getManagerAccess(supabase);

  if (!access?.isOwner) {
    return NextResponse.json({ error: "Only the workspace owner can set goals." }, { status: 403 });
  }
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local." }, { status: 503 });
  }

  const { userId, goal } = (await request.json().catch(() => ({}))) as { userId?: string; goal?: number | null };
  const value = goal === null || goal === undefined || Number.isNaN(Number(goal)) ? null : Math.max(0, Number(goal));
  const admin = createAdminClient();

  const { error } =
    userId === access.user.id
      ? await admin.from("company_profiles").update({ owner_monthly_goal: value }).eq("id", access.company.id)
      : await admin.from("team_members").update({ monthly_goal: value }).eq("company_id", access.company.id).eq("user_id", userId ?? "");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
