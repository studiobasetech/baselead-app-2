"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, BarChart3, Clock3, Flag, Gauge, Hash, Lock, Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing,
  Play, ShieldCheck, SlidersHorizontal, Sparkles, Star, Timer, Users, Video,
} from "lucide-react";

import { usePlan } from "@/components/plans/PlanProvider";
import { usePhone } from "@/components/phone/PhoneProvider";
import { OUTCOMES, PhoneScreen, formatDuration, formatPhone } from "@/components/phone/PhoneDialer";
import { PHONE_MINUTES_PACK } from "@/lib/plans";

const BRAND = "#3B82F6";
const GOLD = "#F5C518";
const GREEN = "#22C55E";
const RED = "#F22F46";
const PURPLE = "#A78BFA";
const TEAL = "#2DD4BF";

/** Icon on a tinted square of its own color; the card's hover glow uses the same color. */
function Tile({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className="bl-icon-tile" style={{ "--tab": color } as CSSProperties}>{children}</span>;
}

type CallRow = {
  id: string;
  user_id: string | null;
  lead_id: string | null;
  lead: { id: string; name: string | null; company: string | null } | null;
  direction: "outbound" | "inbound";
  from_number: string | null;
  to_number: string | null;
  status: string;
  started_at: string;
  duration_seconds: number;
  outcome: string | null;
  notes: string | null;
  recording_id: string | null;
  ai_summary: { summary: string; went_well: string[]; improve: string[]; next_step: string } | null;
  score: number | null;
  manager_note: string | null;
  flagged: boolean;
  flags: string[];
};

const FLAG_LABELS: Record<string, string> = {
  not_a_lead: "Not a lead",
  after_hours: "After hours",
  long_call: "Long call",
  unknown_caller: "Unknown caller",
  personal: "Possible personal call",
};

const outcomeLabel = (value: string | null) => OUTCOMES.find((o) => o.value === value)?.label ?? (value ? value.replace(/_/g, " ") : "—");

export default function CallsPage() {
  return (
    <Suspense fallback={null}>
      <CallsContent />
    </Suspense>
  );
}

function CallsContent() {
  const { can, loading } = usePlan();
  const params = useSearchParams();
  const phone = usePhone();
  const isManager = Boolean(phone?.status?.isManager);
  const [tab, setTab] = useState<"history" | "alerts" | "setup">(params.get("tab") === "setup" ? "setup" : "history");

  if (loading) return <main className="min-h-screen bg-[#050505] p-8" />;

  if (!can("phone_calling")) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Calls</h1>
        <div className="mt-6 max-w-2xl rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/[0.05] p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5C518]/15 text-[#F5C518]"><Lock size={20} /></div>
          <h2 className="mt-4 text-lg font-semibold">Built-in calling is included in Pro and Scale</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-gray-400">
            <li>Every rep gets their own US phone number</li>
            <li>Call leads in the USA and Canada from BaseLead — no other app</li>
            <li>Every call is recorded, logged in the CRM and summarized by AI</li>
            <li>Managers listen to calls and see each rep&apos;s activity</li>
          </ul>
          <p className="mt-3 text-sm text-gray-400">Pro: 400 minutes per rep · Scale: 800 minutes per rep, 10 reps included</p>
          <Link href="/settings?section=billing" className="mt-5 inline-flex rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold">Upgrade</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Calls</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isManager ? "Every call your team makes and receives, with recordings." : "Your calls and recordings."}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-[#202020] bg-[#0D0D0D] p-1">
          {([["history", "History"], ...(isManager ? [["alerts", "Alerts"], ["setup", "Phone setup"]] : [])] as [typeof tab, string][]).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-xs font-medium transition ${tab === value ? "bg-[#3B82F6] text-white" : "text-gray-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {phone?.state === "not_configured" && tab === "setup" && (
        <p className="mt-5 rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/[0.06] p-4 text-sm text-[#F5C518]">
          Calling is being set up. Call history and phone setup will work as soon as the phone service is connected.
        </p>
      )}

      {tab === "setup" && isManager ? <PhoneSetup /> : <CallHistory alertsOnly={tab === "alerts"} />}
    </main>
  );
}

