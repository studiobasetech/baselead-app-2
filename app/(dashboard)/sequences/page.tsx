"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Workflow,
  X,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import PlanGate from "@/components/plans/PlanGate";

type Step = {
  id?: string;
  step_order?: number;
  delay_days: number;
  type: "email" | "call" | "linkedin" | "task";
  subject: string;
  body: string;
};

type Sequence = {
  id: string;
  name: string;
  active: boolean;
  steps: Step[];
  stats: { active: number; replied: number; completed: number; total: number };
};

type LeadOption = {
  id: string;
  company: string | null;
  name: string | null;
  email: string | null;
  status: string | null;
  ai_score: number | null;
};

const STEP_ICON = { email: Mail, call: Phone, linkedin: Briefcase, task: Workflow };

const TEMPLATE: Step[] = [
  {
    delay_days: 0,
    type: "email",
    subject: "Quick idea for {{company}}",
    body:
      "Hi {{first_name}},\n\nI came across {{company}} and had a quick idea that could help you get more clients in {{city}}.\n\nWould you be open to a 15-minute call this week? You can pick a time here: {{booking_link}}\n\nBest,\n{{my_company}}",
  },
  {
    delay_days: 3,
    type: "email",
    subject: "Quick idea for {{company}}",
    body:
      "Hi {{first_name}}, just bringing this back to the top of your inbox. Happy to share a couple of examples of what we did for similar businesses.\n\n{{booking_link}}",
  },
  {
    delay_days: 2,
    type: "call",
    subject: "Call {{company}}",
    body: "Short call: mention the emails and offer a 15-minute intro.",
  },
  {
    delay_days: 4,
    type: "email",
    subject: "Quick idea for {{company}}",
    body:
      "Hi {{first_name}}, I don't want to fill your inbox, so this will be my last note. If growing {{company}} is a priority this quarter, grab a time here: {{booking_link}}",
  },
];

