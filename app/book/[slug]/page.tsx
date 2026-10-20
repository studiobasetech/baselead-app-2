"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  Video,
} from "lucide-react";

type Slot = { start: string; end: string };

type PageInfo = {
  title: string;
  description: string | null;
  duration: number;
  timezone: string;
  host: string;
  company: string;
  logo: string;
  slots: Slot[];
};

function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [info, setInfo] = useState<PageInfo | null>(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ start: string; meetUrl: string | null } | null>(null);

  const visitorZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  async function load() {
    const response = await fetch(`/api/booking/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error || "This booking link is not available.");
      return;
    }

    setInfo(json);
    if (json.slots?.length) setDay((current) => current ?? dayKey(json.slots[0].start));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const item of info?.slots ?? []) {
      const key = dayKey(item.start);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [info]);

  const daySlots = days.find(([key]) => key === day)?.[1] ?? [];

  async function book() {
    if (!slot) return;

    setSending(true);
    setError("");

    const response = await fetch(`/api/booking/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, start: slot.start }),
    });
    const json = await response.json();

    setSending(false);

    if (!response.ok) {
      setError(json.error || "Could not book this time.");
      if (response.status === 409) {
        setSlot(null);
        void load();
      }
      return;
    }

    setDone({ start: json.start, meetUrl: json.meetUrl });
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-10 text-white sm:py-16">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-violet-600/[0.12] blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-[#3B82F6]/[0.06] blur-[140px]" />

      <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0B0D]/90 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="grid md:grid-cols-[300px_1fr]">
          {/* Host info */}
          <aside className="border-b border-white/10 p-6 md:border-b-0 md:border-r sm:p-8">
            {info?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.logo} alt={info.company} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B82F6] text-lg font-bold text-white">
                {(info?.company || info?.host || "B").charAt(0)}
              </div>
            )}

            <p className="mt-5 text-sm text-gray-500">{info?.host || info?.company}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {info?.title ?? "Book a call"}
            </h1>

            <div className="mt-5 space-y-2.5 text-sm text-gray-400">
              <p className="flex items-center gap-2">
                <Clock3 size={16} className="text-[#3B82F6]" />
                {info?.duration ?? 30} minutes
              </p>
              <p className="flex items-center gap-2">
                <Video size={16} className="text-[#A78BFA]" />
                Video call (link sent by email)
              </p>
              <p className="flex items-center gap-2">
                <Globe2 size={16} className="text-[#60A5FA]" />
                Times in your time zone ({visitorZone.replace("_", " ")})
              </p>
            </div>

            {info?.description && (
              <p className="mt-5 text-sm leading-6 text-gray-500">{info.description}</p>
            )}
          </aside>

          {/* Picker / form / confirmation */}
          <section className="min-h-[460px] p-6 sm:p-8">
            {error && !info && (
              <div className="flex h-full items-center justify-center text-center text-gray-400">
                {error}
              </div>
            )}

            {!info && !error && (
              <div className="flex h-full items-center justify-center text-gray-500">
                <Loader2 className="mr-2 animate-spin" size={18} /> Loading availability…
              </div>
            )}

            {info && done && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#84CC16]/15 text-[#84CC16] shadow-[0_0_40px_rgba(132,204,22,0.25)]">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="mt-5 text-2xl font-semibold">You&apos;re booked</h2>
                <p className="mt-2 text-gray-400">
                  {longDate(done.start)} at {time(done.start)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  A calendar invitation was sent to {form.email}.
                </p>
                {done.meetUrl && (
                  <a
                    href={done.meetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white"
                  >
                    <Video size={16} /> Meeting link
                  </a>
                )}
              </div>
            )}

            {info && !done && !slot && (
              <>
                <h2 className="text-lg font-medium">Select a day</h2>

                {days.length === 0 ? (
                  <p className="mt-6 text-sm text-gray-500">
                    No times are available right now. Please check back soon.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                      {days.map(([key, list]) => {
                        const date = new Date(list[0].start);
                        const active = key === day;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setDay(key)}
                            className={`flex min-w-[68px] flex-col items-center rounded-2xl border px-3 py-3 transition ${
                              active
                                ? "border-[#3B82F6]/60 bg-[#3B82F6]/10 text-[#3B82F6] shadow-[0_0_24px_rgba(59,130,246,0.15)]"
                                : "border-white/10 bg-white/[0.02] text-gray-300 hover:border-white/20"
                            }`}
                          >
                            <span className="text-[11px] uppercase tracking-wider opacity-70">
                              {date.toLocaleDateString([], { weekday: "short" })}
                            </span>
                            <span className="mt-1 text-xl font-semibold">{date.getDate()}</span>
                            <span className="text-[11px] opacity-60">
                              {date.toLocaleDateString([], { month: "short" })}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <h3 className="mt-6 text-sm text-gray-400">
                      {daySlots[0] ? longDate(daySlots[0].start) : ""}
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {daySlots.map((item) => (
                        <button
                          key={item.start}
                          type="button"
                          onClick={() => setSlot(item)}
                          className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm font-medium text-gray-200 transition hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10 hover:text-[#3B82F6]"
                        >
                          {time(item.start)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {info && !done && slot && (
              <div>
                <button
                  type="button"
                  onClick={() => setSlot(null)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
                >
                  <ArrowLeft size={15} /> Change time
                </button>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#3B82F6]/25 bg-[#3B82F6]/[0.06] p-4">
                  <CalendarCheck2 className="text-[#3B82F6]" size={20} />
                  <div>
                    <p className="text-sm font-medium">{longDate(slot.start)}</p>
                    <p className="text-sm text-gray-400">
                      {time(slot.start)} – {time(slot.end)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Your name *", "text"],
                      ["email", "Work email *", "email"],
                      ["company", "Company", "text"],
                      ["phone", "Phone", "tel"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <label key={key} className="block">
                      <span className="text-xs text-gray-500">{label}</span>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm outline-none transition focus:border-[#3B82F6]/50"
                      />
                    </label>
                  ))}
                </div>

                <label className="mt-3 block">
                  <span className="text-xs text-gray-500">What would you like to talk about?</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm outline-none transition focus:border-[#3B82F6]/50"
                  />
                </label>

                {error && (
                  <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={sending || !form.name || !form.email}
                  onClick={() => void book()}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <CalendarCheck2 size={16} />}
                  Confirm booking
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <p className="relative mt-6 text-center text-xs text-gray-600">Powered by BaseLead</p>
    </main>
  );
}
