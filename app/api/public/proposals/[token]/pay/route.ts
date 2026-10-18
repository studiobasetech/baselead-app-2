import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { loadPublicProposal } from "@/lib/public-proposal";
import { getWorkspaceSecret } from "@/lib/workspace-secrets";
import { amountDue } from "@/lib/proposals";
import { appUrl, stripeRequest } from "@/lib/stripe";

// Public: starts the payment, paid to the business's own Stripe account.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const { token } = await params;
  const { proposal, company } = await loadPublicProposal(token);

  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  if (proposal.status !== "signed") {
    return NextResponse.json(
      { error: proposal.status === "paid" ? "Already paid." : "Please sign the proposal first." },
      { status: 400 }
    );
  }

  const due = amountDue(proposal);
  if (due <= 0) return NextResponse.json({ error: "Nothing to pay." }, { status: 400 });

  const stripe = await getWorkspaceSecret(proposal.company_id ?? "", "stripe");

  if (!stripe) {
    return NextResponse.json(
      { error: "Online payment is not available for this proposal." },
      { status: 400 }
    );
  }

  const base = appUrl(request);

  try {
    const session = await stripeRequest<{ id: string; url: string }>(
      "POST",
      "checkout/sessions",
      {
        mode: "payment",
        customer_email: proposal.client_email || undefined,
        line_items: {
          0: {
            quantity: 1,
            price_data: {
              currency: proposal.currency,
              unit_amount: Math.round(due * 100),
              product_data: {
                name: `${proposal.title}${proposal.payment_mode === "deposit" ? ` — ${proposal.deposit_percent}% deposit` : ""}`,
                description: `${company?.company_name || ""} · ${proposal.number || ""}`.trim(),
              },
            },
          },
        },
        metadata: { proposal_id: proposal.id },
        success_url: `${base}/api/public/proposals/${token}/paid?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/p/${token}`,
      },
      stripe.secret
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the payment." },
      { status: 500 }
    );
  }
}
