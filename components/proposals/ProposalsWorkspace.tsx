"use client";

// Proposals: create, send, e-sign and get paid. Lives inside Sales Toolkit.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  CreditCard,
  Eye,
  FileSignature,
  FileText,
  Mail,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { computeTotals, formatMoney, type LineItem, type Proposal } from "@/lib/proposals";

type LeadOption = { id: string; company: string | null; name: string | null; email: string | null };

type Draft = {
  id?: string;
  lead_id: string;
  title: string;
  intro: string;
  client_name: string;
  client_email: string;
  line_items: LineItem[];
  discount: number;
  tax_rate: number;
  currency: string;
  valid_until: string;
  payment_mode: "none" | "deposit" | "full";
  deposit_percent: number;
  terms: string;
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#8C8C8C" },
  sent: { label: "Sent", color: "#3B82F6" },
  viewed: { label: "Viewed", color: "#2DD4BF" },
  signed: { label: "Signed", color: "#A78BFA" },
  paid: { label: "Paid", color: "#84CC16" },
  declined: { label: "Declined", color: "#F22F46" },
};

function emptyDraft(): Draft {
  const valid = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  return {
    lead_id: "",
    title: "Growth proposal",
    intro:
      "Thank you for the conversation. Below is the plan we discussed, what's included and the investment.",
    client_name: "",
    client_email: "",
    line_items: [{ name: "", description: "", quantity: 1, price: 0 }],
    discount: 0,
    tax_rate: 0,
    currency: "usd",
    valid_until: valid,
    payment_mode: "deposit",
    deposit_percent: 50,
    terms:
      "Work starts after signature and the initial payment. Timelines begin once we receive all required materials. This proposal is valid until the date shown above.",
  };
}

