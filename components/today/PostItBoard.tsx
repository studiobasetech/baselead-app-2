"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Caveat } from "next/font/google";
import { Check, ChevronLeft, ChevronRight, Clock3, Plus, Sparkles, StickyNote, Target, Trophy, Zap } from "lucide-react";

const handwriting = Caveat({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });

export type BoardTask = {
  id: string;
  title: string;
  type: string;
  notes: string | null;
  due_at: string | null;
  lead_id: string | null;
  source: string;
  board_status?: string | null;
  completed_at?: string | null;
  color?: string | null;
  label?: string | null;
};

export type BoardColumn = "todo" | "doing" | "done";

export function columnOf(task: BoardTask): BoardColumn {
  if (task.completed_at || task.board_status === "done") return "done";
  if (task.board_status === "doing") return "doing";
  return "todo";
}

const COLUMNS: { id: BoardColumn; icon: typeof Target; title: string; hint: string; accent: string }[] = [
  { id: "todo", icon: Target, title: "Up next", hint: "Ready to start", accent: "#F5C518" },
  { id: "doing", icon: Zap, title: "In progress", hint: "What you're working on", accent: "#60A5FA" },
  { id: "done", icon: Trophy, title: "Done", hint: "Wins from the last 7 days", accent: "#84CC16" },
];

// Note colors are just colors — the user writes their own title/label.
const NOTE: Record<string, { paper: string; tape: string; ink: string; name: string }> = {
  yellow: { paper: "linear-gradient(160deg,#FEF9C3 0%,#FDE047 100%)", tape: "rgba(245,197,24,0.5)", ink: "#422006", name: "Yellow" },
  green: { paper: "linear-gradient(160deg,#ECFCCB 0%,#BEF264 100%)", tape: "rgba(132,204,22,0.45)", ink: "#1A2E05", name: "Green" },
  blue: { paper: "linear-gradient(160deg,#CFFAFE 0%,#67E8F9 100%)", tape: "rgba(34,211,238,0.45)", ink: "#083344", name: "Blue" },
  purple: { paper: "linear-gradient(160deg,#EDE9FE 0%,#C4B5FD 100%)", tape: "rgba(167,139,250,0.5)", ink: "#2E1065", name: "Purple" },
  pink: { paper: "linear-gradient(160deg,#FCE7F3 0%,#F9A8D4 100%)", tape: "rgba(244,114,182,0.45)", ink: "#500724", name: "Pink" },
};

// Automatic tasks (from replies, bookings…) keep a sensible default color and label.
const TYPE_DEFAULTS: Record<string, { color: string; label: string }> = {
  call: { color: "green", label: "Call" },
  email: { color: "blue", label: "Email" },
  linkedin: { color: "purple", label: "LinkedIn" },
  follow_up: { color: "pink", label: "Follow up" },
  todo: { color: "yellow", label: "" },
};

function noteStyle(task: BoardTask) {
  const fallback = TYPE_DEFAULTS[task.type] ?? TYPE_DEFAULTS.todo;
  return NOTE[task.color || fallback.color] ?? NOTE.yellow;
}

