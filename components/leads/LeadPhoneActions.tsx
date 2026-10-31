"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Phone, PhoneCall, Send, X } from "lucide-react";

import { supabase } from "@/components/lib/supabase";

const OUTCOMES = [
  { value: "connected", label: "Talked", color: "#3B82F6" },
  { value: "interested", label: "Interested", color: "#84CC16" },
  { value: "meeting_booked", label: "Meeting booked", color: "#F22F46" },
  { value: "voicemail", label: "Voicemail", color: "#A78BFA" },
  { value: "no_answer", label: "No answer", color: "#8C8C8C" },
  { value: "not_interested", label: "Not interested", color: "#F97316" },
  { value: "wrong_number", label: "Wrong number", color: "#555555" },
];

const SMS_TEMPLATES = [
  "Hi {{name}}, it's {{me}}. I just sent you an email with a quick idea for {{company}}. Do you have 10 minutes this week?",
  "Hi {{name}}, following up on my call. Here's a link to pick a time that works: ",
  "Thanks for your time today, {{name}}! I'll send the proposal shortly.",
];

/* Call (phone dialer), log the call, and text the lead. */
export default function LeadPhoneActions({
  leadId,
  onChanged,
}: {
  leadId: string;
  onChanged?: () => void;
}) {
  const [phone, setPhone] = useState<string | null>(null);
  const [lead, setLead] = useState<{ company: string; contact: string } | null>(null);
  const [mode, setMode] = useState<"none" | "log" | "sms">("none");
  const [outcome, setOutcome] = useState("connected");
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState("");
  const [followUp, setFollowUp] = useState<string>("auto");
  const [sms, setSms] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase
      .from("leads")
      .select("phone, company, name, contact_name")
      .eq("id", leadId)
      .maybeSingle()
      .then(({ data }) => {
        setPhone(data?.phone ?? null);
        setLead({
          company: data?.company || data?.name || "",
          contact: (data?.contact_name || "").split(/\s+/)[0] || "there",
        });
      });
  }, [leadId]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  }

  async function logCall() {
    setBusy(true);
    const response = await fetch(`/api/leads/${leadId}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome,
        notes,
        durationMinutes: minutes ? Number(minutes) : undefined,
        followUpDays: followUp === "auto" ? undefined : followUp === "none" ? null : Number(followUp),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      flash(result.error || "Could not log the call.");
      return;
    }

    setMode("none");
    setNotes("");
    setMinutes("");
    flash("Call logged.");
    onChanged?.();
  }

  async function sendText() {
    setBusy(true);
    const response = await fetch(`/api/leads/${leadId}/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: sms }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      flash(result.error || "Could not send the text.");
      return;
    }

    setMode("none");
    setSms("");
    flash("Text sent.");
    onChanged?.();
  }

  function applyTemplate(template: string) {
    setSms(
      template
        .replace("{{name}}", lead?.contact || "there")
        .replace("{{company}}", lead?.company || "your business")
        .replace("{{me}}", "")
        .replace(/\s+,/g, ",")
    );
  }

  return (
    <div className="rounded-xl border border-[#202020] bg-[#0A0A0A] p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">Phone</p>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <a
          href={phone ? `tel:${phone}` : undefined}
          onClick={() => phone && window.setTimeout(() => setMode("log"), 800)}
          aria-disabled={!phone}
          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition ${
            phone ? "bg-[#84CC16] text-black hover:brightness-110" : "pointer-events-none bg-white/[0.04] text-gray-600"
          }`}
        >
          <Phone size={12} /> Call
        </a>
        <button
          type="button"
          onClick={() => setMode(mode === "log" ? "none" : "log")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[11px] text-gray-300 transition hover:border-[#3B82F6]/40 hover:text-[#3B82F6]"
        >
          <PhoneCall size={12} /> Log call
        </button>
        <button
          type="button"
          disabled={!phone}
          onClick={() => setMode(mode === "sms" ? "none" : "sms")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[11px] text-gray-300 transition hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF] disabled:opacity-40"
        >
          <MessageSquare size={12} /> Text
        </button>
      </div>

      {!phone && <p className="mt-2 text-[11px] text-gray-600">No phone number yet. Add one to a contact or edit the lead.</p>}

      {mode === "log" && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400">How did it go?</p>
            <button type="button" onClick={() => setMode("none")} className="text-gray-600 hover:text-white" aria-label="Close"><X size={13} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OUTCOMES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setOutcome(item.value)}
                className="rounded-full border px-2.5 py-1 text-[11px] transition"
                style={
                  outcome === item.value
                    ? { borderColor: item.color, color: item.color, background: `${item.color}1A` }
                    : { borderColor: "rgba(255,255,255,0.1)", color: "#9CA3AF" }
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Call notes: needs, budget, objections, next step…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs outline-none focus:border-[#3B82F6]/40"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              min={0}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              placeholder="Minutes"
              className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs outline-none"
            />
            <select
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-[#111] px-2 text-xs text-gray-300 outline-none"
            >
              <option value="auto">Follow-up: automatic</option>
              <option value="1">Follow up tomorrow</option>
              <option value="3">Follow up in 3 days</option>
              <option value="7">Follow up in 1 week</option>
              <option value="none">No follow-up</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void logCall()}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <PhoneCall size={12} />} Save call
          </button>
        </div>
      )}

      {mode === "sms" && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {SMS_TEMPLATES.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applyTemplate(template)}
                className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-gray-400 hover:text-white"
              >
                Template {index + 1}
              </button>
            ))}
          </div>
          <textarea
            value={sms}
            onChange={(event) => setSms(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={`Text to ${phone}`}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs outline-none focus:border-[#2DD4BF]/40"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-600">{sms.length}/160 · {Math.max(1, Math.ceil(sms.length / 160))} SMS</span>
            <button
              type="button"
              disabled={busy || !sms.trim()}
              onClick={() => void sendText()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2DD4BF] px-4 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send text
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-2 text-[11px] text-[#84CC16]">{message}</p>}
    </div>
  );
}
