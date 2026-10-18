import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { loadPublicProposal } from "@/lib/public-proposal";
import { logActivity } from "@/lib/automation";

// Public: the client declines the proposal.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Proposals are not configured." }, { status: 503 });
  }

  const { token } = await params;
  const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };
  const { admin, proposal } = await loadPublicProposal(token);

  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  if (["signed", "paid"].includes(proposal.status)) {
    return NextResponse.json({ error: "This proposal is already signed." }, { status: 400 });
  }

  const now = new Date().toISOString();

  await admin
    .from("proposals")
    .update({ status: "declined", declined_at: now, decline_reason: reason?.slice(0, 1000) || null })
    .eq("id", proposal.id);

  if (proposal.lead_id) {
    await logActivity(admin, {
      leadId: proposal.lead_id,
      companyId: proposal.company_id,
      userId: proposal.user_id,
      type: "proposal_declined",
      title: `Proposal declined: ${proposal.title}`,
      body: reason || null,
    });

    await admin.from("tasks").insert({
      company_id: proposal.company_id,
      user_id: proposal.user_id,
      lead_id: proposal.lead_id,
      title: `${proposal.client_name || "The client"} declined the proposal — call to understand why`,
      type: "call",
      due_at: now,
      source: "automation",
    });
  }

  return NextResponse.json({ success: true });
}
