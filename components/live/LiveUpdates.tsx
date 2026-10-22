"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MailOpen, MessageSquareReply, Sparkles, UserPlus, X } from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";

/*
 * Live updates: listens to the database in real time (Supabase Realtime).
 * When a lead replies, opens an email or new leads arrive, a notice slides
 * in and the open page refreshes its data without reloading.
 * Pages listen for the "baselead:data-changed" event to refresh.
 */

type Notice = {
  id: string;
  kind: "reply" | "open" | "leads";
  title: string;
  body: string;
  href?: string;
};

const KIND: Record<Notice["kind"], { icon: typeof MailOpen; color: string }> = {
  reply: { icon: MessageSquareReply, color: "#2DD4BF" },
  open: { icon: MailOpen, color: "#A78BFA" },
  leads: { icon: UserPlus, color: "#3B82F6" },
};

type Row = Record<string, unknown>;

export function emitDataChanged() {
  window.dispatchEvent(new Event("baselead:data-changed"));
}

export default function LiveUpdates() {
  const { companyId } = usePlan();
  const [notices, setNotices] = useState<Notice[]>([]);
  const seen = useRef(new Set<string>());
  const changeTimer = useRef<number | null>(null);
  const newLeads = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function changed() {
      if (changeTimer.current) window.clearTimeout(changeTimer.current);
      changeTimer.current = window.setTimeout(emitDataChanged, 1200);
    }

    function push(notice: Notice) {
      if (seen.current.has(notice.id)) return;
      seen.current.add(notice.id);
      setNotices((current) => [notice, ...current].slice(0, 3));
      window.setTimeout(() => setNotices((current) => current.filter((n) => n.id !== notice.id)), 8000);
    }

    async function leadName(leadId: unknown) {
      if (!leadId) return "A lead";
      const { data } = await supabase.from("leads").select("company, name").eq("id", String(leadId)).maybeSingle();
      return (data?.company as string) || (data?.name as string) || "A lead";
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      channel = supabase
        .channel(`live-${companyId}-${user.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "outreach", filter: `user_id=eq.${user.id}` }, async (payload) => {
          const row = payload.new as Row;
          const old = (payload.old ?? {}) as Row;
          changed();
          const recent = (value: unknown) => typeof value === "string" && Date.now() - new Date(value).getTime() < 5 * 60000;
          if (row.replied_at && !old.replied_at && recent(row.replied_at)) {
            const name = await leadName(row.lead_id);
            push({ id: `reply-${row.id}`, kind: "reply", title: `${name} replied`, body: "Answer while it's fresh.", href: row.lead_id ? `/leads?lead=${row.lead_id}` : "/outreach" });
          } else if (row.opened_at && !old.opened_at && recent(row.opened_at)) {
            const name = await leadName(row.lead_id);
            push({ id: `open-${row.id}`, kind: "open", title: `${name} opened your email`, body: String(row.subject || "Good moment to follow up."), href: row.lead_id ? `/leads?lead=${row.lead_id}` : "/outreach" });
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads", filter: `company_id=eq.${companyId}` }, () => {
          changed();
          newLeads.current.count += 1;
          if (newLeads.current.timer) window.clearTimeout(newLeads.current.timer);
          newLeads.current.timer = window.setTimeout(() => {
            const count = newLeads.current.count;
            newLeads.current.count = 0;
            push({ id: `leads-${Date.now()}`, kind: "leads", title: `${count} new lead${count === 1 ? "" : "s"} added`, body: "Fresh businesses are in your list.", href: "/leads" });
          }, 2500);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `company_id=eq.${companyId}` }, changed)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, changed)
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [companyId]);

  if (!notices.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[96] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 lg:top-5">
      {notices.map((notice) => {
        const meta = KIND[notice.kind];
        const content = (
          <>
            <span className="bl-icon-tile !h-9 !w-9" style={{ "--tab": meta.color } as CSSProperties}>
              <meta.icon size={15} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {notice.title}
                <Sparkles size={11} className="text-[#3B82F6]" />
              </span>
              <span className="block truncate text-xs text-gray-500">{notice.body}</span>
            </span>
          </>
        );
        return (
          <div key={notice.id} className="bl-live-notice pointer-events-auto relative flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111114]/95 p-3 pr-9 text-white shadow-2xl backdrop-blur">
            {notice.href ? (
              <Link href={notice.href} className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setNotices((c) => c.filter((n) => n.id !== notice.id))}>
                {content}
              </Link>
            ) : (
              content
            )}
            <button
              type="button"
              onClick={() => setNotices((c) => c.filter((n) => n.id !== notice.id))}
              className="absolute right-2 top-2 rounded-md p-1 text-gray-500 hover:text-white"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
