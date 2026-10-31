import { sendPush } from "@/lib/push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccessToken, sendGmail } from "@/lib/integrations/google-api";

/*
 * Email notifications for the rep (not the lead).
 *
 * Delivery, in order:
 *  1. Resend (RESEND_API_KEY + NOTIFY_FROM_EMAIL) → branded HTML email.
 *  2. The user's own connected Gmail → a note to themselves.
 * If neither is available the notification is skipped silently.
 *
 * Each kind respects the toggles in Settings → Notifications (user_settings).
 */

export type NotificationKind =
  | "reply"
  | "booking"
  | "meeting_reminder"
  | "proposal_viewed"
  | "proposal_signed"
  | "proposal_paid"
  | "proposal_declined"
  | "new_lead"
  | "weekly_report"
  | "test";

type Prefs = {
  email_notifications: boolean;
  new_lead_alerts: boolean;
  outreach_replies: boolean;
  meeting_reminders: boolean;
  weekly_report: boolean;
};

const DEFAULT_PREFS: Prefs = {
  email_notifications: true,
  new_lead_alerts: true,
  outreach_replies: true,
  meeting_reminders: true,
  weekly_report: false,
};

const PREF_FOR: Partial<Record<NotificationKind, keyof Prefs>> = {
  reply: "outreach_replies",
  booking: "meeting_reminders",
  meeting_reminder: "meeting_reminders",
  new_lead: "new_lead_alerts",
  weekly_report: "weekly_report",
};

export type NotificationContent = {
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaPath?: string;
};

async function loadPrefs(admin: SupabaseClient, userId: string): Promise<Prefs> {
  const { data, error } = await admin
    .from("user_settings")
    .select("email_notifications, new_lead_alerts, outreach_replies, meeting_reminders, weekly_report")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_PREFS;

  return {
    email_notifications: data.email_notifications ?? true,
    new_lead_alerts: data.new_lead_alerts ?? true,
    outreach_replies: data.outreach_replies ?? true,
    meeting_reminders: data.meeting_reminders ?? true,
    weekly_report: data.weekly_report ?? false,
  };
}

async function userEmail(admin: SupabaseClient, userId: string) {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

function appUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://baselead.app").replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(content: NotificationContent) {
  const url = content.ctaPath ? `${appUrl()}${content.ctaPath}` : null;

  return `<!doctype html><html><body style="margin:0;background:#050505;font-family:Inter,Arial,sans-serif;color:#e5e5e5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d0d0d;border:1px solid #222;border-radius:18px;padding:32px">
<tr><td style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#a3e635;font-weight:700">BaseLead</td></tr>
<tr><td style="padding-top:14px;font-size:22px;font-weight:700;color:#fff">${escapeHtml(content.heading)}</td></tr>
${content.lines
  .map((line) => `<tr><td style="padding-top:10px;font-size:15px;line-height:1.6;color:#c7c7c7">${escapeHtml(line)}</td></tr>`)
  .join("")}
${
  url
    ? `<tr><td style="padding-top:24px"><a href="${url}" style="display:inline-block;background:#a3e635;color:#050505;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${escapeHtml(content.ctaLabel || "Open BaseLead")}</a></td></tr>`
    : ""
}
<tr><td style="padding-top:28px;font-size:12px;color:#666">You can turn these emails off in BaseLead → Settings → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

function renderText(content: NotificationContent) {
  const url = content.ctaPath ? `${appUrl()}${content.ctaPath}` : null;
  return [
    content.heading,
    "",
    ...content.lines,
    ...(url ? ["", `${content.ctaLabel || "Open BaseLead"}: ${url}`] : []),
    "",
    "— BaseLead (turn these off in Settings → Notifications)",
  ].join("\n");
}

async function sendWithResend(to: string, content: NotificationContent) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM_EMAIL || "BaseLead <onboarding@resend.dev>",
      to: [to],
      subject: content.subject,
      html: renderHtml(content),
      text: renderText(content),
    }),
  });

  if (!response.ok) {
    console.error("Resend notification failed:", await response.text().catch(() => ""));
    return false;
  }

  return true;
}

async function sendWithGmail(admin: SupabaseClient, userId: string, to: string, content: NotificationContent) {
  const token = await getGoogleAccessToken(admin, userId, "gmail").catch(() => null);
  if (!token) return false;

  await sendGmail(token, { to, subject: `[BaseLead] ${content.subject}`, body: renderText(content) });
  return true;
}

