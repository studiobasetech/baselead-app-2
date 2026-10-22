"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Flame, MailOpen, MessageSquareReply, Sparkles } from "lucide-react";

import { Bone } from "@/components/ui/Skeleton";

type Action = {
  kind: "reply" | "opened" | "hot" | "meeting" | "task" | "stale";
  title: string;
  reason: string;
  href: string;
};

const KIND: Record<Action["kind"], { icon: typeof Flame; color: string }> = {
  reply: { icon: MessageSquareReply, color: "#2DD4BF" },
  opened: { icon: MailOpen, color: "#A78BFA" },
  hot: { icon: Flame, color: "#F97316" },
  meeting: { icon: CalendarClock, color: "#F472B6" },
  task: { icon: CheckCircle2, color: "#F5C518" },
  stale: { icon: Clock, color: "#3B82F6" },
};

/* The 3 most useful things to do today, each with the reason why. */
export default function DailyBrief() {
  const [actions, setActions] = useState<Action[] | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/assistant/brief", { cache: "no-store" });
      const result = await response.json();
      setActions(result.actions ?? []);
      setTotal(result.total ?? 0);
    } catch {
      setActions([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const refresh = () => void load();
    window.addEventListener("baselead:data-changed", refresh);
    return () => window.removeEventListener("baselead:data-changed", refresh);
  }, [load]);

  return (
    <section className="mt-5 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bl-icon-tile" style={{ "--tab": "#3B82F6" } as CSSProperties}>
            <Sparkles size={16} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-base font-semibold">Your brief for today</h2>
            <p className="text-xs text-gray-500">The 3 moves most likely to bring you a client today.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("baselead:assistant", { detail: "Who should I contact today?" }))}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#3B82F6] transition hover:bg-[#3B82F6]/10"
        >
          {total > 3 ? `See all ${total} suggestions` : "Ask BaseLead"} <ArrowRight size={13} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {actions === null &&
          [0, 1, 2].map((index) => (
            <div key={index} className="rounded-xl border border-[#202020] p-4">
              <Bone className="h-8 w-8 !rounded-lg" />
              <Bone className="mt-3 h-3.5 w-3/4" />
              <Bone className="mt-2 h-3 w-full opacity-70" />
            </div>
          ))}

        {actions !== null && actions.length === 0 && (
          <p className="text-sm text-gray-500 md:col-span-3">
            You&apos;re all caught up. Find new businesses with New Search, or add your best leads to a sequence.
          </p>
        )}

        {actions?.map((action, index) => {
          const meta = KIND[action.kind] ?? KIND.stale;
          return (
            <Link
              key={action.title + index}
              href={action.href}
              className="group flex flex-col rounded-xl border border-[#202020] bg-white/[0.02] p-4 transition hover:-translate-y-0.5"
              data-hover-accent="1"
              style={{ "--hover-accent": meta.color } as CSSProperties}
            >
              <div className="flex items-center justify-between">
                <span className="bl-icon-tile !h-8 !w-8 !rounded-lg" style={{ "--tab": meta.color } as CSSProperties}>
                  <meta.icon size={14} strokeWidth={2.2} />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">{index + 1}</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{action.title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{action.reason}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#3B82F6] opacity-80 transition group-hover:opacity-100">
                Open <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
