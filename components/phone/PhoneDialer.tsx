"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Delete, Grid3x3, Lock, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, ShieldCheck, X } from "lucide-react";

import { usePhone } from "@/components/phone/PhoneProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const BRAND = "#3B82F6";
const GOLD = "#F5C518";
const RED = "#F22F46";
const GREEN = "#22C55E";
const BORDER = "#262626";
const MUTED = "#8C8C8C";

export const OUTCOMES: { value: string; label: string }[] = [
  { value: "connected", label: "Talked to them" },
  { value: "interested", label: "Interested" },
  { value: "meeting", label: "Meeting booked" },
  { value: "callback", label: "Call back later" },
  { value: "voicemail", label: "Left voicemail" },
  { value: "no_answer", label: "No answer" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
];

export function formatPhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return value ?? "";
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const KEYS: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" }, { digit: "2", letters: "ABC" }, { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" }, { digit: "5", letters: "JKL" }, { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" }, { digit: "8", letters: "TUV" }, { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" }, { digit: "0", letters: "+" }, { digit: "#", letters: "" },
];

/** Formats what the rep is typing: (713) 555-0123 */
function liveFormat(value: string) {
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length <= 3) return ten;
  if (ten.length <= 6) return `(${ten.slice(0, 3)}) ${ten.slice(3)}`;
  if (ten.length <= 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  return value;
}

function Key({ digit, letters, onPress, size = "md" }: { digit: string; letters: string; onPress: (d: string) => void; size?: "md" | "sm" }) {
  const box = size === "md" ? "h-[60px] w-[60px] sm:h-16 sm:w-16" : "h-12 w-12";
  return (
    <button
      type="button"
      onClick={() => onPress(digit)}
      className={`bl-dial-key group relative mx-auto flex ${box} flex-col items-center justify-center rounded-full border border-white/[0.08] bg-[linear-gradient(160deg,rgba(255,255,255,0.09),rgba(255,255,255,0.015))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_-12px_rgba(0,0,0,0.9)] transition duration-150 hover:border-[#22C55E]/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_22px_-6px_rgba(34,197,94,0.65)] active:scale-95`}
    >
      <span className={`${size === "md" ? "text-[26px]" : "text-lg"} font-light leading-none tabular-nums`}>{digit}</span>
      {letters && <span className="mt-0.5 text-[8.5px] font-semibold tracking-[0.22em] text-gray-500 group-hover:text-[#86EFAC]">{letters}</span>}
    </button>
  );
}