export default function ProposalsWorkspace({ embedded = false }: { embedded?: boolean }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [payments, setPayments] = useState<{ connected: boolean; account: string | null; isOwner?: boolean } | null>(null);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [stripeKey, setStripeKey] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  };

  const load = useCallback(async () => {
    const [list, pay, leadRows] = await Promise.all([
      fetch("/api/proposals", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/settings/payments", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      supabase
        .from("leads")
        .select("id, company, name, email")
        .not("status", "in", "(lost)")
        .order("updated_at", { ascending: false })
        .limit(300),
    ]);

    setProposals(list.proposals ?? []);
    setPayments(pay);
    setLeads((leadRows.data ?? []) as LeadOption[]);
    setLoading(false);

    // Open the editor directly from a lead (?lead=ID).
    const leadId = new URLSearchParams(window.location.search).get("lead");
    if (leadId) {
      const lead = (leadRows.data ?? []).find((item) => item.id === leadId);
      setDraft({
        ...emptyDraft(),
        lead_id: leadId,
        client_name: lead?.company || lead?.name || "",
        client_email: lead?.email || "",
      });
      window.history.replaceState(null, "", embedded ? "/resources?tab=proposals" : window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totals = useMemo(
    () => (draft ? computeTotals(draft.line_items.filter((i) => i.name), draft.discount, draft.tax_rate) : null),
    [draft]
  );

  const stats = useMemo(() => {
    const open = proposals.filter((p) => ["sent", "viewed"].includes(p.status));
    const won = proposals.filter((p) => ["signed", "paid"].includes(p.status));
    const decided = proposals.filter((p) => ["signed", "paid", "declined"].includes(p.status));
    return {
      openValue: open.reduce((s, p) => s + Number(p.total), 0),
      wonValue: won.reduce((s, p) => s + Number(p.total), 0),
      collected: proposals.reduce((s, p) => s + Number(p.amount_paid ?? 0), 0),
      winRate: decided.length ? Math.round((won.length / decided.length) * 100) : 0,
    };
  }, [proposals]);

  function edit(proposal: Proposal) {
    setDraft({
      id: proposal.id,
      lead_id: proposal.lead_id ?? "",
      title: proposal.title,
      intro: proposal.intro ?? "",
      client_name: proposal.client_name ?? "",
      client_email: proposal.client_email ?? "",
      line_items: proposal.line_items.length ? proposal.line_items : emptyDraft().line_items,
      discount: Number(proposal.discount),
      tax_rate: Number(proposal.tax_rate),
      currency: proposal.currency,
      valid_until: proposal.valid_until ?? "",
      payment_mode: proposal.payment_mode,
      deposit_percent: Number(proposal.deposit_percent),
      terms: proposal.terms ?? "",
    });
  }

  function duplicate(proposal: Proposal) {
    const copy = { ...proposal } as Proposal;
    edit(copy);
    setDraft((current) => (current ? { ...current, id: undefined, title: `${proposal.title} (copy)` } : current));
  }

  async function save(): Promise<Proposal | null> {
    if (!draft) return null;

    setBusy(true);
    const body = { ...draft, line_items: draft.line_items.filter((item) => item.name.trim()) };

    const response = await fetch(draft.id ? `/api/proposals/${draft.id}` : "/api/proposals", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not save the proposal.");
      return null;
    }

    setDraft((current) => (current ? { ...current, id: result.proposal.id } : current));
    await load();
    return result.proposal as Proposal;
  }

  async function send(proposal: Proposal, email: boolean) {
    setBusy(true);
    const response = await fetch(`/api/proposals/${proposal.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not send.");
      return;
    }

    if (!email) await navigator.clipboard?.writeText(result.link);
    showToast(email ? `Proposal emailed to ${proposal.client_email}.` : "Link copied. Paste it in your email or chat.");
    setDraft(null);
    await load();
  }

  async function saveAndSend(email: boolean) {
    const saved = await save();
    if (saved) await send(saved, email);
  }

  async function remove(proposal: Proposal) {
    if (!window.confirm(`Delete proposal "${proposal.title}"?`)) return;
    await fetch(`/api/proposals/${proposal.id}`, { method: "DELETE" });
    await load();
  }

  async function savePayments(disconnect = false) {
    setBusy(true);
    const response = await fetch("/api/settings/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey: disconnect ? "" : stripeKey }),
    });
    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not save.");
      return;
    }

    setStripeKey("");
    setPaymentsOpen(false);
    showToast(result.connected ? `Payments connected: ${result.account}` : "Payments disconnected.");
    await load();
  }

  function setItem(index: number, patch: Partial<LineItem>) {
    if (!draft) return;
    setDraft({
      ...draft,
      line_items: draft.line_items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  const input =
    "h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm outline-none transition focus:border-[#3B82F6]/50";

  return (
    <section className={embedded ? "text-white" : "min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {embedded ? (
            <h2 className="text-lg font-semibold tracking-tight">Proposals</h2>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Proposals</h1>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Send a proposal, get it signed online and get paid — the pipeline updates by itself.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPaymentsOpen(true)}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[#202020] bg-[#0D0D0D] px-4 py-3 text-sm text-gray-300 transition hover:border-[#84CC16]/40 hover:text-[#84CC16]"
          >
            <CreditCard size={16} />
            {payments?.connected ? "Payments on" : "Connect payments"}
          </button>
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.2)] transition hover:-translate-y-0.5 hover:bg-[#2F74E8]"
          >
            <Plus size={16} /> New proposal
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Open pipeline", value: formatMoney(stats.openValue), color: "#3B82F6" },
          { label: "Won (signed)", value: formatMoney(stats.wonValue), color: "#A78BFA" },
          { label: "Collected", value: formatMoney(stats.collected), color: "#84CC16" },
          { label: "Win rate", value: `${stats.winRate}%`, color: "#F5C518" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums" style={{ color: item.color }}>
              {loading ? "–" : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {!loading && proposals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-10 text-center">
            <FileText className="mx-auto text-[#3B82F6]" />
            <p className="mt-3 text-sm text-gray-400">No proposals yet. Create one from a lead in a couple of minutes.</p>
          </div>
        )}

        {proposals.map((proposal) => {
          const style = STATUS_STYLE[proposal.status] ?? STATUS_STYLE.draft;
          const link = typeof window !== "undefined" ? `${window.location.origin}/p/${proposal.public_token}` : "";

          return (
            <div
              key={proposal.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 transition hover:border-[#2A2A2A] sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${style.color}1A`, color: style.color }}>
                  <FileSignature size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{proposal.title}</p>
                  <p className="truncate text-xs text-gray-500">
                    {proposal.number} · {proposal.client_name || "No client"} ·{" "}
                    {new Date(proposal.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">{formatMoney(Number(proposal.total), proposal.currency)}</span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: `${style.color}1A`, color: style.color }}>
                  {style.label}
                </span>

                <div className="flex gap-1">
                  <a href={link} target="_blank" rel="noreferrer" className="rounded-lg border border-[#202020] p-2 text-gray-400 transition hover:text-white" aria-label="Preview">
                    <Eye size={14} />
                  </a>
                  {["signed", "paid"].includes(proposal.status) ? (
                    <button type="button" onClick={() => duplicate(proposal)} className="rounded-lg border border-[#202020] p-2 text-gray-400 transition hover:text-white" aria-label="Duplicate">
                      <Copy size={14} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => edit(proposal)} className="rounded-lg border border-[#202020] px-3 py-1.5 text-xs text-gray-300 transition hover:border-[#3B82F6]/40 hover:text-[#3B82F6]">
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => void remove(proposal)} className="rounded-lg border border-[#202020] p-2 text-gray-500 transition hover:text-[#F22F46]" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDITOR */}
      {draft && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0D0D0D] p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{draft.id ? "Edit proposal" : "New proposal"}</h3>
              <button type="button" onClick={() => setDraft(null)} className="text-gray-500 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs text-gray-500">Lead</span>
                <select
                  value={draft.lead_id}
                  onChange={(event) => {
                    const lead = leads.find((item) => item.id === event.target.value);
                    setDraft({
                      ...draft,
                      lead_id: event.target.value,
                      client_name: lead?.company || lead?.name || draft.client_name,
                      client_email: lead?.email || draft.client_email,
                    });
                  }}
                  className={input}
                >
                  <option value="">— No lead —</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company || lead.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs text-gray-500">Client name</span>
                <input value={draft.client_name} onChange={(e) => setDraft({ ...draft, client_name: e.target.value })} className={input} />
              </label>
              <label>
                <span className="text-xs text-gray-500">Client email</span>
                <input type="email" value={draft.client_email} onChange={(e) => setDraft({ ...draft, client_email: e.target.value })} className={input} />
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs text-gray-500">Title</span>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={input} />
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs text-gray-500">Introduction</span>
                <textarea
                  rows={3}
                  value={draft.intro}
                  onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm outline-none focus:border-[#3B82F6]/50"
                />
              </label>
            </div>

            <h4 className="mt-6 text-sm font-semibold">Services & pricing</h4>
            <div className="mt-3 space-y-2">
              {draft.line_items.map((item, index) => (
                <div key={index} className="rounded-xl border border-[#202020] bg-[#0A0A0A] p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_80px_120px_32px]">
                    <input value={item.name} onChange={(e) => setItem(index, { name: e.target.value })} placeholder="Service (e.g. Website redesign)" className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#3B82F6]/50" />
                    <input type="number" min={0} value={item.quantity} onChange={(e) => setItem(index, { quantity: Number(e.target.value) })} className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm outline-none" aria-label="Quantity" />
                    <input type="number" min={0} value={item.price} onChange={(e) => setItem(index, { price: Number(e.target.value) })} className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm outline-none" aria-label="Price" />
                    <button type="button" onClick={() => setDraft({ ...draft, line_items: draft.line_items.filter((_, i) => i !== index) })} className="flex h-10 items-center justify-center text-gray-600 hover:text-[#F22F46]" aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input value={item.description ?? ""} onChange={(e) => setItem(index, { description: e.target.value })} placeholder="What's included (optional)" className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs text-gray-300 outline-none" />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, line_items: [...draft.line_items, { name: "", description: "", quantity: 1, price: 0 }] })}
              className="mt-2 w-full rounded-xl border border-dashed border-[#2A2A2A] py-2.5 text-sm text-gray-400 transition hover:border-[#3B82F6]/40 hover:text-[#3B82F6]"
            >
              + Add item
            </button>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <label>
                <span className="text-xs text-gray-500">Discount ($)</span>
                <input type="number" min={0} value={draft.discount} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })} className={input} />
              </label>
              <label>
                <span className="text-xs text-gray-500">Tax (%)</span>
                <input type="number" min={0} value={draft.tax_rate} onChange={(e) => setDraft({ ...draft, tax_rate: Number(e.target.value) })} className={input} />
              </label>
              <label>
                <span className="text-xs text-gray-500">Currency</span>
                <select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} className={input}>
                  {["usd", "mxn", "eur", "cad", "cop", "gbp"].map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs text-gray-500">Valid until</span>
                <input type="date" value={draft.valid_until} onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })} className={input} />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-[#202020] bg-[#0A0A0A] p-4">
              <p className="text-xs text-gray-500">Payment when the client signs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["none", "No online payment"],
                    ["deposit", "Deposit"],
                    ["full", "Full amount"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft({ ...draft, payment_mode: value })}
                    className={`rounded-lg border px-3 py-2 text-xs transition ${
                      draft.payment_mode === value
                        ? "border-[#3B82F6]/50 bg-[#3B82F6]/10 text-[#3B82F6]"
                        : "border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                {draft.payment_mode === "deposit" && (
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input type="number" min={1} max={100} value={draft.deposit_percent} onChange={(e) => setDraft({ ...draft, deposit_percent: Number(e.target.value) })} className="h-9 w-16 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-sm text-white" />%
                  </label>
                )}
              </div>
              {draft.payment_mode !== "none" && !payments?.connected && (
                <p className="mt-2 text-xs text-[#3B82F6]">Connect your Stripe account (“Connect payments”) so clients can pay online.</p>
              )}
            </div>

            <label className="mt-4 block">
              <span className="text-xs text-gray-500">Terms</span>
              <textarea rows={3} value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm outline-none focus:border-[#3B82F6]/50" />
            </label>

            {totals && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/[0.05] px-4 py-3">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-xl font-semibold tabular-nums text-[#3B82F6]">{formatMoney(totals.total, draft.currency)}</span>
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={() => void save().then((p) => p && (setDraft(null), showToast("Proposal saved.")))} className="h-12 rounded-xl border border-[#202020] text-sm text-gray-300 transition hover:bg-[#171717] disabled:opacity-50">
                Save draft
              </button>
              <button type="button" disabled={busy} onClick={() => void saveAndSend(false)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#3B82F6]/40 text-sm text-[#3B82F6] transition hover:bg-[#3B82F6]/10 disabled:opacity-50">
                <Copy size={15} /> Copy link & mark sent
              </button>
              <button type="button" disabled={busy || !draft.client_email} onClick={() => void saveAndSend(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50">
                <Mail size={15} /> Send by email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {paymentsOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0D0D0D] p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Get paid online</h3>
              <button type="button" onClick={() => setPaymentsOpen(false)} className="text-gray-500 hover:text-white" aria-label="Close"><X size={18} /></button>
            </div>

            {payments?.connected ? (
              <>
                <p className="mt-4 flex items-center gap-2 text-sm text-[#84CC16]"><Check size={16} /> Connected: {payments.account}</p>
                <p className="mt-2 text-xs text-gray-500">Clients pay your Stripe account directly when they sign.</p>
                {payments.isOwner && (
                  <button type="button" onClick={() => void savePayments(true)} className="mt-5 h-11 w-full rounded-xl border border-[#202020] text-sm text-gray-400 hover:text-[#F22F46]">
                    Disconnect
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Paste your Stripe <b>secret key</b> (Stripe → Developers → API keys). It is encrypted and only used to create payment links for your proposals. Money goes straight to your Stripe account.
                </p>
                <input value={stripeKey} onChange={(e) => setStripeKey(e.target.value.trim())} placeholder="sk_live_..." className={`${input} mt-4 font-mono`} />
                <button type="button" disabled={busy || !stripeKey} onClick={() => void savePayments()} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50">
                  <Send size={15} /> Connect Stripe
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[90] max-w-[90vw] -translate-x-1/2 rounded-xl border border-white/10 bg-[#111]/95 px-4 py-3 text-sm text-gray-200 shadow-2xl backdrop-blur lg:bottom-8">
          {toast}
        </div>
      )}
    </section>
  );
}
