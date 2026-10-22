import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceAccess } from "@/lib/workspace";

/*
 * "Ask BaseLead" + the daily brief.
 * Everything here works with smart rules for free. When ANTHROPIC_API_KEY
 * is set, the routes also use Claude to write the answers.
 */

export type LeadLite = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  city: string | null;
  category: string | null;
  status: string;
  score: number;
  lastActivityAt: string | null;
  createdAt: string | null;
};

export type OutreachLite = {
  id: string;
  leadId: string | null;
  subject: string | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
};

export type WorkspaceContext = {
  firstName: string;
  leads: LeadLite[];
  outreach: OutreachLite[];
  tasks: { id: string; title: string; dueAt: string | null; leadId: string | null }[];
  meetings: { id: string; title: string; startsAt: string; leadName: string | null }[];
  pipeline: Record<string, number>;
};

export type BriefAction = {
  kind: "reply" | "opened" | "hot" | "meeting" | "task" | "stale";
  title: string;
  reason: string;
  href: string;
  leadId?: string | null;
};

type Row = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));
const num = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);

function leadFromRow(row: Row): LeadLite {
  const raw = (row.raw_data ?? {}) as Row;
  return {
    id: str(row.id),
    name: str(row.name) || str(row.company) || "Lead",
    company: str(row.company) || str(row.name) || "Lead",
    email: str(row.email) || null,
    city: str(row.city) || str(raw.city) || null,
    category: str(row.category) || str(row.industry) || str(raw.category) || null,
    status: (str(row.status) || "new").toLowerCase(),
    score: num(row.ai_score ?? row.intent_score),
    lastActivityAt: str(row.last_activity_at) || null,
    createdAt: str(row.created_at) || null,
  };
}

export async function loadWorkspaceContext(supabase: SupabaseClient, access: WorkspaceAccess): Promise<WorkspaceContext> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

  const [leadResult, outreachResult, taskResult, meetingResult] = await Promise.all([
    supabase.from("leads").select("*").eq("company_id", access.company.id).order("ai_score", { ascending: false, nullsFirst: false }).limit(300),
    supabase
      .from("outreach")
      .select("id, lead_id, subject, sent_at, opened_at, replied_at")
      .eq("user_id", access.user.id)
      .gte("created_at", twoWeeksAgo)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("tasks")
      .select("id, title, due_at, lead_id")
      .eq("user_id", access.user.id)
      .is("completed_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(30),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at, lead_name")
      .gte("starts_at", now.toISOString())
      .lt("starts_at", in3Days)
      .order("starts_at", { ascending: true })
      .limit(10),
  ]);

  const leads = ((leadResult.data ?? []) as Row[]).map(leadFromRow);
  const pipeline: Record<string, number> = {};
  for (const lead of leads) pipeline[lead.status] = (pipeline[lead.status] ?? 0) + 1;

  const meta = (access.user.user_metadata ?? {}) as Row;
  return {
    firstName: str(meta.full_name || meta.name).split(/\s+/)[0] || "",
    leads,
    outreach: ((outreachResult.data ?? []) as Row[]).map((row) => ({
      id: str(row.id),
      leadId: str(row.lead_id) || null,
      subject: str(row.subject) || null,
      sentAt: str(row.sent_at) || null,
      openedAt: str(row.opened_at) || null,
      repliedAt: str(row.replied_at) || null,
    })),
    tasks: ((taskResult.data ?? []) as Row[]).map((row) => ({
      id: str(row.id),
      title: str(row.title),
      dueAt: str(row.due_at) || null,
      leadId: str(row.lead_id) || null,
    })),
    meetings: ((meetingResult.data ?? []) as Row[]).map((row) => ({
      id: str(row.id),
      title: str(row.title),
      startsAt: str(row.starts_at),
      leadName: str(row.lead_name) || null,
    })),
    pipeline,
  };
}

