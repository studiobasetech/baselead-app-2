"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CalendarClock, Check, Copy, ExternalLink, Settings2, X } from "lucide-react";

type BookingPage = {
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  days_ahead: number;
  timezone: string;
  availability: Record<string, [string, string][]>;
  active: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_PAGE: BookingPage = {
  slug: "",
  title: "Intro call",
  description: "",
  duration_minutes: 30,
  buffer_minutes: 10,
  min_notice_hours: 12,
  days_ahead: 21,
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Chicago",
  availability: {
    "1": [["09:00", "17:00"]],
    "2": [["09:00", "17:00"]],
    "3": [["09:00", "17:00"]],
    "4": [["09:00", "17:00"]],
    "5": [["09:00", "17:00"]],
  },
  active: true,
};

/* "Book a call" link: share it in emails so leads book themselves. */
export default function BookingLinkCard({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const [page, setPage] = useState<BookingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BookingPage>(DEFAULT_PAGE);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/booking/settings")
      .then((response) => response.json())
      .then((result) => setPage(result.page ?? null))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const url =
    page && typeof window !== "undefined"
      ? `${window.location.origin}/book/${page.slug}`
      : "";

  function edit() {
    setDraft(page ? { ...DEFAULT_PAGE, ...page } : DEFAULT_PAGE);
    setOpen(true);
  }

  async function save() {
    setSaving(true);

    const response = await fetch("/api/booking/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json();

    setSaving(false);

    if (!response.ok) {
      onToast(result.error || "Could not save your booking link.");
      return;
    }

    setPage(result.page);
    setOpen(false);
    onToast("Booking link saved.");
  }

  async function copy() {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function toggleDay(day: number) {
    const key = String(day);
    const next = { ...draft.availability };

    if (next[key]?.length) delete next[key];
    else next[key] = [["09:00", "17:00"]];

    setDraft({ ...draft, availability: next });
  }

  function setHours(day: number, index: 0 | 1, value: string) {
    const key = String(day);
    const window = [...(draft.availability[key]?.[0] ?? ["09:00", "17:00"])] as [string, string];
    window[index] = value;
    setDraft({ ...draft, availability: { ...draft.availability, [key]: [window] } });
  }

  return (
    <div className="bl-card relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#A78BFA]/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bl-icon-tile" style={{ "--tab": "#A78BFA" } as CSSProperties}>
            <CalendarClock size={17} strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Your booking link</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Leads pick a time; the meeting lands in your calendar and the pipeline.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={edit}
          className="rounded-lg border border-[#202020] p-2 text-gray-400 transition hover:border-[#A78BFA]/40 hover:text-[#A78BFA]"
          aria-label="Booking settings"
        >
          <Settings2 size={15} />
        </button>
      </div>

      <div className="relative mt-4">
        {loading ? (
          <div className="h-11 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : page ? (
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-[#202020] bg-black/40 px-3 py-2.5 text-xs text-gray-300">
              {url}
            </code>
            <button
              type="button"
              onClick={() => void copy()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5C518] text-black transition hover:bg-[#ffe044]"
              aria-label="Copy link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#202020] text-gray-400 transition hover:text-white"
              aria-label="Open booking page"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={edit}
            className="w-full rounded-xl border border-dashed border-[#A78BFA]/40 py-3 text-sm text-[#A78BFA] transition hover:bg-[#A78BFA]/10"
          >
            Create your booking link
          </button>
        )}

        {page && (
          <p className="mt-2 text-[11px] text-gray-600">
            Tip: use <span className="text-gray-400">{"{{booking_link}}"}</span> in sequence emails.
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0D0D0D] p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Booking link</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs text-gray-500">Link name</span>
                <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm">
                  <span className="text-gray-600">/book/</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    placeholder="your-name"
                    className="h-11 flex-1 bg-transparent outline-none"
                  />
                </div>
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs text-gray-500">Meeting title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#F5C518]/50"
                />
              </label>

              {(
                [
                  ["duration_minutes", "Duration (min)"],
                  ["buffer_minutes", "Break between (min)"],
                  ["min_notice_hours", "Minimum notice (hours)"],
                  ["days_ahead", "Days ahead"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span className="text-xs text-gray-500">{label}</span>
                  <input
                    type="number"
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                    className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#F5C518]/50"
                  />
                </label>
              ))}

              <label className="sm:col-span-2">
                <span className="text-xs text-gray-500">Time zone</span>
                <input
                  value={draft.timezone}
                  onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#F5C518]/50"
                />
              </label>
            </div>

            <p className="mt-5 text-xs text-gray-500">Available hours</p>
            <div className="mt-2 space-y-2">
              {DAYS.map((label, day) => {
                const window = draft.availability[String(day)]?.[0];
                return (
                  <div key={label} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`w-14 rounded-lg border py-2 text-xs font-medium transition ${
                        window
                          ? "border-[#F5C518]/40 bg-[#F5C518]/10 text-[#F5C518]"
                          : "border-white/10 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                    {window ? (
                      <div className="flex items-center gap-2 text-sm">
                        <input type="time" value={window[0]} onChange={(e) => setHours(day, 0, e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5" />
                        <span className="text-gray-600">–</span>
                        <input type="time" value={window[1]} onChange={(e) => setHours(day, 1, e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="mt-6 h-12 w-full rounded-xl bg-[#F5C518] text-sm font-semibold text-black transition hover:bg-[#ffe044] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save booking link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
