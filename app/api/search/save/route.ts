import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { cleanLeadRow, saveLeadRows } from "@/lib/search/process-search";
import { dispatchWebhooks } from "@/lib/webhooks";

/*
 * Saves search results the user chose (Save all / Save selected).
 * Body: { searchId, leads: DraftLead[] }
 * Returns { saved: [{ draftId, lead }], skipped, remaining }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!access.active) {
    return NextResponse.json({ code: "SUBSCRIPTION_REQUIRED", error: "Your trial or subscription is not active." }, { status: 402 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    searchId?: string | null;
    leads?: (Record<string, unknown> & { id?: string })[];
  };
  const drafts = (body.leads ?? []).filter((lead) => typeof lead?.id === "string" && lead.id.startsWith("draft-")).slice(0, 60);
  if (!drafts.length) return NextResponse.json({ error: "Select at least one lead to save." }, { status: 400 });

  // Monthly (or trial) lead limit counts saved leads only.
  const usageStart = access.isTrial
    ? access.company.trial_started_at
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  let usage = supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", access.company.id);
  if (usageStart) usage = usage.gte("created_at", usageStart);
  const { count } = await usage;
  const remaining = Math.max(0, access.leadLimit - (count ?? 0));
  if (remaining <= 0) {
    return NextResponse.json(
      {
        code: "LEAD_LIMIT_REACHED",
        error: access.isTrial
          ? "Your free trial lead limit is reached. Choose a plan to save more leads."
          : "You reached your plan's lead limit for this month. Upgrade to save more.",
      },
      { status: 402 }
    );
  }

  // Skip businesses already saved in this workspace.
  const sourceIds = drafts.map((lead) => lead.source_id).filter((id): id is string => typeof id === "string" && Boolean(id));
  const { data: existing } = sourceIds.length
    ? await supabase.from("leads").select("id, source_id").eq("company_id", access.company.id).in("source_id", sourceIds)
    : { data: [] as { id: string; source_id: string }[] };
  const existingBySource = new Map((existing ?? []).map((row) => [row.source_id as string, row.id as string]));

  const toSave = drafts.filter((lead) => !(typeof lead.source_id === "string" && existingBySource.has(lead.source_id)));
  const allowed = toSave.slice(0, remaining);

  let inserted: Record<string, unknown>[] = [];
  if (allowed.length) {
    const result = await saveLeadRows(
      supabase,
      body.searchId || null,
      allowed.map((lead) => cleanLeadRow(lead, access.user.id, access.company.id)),
      access.company.id
    );
    inserted = result.leads as Record<string, unknown>[];
  }

  // Match saved rows back to the drafts (same order as inserted).
  const saved = allowed.map((draft, index) => ({ draftId: draft.id as string, lead: inserted[index] ?? null }));
  const already = drafts
    .filter((lead) => typeof lead.source_id === "string" && existingBySource.has(lead.source_id))
    .map((lead) => ({ draftId: lead.id as string, leadId: existingBySource.get(lead.source_id as string) }));

  if (inserted.length && access.can("integrations_webhooks")) {
    void dispatchWebhooks(supabase, access.user.id, "lead.created", inserted).catch(() => undefined);
  }

  return NextResponse.json({
    saved,
    already,
    overLimit: toSave.length - allowed.length,
    remaining: remaining - allowed.length,
  });
}
