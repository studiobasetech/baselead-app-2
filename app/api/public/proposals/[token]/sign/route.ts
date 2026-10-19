import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { loadPublicProposal } from "@/lib/public-proposal";
import { advanceLead, logActivity } from "@/lib/automation";
import { notifyUser } from "@/lib/notify";
import { formatMoney } from "@/lib/proposals";
import { dispatchWebhooks } from "@/lib/webhooks";

// Public: the client signs the proposal.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Proposals are not configured." }, { status: 503 });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    signature?: string;
    agree?: boolean;
  };

  const name = body.name?.trim() ?? "";
  const signature = body.signature ?? "";

  if (!name || !body.agree || !signature.startsWith("data:image/png;base64,") || signature.length > 400000) {
    return NextResponse.json(
      { error: "Please type your name, sign and accept the terms." },
      { status: 400 }
    );
  }

  const { admin, proposal } = await loadPublicProposal(token);

  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  if (["signed", "paid"].includes(proposal.status)) {
    return NextResponse.json({ error: "This proposal is already signed." }, { status: 400 });
  }

  if (proposal.valid_until && new Date(`${proposal.valid_until}T23:59:59`).getTime() < Date.now()) {
    return NextResponse.json({ error: "This proposal has expired." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  await admin
    .from("proposals")
    .update({
      status: "signed",
      signed_at: now,
      signer_name: name,
      signer_email: body.email?.trim() || proposal.client_email,
      signature_data: signature,
      signer_ip: ip,
      updated_at: now,
    })
    .eq("id", proposal.id);

  if (proposal.lead_id) {
    await logActivity(admin, {
      leadId: proposal.lead_id,
      companyId: proposal.company_id,
      userId: proposal.user_id,
      type: "proposal_signed",
      title: `Proposal signed by ${name} (${formatMoney(proposal.total, proposal.currency)})`,
      metadata: { proposal_id: proposal.id, ip },
    });

    // No payment step → the deal is won now.
    await advanceLead(
      admin,
      proposal.lead_id,
      proposal.payment_mode === "none" ? "won" : "negotiation",
      "Proposal signed.",
      proposal.user_id
    );

    await admin.from("tasks").insert({
      company_id: proposal.company_id,
      user_id: proposal.user_id,
      lead_id: proposal.lead_id,
      title: `🎉 ${name} signed "${proposal.title}" — start onboarding`,
      type: "todo",
      due_at: now,
      source: "automation",
    });

    if (proposal.user_id) {
      void dispatchWebhooks(admin, proposal.user_id, "lead.status_changed", {
        id: proposal.lead_id,
        proposal_id: proposal.id,
        event: "proposal.signed",
      }).catch(() => undefined);
    }
  }

  await notifyUser(admin, proposal.user_id, "proposal_signed", {
    subject: `Signed: ${proposal.title} (${formatMoney(proposal.total, proposal.currency)})`,
    heading: `${name} signed your proposal ✍️`,
    lines: [
      `"${proposal.title}" — ${formatMoney(proposal.total, proposal.currency)}`,
      proposal.payment_mode === "none"
        ? "The deal is marked as Won."
        : "They're being sent to payment next. The deal moved to Negotiation.",
    ],
    ctaLabel: "View proposal",
    ctaPath: "/proposals",
  });

  return NextResponse.json({ success: true, needsPayment: proposal.payment_mode !== "none" });
}
