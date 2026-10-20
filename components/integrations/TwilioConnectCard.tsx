"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageSquare } from "lucide-react";

/* Connect the workspace's own Twilio number for texting leads. */
export default function TwilioConnectCard({
  embedded = false,
  onStatusChange,
}: {
  embedded?: boolean;
  onStatusChange?: (connected: boolean) => void;
} = {}) {
  const [state, setState] = useState<{
    configured: boolean;
    connected: boolean;
    label: string | null;
    isOwner?: boolean;
    webhookUrl?: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountSid: "", authToken: "", fromNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const response = await fetch("/api/settings/twilio", { cache: "no-store" });
    if (!response.ok) return;
    const next = await response.json();
    setState(next);
    onStatusChange?.(Boolean(next.connected));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(disconnect = false) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/settings/twilio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(disconnect ? { disconnect: true } : form),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(result.error || "Could not connect.");
      return;
    }

    setOpen(false);
    setForm({ accountSid: "", authToken: "", fromNumber: "" });
    void load();
  }

  return (
    <div
      className={
        embedded
          ? "rounded-xl border border-white/10 bg-black/20 p-4"
          : "mx-4 mb-5 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 sm:mx-6 lg:mx-7"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F22F46]/15 text-[#F22F46]">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">Twilio — text messages</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {state?.connected
                ? `Connected: ${state.label}`
                : "Text leads from your own business number. Replies land in BaseLead and move the pipeline."}
            </p>
          </div>
        </div>

        {state?.isOwner && (
          <button
            type="button"
            onClick={() => (state.connected ? void save(true) : setOpen(!open))}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              state.connected
                ? "border border-[#202020] text-gray-400 hover:text-[#F22F46]"
                : "bg-[#3B82F6] text-white hover:bg-[#2F74E8]"
            }`}
          >
            {state.connected ? "Disconnect" : "Connect Twilio"}
          </button>
        )}
      </div>

      {state?.connected && state.webhookUrl && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] text-gray-500">
            In Twilio → Phone Numbers → your number → <b>Messaging → “A message comes in”</b>, paste this webhook (HTTP POST):
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs text-gray-300">{state.webhookUrl}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(state.webhookUrl ?? "");
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white"
              aria-label="Copy webhook URL"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["accountSid", "Account SID (AC…)"],
              ["authToken", "Auth Token"],
              ["fromNumber", "Your Twilio number (+1…)"],
            ] as const
          ).map(([key, placeholder]) => (
            <input
              key={key}
              type={key === "authToken" ? "password" : "text"}
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              placeholder={placeholder}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#3B82F6]/50"
            />
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="h-11 rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50 sm:col-span-3"
          >
            {busy ? "Connecting…" : "Save & verify"}
          </button>
          {error && <p className="text-xs text-[#F22F46] sm:col-span-3">{error}</p>}
        </div>
      )}

      {state && !state.configured && (
        <p className="mt-3 text-xs text-gray-500">Add SUPABASE_SERVICE_ROLE_KEY to enable this.</p>
      )}

      {state?.configured && !state.isOwner && !state.connected && (
        <p className="mt-3 text-xs text-gray-500">Ask your workspace owner to connect Twilio.</p>
      )}
    </div>
  );
}
