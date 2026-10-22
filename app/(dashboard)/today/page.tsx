"use client";

import Link from "next/link";
import SetupBanner from "@/components/setup/SetupBanner";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  MessageSquareReply,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import BookingLinkCard from "@/components/booking/BookingLinkCard";
import PostItBoard, { type BoardColumn } from "@/components/today/PostItBoard";
import DailyBrief from "@/components/today/DailyBrief";

type Task = {
  id: string;
  title: string;
  type: string;
  notes: string | null;
  due_at: string | null;
  completed_at: string | null;
  lead_id: string | null;
  source: string;
  board_status?: string | null;
  color?: string | null;
  label?: string | null;
};

type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  lead_name: string | null;
  location: string | null;
  meet_url?: string | null;
};

type ActivityRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  lead_id: string;
};

type HotLead = {
  id: string;
  company: string | null;
  name: string | null;
  status: string | null;
  ai_score: number | null;
  last_activity_at: string | null;
};


const ACTIVITY_COLOR: Record<string, string> = {
  reply: "#2DD4BF",
  meeting_booked: "#F22F46",
  email_sent: "#F5C518",
  stage_change: "#A78BFA",
  note: "#3B82F6",
};

function relative(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

// Uses the user's own clock: morning 5–11, afternoon 12–17, night 18–4.
function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good night";
}