/**
 * Sends a notification email to a BaseLead user if their settings allow it.
 * Never throws — notifications must not break the action that triggered them.
 */
export async function notifyUser(
  admin: SupabaseClient,
  userId: string | null | undefined,
  kind: NotificationKind,
  content: NotificationContent
): Promise<{ sent: boolean; via?: "resend" | "gmail"; reason?: string }> {
  if (!userId) return { sent: false, reason: "no user" };

  try {
    if (kind !== "test") {
      const prefs = await loadPrefs(admin, userId);
      if (!prefs.email_notifications) return { sent: false, reason: "email notifications are off" };
      const specific = PREF_FOR[kind];
      if (specific && !prefs[specific]) return { sent: false, reason: `${specific} is off` };
    }

    // Phone notification (iPhone/Android app), alongside the email.
    if (kind !== "test") {
      void sendPush(admin, userId, { title: content.subject, body: content.lines[0] ?? content.heading, url: content.ctaPath });
    }

    const to = await userEmail(admin, userId);
    if (!to) return { sent: false, reason: "no email on the account" };

    if (await sendWithResend(to, content)) return { sent: true, via: "resend" };
    if (await sendWithGmail(admin, userId, to, content)) return { sent: true, via: "gmail" };

    return { sent: false, reason: "Connect Gmail in Integrations (or add RESEND_API_KEY) to receive email notifications." };
  } catch (error) {
    console.error("Notification failed:", error);
    return { sent: false, reason: error instanceof Error ? error.message : "failed" };
  }
}

/* ---------- Scheduled notifications (called by the automation cron) ---------- */

/** Meetings starting 45–60 minutes from now. The cron runs every 15 min, so each meeting gets one reminder. */
export async function sendMeetingReminders(admin: SupabaseClient, userId: string) {
  const from = new Date(Date.now() + 45 * 60000).toISOString();
  const to = new Date(Date.now() + 60 * 60000).toISOString();

  const { data: events } = await admin
    .from("calendar_events")
    .select("id, title, lead_name, starts_at, meet_url, location, lead_id")
    .eq("user_id", userId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .limit(20);

  let sent = 0;

  for (const event of events ?? []) {
    const link = event.meet_url || event.location;
    const result = await notifyUser(admin, userId, "meeting_reminder", {
      subject: `In 1 hour: ${event.title}${event.lead_name ? ` with ${event.lead_name}` : ""}`,
      heading: "Your meeting starts in about an hour",
      lines: [
        `${event.title}${event.lead_name ? ` with ${event.lead_name}` : ""}`,
        `Starts at ${new Date(event.starts_at).toUTCString()}`,
        ...(link ? [`Join: ${link}`] : []),
      ],
      ctaLabel: event.lead_id ? "Review the lead" : "Open calendar",
      ctaPath: event.lead_id ? "/pipeline" : "/calendar",
    });
    if (result.sent) sent++;
  }

  return sent;
}

/** Monday morning summary of the previous 7 days. */
export async function sendWeeklyReport(admin: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const count = async (table: string, column: string) => {
    const { count: total } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte(column, since);
    return total ?? 0;
  };

  const [newLeads, emailsSent, replies, meetings, signed] = await Promise.all([
    count("leads", "created_at"),
    count("outreach", "sent_at"),
    count("outreach", "replied_at"),
    count("calendar_events", "created_at"),
    count("proposals", "signed_at"),
  ]);

  const { data: won } = await admin
    .from("leads")
    .select("deal_value")
    .eq("user_id", userId)
    .eq("status", "won")
    .gte("updated_at", since);

  const revenue = (won ?? []).reduce((sum, lead) => sum + Number(lead.deal_value || 0), 0);
  const replyRate = emailsSent ? Math.round((replies / emailsSent) * 100) : 0;

  return notifyUser(admin, userId, "weekly_report", {
    subject: `Your week: ${newLeads} new leads, ${replies} replies, ${meetings} meetings`,
    heading: "Your weekly sales report",
    lines: [
      `New leads: ${newLeads}`,
      `Emails sent: ${emailsSent} · Replies: ${replies} (${replyRate}% reply rate)`,
      `Meetings booked: ${meetings}`,
      `Proposals signed: ${signed}`,
      `Deals won: ${(won ?? []).length}${revenue ? ` · $${revenue.toLocaleString("en-US")}` : ""}`,
    ],
    ctaLabel: "See full report",
    ctaPath: "/reports",
  });
}
