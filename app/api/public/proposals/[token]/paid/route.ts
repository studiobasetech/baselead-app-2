import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { loadPublicProposal } from "@/lib/public-proposal";
import { getWorkspaceSecret } from "@/lib/workspace-secrets";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { advanceLead, logActivity } from "@/lib/automation";
import { formatMoney } from "@/lib/proposals";

// Stripe returns the client here after paying. We verify with Stripe.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const base = appUrl(request);
  const back = (query: string) => NextResponse.redirect(`${base}/p/${token}?${query}`);

  if (!hasAdminClient()) return back("payment=error");

  const sessionId = new URL(request.url).searchParams.get("session_id");
  const { admin, proposal } = await loadPublicProposal(token);

  if (!proposal || !sessionId) return back("payment=error");
  if (proposal.status === "paid") return back("payment=success");

  const stripe = await getWorkspaceSecret(proposal.company_id ?? "", "stripe");
  if (!stripe) return back("payment=error");

  try {
    const session = await stripeRequest<{
      payment_status: string;
      amount_total: number;
      metadata?: { proposal_id?: string };
    }>("GET", `checkout/sessions/${sessionId}`, {}, stripe.secret);

    if (session.metadata?.proposal_id !== proposal.id || session.payment_status !== "paid") {
      return back("payment=error");
    }

    const paid = session.amount_total / 100;
    const now = new Date().toISOString();

    await admin
      .from("proposals")
      .update({
        status: "paid",
        paid_at: now,
        amount_paid: paid,
        stripe_session_id: sessionId,
        updated_at: now,
      })
      .eq("id", proposal.id);

    if (proposal.lead_id) {
      await logActivity(admin, {
        leadId: proposal.lead_id,
        companyId: proposal.company_id,
        userId: proposal.user_id,
        type: "payment",
        title: `Payment received: ${formatMoney(paid, proposal.currency)} for ${proposal.title}`,
        metadata: { proposal_id: proposal.id, session_id: sessionId },
      });

      await admin
        .from("leads")
        .update({ deal_value: proposal.total })
        .eq("id", proposal.lead_id);

      await advanceLead(admin, proposal.lead_id, "won", "Proposal paid.", proposal.user_id);
    }

    return back("payment=success");
  } catch {
    return back("payment=error");
  }
}