export default function SequencesPage() {
  const { can } = usePlan();

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id?: string; name: string; steps: Step[] } | null>(null);
  const [enrolling, setEnrolling] = useState<Sequence | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  };

  const load = useCallback(async () => {
    const response = await fetch("/api/sequences", { cache: "no-store" });
    const result = await response.json();
    setSequences(result.sequences ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save() {
    if (!editing) return;

    setBusy(true);

    const response = await fetch("/api/sequences", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const result = await response.json();

    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not save the sequence.");
      return;
    }

    setEditing(null);
    showToast("Sequence saved.");
    void load();
  }

  async function toggle(sequence: Sequence) {
    await fetch("/api/sequences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sequence.id, active: !sequence.active }),
    });
    void load();
  }

  async function remove(sequence: Sequence) {
    if (!window.confirm(`Delete "${sequence.name}"? Leads in it will stop receiving emails.`)) return;
    await fetch(`/api/sequences?id=${sequence.id}`, { method: "DELETE" });
    void load();
  }

  async function openEnroll(sequence: Sequence) {
    setEnrolling(sequence);
    setPicked([]);

    const { data } = await supabase
      .from("leads")
      .select("id, company, name, email, status, ai_score")
      .not("status", "in", "(won,lost)")
      .order("ai_score", { ascending: false, nullsFirst: false })
      .limit(300);

    setLeads((data ?? []) as LeadOption[]);
  }

  async function enroll() {
    if (!enrolling || picked.length === 0) return;

    setBusy(true);

    const response = await fetch("/api/sequences/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId: enrolling.id, leadIds: picked }),
    });
    const result = await response.json();

    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not add leads.");
      return;
    }

    setEnrolling(null);
    showToast(
      `${result.enrolled} leads added · ${result.sent} emails sent now${
        result.errors?.length ? ` · ${result.errors[0]}` : ""
      }`
    );
    void load();
  }

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (lead) =>
        !q ||
        `${lead.company} ${lead.name} ${lead.email}`.toLowerCase().includes(q)
    );
  }, [leads, query]);

  function updateStep(index: number, patch: Partial<Step>) {
    if (!editing) return;
    const steps = editing.steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
    setEditing({ ...editing, steps });
  }

  if (!can("outreach_automation") && !loading) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 pt-6 text-white sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Sequences</h1>
        <div className="mt-6 max-w-xl">
          <PlanGate
            feature="outreach_automation"
            title="Automatic follow-ups are a Pro feature"
            description="Sequences send your follow-up emails and create call tasks automatically, and stop the moment a lead replies."
          >
            {null}
          </PlanGate>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Sequences</h1>
          <p className="mt-1 text-sm text-gray-500">
            Multi-step follow-ups that run themselves and stop when the lead replies or books a call.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing({ name: "New client outreach", steps: TEMPLATE })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-5 py-3 text-sm font-semibold text-black shadow-[0_8px_30px_rgba(245,197,24,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ffe044]"
        >
          <Plus size={16} /> New sequence
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {loading &&
          [0, 1].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/[0.03]" />)}

        {!loading && sequences.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-10 text-center lg:col-span-2">
            <Workflow className="mx-auto text-[#F5C518]" />
            <p className="mt-3 text-sm text-gray-400">
              Create your first sequence. We pre-filled a proven 4-step template you can edit.
            </p>
          </div>
        )}

        {sequences.map((sequence) => (
          <article key={sequence.id} className="bl-card rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${sequence.active ? "bg-[#84CC16] shadow-[0_0_8px_#84CC16]" : "bg-gray-600"}`} />
                  <h2 className="truncate text-base font-semibold">{sequence.name}</h2>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {sequence.steps.length} steps · {sequence.stats.active} active · {sequence.stats.replied} replied
                </p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <button type="button" onClick={() => void toggle(sequence)} className="rounded-lg border border-[#202020] p-2 text-gray-400 transition hover:text-white" aria-label={sequence.active ? "Pause" : "Activate"}>
                  {sequence.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button type="button" onClick={() => void remove(sequence)} className="rounded-lg border border-[#202020] p-2 text-gray-400 transition hover:text-[#F0475C]" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <ol className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
              {sequence.steps.map((step, index) => {
                const Icon = STEP_ICON[step.type] ?? Mail;
                return (
                  <li key={index} className="flex items-center gap-1">
                    {index > 0 && <span className="whitespace-nowrap px-1 text-[10px] text-gray-600">+{step.delay_days}d</span>}
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#202020] bg-[#0A0A0A] text-[#F5C518]">
                      <Icon size={15} />
                    </span>
                  </li>
                );
              })}
            </ol>

            {sequence.stats.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Reply rate</span>
                  <span>{Math.round((sequence.stats.replied / sequence.stats.total) * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#191919]">
                  <div className="h-full rounded-full bg-[#22D3EE]" style={{ width: `${(sequence.stats.replied / sequence.stats.total) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing({ id: sequence.id, name: sequence.name, steps: sequence.steps })}
                className="rounded-xl border border-[#202020] py-2.5 text-xs text-gray-300 transition hover:border-[#2A2A2A] hover:bg-[#171717]"
              >
                Edit steps
              </button>
              <button
                type="button"
                disabled={!sequence.active}
                onClick={() => void openEnroll(sequence)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F5C518] py-2.5 text-xs font-semibold text-black transition hover:bg-[#ffe044] disabled:opacity-40"
              >
                <UserPlus size={13} /> Add leads
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* EDITOR */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0D0D0D] p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing.id ? "Edit sequence" : "New sequence"}</h3>
              <button type="button" onClick={() => setEditing(null)} className="text-gray-500 hover:text-white" aria-label="Close"><X size={18} /></button>
            </div>

            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm outline-none focus:border-[#F5C518]/50"
              placeholder="Sequence name"
            />

            <p className="mt-3 text-[11px] text-gray-500">
              Personalize with {"{{first_name}} {{company}} {{city}} {{my_company}} {{booking_link}}"}. Follow-up emails go in the same thread.
            </p>

            <div className="mt-4 space-y-3">
              {editing.steps.map((step, index) => (
                <div key={index} className="rounded-2xl border border-[#202020] bg-[#0A0A0A] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5C518]/10 text-xs font-semibold text-[#F5C518]">{index + 1}</span>
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(index, { type: e.target.value as Step["type"] })}
                      className="rounded-lg border border-white/10 bg-[#111] px-2 py-1.5 text-xs"
                    >
                      <option value="email">Email (sent automatically)</option>
                      <option value="call">Call task</option>
                      <option value="linkedin">LinkedIn task</option>
                      <option value="task">Other task</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      wait
                      <input
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={(e) => updateStep(index, { delay_days: Number(e.target.value) })}
                        className="w-14 rounded-lg border border-white/10 bg-[#111] px-2 py-1.5 text-xs text-white"
                      />
                      days
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== index) })}
                      className="ml-auto text-gray-600 hover:text-[#F0475C]"
                      aria-label="Remove step"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <input
                    value={step.subject ?? ""}
                    onChange={(e) => updateStep(index, { subject: e.target.value })}
                    placeholder={step.type === "email" ? "Subject" : "Task title"}
                    className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#F5C518]/50"
                  />
                  <textarea
                    value={step.body ?? ""}
                    onChange={(e) => updateStep(index, { body: e.target.value })}
                    rows={step.type === "email" ? 5 : 2}
                    placeholder={step.type === "email" ? "Email body" : "Notes for the rep"}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-[#F5C518]/50"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setEditing({ ...editing, steps: [...editing.steps, { delay_days: 3, type: "email", subject: "", body: "" }] })}
              className="mt-3 w-full rounded-xl border border-dashed border-[#2A2A2A] py-3 text-sm text-gray-400 transition hover:border-[#F5C518]/40 hover:text-[#F5C518]"
            >
              + Add step
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="mt-5 h-12 w-full rounded-xl bg-[#F5C518] text-sm font-semibold text-black transition hover:bg-[#ffe044] disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save sequence"}
            </button>
          </div>
        </div>
      )}

      {/* ENROLL */}
      {enrolling && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl border border-white/10 bg-[#0D0D0D] p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add leads to “{enrolling.name}”</h3>
              <button type="button" onClick={() => setEnrolling(null)} className="text-gray-500 hover:text-white" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="mt-4 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3">
              <Search size={15} className="text-gray-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none" />
              <button
                type="button"
                onClick={() => setPicked(visibleLeads.filter((l) => l.email).map((l) => l.id))}
                className="text-xs text-[#F5C518]"
              >
                Select all with email
              </button>
            </div>

            <ul className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
              {visibleLeads.map((lead) => {
                const checked = picked.includes(lead.id);
                return (
                  <li key={lead.id}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${checked ? "border-[#F5C518]/40 bg-[#F5C518]/[0.06]" : "border-[#202020] hover:border-[#2A2A2A]"} ${lead.email ? "" : "opacity-50"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!lead.email}
                        onChange={() => setPicked((current) => (checked ? current.filter((id) => id !== lead.id) : [...current, lead.id]))}
                        className="accent-[#F5C518]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{lead.company || lead.name}</p>
                        <p className="truncate text-[11px] text-gray-500">{lead.email || "No email"} · {lead.status || "new"}</p>
                      </div>
                      {lead.ai_score != null && <span className="text-xs text-gray-400">{lead.ai_score}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              disabled={busy || picked.length === 0}
              onClick={() => void enroll()}
              className="mt-4 h-12 w-full rounded-xl bg-[#F5C518] text-sm font-semibold text-black transition hover:bg-[#ffe044] disabled:opacity-50"
            >
              {busy ? "Starting..." : `Start sequence for ${picked.length} lead${picked.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[90] max-w-[90vw] -translate-x-1/2 rounded-xl border border-white/10 bg-[#111]/95 px-4 py-3 text-sm text-gray-200 shadow-2xl backdrop-blur lg:bottom-8">
          {toast}
        </div>
      )}
    </main>
  );
}