function useGreeting() {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => setText(greetingFor(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return text;
}

export default function TodayPage() {
  const greeting = useGreeting();
  const { companyId } = usePlan();

  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [replies, setReplies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");
  const [setupNeeded, setSetupNeeded] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 6500);
  }, []);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);
    setName(
      String(user.user_metadata?.full_name || user.user_metadata?.name || "")
        .split(/\s+/)[0]
    );

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [taskResult, meetingResult, activityResult, leadResult, replyResult] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          // Open tasks + the ones finished in the last 7 days (Done column).
          .or(`completed_at.is.null,completed_at.gte.${weekAgo}`)
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(50),
        supabase
          .from("calendar_events")
          .select("id, title, starts_at, ends_at, lead_name, location, meet_url")
          .gte("starts_at", startOfDay.toISOString())
          .lt("starts_at", new Date(endOfDay.getTime() + 86400000).toISOString())
          .order("starts_at", { ascending: true }),
        supabase
          .from("lead_activities")
          .select("id, type, title, body, created_at, lead_id")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("leads")
          .select("id, company, name, status, ai_score, last_activity_at")
          .or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`)
          .gte("ai_score", 75)
          .not("status", "in", "(won,lost)")
          .order("ai_score", { ascending: false })
          .limit(30),
        supabase
          .from("outreach")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("replied_at", weekAgo),
      ]);

    setSetupNeeded((taskResult.error || activityResult.error)?.message ?? null);
    setTasks((taskResult.data ?? []) as Task[]);
    setMeetings((meetingResult.data ?? []) as Meeting[]);
    setActivity((activityResult.data ?? []) as ActivityRow[]);
    setReplies(replyResult.count ?? 0);

    // Hot leads nobody touched in 5+ days.
    const stale = Date.now() - 5 * 86400000;
    setHotLeads(
      ((leadResult.data ?? []) as HotLead[])
        .filter(
          (lead) =>
            !lead.last_activity_at || new Date(lead.last_activity_at).getTime() < stale
        )
        .slice(0, 6)
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function sync() {
    setSyncing(true);

    try {
      const response = await fetch("/api/automation/sync", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || "Sync failed.");
        return;
      }

      if (!result.gmailConnected) {
        showToast("Connect Gmail in Integrations first. BaseLead checks replies and sends follow-ups from your Gmail.");
        return;
      }

      const parts: string[] = [];
      if (result.inboxAccess) {
        parts.push(
          result.replies
            ? `${result.replies} new repl${result.replies === 1 ? "y" : "ies"} found`
            : `No new replies (${result.checked} conversation${result.checked === 1 ? "" : "s"} checked)`
        );
      } else if (!result.replyAddress) {
        parts.push("Replies can't be read yet: reconnect Gmail in Integrations and allow BaseLead to read replies");
      }
      parts.push(
        result.sequenceEmails
          ? `${result.sequenceEmails} follow-up${result.sequenceEmails === 1 ? "" : "s"} sent`
          : "no follow-ups due right now"
      );
      if (result.sequenceTasks) parts.push(`${result.sequenceTasks} call/LinkedIn task${result.sequenceTasks === 1 ? "" : "s"} added`);
      if (result.scheduled) parts.push(`${result.scheduled} scheduled email${result.scheduled === 1 ? "" : "s"} sent`);
      if (!result.sequenceEmails && result.nextFollowUpAt) {
        parts.push(
          `next one ${new Date(result.nextFollowUpAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`
        );
      }
      showToast(result.errors?.length ? `${parts.join(" · ")} — ${result.errors[0]}` : parts.join(" · "));

      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function moveTask(task: { id: string }, column: BoardColumn) {
    const completedAt = column === "done" ? new Date().toISOString() : null;

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, board_status: column, completed_at: completedAt } : item
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ board_status: column, completed_at: completedAt })
      .eq("id", task.id);

    if (error) {
      // Older database without the board_status column: keep Done working.
      await supabase.from("tasks").update({ completed_at: completedAt }).eq("id", task.id);
      if (column === "doing") {
        showToast("Run supabase/UPDATE_3_RUN_THIS.sql in Supabase to save the In progress column.");
      }
    }
  }

  async function editNote(task: { id: string }, changes: { title: string; label: string; color: string }) {
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, title: changes.title, label: changes.label || null, color: changes.color } : item))
    );

    let { error } = await supabase
      .from("tasks")
      .update({ title: changes.title, label: changes.label || null, color: changes.color })
      .eq("id", task.id);

    if (error && /color|label|column/i.test(error.message)) {
      ({ error } = await supabase.from("tasks").update({ title: changes.title }).eq("id", task.id));
      if (!error) showToast("Run supabase/UPDATE_3_RUN_THIS.sql in Supabase to keep note colors and titles.");
    }

    if (error) showToast(`Could not save the note: ${error.message}`);
  }

  async function deleteNote(task: { id: string }) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) showToast(`Could not delete the note: ${error.message}`);
  }

  async function addNote(title: string, color: string, label: string) {
    if (!title || !userId) return;

    const base = {
      title,
      user_id: userId,
      company_id: companyId,
      type: "todo",
      due_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from("tasks")
      .insert({ ...base, color, label: label || null })
      .select("*")
      .single();

    if (error && /color|label|column/i.test(error.message)) {
      // Database not updated yet: save the note without color/title.
      ({ data, error } = await supabase.from("tasks").insert(base).select("*").single());
      if (!error) showToast("Run supabase/UPDATE_3_RUN_THIS.sql in Supabase to keep note colors and titles.");
    }

    if (error) {
      showToast(`Could not save the note: ${error.message}`);
      return;
    }

    setTasks((current) => [...current, data as Task]);
  }



  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  const dueToday = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.completed_at &&
          (!task.due_at || new Date(task.due_at).getTime() <= endToday.getTime())
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks]
  );

  const upcoming = tasks.filter(
    (task) => !task.completed_at && task.due_at && new Date(task.due_at).getTime() > endToday.getTime()
  );

  const finished = tasks.filter((task) => task.completed_at);

  const todaysMeetings = meetings.filter(
    (meeting) => new Date(meeting.starts_at).getTime() <= endToday.getTime()
  );

  const kpis = [
    { label: "Tasks due", value: dueToday.length, icon: Check, color: "#F5C518" },
    { label: "Replies this week", value: replies, icon: MessageSquareReply, color: "#2DD4BF" },
    { label: "Meetings today", value: todaysMeetings.length, icon: Video, color: "#F472B6" },
    { label: "Hot leads waiting", value: hotLeads.length, icon: Flame, color: "#F97316" },
  ];

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10">
      {/* HERO */}
      <section className="bl-hero relative overflow-hidden rounded-3xl border border-[#202020] bg-[#0A0A0A] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#3B82F6]/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#A78BFA]/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/25 bg-[#3B82F6]/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3B82F6]">
              <Sparkles size={12} /> Today
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {greeting || "\u00a0"}
              {greeting && name ? `, ${name.charAt(0).toUpperCase()}${name.slice(1)}` : ""}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              {" · "}Everything that needs you today, in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2F74E8] disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Checking inbox…" : "Check replies & run follow-ups"}
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D]/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 sm:tracking-wider">{label}</span>
                <span className="bl-icon-tile" style={{ "--tab": color } as CSSProperties}>
                  <Icon size={16} strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "–" : value}</p>
            </div>
          ))}
        </div>
      </section>

      <SetupBanner />

      <DailyBrief />

      {setupNeeded && (
        <div className="mt-4 rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/[0.06] p-4 text-sm text-amber-200">
          {/permission denied/i.test(setupNeeded) ? (
            <>Supabase is blocking the app from the new tables. Run <code>supabase/FIX_PERMISSIONS.sql</code> in Supabase → SQL Editor.</>
          ) : (
            <>Run <code>supabase/RUN_THIS_IN_SUPABASE.sql</code> in Supabase → SQL Editor to turn on tasks, the activity timeline and automation.</>
          )}
          <span className="mt-1 block text-xs text-amber-200/60">Supabase says: {setupNeeded}</span>
        </div>
      )}

      <div className="mt-5">
        {/* TASKS — post-it board */}
        <PostItBoard
          tasks={[...dueToday, ...upcoming, ...finished]}
          loading={loading}
          onMove={moveTask}
          onAdd={addNote}
          onEdit={editNote}
          onDelete={deleteNote}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">


          {/* HOT LEADS */}
          <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Hot leads going cold</h2>
                <p className="mt-0.5 text-xs text-gray-500">Score 75+ with no activity in 5 days.</p>
              </div>
              <span className="bl-icon-tile" style={{ "--tab": "#F22F46" } as CSSProperties}>
                <Flame size={17} strokeWidth={2.2} />
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {hotLeads.length === 0 && !loading && (
                <p className="text-sm text-gray-500 sm:col-span-2">Nothing waiting. Nice work.</p>
              )}
              {hotLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/outreach?lead=${lead.id}`}
                  className="group flex items-center justify-between rounded-xl border border-[#202020] bg-[#0A0A0A] p-3.5 transition hover:border-[#F22F46]/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-200">{lead.company || lead.name}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-gray-500">
                      {lead.status || "new"} · score {lead.ai_score}
                    </p>
                  </div>
                  <ArrowRight size={15} className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-[#F22F46]" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <BookingLinkCard onToast={showToast} />

          {/* MEETINGS */}
          <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bl-icon-tile" style={{ "--tab": "#F472B6" } as CSSProperties}>
                  <Video size={17} strokeWidth={2.2} />
                </span>
                <h2 className="text-base font-semibold">Meetings</h2>
              </div>
              <Link href="/calendar" className="text-xs text-gray-500 hover:text-[#3B82F6]">Calendar</Link>
            </div>

            <div className="mt-4 space-y-2">
              {meetings.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No meetings today or tomorrow.</p>
              )}
              {meetings.map((meeting) => {
                const link = meeting.meet_url || meeting.location?.match(/https?:\/\/\S+/)?.[0];
                return (
                  <div key={meeting.id} className="flex items-center gap-3 rounded-xl border border-[#202020] bg-[#0A0A0A] p-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F22F46]/10 text-[#F22F46]">
                      <CalendarDays size={14} />
                      <span className="mt-0.5 text-[10px] font-semibold">
                        {new Date(meeting.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-200">{meeting.title}</p>
                      <p className="truncate text-[11px] text-gray-500">
                        {meeting.lead_name || "—"} · {relative(meeting.starts_at)}
                      </p>
                    </div>
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white">
                        Join
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ACTIVITY */}
          <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Live activity</h2>
              <span className="bl-icon-tile" style={{ "--tab": "#3B82F6" } as CSSProperties}>
                <Activity size={17} strokeWidth={2.2} />
              </span>
            </div>

            <ol className="relative mt-4 space-y-4 border-l border-[#202020] pl-4">
              {activity.length === 0 && !loading && (
                <li className="text-sm text-gray-500">Activity appears here as you work.</li>
              )}
              {activity.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#0D0D0D]"
                    style={{ background: ACTIVITY_COLOR[item.type] ?? "#777" }}
                  />
                  <p className="text-sm text-gray-200">{item.title}</p>
                  {item.body && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{item.body}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-600">{relative(item.created_at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[90] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl border border-white/10 bg-[#111]/95 px-4 py-3 text-sm text-gray-200 shadow-2xl backdrop-blur lg:bottom-8">
          {toast}
          <button type="button" onClick={() => setToast("")} className="text-gray-500 hover:text-white" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}