export function ago(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function at(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

const OPEN = (status: string) => !["won", "lost", "client", "closed_won", "closed_lost"].includes(status);

/** Ranked list of the most useful next actions (rules only, no AI). */
export function briefCandidates(context: WorkspaceContext): BriefAction[] {
  const byId = new Map(context.leads.map((lead) => [lead.id, lead]));
  const actions: BriefAction[] = [];
  const used = new Set<string>();

  // 1. Replies waiting for an answer.
  for (const item of context.outreach.filter((o) => o.repliedAt).slice(0, 3)) {
    const lead = item.leadId ? byId.get(item.leadId) : undefined;
    if (!lead || used.has(lead.id) || !OPEN(lead.status)) continue;
    used.add(lead.id);
    actions.push({
      kind: "reply",
      title: `Reply to ${lead.company}`,
      reason: `They answered your email ${ago(item.repliedAt)}. A fast reply doubles your chances.`,
      href: `/leads?lead=${lead.id}`,
      leadId: lead.id,
    });
  }

  // 2. Meetings coming up.
  for (const meeting of context.meetings.slice(0, 2)) {
    actions.push({
      kind: "meeting",
      title: `Prepare for ${meeting.leadName || meeting.title}`,
      reason: `Meeting ${at(meeting.startsAt)}. Review their profile and your proposal before the call.`,
      href: "/calendar",
    });
  }

  // 3. Opened but no reply.
  for (const item of context.outreach.filter((o) => o.openedAt && !o.repliedAt).slice(0, 4)) {
    const lead = item.leadId ? byId.get(item.leadId) : undefined;
    if (!lead || used.has(lead.id) || !OPEN(lead.status)) continue;
    used.add(lead.id);
    actions.push({
      kind: "opened",
      title: `Follow up with ${lead.company}`,
      reason: `They opened "${item.subject || "your email"}" ${ago(item.openedAt)} but haven't replied yet.`,
      href: `/leads?lead=${lead.id}`,
      leadId: lead.id,
    });
  }

  // 4. Overdue tasks.
  const overdue = context.tasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now());
  if (overdue.length) {
    const named = overdue.find((task) => task.title.trim().length >= 4);
    actions.push({
      kind: "task",
      title: overdue.length === 1 && named ? `Finish: ${named.title}` : `Clear ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`,
      reason: named
        ? overdue.length === 1
          ? `It was due ${ago(named.dueAt)}.`
          : `Oldest one: "${named.title}". They're on your board below.`
        : "They're waiting on your board below.",
      href: "/today",
    });
  }

  // 5. Best leads nobody has contacted.
  for (const lead of context.leads.filter((l) => l.score >= 80 && (l.status === "new" || l.status === "pipeline")).slice(0, 4)) {
    if (used.has(lead.id)) continue;
    used.add(lead.id);
    actions.push({
      kind: "hot",
      title: `Contact ${lead.company}`,
      reason: `Opportunity score ${lead.score}/100${lead.city ? ` in ${lead.city}` : ""} and nobody has reached out yet.`,
      href: `/leads?lead=${lead.id}`,
      leadId: lead.id,
    });
  }

  // 6. Good leads going cold.
  const stale = Date.now() - 7 * 86400000;
  for (const lead of context.leads.filter(
    (l) => l.score >= 70 && OPEN(l.status) && l.status !== "new" && l.lastActivityAt && new Date(l.lastActivityAt).getTime() < stale
  ).slice(0, 2)) {
    if (used.has(lead.id)) continue;
    used.add(lead.id);
    actions.push({
      kind: "stale",
      title: `Check in with ${lead.company}`,
      reason: `No activity ${ago(lead.lastActivityAt)}. A short note keeps the deal warm.`,
      href: `/leads?lead=${lead.id}`,
      leadId: lead.id,
    });
  }

  return actions;
}

/** Short JSON the AI can read. */
export function contextForAi(context: WorkspaceContext) {
  return {
    today: new Date().toISOString(),
    pipeline: context.pipeline,
    topLeads: context.leads.slice(0, 40).map((lead) => ({
      id: lead.id,
      company: lead.company,
      contact: lead.name,
      city: lead.city,
      category: lead.category,
      status: lead.status,
      score: lead.score,
      lastActivity: lead.lastActivityAt,
    })),
    recentEmails: context.outreach.slice(0, 40),
    openTasks: context.tasks.slice(0, 15),
    upcomingMeetings: context.meetings,
  };
}

/** Free answers without AI: understands the most common questions. */
export function ruleAnswer(question: string, context: WorkspaceContext): { answer: string; links: { label: string; href: string }[] } {
  const q = question.toLowerCase();
  const links: { label: string; href: string }[] = [];

  // A specific lead mentioned by name?
  const mentioned = context.leads.find((lead) => {
    const names = [lead.company, lead.name].map((n) => n.toLowerCase()).filter((n) => n.length > 2);
    return names.some((n) => q.includes(n));
  });

  if (mentioned && /(write|draft|email|reply|message|escrib|correo|respuesta)/.test(q)) {
    const first = mentioned.name.split(/\s+/)[0];
    links.push({ label: `Open ${mentioned.company}`, href: `/leads?lead=${mentioned.id}` });
    return {
      answer: `Here's a short draft for ${mentioned.company}:\n\nSubject: Quick idea for ${mentioned.company}\n\nHi ${first},\n\nI came across ${mentioned.company}${mentioned.city ? ` in ${mentioned.city}` : ""} and had a quick idea that could bring you more clients. Would you be open to a 15-minute call this week?\n\nBest,\n${context.firstName || "—"}\n\nOpen the lead to send it from your Gmail.`,
      links,
    };
  }

  if (mentioned) {
    const emails = context.outreach.filter((o) => o.leadId === mentioned.id);
    const opened = emails.filter((o) => o.openedAt).length;
    const replied = emails.filter((o) => o.repliedAt).length;
    links.push({ label: `Open ${mentioned.company}`, href: `/leads?lead=${mentioned.id}` });
    return {
      answer: `${mentioned.company}${mentioned.category ? ` (${mentioned.category})` : ""}${mentioned.city ? ` · ${mentioned.city}` : ""}\n\n• Opportunity score: ${mentioned.score}/100\n• Stage: ${mentioned.status}\n• Emails in the last 2 weeks: ${emails.length} sent, ${opened} opened, ${replied} replied\n• Last activity: ${mentioned.lastActivityAt ? ago(mentioned.lastActivityAt) : "none yet"}\n\n${replied ? "They replied — answer them today." : opened ? "They opened your email. A short follow-up is a good next step." : mentioned.score >= 80 ? "Strong lead with no reply yet. Reach out or add them to a sequence." : "Add them to a sequence so follow-ups happen automatically."}`,
      links,
    };
  }

  if (/(repl|respond|answer|respuesta)/.test(q)) {
    const replies = context.outreach.filter((o) => o.repliedAt);
    if (!replies.length) return { answer: "No replies in the last 2 weeks yet. Leads who open your emails are the best ones to follow up with — ask me \"who opened my emails?\"", links };
    const byId = new Map(context.leads.map((l) => [l.id, l]));
    const lines = replies.slice(0, 6).map((o) => {
      const lead = o.leadId ? byId.get(o.leadId) : undefined;
      if (lead) links.push({ label: lead.company, href: `/leads?lead=${lead.id}` });
      return `• ${lead?.company ?? "A lead"} — ${ago(o.repliedAt)}`;
    });
    return { answer: `Recent replies:\n${lines.join("\n")}`, links: links.slice(0, 4) };
  }

  if (/(open|abri)/.test(q)) {
    const opened = context.outreach.filter((o) => o.openedAt && !o.repliedAt);
    if (!opened.length) return { answer: "Nobody has opened an email without replying in the last 2 weeks.", links };
    const byId = new Map(context.leads.map((l) => [l.id, l]));
    const lines = opened.slice(0, 6).map((o) => {
      const lead = o.leadId ? byId.get(o.leadId) : undefined;
      if (lead) links.push({ label: lead.company, href: `/leads?lead=${lead.id}` });
      return `• ${lead?.company ?? "A lead"} opened "${o.subject ?? "your email"}" ${ago(o.openedAt)}`;
    });
    return { answer: `These leads opened your email but haven't replied — perfect for a follow-up:\n${lines.join("\n")}`, links: links.slice(0, 4) };
  }

  if (/(pipeline|deal|stage|embudo)/.test(q)) {
    const order = ["new", "contacted", "responded", "qualified", "proposal", "won", "lost"];
    const lines = Object.entries(context.pipeline)
      .sort((a, b) => (order.indexOf(a[0]) + 99) % 99 - (order.indexOf(b[0]) + 99) % 99)
      .map(([status, count]) => `• ${status}: ${count}`);
    links.push({ label: "Open Pipeline", href: "/pipeline" });
    return { answer: `Your pipeline right now:\n${lines.join("\n")}`, links };
  }

  if (/(hot|best|top|mejor|caliente)/.test(q)) {
    const top = context.leads.filter((l) => OPEN(l.status)).slice(0, 5);
    top.forEach((lead) => links.push({ label: lead.company, href: `/leads?lead=${lead.id}` }));
    return {
      answer: top.length
        ? `Your strongest open leads:\n${top.map((l) => `• ${l.company} — ${l.score}/100 · ${l.status}${l.city ? ` · ${l.city}` : ""}`).join("\n")}`
        : "You don't have open leads yet. Start a New Search to find some.",
      links: links.slice(0, 5),
    };
  }

  if (/(who|call|contact|today|focus|priorit|next|hoy|llamar|qui)/.test(q)) {
    const actions = briefCandidates(context).slice(0, 5);
    actions.forEach((a) => links.push({ label: a.title, href: a.href }));
    return {
      answer: actions.length
        ? `Here's where I'd focus today:\n${actions.map((a, i) => `${i + 1}. ${a.title} — ${a.reason}`).join("\n")}`
        : "You're all caught up. Find new businesses with New Search, or add your best leads to a sequence.",
      links: links.slice(0, 5),
    };
  }

  return {
    answer:
      "I can help with your leads and deals. Try:\n• \"Who should I contact today?\"\n• \"Show my hot leads\"\n• \"Who opened my emails?\"\n• \"Summarize Sunrise Dental\"\n• \"Write an email to Sunrise Dental\"\n• \"How is my pipeline?\"",
    links,
  };
}