/** The dial pad + line status. Used in the floating Phone panel and on the Calls page. */
export function DialPad({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const phone = usePhone();
  const { t } = useLanguage();
  const [number, setNumber] = useState("");
  if (!phone) return null;
  const { state, status } = phone;
  const usage = status?.usage;
  const ready = state === "ready";
  const percent = usage ? Math.min(100, (usage.used / Math.max(1, usage.allowance)) * 100) : 0;

  const pill =
    state === "ready" ? { label: t("Line ready"), color: GREEN }
    : state === "not_configured" ? { label: t("Setting up"), color: GOLD }
    : state === "no_number" ? { label: t("No number yet"), color: GOLD }
    : state === "error" || state === "sdk_missing" ? { label: t("Offline"), color: RED }
    : { label: t("Connecting…"), color: GOLD };

  const notice =
    state === "not_configured" ? t("Calling turns on as soon as BaseLead's phone service is connected.")
    : state === "no_number" ? (status?.isManager ? t("Give yourself a number in Phone setup to start calling.") : t("Ask your manager to assign you a number."))
    : state === "sdk_missing" ? t("Run once in the project folder: npm install @telnyx/webrtc — then restart the app.")
    : state === "error" ? t(phone.error || "The phone is offline. Reconnecting…")
    : "";

  const press = (digit: string) => setNumber((value) => (value + digit).slice(0, 18));
  const call = () => number && ready && phone.startCall(number);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">{t("Your line")}</p>
          <p className="truncate text-sm font-medium tabular-nums text-white">{status?.myNumber ? formatPhone(status.myNumber) : "— — —"}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium" style={{ borderColor: `${pill.color}40`, backgroundColor: `${pill.color}14`, color: pill.color }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: pill.color }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: pill.color }} />
          </span>
          {pill.label}
        </span>
      </div>

      {/* Display */}
      <div className={`relative ${compact ? "mt-4" : "mt-6"} rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-4 text-center shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]`}>
        <span className="absolute left-3 top-3 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-gray-400">+1 US · CA</span>
        <input
          value={liveFormat(number)}
          onChange={(event) => setNumber(event.target.value.replace(/[^\d*#+]/g, "").slice(0, 18))}
          onKeyDown={(event) => event.key === "Enter" && call()}
          placeholder={t("Enter a number")}
          inputMode="tel"
          aria-label={t("Phone number")}
          className="mt-3 w-full bg-transparent text-center text-[28px] font-light tracking-wide text-white tabular-nums outline-none placeholder:text-[18px] placeholder:text-gray-600"
        />
      </div>

      {/* Keys */}
      <div className={`${compact ? "mt-4 gap-y-3" : "mt-6 gap-y-4"} grid grid-cols-3`}>
        {KEYS.map((key) => <Key key={key.digit} {...key} onPress={press} />)}
      </div>

      {/* Actions */}
      <div className={`${compact ? "mt-4" : "mt-6"} grid grid-cols-3 items-center`}>
        <span />
        <button
          type="button"
          onClick={call}
          disabled={!number || !ready}
          aria-label={t("Call")}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(145deg,#34D399,#16A34A)] text-white shadow-[0_12px_30px_-8px_rgba(34,197,94,0.75),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Phone size={24} fill="currentColor" />
        </button>
        {number ? (
          <button type="button" onClick={() => setNumber(number.slice(0, -1))} className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/[0.06] hover:text-white" aria-label={t("Delete")}>
            <Delete size={22} />
          </button>
        ) : <span />}
      </div>

      {notice && (
        <p className="mt-4 rounded-xl border px-3 py-2 text-center text-xs leading-5" style={{ borderColor: `${GOLD}33`, backgroundColor: `${GOLD}0D`, color: "#E8C547" }}>
          {notice}{" "}
          {state === "no_number" && status?.isManager && (
            <Link href="/calls?tab=setup" onClick={onNavigate} className="font-semibold underline">{t("Phone setup")}</Link>
          )}
        </p>
      )}
      {phone.error && state !== "error" && <p className="mt-3 text-center text-xs" style={{ color: RED }}>{t(phone.error)}</p>}
      {status?.settings?.non_lead_policy === "block" && <p className="mt-3 text-center text-[11px] text-gray-500">{t("Only leads saved in BaseLead can be called.")}</p>}

      {usage && (
        <div className="mt-5">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>{t("Team minutes this month")}</span>
            <span className="tabular-nums text-gray-300">{usage.used.toLocaleString()} / {usage.allowance.toLocaleString()}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, percent)}%`, background: percent >= 80 ? `linear-gradient(90deg, ${GOLD}, #F97316)` : `linear-gradient(90deg, ${BRAND}, #22D3EE)`, boxShadow: `0 0 12px ${percent >= 80 ? GOLD : BRAND}80` }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Live call: avatar with pulse rings, timer, controls. */
function InCall() {
  const phone = usePhone();
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());
  const [showKeys, setShowKeys] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!phone?.call) return null;
  const call = phone.call;
  const seconds = call.answeredAt ? Math.max(0, Math.round((now - call.answeredAt) / 1000)) : 0;
  const name = call.leadName || formatPhone(call.number);
  const initials = (call.leadName || "#").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const live = call.stage === "active";

  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: live ? GREEN : GOLD }}>
        {live ? t("On call") : call.direction === "inbound" ? t("Incoming call") : t("Calling…")}
      </p>
      <div className="relative mx-auto mt-5 flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full opacity-20" style={{ backgroundColor: live ? GREEN : BRAND }} />
        <span className="absolute -inset-2 rounded-full border opacity-40" style={{ borderColor: live ? GREEN : BRAND }} />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(145deg,#1E3A8A,#3B82F6)] text-2xl font-semibold text-white shadow-[0_0_40px_-8px_rgba(59,130,246,0.8)]">{initials}</span>
      </div>
      <p className="mt-5 truncate text-lg font-semibold text-white" data-no-translate>{name}</p>
      {call.leadName && <p className="text-sm tabular-nums text-gray-500">{formatPhone(call.number)}</p>}
      <p className="mt-3 font-mono text-3xl font-light tabular-nums text-white">{formatDuration(seconds)}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ borderColor: `${RED}40`, color: RED, backgroundColor: `${RED}10` }}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: RED }} /> {t("Recording")}
      </p>

      {showKeys && live && (
        <div className="mt-5 grid grid-cols-3 gap-y-3">
          {KEYS.map((key) => <Key key={key.digit} {...key} size="sm" onPress={phone.sendDigit} />)}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-5">
        {live && (
          <button type="button" onClick={phone.toggleMute} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/[0.08]" style={{ backgroundColor: call.muted ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.03)" }} aria-label={call.muted ? t("Unmute") : t("Mute")}>
            {call.muted ? <MicOff size={21} /> : <Mic size={21} />}
          </button>
        )}
        <button type="button" onClick={phone.hangup} className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(145deg,#FB7185,#E11D48)] text-white shadow-[0_12px_30px_-8px_rgba(242,47,70,0.8)] transition hover:scale-105 active:scale-95" aria-label={t("Hang up")}>
          <PhoneOff size={24} />
        </button>
        {live && (
          <button type="button" onClick={() => setShowKeys(!showKeys)} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/[0.08]" style={{ backgroundColor: showKeys ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.03)" }} aria-label={t("Keypad")}>
            <Grid3x3 size={21} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Policy screen + call screen + dial pad: everything the phone shows. */
export function PhoneScreen({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const phone = usePhone();
  const { t } = useLanguage();
  if (!phone) return null;

  if (phone.state === "locked") {
    return (
      <div>
        <span className="bl-icon-tile" style={{ "--tab": GOLD } as CSSProperties}><Lock size={17} /></span>
        <h3 className="mt-4 text-base font-bold text-white">{t("Call leads from BaseLead")}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          {t("Each rep gets their own US number. Calls to the USA and Canada are recorded and logged in the CRM automatically. Included in Pro and Scale.")}
        </p>
        <Link href="/settings?section=billing" onClick={onNavigate} className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>
          {t("Upgrade to Pro")}
        </Link>
      </div>
    );
  }

  if (phone.state === "policy") {
    return (
      <div>
        <span className="bl-icon-tile" style={{ "--tab": BRAND } as CSSProperties}><ShieldCheck size={17} /></span>
        <h3 className="mt-4 text-base font-bold text-white">{t("Call recording policy")}</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-400">
          {[
            "All calls on your BaseLead number are recorded and can be reviewed by your managers.",
            "Callers hear: “This call may be recorded for quality and training.”",
            "Your BaseLead number is for work only — no personal calls.",
            "The number belongs to the company.",
          ].map((line) => (
            <li key={line} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: BRAND }} />{t(line)}</li>
          ))}
        </ul>
        <button type="button" onClick={phone.acceptPolicy} className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>
          {t("I understand and accept")}
        </button>
      </div>
    );
  }

  if (phone.call) return <InCall />;
  return <DialPad compact={compact} onNavigate={onNavigate} />;
}

export default function PhoneDialer() {
  const phone = usePhone();
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!phone?.call) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phone?.call]);

  if (!phone || !mounted || phone.state === "loading") return null;
  const { open, setOpen, call, incoming } = phone;
  const seconds = call?.answeredAt ? Math.max(0, Math.round((now - call.answeredAt) / 1000)) : 0;
  const live = call?.stage === "active";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 left-4 z-[60] flex h-12 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(34,197,94,0.75),inset_0_1px_0_rgba(255,255,255,0.3)] transition hover:-translate-y-0.5 lg:bottom-6 lg:left-[264px]"
          style={{ background: call ? (live ? "linear-gradient(145deg,#34D399,#16A34A)" : `linear-gradient(145deg,${GOLD},#F59E0B)`) : "linear-gradient(145deg,#34D399,#16A34A)", color: call && !live ? "#111" : "#fff" }}
          aria-label={t("Phone")}
        >
          <Phone size={17} fill="currentColor" />
          {call ? (live ? <span className="tabular-nums">{formatDuration(seconds)}</span> : t("Calling…")) : t("Phone")}
          {phone.state === "locked" && <Lock size={13} />}
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 left-4 z-[97] w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(59,130,246,0.16),rgba(11,11,13,0.98)_55%)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-2xl lg:bottom-6 lg:left-[264px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/60 to-transparent" />
          <div className="flex items-center justify-between px-5 pb-1 pt-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${GREEN}22`, color: GREEN }}><Phone size={14} fill="currentColor" /></span>
              {t("Phone")}
            </span>
            <div className="flex items-center gap-1">
              <Link href="/calls" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 transition hover:bg-white/[0.06] hover:text-white">
                {t("History")}
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/[0.06] hover:text-white" aria-label={t("Close")}>
                <X size={17} />
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto px-5 pb-5 pt-3">
            <PhoneScreen compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {incoming &&
        createPortal(
          <div className="fixed inset-x-0 top-4 z-[130] flex justify-center px-4">
            <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0B0D]/95 p-4 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.5)] backdrop-blur-xl">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${GREEN}22`, color: GREEN }}>
                <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ backgroundColor: GREEN }} />
                <PhoneIncoming size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{t("Incoming call")}</p>
                <p className="truncate font-semibold text-white" data-no-translate>{incoming.leadName || formatPhone(incoming.number)}</p>
                {incoming.leadName && <p className="text-xs tabular-nums text-gray-500">{formatPhone(incoming.number)}</p>}
              </div>
              <button type="button" onClick={phone.decline} className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "linear-gradient(145deg,#FB7185,#E11D48)" }} aria-label={t("Decline")}>
                <PhoneOff size={18} />
              </button>
              <button type="button" onClick={phone.answer} className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "linear-gradient(145deg,#34D399,#16A34A)" }} aria-label={t("Answer")}>
                <Phone size={18} fill="currentColor" />
              </button>
            </div>
          </div>,
          document.body
        )}

      <OutcomeModal />
    </>
  );
}

