import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { advanceLead, logActivity } from "@/lib/automation";

const OUTCOMES: Record<string, string> = {
  connected: "Connected",
  interested: "Interested",
  meeting_booked: "Meeting booked",
  voicemail: "Left voicemail",
  no_answer: "No answer",
  not_interested: "Not interested",
  wrong_number: "Wrong number",
};

// Logs a phone call: outcome, notes, follow-up task and automatic stage.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    outcome?: string;
    notes?: string;
    durationMinutes?: number;
    followUpDays?: number | null;
  };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const outcome = body.outcome && OUTCOMES[body.outcome] ? body.outcome : "connected";

  const { data: lead } = await supabase
    .from("leads")
    .select("id, company, name, contact_name")
    .eq("id", id)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  await logActivity(supabase, {
    leadId: id,
    companyId: access.company.id,
    userId: access.user.id,
    type: "call",
    title: `Call: ${OUTCOMES[outcome]}${body.durationMinutes ? ` (${body.durationMinutes} min)` : ""}`,
    body: body.notes?.trim() || null,
    metadata: { outcome, duration_minutes: body.durationMinutes ?? null },
  });

  // Automatic pipeline from the call result.
  if (["connected", "voicemail", "no_answer"].includes(outcome)) {
    await advanceLead(supabase, id, "contacted", `Call: ${OUTCOMES[outcome]}.`, access.user.id);
  } else if (outcome === "interested") {
    await advanceLead(supabase, id, "qualified", "Interested on the phone.", access.user.id);
  } else if (outcome === "meeting_booked") {
    await advanceLead(supabase, id, "meeting", "Meeting booked on the phone.", access.user.id);
  } else if (outcome === "not_interested") {
    await supabase.from("leads").update({ status: "nurture" }).eq("id", id);
  }

  // Follow-up task.
  const days =
    body.followUpDays === null
      ? null
      : body.followUpDays ?? (outcome === "no_answer" || outcome === "voicemail" ? 2 : null);

  if (days) {
    await supabase.from("tasks").insert({
      company_id: access.company.id,
      user_id: access.user.id,
      lead_id: id,
      title: `${outcome === "no_answer" || outcome === "voicemail" ? "Try calling again" : "Follow up with"} ${lead.contact_name || lead.company || lead.name}`,
      type: "call",
      due_at: new Date(Date.now() + days * 86400000).toISOString(),
      source: "call",
    });
  }

  return NextResponse.json({ success: true });
}
