"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Delete, Lock, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, ShieldCheck, X } from "lucide-react";

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

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export default function PhoneDialer() {
  const phone = usePhone();
  const { t } = useLanguage();
  const [number, setNumber] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!phone?.call) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phone?.call]);

  if (!phone || !mounted) return null;
  const { state, status, open, setOpen, call, incoming, error } = phone;
  if (state === "loading") return null;

  const usage = status?.usage;
  const seconds = call?.answeredAt ? Math.max(0, Math.round((now - call.answeredAt) / 1000)) : 0;

  const fab = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="fixed bottom-20 left-4 z-[60] flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(34,197,94,0.6)] transition hover:-translate-y-0.5 lg:bottom-6 lg:left-[264px]"
      style={{ backgroundColor: call ? (call.stage === "active" ? GREEN : GOLD) : "#16A34A", color: call && call.stage !== "active" ? "#111" : "#fff" }}
      aria-label={t("Phone")}
    >
      <Phone size={18} />
      {call ? (call.stage === "active" ? formatDuration(seconds) : t("Calling…")) : t("Phone")}
      {state === "locked" && <Lock size={13} />}
    </button>
  );

  function body() {
    if (state === "locked") {
      return (
        <div className="p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(245,197,24,0.12)", color: GOLD }}>
            <Lock size={20} />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">{t("Call leads from BaseLead")}</h3>
          <p className="mt-2 text-sm leading-6" style={{ color: MUTED }}>
            {t("Each rep gets their own US number. Calls to the USA and Canada are recorded and logged in the CRM automatically. Included in Pro and Scale.")}
          </p>
          <Link href="/settings?section=billing" className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold" style={{ backgroundColor: BRAND, color: "#fff" }}>
            {t("Upgrade to Pro")}
          </Link>
        </div>
      );
    }

    if (state === "not_configured") {
      return (
        <Notice
          title={t("Calling is being set up")}
          text={status?.isManager ? t("Built-in calling turns on once BaseLead's phone service is connected.") : t("Your manager will let you know when calling is ready.")}
        />
      );
    }

    if (state === "no_number") {
      return (
        <Notice
          title={t("You don't have a phone number yet")}
          text={status?.isManager ? t("Give yourself and your reps a number in Calls → Phone setup.") : t("Ask your manager to assign you a number.")}
          href={status?.isManager ? "/calls?tab=setup" : undefined}
          action={t("Phone setup")}
        />
      );
    }

    if (state === "sdk_missing") {
      return <Notice title={t("Phone component missing")} text={t("Run once in the project folder: npm install @telnyx/webrtc — then restart the app.")} />;
    }

    if (state === "policy") {
      return (
        <div className="p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(59,130,246,0.12)", color: BRAND }}>
            <ShieldCheck size={20} />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">{t("Call recording policy")}</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6" style={{ color: MUTED }}>
            <li>{t("All calls on your BaseLead number are recorded and can be reviewed by your managers.")}</li>
            <li>{t("Callers hear: “This call may be recorded for quality and training.”")}</li>
            <li>{t("Your BaseLead number is for work only — no personal calls.")}</li>
            <li>{t("The number belongs to the company.")}</li>
          </ul>
          <button type="button" onClick={phone!.acceptPolicy} className="mt-5 w-full rounded-xl py-3 text-sm font-bold" style={{ backgroundColor: BRAND, color: "#fff" }}>
            {t("I understand and accept")}
          </button>
        </div>
      );
    }

    if (call) {
      return (
        <div className="p-5 text-center">
          <p className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>
            {call.stage === "active" ? t("On call") : call.direction === "inbound" ? t("Incoming call") : t("Calling…")}
          </p>
          <p className="mt-2 truncate text-lg font-bold text-white">{call.leadName || formatPhone(call.number)}</p>
          {call.leadName && <p className="text-sm" style={{ color: MUTED }}>{formatPhone(call.number)}</p>}
          <p className="mt-3 font-mono text-2xl text-white">{formatDuration(seconds)}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: RED }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: RED }} /> {t("Recording")}
          </p>

          {call.stage === "active" && (
            <div className="mx-auto mt-4 grid max-w-[220px] grid-cols-3 gap-2">
              {KEYS.map((key) => (
                <button key={key} type="button" onClick={() => phone!.sendDigit(key)} className="rounded-lg border py-2 text-white hover:bg-white/[0.05]" style={{ borderColor: BORDER }}>
                  {key}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-center gap-4">
            {call.stage === "active" && (
              <button type="button" onClick={phone!.toggleMute} className="flex h-12 w-12 items-center justify-center rounded-full border text-white" style={{ borderColor: BORDER, backgroundColor: call.muted ? "rgba(255,255,255,0.12)" : "transparent" }} aria-label={call.muted ? t("Unmute") : t("Mute")}>
                {call.muted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <button type="button" onClick={phone!.hangup} className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: RED }} aria-label={t("Hang up")}>
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      );
    }

    // Ready (or connecting / error): keypad.
    return (
      <div className="p-5">
        <div className="flex items-center justify-between text-xs" style={{ color: MUTED }}>
          <span>{t("Your number")}: <span className="text-white">{formatPhone(status?.myNumber)}</span></span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: state === "ready" ? GREEN : state === "error" ? RED : GOLD }} />
            {state === "ready" ? t("Ready") : state === "error" ? t("Offline") : t("Connecting…")}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: BORDER }}>
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value.replace(/[^\d+()\-\s]/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && number) phone!.startCall(number);
            }}
            placeholder={t("Number (USA or Canada)")}
            inputMode="tel"
            className="h-12 min-w-0 flex-1 bg-transparent text-lg text-white outline-none"
          />
          {number && (
            <button type="button" onClick={() => setNumber(number.slice(0, -1))} style={{ color: MUTED }} aria-label={t("Delete")}>
              <Delete size={18} />
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button key={key} type="button" onClick={() => setNumber(number + key)} className="rounded-xl border py-3 text-lg text-white transition hover:bg-white/[0.05]" style={{ borderColor: BORDER }}>
              {key}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!number || state !== "ready"}
          onClick={() => phone!.startCall(number)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: GREEN }}
        >
          <Phone size={17} /> {t("Call")}
        </button>

        {status?.settings?.non_lead_policy === "block" && (
          <p className="mt-2 text-center text-[11px]" style={{ color: MUTED }}>{t("Only leads saved in BaseLead can be called.")}</p>
        )}

        {usage && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px]" style={{ color: MUTED }}>
              <span>{t("Team minutes this month")}</span>
              <span>{usage.used.toLocaleString()} / {usage.allowance.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.allowance)) * 100)}%`, backgroundColor: usage.used / Math.max(1, usage.allowance) >= 0.8 ? GOLD : BRAND }} />
            </div>
          </div>
        )}

        <Link href="/calls" onClick={() => setOpen(false)} className="mt-4 block text-center text-xs font-medium" style={{ color: BRAND }}>
          {t("Call history and recordings")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {!open && fab}

      {open && (
        <div
          className="fixed bottom-20 left-4 z-[97] w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border shadow-2xl lg:bottom-6 lg:left-[264px]"
          style={{ borderColor: BORDER, backgroundColor: "#0B0B0D" }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: BORDER }}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Phone size={16} style={{ color: GREEN }} /> {t("Phone")}
            </span>
            <button type="button" onClick={() => setOpen(false)} style={{ color: MUTED }} aria-label={t("Close")}>
              <X size={18} />
            </button>
          </div>
          {error && <p className="border-b px-4 py-2 text-xs" style={{ borderColor: BORDER, color: RED }}>{t(error)}</p>}
          {body()}
        </div>
      )}

      {incoming &&
        createPortal(
          <div className="fixed inset-x-0 top-4 z-[130] flex justify-center px-4">
            <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border p-4 shadow-2xl" style={{ borderColor: BORDER, backgroundColor: "#0B0B0D" }}>
              <div className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: GREEN }}>
                <PhoneIncoming size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs" style={{ color: MUTED }}>{t("Incoming call")}</p>
                <p className="truncate font-semibold text-white">{incoming.leadName || formatPhone(incoming.number)}</p>
                {incoming.leadName && <p className="text-xs" style={{ color: MUTED }}>{formatPhone(incoming.number)}</p>}
              </div>
              <button type="button" onClick={phone.decline} className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: RED }} aria-label={t("Decline")}>
                <PhoneOff size={18} />
              </button>
              <button type="button" onClick={phone.answer} className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: GREEN }} aria-label={t("Answer")}>
                <Phone size={18} />
              </button>
            </div>
          </div>,
          document.body
        )}

      <OutcomeModal />
    </>
  );
}

function Notice({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return (
    <div className="p-5">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6" style={{ color: MUTED }}>{text}</p>
      {href && (
        <Link href={href} className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold" style={{ backgroundColor: BRAND, color: "#fff" }}>
          {action}
        </Link>
      )}
    </div>
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