/** After every call: the rep picks the result (saved in the CRM). */
function OutcomeModal() {
  const phone = usePhone();
  const { t } = useLanguage();
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const ended = phone?.ended;
  if (!phone || !ended) return null;

  async function save() {
    if (!ended || !outcome) return;
    setSaving(true);
    setMessage("");
    try {
      let callId = ended.callId;
      if (!callId) {
        // Incoming calls: find the log entry the server created.
        const response = await fetch("/api/phone/calls?days=1");
        const data = await response.json();
        const digits = ended.number.replace(/\D/g, "").slice(-10);
        callId = (data.calls ?? []).find((c: { direction: string; from_number: string | null }) => c.direction === "inbound" && String(c.from_number ?? "").replace(/\D/g, "").endsWith(digits))?.id ?? null;
      }
      if (!callId) throw new Error("Call not found yet. Add the result from Calls later.");
      const response = await fetch(`/api/phone/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save.");
      setOutcome("");
      setNotes("");
      phone!.clearEnded();
      phone!.refresh();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ borderColor: BORDER, backgroundColor: "#0B0B0D" }} role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-white">{t("How did the call go?")}</h2>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {ended.leadName || formatPhone(ended.number)} · {formatDuration(ended.seconds)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {OUTCOMES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setOutcome(item.value)}
              className="rounded-xl border px-3 py-2.5 text-left text-sm transition"
              style={{ borderColor: outcome === item.value ? BRAND : BORDER, backgroundColor: outcome === item.value ? "rgba(59,130,246,0.12)" : "transparent", color: outcome === item.value ? "#fff" : "#C4C4C4" }}
            >
              {t(item.label)}
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("Notes (optional)")}
          rows={3}
          className="mt-3 w-full rounded-xl border bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#3B82F6]"
          style={{ borderColor: BORDER }}
        />

        {message && <p className="mt-2 text-sm" style={{ color: RED }}>{t(message)}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={phone.clearEnded} className="rounded-xl px-4 py-2.5 text-sm" style={{ color: MUTED }}>
            {t("Skip")}
          </button>
          <button type="button" disabled={!outcome || saving} onClick={save} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: BRAND }}>
            {saving ? t("Saving...") : t("Save result")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