function noteLabel(task: BoardTask) {
  if (task.label !== undefined && task.label !== null) return task.label;
  return task.source === "manual" ? "" : (TYPE_DEFAULTS[task.type]?.label ?? "");
}

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
  onMove,
  onAdd,
}: {
  tasks: BoardTask[];
  loading: boolean;
  onMove: (task: BoardTask, column: BoardColumn) => Promise<void> | void;
  onAdd: (title: string, color: string, label: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState("yellow");
  // Pointer-based drag & drop (mouse/trackpad). On phones the arrow buttons move notes.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; dx: number; dy: number; width: number } | null>(null);
  const [over, setOver] = useState<BoardColumn | null>(null);
  const pending = useRef<{ id: string; startX: number; startY: number; dx: number; dy: number; width: number } | null>(null);
  const dragging = drag?.id ?? null;
  const [now] = useState(() => Date.now());

  async function add() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setDraftLabel("");
    await onAdd(title, draftColor, draftLabel.trim());
  }

  function columnAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest("[data-column]") as HTMLElement | null;
    return (element?.dataset.column as BoardColumn | undefined) ?? null;
  }

  const active = useRef(false);
  const latest = useRef({ tasks, onMove });
  useEffect(() => {
    latest.current = { tasks, onMove };
  }, [tasks, onMove]);

  useEffect(() => {
    function move(event: PointerEvent) {
      const start = pending.current;
      if (!start) return;
      const moved = Math.abs(event.clientX - start.startX) + Math.abs(event.clientY - start.startY);
      if (!active.current && moved < 6) return;
      active.current = true;
      setDrag({ id: start.id, x: event.clientX, y: event.clientY, dx: start.dx, dy: start.dy, width: start.width });
      setOver(columnAt(event.clientX, event.clientY));
    }

    function up(event: PointerEvent) {
      const start = pending.current;
      const wasDragging = active.current;
      pending.current = null;
      active.current = false;
      setDrag(null);
      setOver(null);
      if (!start || !wasDragging) return;
      const column = columnAt(event.clientX, event.clientY);
      const task = latest.current.tasks.find((item) => item.id === start.id);
      if (column && task && columnOf(task) !== column) void latest.current.onMove(task, column);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const openCount = tasks.filter((task) => columnOf(task) !== "done").length;

  return (
    <section className="bl-card relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bl-icon-tile" style={{ "--tab": "#F5C518" } as CSSProperties} aria-hidden>
            <StickyNote size={17} strokeWidth={2.2} />
          </span>
          <div>
          <h2 className="text-base font-semibold">Your tasks</h2>
          <p className="mt-0.5 text-xs text-gray-500">Drag the notes between columns as you work (on phones, use the arrows).</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-400">
          {openCount} open
        </span>
      </div>

      {/* New note — above the columns */}
      <div className="relative mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 transition focus-within:border-[#F5C518]/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value.slice(0, 40))}
              placeholder="Title (optional) — e.g. Urgent, Client call, Ideas"
              className="w-full bg-transparent text-xs font-semibold uppercase tracking-[0.12em] text-gray-300 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-600"
            />
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void add();
                }
              }}
              rows={2}
              placeholder="Write a new note…"
              className={`${handwriting.className} w-full resize-none bg-transparent text-[22px] leading-6 text-gray-200 outline-none placeholder:text-gray-600`}
            />
          </div>
          <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
            <div className="flex gap-1.5">
              {Object.entries(NOTE).map(([color, note]) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraftColor(color)}
                  title={note.name}
                  aria-label={note.name}
                  className={`h-6 w-6 rounded-full border-2 transition ${draftColor === color ? "scale-110 border-white" : "border-transparent opacity-70 hover:opacity-100"}`}
                  style={{ background: note.paper }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => void add()}
              disabled={!draft.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F5C518] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#ffe044] disabled:opacity-30"
            >
              <Plus size={13} /> Stick it
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = tasks.filter((task) => columnOf(task) === column.id);
          const isOver = over === column.id;

          return (
            <div
              key={column.id}
              data-column={column.id}
              className="flex min-h-[260px] flex-col rounded-2xl border p-3 transition-colors duration-200"
              style={{
                borderColor: isOver ? `${column.accent}88` : "rgba(255,255,255,0.07)",
                background: isOver ? `${column.accent}12` : "rgba(255,255,255,0.015)",
              }}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="bl-icon-tile" style={{ "--tab": column.accent } as CSSProperties} aria-hidden>
                    <column.icon size={16} strokeWidth={2.2} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: column.accent }}>{column.title}</h3>
                    <p className="text-[11px] text-gray-500">{column.hint}</p>
                  </div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${column.accent}1f`, color: column.accent }}>
                  {items.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-4 px-1 pb-1">
                {loading && column.id !== "done" && (
                  <div className="min-h-[140px] animate-pulse rounded-[6px] bg-white/[0.04]" />
                )}

                {items.map((task, index) => {
                  const note = noteStyle(task);
                  const label = noteLabel(task);
                  const rotation = ROTATIONS[index % ROTATIONS.length] * 0.6;
                  const done = column.id === "done";
                  const overdue = !done && task.due_at && new Date(task.due_at).getTime() < now - 3600000;
                  const next = column.id === "todo" ? "doing" : column.id === "doing" ? "done" : null;
                  const prev = column.id === "done" ? "doing" : column.id === "doing" ? "todo" : null;

                  return (
                    <article
                      key={task.id}
                      onPointerDown={(event) => {
                        if (event.pointerType === "touch" || event.button !== 0) return;
                        if ((event.target as HTMLElement).closest("button,a")) return;
                        event.preventDefault();
                        const rect = event.currentTarget.getBoundingClientRect();
                        pending.current = {
                          id: task.id,
                          startX: event.clientX,
                          startY: event.clientY,
                          dx: event.clientX - rect.left,
                          dy: event.clientY - rect.top,
                          width: rect.width,
                        };
                      }}
                      className="group relative cursor-grab select-none rounded-[4px] p-4 pt-6 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:scale-[1.02] active:cursor-grabbing"
                      style={{
                        background: note.paper,
                        color: note.ink,
                        transform: `rotate(${rotation}deg)`,
                        opacity: dragging === task.id ? 0.45 : done ? 0.75 : 1,
                        filter: done ? "saturate(0.6)" : "none",
                        boxShadow:
                          "0 1px 1px rgba(0,0,0,0.25), 0 10px 18px -6px rgba(0,0,0,0.55), 0 24px 40px -18px rgba(0,0,0,0.7), inset 0 -18px 30px -24px rgba(0,0,0,0.35)",
                      }}
                    >
                      <span
                        className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg] rounded-[2px]"
                        style={{
                          background: note.tape,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                          maskImage: "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 h-6 w-6"
                        style={{ background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.18) 50%)", borderTopLeftRadius: 4 }}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">{label}</span>
                        {task.source !== "manual" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                            <Sparkles size={9} /> auto
                          </span>
                        )}
                      </div>

                      <p className={`${handwriting.className} mt-2 line-clamp-4 text-[22px] font-bold leading-[1.15] ${done ? "line-through decoration-2" : ""}`}>
                        {task.title}
                      </p>

                      {task.notes && <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 opacity-70">{task.notes}</p>}

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${overdue ? "rounded-full bg-[#F0475C] px-2 py-0.5 text-white" : "opacity-70"}`}>
                          <Clock3 size={11} />
                          {done ? "Done" : overdue ? "Overdue" : when(task.due_at)}
                        </span>

                        <div className="flex items-center gap-1">
                          {task.lead_id && (
                            <Link href={`/leads?lead=${task.lead_id}`} className="rounded-md bg-black/10 px-2 py-1 text-[11px] font-semibold transition hover:bg-black/20">
                              Open
                            </Link>
                          )}
                          {prev && (
                            <button
                              type="button"
                              onClick={() => void onMove(task, prev)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 transition hover:bg-black/20"
                              aria-label="Move back"
                              title="Move back"
                            >
                              <ChevronLeft size={15} strokeWidth={2.6} />
                            </button>
                          )}
                          {next && (
                            <button
                              type="button"
                              onClick={() => void onMove(task, next)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-current/40 bg-white/30 transition hover:scale-110 hover:bg-white/60"
                              aria-label={next === "done" ? "Mark as done" : "Start"}
                              title={next === "done" ? "Done" : "Start"}
                            >
                              {next === "done" ? <Check size={14} strokeWidth={3} /> : <ChevronRight size={15} strokeWidth={2.6} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!loading && items.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-[6px] border border-dashed border-white/10 p-6 text-center text-xs text-gray-600">
                    {column.id === "todo" ? "Stick a note above to get started." : column.id === "doing" ? "Drag a note here when you start it." : "Finished notes land here."}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {drag && (() => {
        const task = tasks.find((item) => item.id === drag.id);
        if (!task) return null;
        const note = noteStyle(task);
        return (
          <div
            className="pointer-events-none fixed left-0 top-0 z-[300] rounded-[4px] p-4 pt-6"
            style={{
              width: drag.width,
              transform: `translate(${drag.x - drag.dx}px, ${drag.y - drag.dy}px) rotate(3deg) scale(1.04)`,
              background: note.paper,
              color: note.ink,
              boxShadow: "0 30px 60px -15px rgba(0,0,0,0.75), 0 10px 20px -8px rgba(0,0,0,0.5)",
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">{noteLabel(task)}</span>
            <p className={`${handwriting.className} mt-2 line-clamp-3 text-[22px] font-bold leading-[1.15]`}>{task.title}</p>
          </div>
        );
      })()}
    </section>
  );
}
