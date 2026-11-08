import { NextResponse } from "next/server";
import { phoneRoute } from "../_shared";

// Call log. Reps get their own calls, managers the whole team (enforced by database rules).
export async function GET(request: Request) {
  const { error, phone, supabase } = await phoneRoute();
  if (error) return error;

  const url = new URL(request.url);
  const rep = url.searchParams.get("rep");
  const outcome = url.searchParams.get("outcome");
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const flaggedOnly = url.searchParams.get("flagged") === "1";
  const alertsOnly = url.searchParams.get("alerts") === "1";
  const leadId = url.searchParams.get("lead");

  let query = supabase
    .from("calls")
    .select("*, lead:leads(id, name, company)")
    .eq("company_id", phone.companyId)
    .gte("started_at", new Date(Date.now() - days * 86400000).toISOString())
    .order("started_at", { ascending: false })
    .limit(300);

  if (!phone.isManager) query = query.eq("user_id", phone.userId);
  else if (rep) query = query.eq("user_id", rep);
  if (outcome) query = query.eq("outcome", outcome);
  if (flaggedOnly) query = query.eq("flagged", true);
  if (alertsOnly) query = query.neq("flags", "{}");
  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error: listError } = await query;
  if (listError) {
    const missing = /relation .*calls|does not exist|schema cache/i.test(listError.message);
    return NextResponse.json(
      { error: missing ? "Run supabase/UPDATE_12_RUN_THIS.sql in Supabase first." : listError.message },
      { status: 500 }
    );
  }

  // Rep names for the manager view.
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, name, email")
    .eq("company_id", phone.companyId)
    .eq("status", "active");

  const reps: Record<string, string> = {};
  for (const member of members ?? []) {
    if (member.user_id) reps[member.user_id] = member.name || member.email || "Rep";
  }
  const meta = (phone.access.user.user_metadata ?? {}) as Record<string, string>;
  reps[phone.userId] = reps[phone.userId] || meta.full_name || meta.name || phone.access.user.email || "Me";

  return NextResponse.json({ calls: data ?? [], reps, isManager: phone.isManager, scorecards: phone.scorecards, me: phone.userId });
}
