import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { getGoogleAccessToken, sendGmail } from "@/lib/integrations/google-api";
import { advanceLead, logActivity } from "@/lib/automation";
import { formatMoney } from "@/lib/proposals";
import { appUrl } from "@/lib/stripe";

// Marks a proposal as sent and (optionally) emails the link via Gmail.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { email, message } = (await request.json().catch(() => ({}))) as {
    email?: boolean;
    message?: string;
  };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data: proposal } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();

  if (!proposal) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!proposal.line_items?.length) {
    return NextResponse.json({ error: "Add at least one item before sending." }, { status: 400 });
  }

  const link = `${appUrl(request)}/p/${proposal.public_token}`;
  let emailed = false;

  if (email) {
    if (!proposal.client_email) {
      return NextResponse.json({ error: "Add the client's email first." }, { status: 400 });
    }

    const token = await getGoogleAccessToken(supabase, access.user.id, "gmail").catch(() => null);

    if (!token) {
      return NextResponse.json(
        { error: "Connect Gmail in Integrations to send by email, or copy the link instead." },
        { status: 400 }
      );
    }

    const { data: company } = await supabase
      .from("company_profiles")
      .select("company_name")
      .eq("id", access.company.id)
      .maybeSingle();

    await sendGmail(token, {
      to: proposal.client_email,
      subject: `${proposal.title} — ${company?.company_name || "Proposal"}`,
      body:
        (message?.trim() ||
          `Hi ${proposal.client_name || ""},\n\nHere is your proposal "${proposal.title}" (${formatMoney(
            proposal.total,
            proposal.currency
          )}).`) +
        `\n\nView, sign${proposal.payment_mode !== "none" ? " and pay" : ""} online:\n${link}\n\nBest regards,\n${
          company?.company_name || ""
        }`,
    });

    emailed = true;
  }

  const { data: updated } = await supabase
    .from("proposals")
    .update({
      status: proposal.status === "draft" ? "sent" : proposal.status,
      sent_at: proposal.sent_at ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (proposal.lead_id) {
    await logActivity(supabase, {
      leadId: proposal.lead_id,
      companyId: access.company.id,
      userId: access.user.id,
      type: "proposal_sent",
      title: `Proposal sent: ${proposal.title} (${formatMoney(proposal.total, proposal.currency)})`,
      metadata: { proposal_id: id },
    });

    await advanceLead(supabase, proposal.lead_id, "proposal", "Proposal sent.", access.user.id);

    await supabase
      .from("leads")
      .update({ deal_value: proposal.total })
      .eq("id", proposal.lead_id);
  }

  return NextResponse.json({ proposal: updated, link, emailed });
}
