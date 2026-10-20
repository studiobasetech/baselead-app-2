import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/notify";
import {
  checkCanEmail,
  isOptOutReply,
  markDoNotContact,
  replyToHeaders,
  unsubscribeHeaders,
  withComplianceFooter,
} from "@/lib/compliance";
import {
  findReplyInThread,
  getGoogleAccessToken,
  sendGmail,
} from "@/lib/integrations/google-api";
import { dispatchWebhooks } from "@/lib/webhooks";

/* =========================================================
   AUTOMATIC PIPELINE
   Leads only move FORWARD automatically, never backwards.
========================================================= */

export const STAGE_ORDER = [
  "new",
  "contacted",
  "responded",
  "meeting",
  "qualified",
  "proposal",
  "negotiation",
  "won",
] as const;

export type LeadStatus = (typeof STAGE_ORDER)[number] | "lost" | "nurture";

const STAGE_LABEL: Record<string, string> = {
  new: "New Lead",
  contacted: "Contacted",
  responded: "Responded",
  meeting: "Meeting",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  nurture: "Nurture",
};

function rank(status: string | null | undefined) {
  const index = STAGE_ORDER.indexOf((status ?? "new").toLowerCase() as never);
  return index === -1 ? 0 : index;
}

export async function logActivity(
  supabase: SupabaseClient,
  activity: {
    leadId: string;
    companyId?: string | null;
    userId?: string | null;
    type: string;
    title: string;
    body?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const now = new Date().toISOString();

  await supabase.from("lead_activities").insert({
    lead_id: activity.leadId,
    company_id: activity.companyId ?? null,
    user_id: activity.userId ?? null,
    type: activity.type,
    title: activity.title,
    body: activity.body ?? null,
    metadata: activity.metadata ?? {},
  });

  await supabase
    .from("leads")
    .update({ last_activity_at: now })
    .eq("id", activity.leadId);
}

/**
 * Moves a lead forward to `to` (if it is ahead of its current stage)
 * and records it on the timeline. Returns true if it moved.
 */
export async function advanceLead(
  supabase: SupabaseClient,
  leadId: string,
  to: LeadStatus,
  reason: string,
  userId?: string | null
) {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status, company_id, user_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return false;

  const current = (lead.status ?? "new").toLowerCase();

  const moves =
    to === "lost" || to === "nurture"
      ? current !== "won" && current !== to
      : rank(to) > rank(current) && current !== "won";

  if (!moves) return false;

  await supabase
    .from("leads")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  await logActivity(supabase, {
    leadId,
    companyId: lead.company_id,
    userId: userId ?? lead.user_id,
    type: "stage_change",
    title: `Moved to ${STAGE_LABEL[to] ?? to}`,
    body: reason,
    metadata: { from: current, to, automatic: true },
  });

  void dispatchWebhooks(supabase, lead.user_id, "lead.status_changed", {
    id: leadId,
    from: current,
    to,
    automatic: true,
  }).catch(() => undefined);

  return true;
}

/* =========================================================
   PERSONALISATION TOKENS
   {{company}} {{first_name}} {{city}} {{my_company}} {{booking_link}}
========================================================= */

export function fillTemplate(
  text: string,
  values: Record<string, string | null | undefined>
) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const value = values[key.toLowerCase()];
    return value ? String(value) : "";
  });
}

async function templateValues(
  supabase: SupabaseClient,
  lead: Record<string, unknown>,
  userId: string
) {
  const [{ data: company }, { data: booking }] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("company_name")
      .eq("id", lead.company_id as string)
      .maybeSingle(),
    supabase
      .from("booking_pages")
      .select("slug")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  const contact = String(lead.contact_name || lead.name || "");
  const base = (process.env.APP_URL || "").replace(/\/$/, "");

  return {
    company: String(lead.company || lead.name || ""),
    first_name: contact && contact !== lead.company ? contact.split(/\s+/)[0] : "",
    city: String(lead.city || ""),
    my_company: company?.company_name || "",
    booking_link: booking?.slug && base ? `${base}/book/${booking.slug}` : "",
  };
}

/* =========================================================
   REPLY DETECTION (Gmail)
========================================================= */

