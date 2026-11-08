import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneRoute } from "../../_shared";

const OUTCOMES = new Set(["connected", "voicemail", "no_answer", "interested", "meeting", "not_interested", "wrong_number", "callback"]);

// Rep: outcome + notes on their own call. Manager: score, note, flag.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  const { id } = await context.params;

  const admin = createAdminClient();
  const { data: call } = await admin.from("calls").select("id, user_id, company_id, lead_id").eq("id", id).maybeSingle();
  if (!call || call.company_id !== phone.companyId) return NextResponse.json({ error: "Call not found." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    outcome?: string; notes?: string; score?: number | null; manager_note?: string; flagged?: boolean; lead_id?: string;
  };

  const update: Record<string, unknown> = {};
  const own = call.user_id === phone.userId;

  if (own || phone.isManager) {
    if (body.outcome !== undefined) {
      if (body.outcome && !OUTCOMES.has(body.outcome)) return NextResponse.json({ error: "Unknown result." }, { status: 400 });
      update.outcome = body.outcome || null;
    }
    if (body.notes !== undefined) update.notes = String(body.notes).slice(0, 4000);
  }

  if (phone.isManager) {
    if (body.score !== undefined) {
      if (!phone.scorecards) return NextResponse.json({ error: "Call scorecards are included in the Scale plan." }, { status: 403 });
      update.score = body.score === null ? null : Math.min(5, Math.max(1, Math.round(Number(body.score))));
    }
    if (body.manager_note !== undefined) update.manager_note = String(body.manager_note).slice(0, 4000);
    if (body.flagged !== undefined) update.flagged = Boolean(body.flagged);
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const { error: saveError } = await admin.from("calls").update(update).eq("id", id);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  // Keep the lead's history up to date in the CRM.
  if (call.lead_id && (update.outcome || update.notes)) {
    await admin.from("lead_activities").insert({
      company_id: phone.companyId,
      lead_id: call.lead_id,
      user_id: phone.userId,
      type: "call",
      title: `Call: ${String(update.outcome ?? "logged").replace(/_/g, " ")}`,
      body: typeof update.notes === "string" ? update.notes : null,
    }).then(() => undefined, () => undefined);
  }

  return NextResponse.json({ success: true });
}
