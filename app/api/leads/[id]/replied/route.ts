import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { handleLeadReply } from "@/lib/automation";

/* "Mark as replied" from the app: stops follow-ups and moves the deal to Responded. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { note } = (await request.json().catch(() => ({}))) as { note?: string };

  const { data: lead } = await supabase.from("leads").select("id, company_id").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  await handleLeadReply(supabase, {
    userId: access.user.id,
    leadId: lead.id,
    companyId: lead.company_id,
    from: "Marked manually",
    snippet: note?.slice(0, 500) || "Marked as replied in BaseLead.",
    source: "manual",
  });

  return NextResponse.json({ success: true });
}