/** Everything that happens when a lead replies (Gmail scan, reply address, or manual). */
export async function handleLeadReply(
  supabase: SupabaseClient,
  reply: {
    userId: string;
    leadId: string;
    companyId?: string | null;
    outreachId?: string | null;
    threadId?: string | null;
    subject?: string | null;
    from: string;
    snippet: string;
    receivedAt?: string;
    source: "gmail" | "reply-address" | "manual";
  }
) {
  const now = new Date().toISOString();
  const update = {
    status: "replied",
    replied_at: reply.receivedAt || now,
    next_step: "Reply to the lead",
    next_step_at: now,
    updated_at: now,
  };

  // Mark the conversation (or the lead's latest email) as replied.
  if (reply.threadId) {
    await supabase.from("outreach").update(update).eq("gmail_thread_id", reply.threadId);
  } else if (reply.outreachId) {
    await supabase.from("outreach").update(update).eq("id", reply.outreachId);
  } else {
    const { data: last } = await supabase
      .from("outreach")
      .select("id")
      .eq("lead_id", reply.leadId)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) await supabase.from("outreach").update(update).eq("id", last.id);
  }

  // Stop the follow-up sequence for this lead.
  await supabase
    .from("sequence_enrollments")
    .update({ status: "replied", next_run_at: null })
    .eq("lead_id", reply.leadId)
    .eq("status", "active");

  const name = reply.from.replace(/<.*>/, "").replace(/"/g, "").trim() || "the lead";

  await logActivity(supabase, {
    leadId: reply.leadId,
    companyId: reply.companyId,
    userId: reply.userId,
    type: "reply",
    title: `Reply received: ${reply.subject || "your email"}`,
    body: reply.snippet,
    metadata: { from: reply.from, thread: reply.threadId, source: reply.source },
  });

  await advanceLead(supabase, reply.leadId, "responded", "The lead replied to your email.", reply.userId);

  if (isOptOutReply(reply.snippet || "")) {
    await markDoNotContact(supabase, reply.leadId, "Replied asking not to be contacted");
    await logActivity(supabase, {
      leadId: reply.leadId,
      companyId: reply.companyId,
      userId: reply.userId,
      type: "unsubscribed",
      title: "Asked not to be contacted — BaseLead won't email them again",
    });
  }

  if (reply.source === "manual") return;

  await supabase.from("tasks").insert({
    company_id: reply.companyId,
    user_id: reply.userId,
    lead_id: reply.leadId,
    title: `Answer the reply from ${name}`,
    type: "email",
    notes: reply.snippet,
    due_at: now,
    source: "automation",
  });

  await notifyUser(supabase, reply.userId, "reply", {
    subject: `${name} replied to "${reply.subject || "your email"}"`,
    heading: "A lead just replied 🎉",
    lines: [`From: ${reply.from}`, `"${reply.snippet}"`, "The lead moved to Responded and their follow-up sequence was stopped."],
    ctaLabel: "Reply now",
    ctaPath: "/outreach",
  });

  void dispatchWebhooks(supabase, reply.userId, "outreach.replied", {
    outreach_id: reply.outreachId,
    lead_id: reply.leadId,
    snippet: reply.snippet,
  }).catch(() => undefined);
}

/** True when this user's Gmail connection includes inbox read access. */
async function canReadInbox(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("integration_credentials")
    .select("scopes")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();
  const scopes = (data?.scopes ?? []) as string[];
  return scopes.some((scope) => scope.includes("gmail.readonly"));
}

/** Optional inbox scan (only when the Gmail connection has read access). */
export async function detectReplies(supabase: SupabaseClient, userId: string) {
  if (!(await canReadInbox(supabase, userId))) return { checked: 0, replies: 0 };

  let token: string | null = null;

  try {
    token = await getGoogleAccessToken(supabase, userId, "gmail");
  } catch {
    return { checked: 0, replies: 0 };
  }

  if (!token) return { checked: 0, replies: 0 };

  const { data: open } = await supabase
    .from("outreach")
    .select("id, lead_id, subject, gmail_thread_id, company_id")
    .eq("user_id", userId)
    .not("gmail_thread_id", "is", null)
    .is("replied_at", null)
    .gte("sent_at", new Date(Date.now() - 60 * 86400000).toISOString())
    .limit(100);

  let replies = 0;
  const seenThreads = new Set<string>();

  for (const item of open ?? []) {
    if (!item.gmail_thread_id || seenThreads.has(item.gmail_thread_id)) continue;
    seenThreads.add(item.gmail_thread_id);

    const reply = await findReplyInThread(token, item.gmail_thread_id).catch(() => null);
    if (!reply) continue;

    replies++;
    await handleLeadReply(supabase, {
      userId,
      leadId: item.lead_id,
      companyId: item.company_id,
      outreachId: item.id,
      threadId: item.gmail_thread_id,
      subject: item.subject,
      from: reply.from,
      snippet: reply.snippet,
      receivedAt: reply.receivedAt,
      source: "gmail",
    });
  }

  return { checked: seenThreads.size, replies };
}

/* =========================================================
   SEQUENCES (automatic follow-ups)
========================================================= */

