"use client";

import Link from "next/link";
import { useState } from "react";
import { Caveat } from "next/font/google";
import { Check, Clock3, Plus, Sparkles } from "lucide-react";

const handwriting = Caveat({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });

export type BoardTask = {
  id: string;
  title: string;
  type: string;
  notes: string | null;
  due_at: string | null;
  lead_id: string | null;
  source: string;
};

// Each task type gets its own sticky-note color.
const NOTE: Record<string, { paper: string; tape: string; ink: string; label: string }> = {
  call: { paper: "linear-gradient(160deg,#ECFCCB 0%,#BEF264 100%)", tape: "rgba(132,204,22,0.45)", ink: "#1A2E05", label: "Call" },
  email: { paper: "linear-gradient(160deg,#CFFAFE 0%,#67E8F9 100%)", tape: "rgba(34,211,238,0.45)", ink: "#083344", label: "Email" },
  linkedin: { paper: "linear-gradient(160deg,#EDE9FE 0%,#C4B5FD 100%)", tape: "rgba(167,139,250,0.5)", ink: "#2E1065", label: "LinkedIn" },
  follow_up: { paper: "linear-gradient(160deg,#FCE7F3 0%,#F9A8D4 100%)", tape: "rgba(244,114,182,0.45)", ink: "#500724", label: "Follow up" },
  todo: { paper: "linear-gradient(160deg,#FEF9C3 0%,#FDE047 100%)", tape: "rgba(245,197,24,0.5)", ink: "#422006", label: "To do" },
};

const ROTATIONS = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.1, -2.6, 1.9];

function when(iso: string | null) {
  if (!iso) return "Anytime";
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (date.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${time}`;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function PostItBoard({
  tasks,
  loading,
  onComplete,
  onAdd,
}: {
  tasks: BoardTask[];
  loading: boolean;
  onComplete: (task: BoardTask) => Promise<void> | void;
  onAdd: (title: string, type: string) => Promise<void> | void;
}) {
  const [peeling, setPeeling] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState("todo");

  async function complete(task: BoardTask) {
    setPeeling((current) => [...current, task.id]);
    window.setTimeout(() => void onComplete(task), 420);
  }

  async function add() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await onAdd(title, draftType);
  }

  const [now] = useState(() => Date.now());

  return (
    <section className="bl-card relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
      {/* subtle board texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Your tasks</h2>
          <p className="mt-0.5 text-xs text-gray-500">Peel a note off when it&apos;s done.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-400">
          {tasks.length} on the board
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
        {/* New note */}
        <div
          className="group relative flex min-h-[176px] flex-col rounded-[6px] border border-dashed border-white/15 bg-white/[0.02] p-4 transition hover:border-[#F5C518]/40"
          style={{ transform: "rotate(-1deg)" }}
        >
          <div className="flex gap-1.5">
            {Object.entries(NOTE).map(([type, note]) => (
              <button
                key={type}
                type="button"
                onClick={() => setDraftType(type)}
                title={note.label}
                aria-label={note.label}
                className={`h-5 w-5 rounded-full border transition ${draftType === type ? "scale-110 border-white" : "border-transparent opacity-70 hover:opacity-100"}`}
                style={{ background: note.paper }}
              />
            ))}
          </div>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void add();
              }
            }}
            rows={3}
            placeholder="Write a new note…"
            className={`${handwriting.className} mt-3 flex-1 resize-none bg-transparent text-[22px] leading-6 text-gray-200 outline-none placeholder:text-gray-600`}
          />

          <button
            type="button"
            onClick={() => void add()}
            disabled={!draft.trim()}
            className="mt-2 inline-flex items-center justify-center gap-1.5 self-end rounded-lg bg-[#F5C518] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#ffe044] disabled:opacity-30"
          >
            <Plus size={13} /> Stick it
          </button>
        </div>

        {loading &&
          [0, 1].map((i) => (
            <div key={i} className="min-h-[176px] animate-pulse rounded-[6px] bg-white/[0.04]" style={{ transform: `rotate(${ROTATIONS[i]}deg)` }} />
          ))}

        {tasks.map((task, index) => {
          const note = NOTE[task.type] ?? NOTE.todo;
          const rotation = ROTATIONS[index % ROTATIONS.length];
          const overdue = task.due_at && new Date(task.due_at).getTime() < now - 3600000;
          const isPeeling = peeling.includes(task.id);

          return (
            <article
              key={task.id}
              className="group relative min-h-[176px] rounded-[4px] p-4 pt-6 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:rotate-0 hover:scale-[1.03]"
              style={{
                background: note.paper,
                color: note.ink,
                transform: isPeeling
                  ? `rotate(${rotation * 4}deg) translate(40px,-30px) scale(0.85)`
                  : `rotate(${rotation}deg)`,
                opacity: isPeeling ? 0 : 1,
                boxShadow:
                  "0 1px 1px rgba(0,0,0,0.25), 0 10px 18px -6px rgba(0,0,0,0.55), 0 24px 40px -18px rgba(0,0,0,0.7), inset 0 -18px 30px -24px rgba(0,0,0,0.35)",
              }}
            >
              {/* tape */}
              <span
                className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg] rounded-[2px] backdrop-blur-sm"
                style={{
                  background: note.tape,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                  maskImage: "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
                }}
              />

              {/* folded corner */}
              <span
                className="absolute bottom-0 right-0 h-6 w-6"
                style={{
                  background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.18) 50%)",
                  borderTopLeftRadius: 4,
                }}
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">
                  {note.label}
                </span>
                {task.source !== "manual" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                    <Sparkles size={9} /> auto
                  </span>
                )}
              </div>

              <p className={`${handwriting.className} mt-2 line-clamp-4 text-[22px] font-bold leading-[1.15]`}>
                {task.title}
              </p>

              {task.notes && (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 opacity-70">{task.notes}</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${overdue ? "rounded-full bg-[#F0475C] px-2 py-0.5 text-white" : "opacity-70"}`}
                >
                  <Clock3 size={11} />
                  {overdue ? "Overdue" : when(task.due_at)}
                </span>

                <div className="flex items-center gap-1">
                  {task.lead_id && (
                    <Link
                      href={`/leads?lead=${task.lead_id}`}
                      className="rounded-md bg-black/10 px-2 py-1 text-[11px] font-semibold transition hover:bg-black/20"
                    >
                      Open
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void complete(task)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-current/40 bg-white/30 transition hover:scale-110 hover:bg-white/60"
                    aria-label="Mark as done"
                    title="Done"
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!loading && tasks.length === 0 && (
          <div className="flex min-h-[176px] items-center justify-center rounded-[6px] border border-white/5 p-6 text-center text-sm text-gray-500 md:col-span-2">
            Board is clear. Replies, follow-ups and meetings will stick new notes here automatically.
          </div>
        )}
      </div>
    </section>
  );
}
