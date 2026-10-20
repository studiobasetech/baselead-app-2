import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { leadFromReplyAddress } from "@/lib/compliance";
import { handleLeadReply } from "@/lib/automation";

/*
 * Receives replies sent to the reply-tracking address (r+<lead>.<sig>@domain).
 * Called by the Cloudflare Email Worker in cloudflare/reply-worker.js with
 * header "x-inbound-secret: <INBOUND_EMAIL_SECRET>".
 */
export async function POST(request: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET || "";
  const given = request.headers.get("x-inbound-secret") || "";

  if (!secret || secret.length !== given.length || !timingSafeEqual(Buffer.from(secret), Buffer.from(given))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasAdminClient()) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as {
    to?: string | string[];
    from?: string;
    subject?: string;
    text?: string;
  };

  const recipients = Array.isArray(body.to) ? body.to : String(body.to || "").split(",");
  const leadId = recipients.map(leadFromReplyAddress).find(Boolean);

  if (!leadId) return NextResponse.json({ ignored: true });

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("id, user_id, assigned_to, company_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ ignored: true });

  // Strip quoted history ("On ... wrote:" and "> " lines) for a clean snippet.
  const clean = String(body.text || "")
    .split(/\n(?:On .+wrote:|-{2,}\s*Original Message|From: .+)\s*\n/i)[0]
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  await handleLeadReply(admin, {
    userId: lead.assigned_to || lead.user_id,
    leadId: lead.id,
    companyId: lead.company_id,
    subject: (body.subject || "").replace(/^(re|fwd?):\s*/i, ""),
    from: body.from || "Lead",
    snippet: clean,
    source: "reply-address",
  });

  return NextResponse.json({ success: true });
}
