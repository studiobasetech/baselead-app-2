"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AtSign, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";

/*
 * Connect any email account by IMAP/SMTP (Hostinger, Zoho, GoDaddy,
 * Namecheap, Yahoo, iCloud, cPanel...). BaseLead sends outreach from it
 * and reads its inbox for replies. Gmail keeps working through Google.
 */

type Account = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  smtp_host: string;
  imap_host: string | null;
  daily_limit: number;
  is_default: boolean;
  last_error: string | null;
};

type Preset = { id: string; label: string; smtp: string; smtpPort: number; secure: boolean; imap: string };

const EMPTY_FORM = {
  preset: "hostinger",
  displayName: "",
  email: "",
  password: "",
  smtpHost: "",
  smtpPort: "465",
  smtpSecure: true,
  imapHost: "",
  imapPort: "993",
  username: "",
  dailyLimit: "50",
};

const input =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#3B82F6]/60";

export default function EmailAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [setupNeeded, setSetupNeeded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  const preset = presets.find((item) => item.id === form.preset);
  const custom = form.preset === "custom";

  async function load() {
    const response = await fetch("/api/email-accounts");
    if (!response.ok) return;
    const data = await response.json();
    setAccounts(data.accounts ?? []);
    setPresets(data.presets ?? []);
    setSetupNeeded(data.setupNeeded ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/email-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        smtpHost: custom ? form.smtpHost : undefined,
        smtpPort: custom ? form.smtpPort : undefined,
        smtpSecure: custom ? form.smtpSecure : undefined,
        imapHost: custom ? form.imapHost : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage({ type: "error", text: data.error || "Could not connect this account." });
      return;
    }
    setMessage({
      type: "ok",
      text: data.warning || `${data.account?.email} is connected. Outreach will be sent from this address.`,
    });
    setForm(EMPTY_FORM);
    setOpen(false);
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/email-accounts?id=${id}`, { method: "DELETE" });
    void load();
  }

  async function makeDefault(id: string) {
    await fetch("/api/email-accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, makeDefault: true }),
    });
    void load();
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10243A] text-[#3B82F6]">
            <AtSign size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Email accounts (IMAP / SMTP)</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Send outreach from your business email (Hostinger, Zoho, GoDaddy, Namecheap, Yahoo, iCloud, cPanel...) and detect replies.
              Using Gmail? Connect it below with Google instead.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          <Plus size={16} /> Connect email account
        </button>
      </div>

      {setupNeeded && <p className="mt-4 rounded-xl border border-[#F5C518]/30 bg-[#F5C518]/[0.06] p-3 text-sm text-[#F5C518]">{setupNeeded}</p>}

      {message && (
        <p className={`mt-4 rounded-xl p-3 text-sm ${message.type === "ok" ? "border border-[#84CC16]/30 bg-[#84CC16]/[0.06] text-[#84CC16]" : "border border-[#F22F46]/30 bg-[#F22F46]/[0.06] text-[#F22F46]"}`}>
          {message.text}
        </p>
      )}

      {accounts.length > 0 && (
        <div className="mt-4 space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-white" data-no-translate>
                  <CheckCircle2 size={15} className="shrink-0 text-[#84CC16]" />
                  {account.display_name ? `${account.display_name} · ` : ""}
                  {account.email}
                  {account.is_default && (
                    <span className="rounded-full bg-[#3B82F6]/15 px-2 py-0.5 text-[11px] font-semibold text-[#3B82F6]">Sending from this one</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {account.imap_host ? "Sends + detects replies" : "Sends only (replies not read)"} · up to {account.daily_limit} emails a day
                </p>
                {account.last_error && <p className="mt-1 text-xs text-[#F5C518]">{account.last_error}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!account.is_default && (
                  <button type="button" onClick={() => void makeDefault(account.id)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white">
                    Use for sending
                  </button>
                )}
                <button type="button" onClick={() => void remove(account.id)} aria-label="Disconnect" className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-[#F22F46]">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Connect an email account</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-gray-400">
                Email provider
                <select value={form.preset} onChange={(e) => update("preset", e.target.value)} className={`${input} mt-1.5`}>
                  {presets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-gray-400">
                Your name (shown to the lead)
                <input value={form.displayName} onChange={(e) => update("displayName", e.target.value)} className={`${input} mt-1.5`} placeholder="Kimberley from Studio Base" />
              </label>

              <label className="block text-sm text-gray-400">
                Email address
                <input type="email" autoComplete="off" value={form.email} onChange={(e) => update("email", e.target.value)} className={`${input} mt-1.5`} placeholder="you@yourcompany.com" />
              </label>

              <label className="block text-sm text-gray-400">
                Password {/(yahoo|icloud|gmail-app)/.test(form.preset) ? "(app password)" : ""}
                <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className={`${input} mt-1.5`} placeholder="Email password" />
              </label>

              {custom && (
                <div className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2">
                  <label className="block text-xs text-gray-400 sm:col-span-2">
                    Username (usually the full email)
                    <input value={form.username} onChange={(e) => update("username", e.target.value)} className={`${input} mt-1`} placeholder="you@yourcompany.com" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    SMTP server (outgoing)
                    <input value={form.smtpHost} onChange={(e) => update("smtpHost", e.target.value)} className={`${input} mt-1`} placeholder="mail.yourcompany.com" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    SMTP port
                    <select
                      value={`${form.smtpPort}-${form.smtpSecure ? "ssl" : "tls"}`}
                      onChange={(e) => {
                        const [port, mode] = e.target.value.split("-");
                        update("smtpPort", port);
                        update("smtpSecure", mode === "ssl");
                      }}
                      className={`${input} mt-1`}
                    >
                      <option value="465-ssl">465 (SSL)</option>
                      <option value="587-tls">587 (STARTTLS)</option>
                    </select>
                  </label>
                  <label className="block text-xs text-gray-400">
                    IMAP server (incoming)
                    <input value={form.imapHost} onChange={(e) => update("imapHost", e.target.value)} className={`${input} mt-1`} placeholder="mail.yourcompany.com" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    IMAP port
                    <input value={form.imapPort} onChange={(e) => update("imapPort", e.target.value)} className={`${input} mt-1`} placeholder="993" />
                  </label>
                </div>
              )}

              {!custom && preset && (
                <p className="text-xs text-gray-500" data-no-translate>
                  {preset.smtp}:{preset.smtpPort} · {preset.imap}:993
                </p>
              )}

              <label className="block text-sm text-gray-400">
                Max emails per day from this account
                <input type="number" min={1} max={500} value={form.dailyLimit} onChange={(e) => update("dailyLimit", e.target.value)} className={`${input} mt-1.5`} />
                <span className="mt-1 block text-xs text-gray-600">30–50 a day is safest for cold outreach.</span>
              </label>

              {message?.type === "error" && (
                <p className="rounded-xl border border-[#F22F46]/30 bg-[#F22F46]/[0.06] p-3 text-sm text-[#F22F46]">{message.text}</p>
              )}

              <button
                type="button"
                disabled={saving || !form.email || !form.password}
                onClick={() => void save()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? "Testing the connection..." : "Test & connect"}
              </button>
              <p className="text-center text-xs text-gray-600">
                Your password is encrypted and only used to send and read emails for BaseLead.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
