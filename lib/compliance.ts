import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Email compliance (CAN-SPAM / Gmail sender rules):
 *  - every outreach email carries an unsubscribe link + the sender's postal address
 *  - one-click List-Unsubscribe headers
 *  - leads that unsubscribe (or reply "stop") are never emailed again
 *  - a daily sending cap per user protects the Gmail account
 */

export const DAILY_SEND_LIMIT = Math.max(
  1,
  Number(process.env.DAILY_SEND_LIMIT) || 150
);

function secret() {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.CRON_SECRET ||
    "baselead-unsubscribe"
  );
}

function sign(leadId: string) {
  return createHmac("sha256", secret()).update(`unsub:${leadId}`).digest("base64url").slice(0, 24);
}

export function unsubscribeToken(leadId: string) {
  return `${leadId}.${sign(leadId)}`;
}

/** Returns the lead id when the token is genuine, otherwise null. */
export function verifyUnsubscribeToken(token: string) {
  const [leadId, signature] = token.split(".");
  if (!leadId || !signature) return null;
  const expected = Buffer.from(sign(leadId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return leadId;
}

function baseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function unsubscribeLinks(leadId: string) {
  const token = unsubscribeToken(leadId);
  return {
    page: `${baseUrl()}/u/${token}`,
    oneClick: `${baseUrl()}/api/public/unsubscribe/${token}`,
  };
}

/** Extra headers so Gmail / Outlook show their native "Unsubscribe" button. */
export function unsubscribeHeaders(leadId: string) {
  const links = unsubscribeLinks(leadId);
  return [
    `List-Unsubscribe: <${links.oneClick}>`,
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
  ];
}

/** Appends the opt-out line and the sender's postal address to an email body. */
export async function withComplianceFooter(
  supabase: SupabaseClient,
  body: string,
  leadId: string,
  companyId?: string | null
) {
  let address = "";
  let name = "";

  if (companyId) {
    const { data } = await supabase
      .from("company_profiles")
      .select("company_name, address, city, state")
      .eq("id", companyId)
      .maybeSingle();

    name = data?.company_name || "";
    address = [data?.address, data?.city, data?.state].filter(Boolean).join(", ");
  }

  const links = unsubscribeLinks(leadId);
  const footer = [
    "",
    "",
    "—",
    [name, address].filter(Boolean).join(" · "),
    `Not interested? Reply "no thanks" or unsubscribe here: ${links.page}`,
  ]
    .filter((line, index) => index < 3 || line)
    .join("\n");

  return `${body.trimEnd()}${footer}`;
}

type SendCheck = { ok: true } | { ok: false; reason: string; retryTomorrow?: boolean };

/** Blocks sending to opted-out leads and enforces the daily cap. */
export async function checkCanEmail(
  supabase: SupabaseClient,
  userId: string,
  lead: { id: string; email?: string | null; do_not_contact?: boolean | null; company_id?: string | null }
): Promise<SendCheck> {
  if (lead.do_not_contact) {
    return { ok: false, reason: "This lead unsubscribed. BaseLead won't email them again." };
  }

  if (lead.email) {
    // Same email unsubscribed on another lead record in this workspace.
    const { data: blocked } = await supabase
      .from("leads")
      .select("id")
      .ilike("email", lead.email)
      .eq("do_not_contact", true)
      .limit(1);

    if (blocked?.length) {
      return { ok: false, reason: "This email address unsubscribed. BaseLead won't email it again." };
    }
  }

  const since = new Date(Date.now() - 24 * 3600000).toISOString();
  const { count } = await supabase
    .from("outreach")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", since);

  if ((count ?? 0) >= DAILY_SEND_LIMIT) {
    return {
      ok: false,
      retryTomorrow: true,
      reason: `Daily sending limit reached (${DAILY_SEND_LIMIT} emails in 24 hours). This protects your Gmail from being blocked — the rest will go out automatically tomorrow.`,
    };
  }

  return { ok: true };
}

const OPT_OUT = /\b(unsubscribe|remove me|take me off|stop emailing|do not contact|don't contact|no thanks|not interested|stop)\b/i;

/** True when a reply clearly asks not to be contacted again. */
export function isOptOutReply(text: string) {
  return OPT_OUT.test(text.slice(0, 300));
}

/** Marks a lead (and every lead with the same email in the workspace) as do-not-contact. */
export async function markDoNotContact(supabase: SupabaseClient, leadId: string, reason: string) {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, email, company_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return null;

  const now = new Date().toISOString();
  const update = { do_not_contact: true, unsubscribed_at: now, unsubscribe_reason: reason };

  await supabase.from("leads").update(update).eq("id", lead.id);

  if (lead.email && lead.company_id) {
    await supabase.from("leads").update(update).eq("company_id", lead.company_id).ilike("email", lead.email);
  }

  // Stop any running follow-up sequence and cancel scheduled emails.
  await supabase
    .from("sequence_enrollments")
    .update({ status: "stopped", next_run_at: null })
    .eq("lead_id", lead.id)
    .eq("status", "active");

  await supabase
    .from("outreach")
    .update({ status: "cancelled" })
    .eq("lead_id", lead.id)
    .eq("status", "scheduled")
    .is("sent_at", null);

  return lead;
}

/* =========================================================
   REPLY TRACKING ADDRESS (no inbox access needed)
   Outreach emails carry  Reply-To: rep@company.com, r+<lead>.<sig>@INBOUND_REPLY_DOMAIN
   so a reply reaches the rep's inbox AND BaseLead (via a free
   Cloudflare Email Routing worker → /api/inbound/email).
========================================================= */

function replySignature(leadId: string) {
  return createHmac("sha256", secret()).update(`reply:${leadId}`).digest("hex").slice(0, 16);
}

export function replyTrackingAddress(leadId: string) {
  const domain = process.env.INBOUND_REPLY_DOMAIN?.trim();
  if (!domain) return null;
  return `r+${leadId}.${replySignature(leadId)}@${domain}`;
}

/** Lead id from an address like r+<uuid>.<sig>@domain, or null if forged. */
export function leadFromReplyAddress(address: string) {
  const match = address.toLowerCase().match(/r\+([0-9a-f-]{36})\.([0-9a-f]{16})@/);
  if (!match) return null;
  const [, leadId, signature] = match;
  return replySignature(leadId) === signature ? leadId : null;
}

/** Reply-To header so replies reach both the rep and BaseLead. */
export async function replyToHeaders(supabase: SupabaseClient, userId: string, leadId: string) {
  const tracking = replyTrackingAddress(leadId);
  if (!tracking) return [];

  const { data } = await supabase
    .from("connected_integrations")
    .select("account_email, account_name")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();

  if (!data?.account_email) return [];

  const name = (data.account_name || "").replace(/["<>]/g, "");
  const rep = name ? `"${name}" <${data.account_email}>` : data.account_email;
  return [`Reply-To: ${rep}, ${tracking}`];
}