export async function runSequences(supabase: SupabaseClient, userId?: string) {
  let query = supabase
    .from("sequence_enrollments")
    .select("id, sequence_id, lead_id, user_id, company_id, current_step, gmail_thread_id")
    .eq("status", "active")
    .lte("next_run_at", new Date().toISOString())
    .limit(50);

  if (userId) query = query.eq("user_id", userId);

  const { data: due } = await query;

  let sent = 0;
  let tasks = 0;
  const errors: string[] = [];
  const tokens = new Map<string, string | null>();

  for (const enrollment of due ?? []) {
    const nextOrder = enrollment.current_step + 1;

    const [{ data: step }, { data: lead }] = await Promise.all([
      supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", enrollment.sequence_id)
        .eq("step_order", nextOrder)
        .maybeSingle(),
      supabase.from("leads").select("*").eq("id", enrollment.lead_id).maybeSingle(),
    ]);

    if (!step || !lead) {
      await supabase
        .from("sequence_enrollments")
        .update({ status: "completed", next_run_at: null })
        .eq("id", enrollment.id);

      if (lead && (lead.status ?? "new") === "contacted") {
        await supabase.from("tasks").insert({
          company_id: enrollment.company_id,
          user_id: enrollment.user_id,
          lead_id: enrollment.lead_id,
          title: `No reply from ${lead.company || lead.name} after the full sequence — call or move to Nurture`,
          type: "call",
          due_at: new Date().toISOString(),
          source: "automation",
        });
      }
      continue;
    }

    const values = await templateValues(supabase, lead, enrollment.user_id);
    let threadId = enrollment.gmail_thread_id as string | null;

    try {
      if (step.type === "email") {
        if (!lead.email) throw new Error("Lead has no email address.");

        const allowed = await checkCanEmail(supabase, enrollment.user_id, lead);
        if (!allowed.ok) {
          if (allowed.retryTomorrow) {
            // Daily cap: try again in ~a day, keep the sequence running.
            await supabase
              .from("sequence_enrollments")
              .update({ next_run_at: new Date(Date.now() + 20 * 3600000).toISOString(), last_error: allowed.reason })
              .eq("id", enrollment.id);
            continue;
          }
          await supabase
            .from("sequence_enrollments")
            .update({ status: "stopped", next_run_at: null, last_error: allowed.reason })
            .eq("id", enrollment.id);
          continue;
        }

        if (!tokens.has(enrollment.user_id)) {
          tokens.set(
            enrollment.user_id,
            await getGoogleAccessToken(supabase, enrollment.user_id, "gmail").catch(() => null)
          );
        }

        const token = tokens.get(enrollment.user_id);
        if (!token) throw new Error("Connect Gmail in Integrations.");

        const subject = fillTemplate(step.subject || "Quick question", values);
        const body = fillTemplate(step.body || "", values);

        const message = await sendGmail(token, {
          to: lead.email,
          subject: threadId && !/^re:/i.test(subject) ? `Re: ${subject}` : subject,
          body: await withComplianceFooter(supabase, body, lead.id, enrollment.company_id),
          threadId,
          headers: [...unsubscribeHeaders(lead.id), ...(await replyToHeaders(supabase, enrollment.user_id, lead.id))],
        });

        threadId = threadId || message.threadId;
        const now = new Date().toISOString();

        await supabase.from("outreach").insert({
          user_id: enrollment.user_id,
          company_id: enrollment.company_id,
          lead_id: enrollment.lead_id,
          campaign: "Sequence",
          channel: "Email",
          subject,
          message: body,
          status: "sent",
          sent_at: now,
          gmail_message_id: message.id,
          gmail_thread_id: message.threadId,
          enrollment_id: enrollment.id,
          step_order: nextOrder,
        });

        await logActivity(supabase, {
          leadId: lead.id,
          companyId: enrollment.company_id,
          userId: enrollment.user_id,
          type: "email_sent",
          title: `Sequence email ${nextOrder} sent: ${subject}`,
          body,
        });

        await advanceLead(supabase, lead.id, "contacted", "First email sent.", enrollment.user_id);
        sent++;
      } else {
        await supabase.from("tasks").insert({
          company_id: enrollment.company_id,
          user_id: enrollment.user_id,
          lead_id: enrollment.lead_id,
          title: fillTemplate(step.subject || `${step.type} with {{company}}`, values),
          notes: fillTemplate(step.body || "", values),
          type: step.type,
          due_at: new Date().toISOString(),
          source: "sequence",
        });
        tasks++;
      }

      // Schedule the following step.
      const { data: following } = await supabase
        .from("sequence_steps")
        .select("delay_days")
        .eq("sequence_id", enrollment.sequence_id)
        .eq("step_order", nextOrder + 1)
        .maybeSingle();

      await supabase
        .from("sequence_enrollments")
        .update({
          current_step: nextOrder,
          gmail_thread_id: threadId,
          last_error: null,
          next_run_at: new Date(
            Date.now() + (following?.delay_days ?? 3) * 86400000
          ).toISOString(),
        })
        .eq("id", enrollment.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Step failed";
      errors.push(message);

      await supabase
        .from("sequence_enrollments")
        .update({
          last_error: message,
          // Retry in 6 hours.
          next_run_at: new Date(Date.now() + 6 * 3600000).toISOString(),
        })
        .eq("id", enrollment.id);
    }
  }

  return { processed: due?.length ?? 0, sent, tasks, errors };
}
