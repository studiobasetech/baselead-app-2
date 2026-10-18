import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { planRequiredBody } from "@/lib/workspace";
import { getManagerAccess } from "@/lib/team-access";

type Rep = {
  userId: string;
  name: string;
  email: string;
  role: string;
  goal: number | null;
  leads: number;
  emails: number;
  replies: number;
  meetings: number;
  proposals: number;
  wonDeals: number;
  wonValue: number;
  monthWonValue: number;
  openTasks: number;
  overdueTasks: number;
  lastActivity: string | null;
};

// Team performance for owners, admins and managers (Pro/Scale).
export async function GET(request: Request) {
  const supabase = await createClient();
  const { access, isManager } = await getManagerAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!isManager) {
    return NextResponse.json({ error: "Only owners, admins and managers can see team performance." }, { status: 403 });
  }
  if (!access.can("advanced_reports")) {
    return NextResponse.json(planRequiredBody("advanced_reports"), { status: 402 });
  }
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local." }, { status: 503 });
  }

  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const companyId = access.company.id;
  const admin = createAdminClient();

  const [{ data: company }, { data: members }] = await Promise.all([
    admin.from("company_profiles").select("user_id, owner_monthly_goal").eq("id", companyId).maybeSingle(),
    admin.from("team_members").select("user_id, name, email, role, status, monthly_goal").eq("company_id", companyId).eq("status", "active"),
  ]);

  const reps = new Map<string, Rep>();
  const blank = (userId: string, name: string, email: string, role: string, goal: number | null): Rep => ({
    userId, name, email, role, goal,
    leads: 0, emails: 0, replies: 0, meetings: 0, proposals: 0,
    wonDeals: 0, wonValue: 0, monthWonValue: 0, openTasks: 0, overdueTasks: 0, lastActivity: null,
  });

  if (company?.user_id) {
    const { data: owner } = await admin.auth.admin.getUserById(company.user_id);
    reps.set(
      company.user_id,
      blank(
        company.user_id,
        owner?.user?.user_metadata?.full_name || owner?.user?.email?.split("@")[0] || "Owner",
        owner?.user?.email || "",
        "Owner",
        company.owner_monthly_goal ?? null
      )
    );
  }

  for (const member of members ?? []) {
    if (member.user_id && !reps.has(member.user_id)) {
      reps.set(member.user_id, blank(member.user_id, member.name || member.email || "Member", member.email || "", member.role || "Member", member.monthly_goal ?? null));
    }
  }

  const ids = [...reps.keys()];

  const [leads, outreach, meetings, proposals, tasks, activity, wonLeads] = await Promise.all([
    admin.from("leads").select("assigned_to, user_id, created_at").eq("company_id", companyId).gte("created_at", since),
    admin.from("outreach").select("user_id, sent_at, replied_at").in("user_id", ids).or(`sent_at.gte.${since},replied_at.gte.${since}`),
    admin.from("calendar_events").select("user_id, starts_at").eq("company_id", companyId).gte("starts_at", since),
    admin.from("proposals").select("user_id, sent_at").eq("company_id", companyId).gte("sent_at", since),
    admin.from("tasks").select("user_id, due_at").eq("company_id", companyId).is("completed_at", null),
    admin.from("lead_activities").select("user_id, created_at, type, metadata, lead_id").eq("company_id", companyId).gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
    admin.from("leads").select("assigned_to, user_id, deal_value, updated_at").eq("company_id", companyId).eq("status", "won").gte("updated_at", since),
  ]);

  const rep = (userId: string | null | undefined) => (userId ? reps.get(userId) : undefined);

  for (const row of leads.data ?? []) {
    const r = rep(row.assigned_to || row.user_id);
    if (r) r.leads++;
  }
  for (const row of outreach.data ?? []) {
    const r = rep(row.user_id);
    if (!r) continue;
    if (row.sent_at && row.sent_at >= since) r.emails++;
    if (row.replied_at && row.replied_at >= since) r.replies++;
  }
  for (const row of meetings.data ?? []) {
    const r = rep(row.user_id);
    if (r) r.meetings++;
  }
  for (const row of proposals.data ?? []) {
    const r = rep(row.user_id);
    if (r) r.proposals++;
  }
  const now = Date.now();
  for (const row of tasks.data ?? []) {
    const r = rep(row.user_id);
    if (!r) continue;
    r.openTasks++;
    if (row.due_at && new Date(row.due_at).getTime() < now - 3600000) r.overdueTasks++;
  }
  for (const row of activity.data ?? []) {
    const r = rep(row.user_id);
    if (r && !r.lastActivity) r.lastActivity = row.created_at;
  }
  for (const row of wonLeads.data ?? []) {
    const r = rep(row.assigned_to || row.user_id);
    if (!r) continue;
    r.wonDeals++;
    r.wonValue += Number(row.deal_value) || 0;
    if (row.updated_at >= monthStart) r.monthWonValue += Number(row.deal_value) || 0;
  }

  // Funnel for the whole workspace (current stages).
  const { data: stageRows } = await admin.from("leads").select("status").eq("company_id", companyId);
  const funnelOrder = ["new", "contacted", "responded", "meeting", "qualified", "proposal", "negotiation", "won"];
  const funnel = funnelOrder.map((stage) => ({
    stage,
    count: (stageRows ?? []).filter((row) => (row.status ?? "new").toLowerCase() === stage).length,
  }));

  return NextResponse.json({
    days,
    reps: [...reps.values()].sort((a, b) => b.wonValue - a.wonValue || b.emails - a.emails),
    funnel,
    canEditGoals: access.isOwner,
  });
}
