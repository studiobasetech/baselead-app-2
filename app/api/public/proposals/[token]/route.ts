import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { loadPublicProposal } from "@/lib/public-proposal";
import { logActivity } from "@/lib/automation";
import { amountDue } from "@/lib/proposals";
import { getWorkspaceSecret } from "@/lib/workspace-secrets";

// Public: the client opens the proposal link.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Proposals are not configured." }, { status: 503 });
  }

  const { token } = await params;
  const { admin, proposal, company } = await loadPublicProposal(token);

  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  // First view: record it and tell the rep.
  if (!proposal.viewed_at && proposal.status !== "draft") {
    const now = new Date().toISOString();

    await admin
      .from("proposals")
      .update({ viewed_at: now, status: proposal.status === "sent" ? "viewed" : proposal.status })
      .eq("id", proposal.id);

    if (proposal.lead_id) {
      await logActivity(admin, {
        leadId: proposal.lead_id,
        companyId: proposal.company_id,
        userId: proposal.user_id,
        type: "proposal_viewed",
        title: `Proposal opened by the client: ${proposal.title}`,
      });

      await admin.from("tasks").insert({
        company_id: proposal.company_id,
        user_id: proposal.user_id,
        lead_id: proposal.lead_id,
        title: `${proposal.client_name || "The client"} opened your proposal — follow up now`,
        type: "call",
        due_at: now,
        source: "automation",
      });
    }

    proposal.viewed_at = now;
    if (proposal.status === "sent") proposal.status = "viewed";
  }

  const stripe = proposal.payment_mode !== "none"
    ? await getWorkspaceSecret(proposal.company_id ?? "", "stripe").catch(() => null)
    : null;

  return NextResponse.json({
    proposal: {
      number: proposal.number,
      title: proposal.title,
      intro: proposal.intro,
      line_items: proposal.line_items,
      currency: proposal.currency,
      discount: proposal.discount,
      tax_rate: proposal.tax_rate,
      subtotal: proposal.subtotal,
      total: proposal.total,
      terms: proposal.terms,
      valid_until: proposal.valid_until,
      payment_mode: proposal.payment_mode,
      deposit_percent: proposal.deposit_percent,
      amount_due: amountDue(proposal),
      status: proposal.status,
      client_name: proposal.client_name,
      signer_name: proposal.signer_name,
      signed_at: proposal.signed_at,
      signature_data: proposal.signature_data,
      paid_at: proposal.paid_at,
      amount_paid: proposal.amount_paid,
      created_at: proposal.created_at,
      can_pay: Boolean(stripe),
    },
    company,
  });
}