/* =========================================================
   HISTORY + ALERTS
========================================================= */

function CallHistory({ alertsOnly }: { alertsOnly: boolean }) {
  const [days, setDays] = useState(30);
  const [rep, setRep] = useState("");
  const [outcome, setOutcome] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [reps, setReps] = useState<Record<string, string>>({});
  const [isManager, setIsManager] = useState(false);
  const [scorecards, setScorecards] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ days: String(days) });
    if (rep) query.set("rep", rep);
    if (outcome) query.set("outcome", outcome);
    if (flaggedOnly) query.set("flagged", "1");
    if (alertsOnly) query.set("alerts", "1");
    try {
      const response = await fetch(`/api/phone/calls?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load calls.");
      setCalls(data.calls ?? []);
      setReps(data.reps ?? {});
      setIsManager(Boolean(data.isManager));
      setScorecards(Boolean(data.scorecards));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load calls.");
    } finally {
      setLoading(false);
    }
  }, [days, rep, outcome, flaggedOnly, alertsOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/phone/calls/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) setCalls((list) => list.map((c) => (c.id === id ? { ...c, ...body } : c)));
    else setError((await response.json().catch(() => ({}))).error || "Could not save.");
  }

  const totals = useMemo(() => {
    const answered = calls.filter((c) => c.duration_seconds > 0);
    return {
      calls: calls.length,
      connected: answered.length,
      minutes: Math.round(calls.reduce((s, c) => s + c.duration_seconds, 0) / 60),
      meetings: calls.filter((c) => c.outcome === "meeting").length,
      missed: calls.filter((c) => c.status === "missed").length,
    };
  }, [calls]);

  const perRep = useMemo(() => {
    const map = new Map<string, { calls: number; connected: number; seconds: number; meetings: number; scores: number[] }>();
    for (const c of calls) {
      const key = c.user_id ?? "—";
      const row = map.get(key) ?? { calls: 0, connected: 0, seconds: 0, meetings: 0, scores: [] };
      row.calls += 1;
      if (c.duration_seconds > 0) row.connected += 1;
      row.seconds += c.duration_seconds;
      if (c.outcome === "meeting") row.meetings += 1;
      if (c.score) row.scores.push(c.score);
      map.set(key, row);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].calls - a[1].calls);
  }, [calls]);

  return (
    <div className={alertsOnly ? "" : "mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"}>
      {!alertsOnly && (
        <aside className="order-first xl:order-last">
          <div className="bl-card relative overflow-hidden rounded-[28px] border border-[#202020] bg-[radial-gradient(120%_70%_at_50%_0%,rgba(34,197,94,0.10),#0D0D0D_60%)] p-5 xl:sticky xl:top-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22C55E]/60 to-transparent" />
            <div className="mb-4 flex items-center gap-3 xl:mb-5">
              <Tile color={GREEN}><Hash size={16} strokeWidth={2.2} /></Tile>
              <h2 className="text-sm font-semibold">Dial pad</h2>
            </div>
            <div className="mx-auto max-w-[340px]"><PhoneScreen /></div>
          </div>
        </aside>
      )}
      <div className="min-w-0">
      <div className="mt-6 flex flex-wrap items-center gap-2 xl:mt-0">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-sm">
          {[1, 7, 30, 90, 365].map((d) => <option key={d} value={d}>{d === 1 ? "Today" : `Last ${d} days`}</option>)}
        </select>
        {isManager && (
          <select value={rep} onChange={(e) => setRep(e.target.value)} className="rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-sm">
            <option value="">All reps</option>
            {Object.entries(reps).map(([id, name]) => <option key={id} value={id} data-no-translate>{name}</option>)}
          </select>
        )}
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-sm">
          <option value="">All results</option>
          {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-sm text-gray-300">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} /> Flagged only
        </label>
      </div>

      {alertsOnly && (
        <p className="mt-4 text-sm text-gray-500">Calls to numbers that aren&apos;t leads, after-hours or weekend calls, unusually long calls, unknown callers and calls the AI thinks are personal.</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
        {[
          { label: "Calls", value: totals.calls, color: BRAND, icon: PhoneCall },
          { label: "Connected", value: totals.connected, color: GREEN, icon: Phone },
          { label: "Talk time (min)", value: totals.minutes, color: PURPLE, icon: Timer },
          { label: "Meetings booked", value: totals.meetings, color: GOLD, icon: Video },
          { label: "Missed calls", value: totals.missed, color: RED, icon: PhoneMissed },
        ].map(({ label, value, color, icon: Icon }, index) => (
          <div key={label} className={`bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 ${index === 4 ? "col-span-2 md:col-span-1" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase leading-4 tracking-wider text-gray-500">{label}</span>
              <Tile color={color}><Icon size={16} strokeWidth={2.2} /></Tile>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color }}>{loading ? "–" : value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {isManager && !alertsOnly && perRep.length > 1 && (
        <div className="bl-card mt-5 overflow-x-auto rounded-2xl border border-[#202020] bg-[#0D0D0D]">
          <div className="flex items-center gap-3 px-4 pt-4">
            <Tile color={TEAL}><Users size={16} strokeWidth={2.2} /></Tile>
            <h2 className="text-sm font-semibold">By rep</h2>
          </div>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>{["Rep", "Calls", "Connected", "Talk time", "Meetings", "Avg. score"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {perRep.map(([id, r]) => (
                <tr key={id} className="border-t border-[#1A1A1A]">
                  <td className="px-4 py-3 text-white" data-no-translate>{reps[id] ?? "Rep"}</td>
                  <td className="px-4 py-3">{r.calls}</td>
                  <td className="px-4 py-3">{r.calls ? Math.round((r.connected / r.calls) * 100) : 0}%</td>
                  <td className="px-4 py-3">{Math.round(r.seconds / 60)} min</td>
                  <td className="px-4 py-3">{r.meetings}</td>
                  <td className="px-4 py-3">{r.scores.length ? (r.scores.reduce((a, b) => a + b, 0) / r.scores.length).toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-5 rounded-2xl border border-[#F22F46]/30 bg-[#F22F46]/10 p-4 text-sm text-[#F22F46]">{error}</p>}

      <div className="mt-5 space-y-2">
        {loading && <div className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />}
        {!loading && calls.length === 0 && !error && (
          <div className="rounded-2xl border border-[#202020] bg-[#0D0D0D] p-8 text-center text-sm text-gray-500">
            {alertsOnly ? "No alerts. Nice." : "No calls yet. Open a lead and press Call, or use the Phone button."}
          </div>
        )}
        {calls.map((call) => {
          const open = openId === call.id;
          const other = call.direction === "outbound" ? call.to_number : call.from_number;
          const Icon = call.status === "missed" ? PhoneMissed : call.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
          return (
            <div key={call.id} className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D]">
              <button type="button" onClick={() => setOpenId(open ? null : call.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
                <Tile color={call.status === "missed" ? RED : call.direction === "inbound" ? GREEN : BRAND}><Icon size={16} strokeWidth={2.2} /></Tile>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white" data-no-translate>{call.lead?.company || call.lead?.name || formatPhone(other)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(call.started_at).toLocaleString()} {isManager && call.user_id && <span data-no-translate>· {reps[call.user_id] ?? "Rep"}</span>}
                  </p>
                </div>
                {call.flags?.map((f) => (
                  <span key={f} className="rounded-full bg-[#F5C518]/10 px-2 py-0.5 text-[11px] text-[#F5C518]">{FLAG_LABELS[f] ?? f}</span>
                ))}
                {call.flagged && <Flag size={14} style={{ color: RED }} />}
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-gray-300">{outcomeLabel(call.outcome)}</span>
                <span className="flex items-center gap-1 text-xs text-gray-400"><Clock3 size={12} /> {formatDuration(call.duration_seconds)}</span>
                {call.recording_id && <Play size={15} className="text-gray-400" />}
              </button>

              {open && (
                <div className="space-y-4 border-t border-[#1A1A1A] px-4 py-4">
                  {call.recording_id ? (
                    <audio controls preload="none" src={`/api/phone/recordings/${call.id}`} className="w-full" />
                  ) : (
                    <p className="text-xs text-gray-500">No recording for this call.</p>
                  )}

                  {call.ai_summary && (
                    <div className="rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/[0.05] p-4 text-sm">
                      <p className="flex items-center gap-2 font-medium text-white"><Sparkles size={14} style={{ color: BRAND }} /> AI summary</p>
                      <p className="mt-2 leading-6 text-gray-300">{call.ai_summary.summary}</p>
                      {call.ai_summary.went_well?.length > 0 && (
                        <p className="mt-2 text-xs text-gray-400"><span className="text-[#22C55E]">Went well:</span> {call.ai_summary.went_well.join(" · ")}</p>
                      )}
                      {call.ai_summary.improve?.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400"><span className="text-[#F5C518]">To improve:</span> {call.ai_summary.improve.join(" · ")}</p>
                      )}
                      {call.ai_summary.next_step && <p className="mt-1 text-xs text-gray-400"><span className="text-white">Next step:</span> {call.ai_summary.next_step}</p>}
                    </div>
                  )}

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Result</p>
                      <select value={call.outcome ?? ""} onChange={(e) => patch(call.id, { outcome: e.target.value })} className="mt-1 w-full rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm">
                        <option value="">—</option>
                        {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <p className="mt-3 text-xs text-gray-500">Rep notes</p>
                      <textarea defaultValue={call.notes ?? ""} onBlur={(e) => e.target.value !== (call.notes ?? "") && patch(call.id, { notes: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm" />
                    </div>

                    {isManager && (
                      <div>
                        <p className="text-xs text-gray-500">Manager review</p>
                        {scorecards ? (
                          <div className="mt-1 flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" onClick={() => patch(call.id, { score: call.score === n ? null : n })} aria-label={`${n}`}>
                                <Star size={20} fill={call.score && n <= call.score ? GOLD : "none"} style={{ color: GOLD }} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500">Call scores are included in Scale.</p>
                        )}
                        <textarea defaultValue={call.manager_note ?? ""} placeholder="Feedback for the rep" onBlur={(e) => e.target.value !== (call.manager_note ?? "") && patch(call.id, { manager_note: e.target.value })} rows={2} className="mt-2 w-full rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm" />
                        <button type="button" onClick={() => patch(call.id, { flagged: !call.flagged })} className="mt-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: call.flagged ? RED : "#202020", color: call.flagged ? RED : "#C4C4C4" }}>
                          <Flag size={13} /> {call.flagged ? "Flagged — kept as backup" : "Flag this call (keep recording)"}
                        </button>
                      </div>
                    )}
                    {!isManager && call.manager_note && (
                      <div>
                        <p className="text-xs text-gray-500">Feedback from your manager</p>
                        <p className="mt-1 text-sm text-gray-300">{call.manager_note}</p>
                      </div>
                    )}
                  </div>

                  {call.lead_id && (
                    <Link href={`/leads?lead=${call.lead_id}`} className="inline-block text-xs font-medium text-[#3B82F6]">Open lead</Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/* =========================================================
   PHONE SETUP (managers)
========================================================= */

type TeamRow = { userId: string; name: string; role?: string };
type NumberRow = { id: string; user_id: string | null; phone_number: string };

function PhoneSetup() {
  const phone = usePhone();
  const params = useSearchParams();
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [numbers, setNumbers] = useState<NumberRow[]>([]);
  const [included, setIncluded] = useState(0);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState(params.get("minutes") === "added" ? "Minutes added to this month." : params.get("minutes") === "failed" ? "The payment was not completed." : "");
  const [picking, setPicking] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [country, setCountry] = useState<"US" | "CA">("US");
  const [available, setAvailable] = useState<{ phone_number: string; locality?: string; region?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const usage = phone?.status?.usage;
  const scorecards = Boolean(phone?.status?.scorecards);

  const load = useCallback(async () => {
    const [numbersResponse, settingsResponse] = await Promise.all([fetch("/api/phone/numbers", { cache: "no-store" }), fetch("/api/phone/settings", { cache: "no-store" })]);
    const data = await numbersResponse.json().catch(() => ({}));
    if (numbersResponse.ok) {
      setTeam(data.team ?? []);
      setNumbers(data.numbers ?? []);
      setIncluded(data.included ?? 0);
      setConfigured(Boolean(data.configured));
    } else setMessage(data.error || "Could not load numbers.");
    const settingsData = await settingsResponse.json().catch(() => ({}));
    if (settingsResponse.ok) setSettings(settingsData.settings);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function search() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/phone/numbers?areaCode=${encodeURIComponent(areaCode)}&country=${country}`);
    const data = await response.json().catch(() => ({}));
    setAvailable(data.available ?? []);
    if (data.searchError) setMessage(data.searchError);
    else if ((data.available ?? []).length === 0) setMessage("No numbers found for that area code. Try another one.");
    setBusy(false);
  }

  async function buy(userId: string, phoneNumber: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/phone/numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, phoneNumber }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || "Could not get the number.");
    else {
      setPicking(null);
      setAvailable([]);
      setMessage(`${formatPhone(phoneNumber)} is ready.`);
      await load();
      await phone?.refresh();
    }
    setBusy(false);
  }

  async function changeNumber(numberId: string, body: Record<string, unknown>) {
    const response = await fetch("/api/phone/numbers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numberId, ...body }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || "Could not update the number.");
    await load();
    await phone?.refresh();
  }

  async function saveSettings(change: Record<string, unknown>) {
    const response = await fetch("/api/phone/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setSettings(data.settings);
      phone?.refresh();
    } else setMessage(data.error || "Could not save.");
  }

  async function buyMinutes() {
    const response = await fetch("/api/phone/minutes-pack", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else setMessage(data.error || "Could not open checkout.");
  }

  const unassigned = numbers.filter((n) => !n.user_id);

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        {message && <p className="rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-4 text-sm text-[#93C5FD]">{message}</p>}

        <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Tile color={GREEN}><Phone size={16} strokeWidth={2.2} /></Tile><h2 className="font-semibold">Phone numbers</h2></div>
            <span className="text-xs text-gray-500">{numbers.length} / {included} included</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Each rep gets their own US or Canadian number. Numbers belong to the company — reassign them when someone leaves.</p>

          <div className="mt-4 divide-y divide-[#1A1A1A]">
            {team.map((member) => {
              const number = numbers.find((n) => n.user_id === member.userId);
              return (
                <div key={member.userId} className="py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white" data-no-translate>{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    {number ? (
                      <>
                        <span className="flex items-center gap-2 text-sm text-white"><Phone size={14} style={{ color: GREEN }} /> {formatPhone(number.phone_number)}</span>
                        <button type="button" onClick={() => changeNumber(number.id, { userId: null })} className="text-xs text-gray-400 hover:text-white">Unassign</button>
                      </>
                    ) : unassigned.length > 0 ? (
                      <select defaultValue="" onChange={(e) => e.target.value && changeNumber(e.target.value, { userId: member.userId })} className="rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-xs">
                        <option value="">Give a free number…</option>
                        {unassigned.map((n) => <option key={n.id} value={n.id}>{formatPhone(n.phone_number)}</option>)}
                      </select>
                    ) : (
                      <button type="button" disabled={!configured || numbers.length >= included} onClick={() => { setPicking(member.userId); setAvailable([]); }} className="rounded-xl bg-[#3B82F6] px-3 py-2 text-xs font-semibold disabled:opacity-40">
                        Get a number
                      </button>
                    )}
                  </div>

                  {picking === member.userId && (
                    <div className="mt-3 rounded-xl border border-[#202020] bg-[#0A0A0A] p-3">
                      <div className="flex flex-wrap gap-2">
                        <select value={country} onChange={(e) => setCountry(e.target.value as "US" | "CA")} className="rounded-lg border border-[#202020] bg-transparent px-2 py-2 text-sm">
                          <option value="US">USA</option>
                          <option value="CA">Canada</option>
                        </select>
                        <input value={areaCode} onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Area code (e.g. 713)" className="w-40 rounded-lg border border-[#202020] bg-transparent px-3 py-2 text-sm outline-none" />
                        <button type="button" onClick={search} disabled={busy} className="rounded-lg bg-white/[0.08] px-3 py-2 text-sm">Search</button>
                        <button type="button" onClick={() => setPicking(null)} className="px-2 text-sm text-gray-500">Cancel</button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {available.map((n) => (
                          <button key={n.phone_number} type="button" disabled={busy} onClick={() => buy(member.userId, n.phone_number)} className="rounded-lg border border-[#202020] px-3 py-2 text-left text-sm hover:border-[#3B82F6]">
                            <span className="text-white">{formatPhone(n.phone_number)}</span>
                            <span className="block text-xs text-gray-500">{[n.locality, n.region].filter(Boolean).join(", ")}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {unassigned.length > 0 && (
            <div className="mt-3 border-t border-[#1A1A1A] pt-3 text-xs text-gray-500">
              Free numbers:{" "}
              {unassigned.map((n) => (
                <span key={n.id} className="mr-3 inline-flex items-center gap-2">
                  {formatPhone(n.phone_number)}
                  <button type="button" onClick={() => window.confirm("Release this number? It can't be recovered.") && changeNumber(n.id, { release: true })} className="text-[#F22F46]">Release</button>
                </span>
              ))}
            </div>
          )}
          {numbers.length >= included && included > 0 && (
            <p className="mt-3 text-xs text-gray-500">All included numbers are in use. Extra reps ($25/month each, Scale) are coming soon.</p>
          )}
        </section>

        {settings && (
          <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-center gap-3"><Tile color={BRAND}><SlidersHorizontal size={16} strokeWidth={2.2} /></Tile><h2 className="font-semibold">Rules</h2></div>

            <p className="mt-4 text-sm text-white">Calls to numbers that aren&apos;t leads</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[["flag", "Allow, but flag them for review"], ["block", "Block — only leads in BaseLead"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => saveSettings({ non_lead_policy: value })} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: settings.non_lead_policy === value ? BRAND : "#202020", color: settings.non_lead_policy === value ? "#fff" : "#A3A3A3" }}>
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm">
              <input type="checkbox" checked={Boolean(settings.announcement)} onChange={(e) => (e.target.checked || window.confirm("Some states and Canada require telling people the call is recorded. Turn off the announcement anyway?")) && saveSettings({ announcement: e.target.checked })} className="mt-1" />
              <span>
                <span className="text-white">Recording announcement</span>
                <span className="block text-xs text-gray-500">Callers hear: “This call may be recorded for quality and training.” Recommended — required in several states.</span>
              </span>
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-gray-500">Work hours start
                <select value={Number(settings.hours_start)} onChange={(e) => saveSettings({ hours_start: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${h}:00`}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500">Work hours end
                <select value={Number(settings.hours_end)} onChange={(e) => saveSettings({ hours_end: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h + 1}>{`${h + 1}:00`}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500">Time zone
                <select value={String(settings.timezone)} onChange={(e) => saveSettings({ timezone: e.target.value })} className="mt-1 w-full rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                  {["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Toronto", "America/Vancouver", "America/Mexico_City"].map((z) => <option key={z} value={z}>{z.replace("America/", "").replace("_", " ")}</option>)}
                </select>
              </label>
            </div>

            <label className="mt-4 block text-xs text-gray-500">Flag calls longer than (minutes)
              <input type="number" min={5} max={240} defaultValue={Number(settings.long_call_minutes)} onBlur={(e) => saveSettings({ long_call_minutes: Number(e.target.value) })} className="mt-1 w-32 rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-sm text-white" />
            </label>
          </section>
        )}
      </div>

      <div className="space-y-5">
        {usage && (
          <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-center gap-3"><Tile color={BRAND}><BarChart3 size={16} strokeWidth={2.2} /></Tile><h2 className="font-semibold">Minutes this month</h2></div>
            <p className="mt-3 text-3xl font-semibold tabular-nums" style={{ color: BRAND }}>{usage.used.toLocaleString()} <span className="text-base text-gray-500">/ {usage.allowance.toLocaleString()}</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.allowance)) * 100)}%`, backgroundColor: usage.used / Math.max(1, usage.allowance) >= 0.8 ? GOLD : BRAND }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {usage.minutesPerRep} minutes × {Math.max(1, usage.repsWithNumbers)} {Math.max(1, usage.repsWithNumbers) === 1 ? "rep" : "reps"} with a number{usage.packMinutes ? ` + ${usage.packMinutes.toLocaleString()} extra` : ""}. Shared by the whole team. Calls to the USA and Canada only.
            </p>
            {usage.used / Math.max(1, usage.allowance) >= 0.8 && (
              <p className="mt-3 flex items-center gap-2 text-xs text-[#F5C518]"><AlertTriangle size={13} /> {usage.remaining <= 0 ? "Minutes used up — calling is paused until next month." : "Over 80% used."}</p>
            )}
            <button type="button" onClick={buyMinutes} className="mt-4 w-full rounded-xl border border-[#3B82F6]/40 py-2.5 text-sm font-semibold text-[#93C5FD] hover:bg-[#3B82F6]/10">
              Add {PHONE_MINUTES_PACK.minutes.toLocaleString()} minutes — ${PHONE_MINUTES_PACK.price}
            </button>
          </section>
        )}

        {settings && (
          <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-center gap-3"><Tile color={PURPLE}><Gauge size={16} strokeWidth={2.2} /></Tile><h2 className="font-semibold">Monthly limit per rep</h2></div>
            {scorecards ? (
              <>
                <p className="mt-1 text-xs text-gray-500">Optional. Empty = no personal limit (only the team total).</p>
                <div className="mt-3 space-y-2">
                  {team.map((member) => (
                    <label key={member.userId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate" data-no-translate>{member.name}</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={(settings.rep_minute_limits as Record<string, number> | undefined)?.[member.userId] ?? ""}
                        placeholder="No limit"
                        onBlur={(e) => {
                          const limits = { ...((settings.rep_minute_limits as Record<string, number>) ?? {}) };
                          const value = Number(e.target.value);
                          if (value > 0) limits[member.userId] = value;
                          else delete limits[member.userId];
                          saveSettings({ rep_minute_limits: limits });
                        }}
                        className="w-28 rounded-xl border border-[#202020] bg-[#0A0A0A] px-3 py-1.5 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Per-rep limits are included in the Scale plan.</p>
            )}
          </section>
        )}

        <section className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 text-xs leading-5 text-gray-500">
          <div className="flex items-center gap-3"><Tile color={RED}><ShieldCheck size={16} strokeWidth={2.2} /></Tile><p className="text-sm font-semibold text-white">How recordings work</p></div>
          <p className="mt-2">Every call is recorded automatically and kept for 1 year. Flagged calls are kept as backup. Reps can&apos;t turn recording off or delete recordings. The AI summarizes each call and points out what to improve.</p>
        </section>
      </div>
    </div>
  );
}
