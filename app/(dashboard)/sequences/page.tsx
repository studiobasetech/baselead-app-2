"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  FileSignature,
  Mail,
  MessageSquareReply,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import PlanGate from "@/components/plans/PlanGate";

type StepType = "email" | "call" | "linkedin" | "task";

type Step = {
  id?: string;
  step_order?: number;
  delay_days: number;
  type: StepType;
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

type Draft = { id?: string; name: string; steps: Step[] };

const MAX_STEPS = 10;

const STEP_TYPES: Record<StepType, { label: string; hint: string; icon: typeof Mail; color: string }> = {
  email: { label: "Email", hint: "Sent automatically", icon: Mail, color: "#60A5FA" },
  call: { label: "Call", hint: "Creates a call task", icon: Phone, color: "#84CC16" },
  linkedin: { label: "LinkedIn", hint: "Creates a LinkedIn task", icon: Briefcase, color: "#22D3EE" },
  task: { label: "Task", hint: "Creates a to-do", icon: CheckCircle2, color: "#A78BFA" },
};

const VARIABLES = [
  { token: "{{first_name}}", label: "First name", sample: "Maria" },
  { token: "{{company}}", label: "Company", sample: "Sunrise Dental" },
  { token: "{{city}}", label: "City", sample: "Austin" },
  { token: "{{my_company}}", label: "Your company", sample: "Your company" },
  { token: "{{booking_link}}", label: "Booking link", sample: "baselead.app/book/you" },
];

function fillSample(text: string) {
  return VARIABLES.reduce((acc, v) => acc.split(v.token).join(v.sample), text || "");
}

const TEMPLATES: { key: string; name: string; description: string; icon: typeof Mail; color: string; steps: Step[] }[] = [
  {
    key: "outreach",
    name: "New client outreach",
    description: "3 emails and a call over 10 days. Best for new leads you found.",
    icon: Rocket,
    color: "#F5C518",
    steps: [
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
      { delay_days: 2, type: "call", subject: "Call {{company}}", body: "Short call: mention the emails and offer a 15-minute intro." },
      {
        delay_days: 4,
        type: "email",
        subject: "Quick idea for {{company}}",
        body:
          "Hi {{first_name}}, I don't want to fill your inbox, so this will be my last note. If growing {{company}} is a priority this quarter, grab a time here: {{booking_link}}",
      },
    ],
  },
  {
    key: "proposal",
    name: "Follow up on a proposal",
    description: "Gentle nudges after you send a quote, with a call in between.",
    icon: FileSignature,
    color: "#84CC16",
    steps: [
      {
        delay_days: 0,
        type: "email",
        subject: "Your proposal from {{my_company}}",
        body:
          "Hi {{first_name}},\n\nI wanted to make sure the proposal for {{company}} reached you. Happy to walk you through it or adjust anything.\n\n{{booking_link}}\n\nBest,\n{{my_company}}",
      },
      { delay_days: 3, type: "call", subject: "Call {{company}} about the proposal", body: "Ask if they had a chance to review it and what questions they have." },
      {
        delay_days: 4,
        type: "email",
        subject: "Your proposal from {{my_company}}",
        body: "Hi {{first_name}}, any questions about the proposal? If the timing isn't right, just let me know and I'll check back later.",
      },
    ],
  },
  {
    key: "reengage",
    name: "Re-engage old leads",
    description: "Two short emails to wake up leads that went quiet.",
    icon: RefreshCw,
    color: "#A78BFA",
    steps: [
      {
        delay_days: 0,
        type: "email",
        subject: "Still looking to grow {{company}}?",
        body:
          "Hi {{first_name}},\n\nWe spoke a while ago. We've helped a few businesses in {{city}} since then and I thought of {{company}}.\n\nWorth a quick chat? {{booking_link}}\n\n{{my_company}}",
      },
      {
        delay_days: 5,
        type: "email",
        subject: "Still looking to grow {{company}}?",
        body: "Hi {{first_name}}, closing the loop on this. If now isn't a good time, no problem at all.",
      },
    ],
  },
];

const BLANK_STEP: Step = { delay_days: 0, type: "email", subject: "", body: "" };

function dayNumbers(steps: Step[]) {
  let day = 1;
  return steps.map((step, index) => {
    if (index > 0) day += Math.max(0, Number(step.delay_days) || 0);
    return day;
  });
}

function tile(color: string) {
  return { "--tab": color } as CSSProperties;
}

export default function SequencesPage() {
  const { can } = usePlan();

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState<Sequence | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [onlyWithEmail, setOnlyWithEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const cursor = useRef<Record<number, number>>({});

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4500);
  };

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/sequences", { cache: "no-store" });
      const result = await response.json();
      setSequences(result.sequences ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Escape closes the top-most window.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (enrolling) setEnrolling(null);
      else if (editing) setEditing(null);
      else if (choosing) setChoosing(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choosing, editing, enrolling]);

  const totals = useMemo(
    () => ({
      running: sequences.filter((s) => s.active).length,
      inProgress: sequences.reduce((sum, s) => sum + s.stats.active, 0),
      replied: sequences.reduce((sum, s) => sum + s.stats.replied, 0),
      finished: sequences.reduce((sum, s) => sum + s.stats.completed, 0),
    }),
    [sequences]
  );

  function startFrom(template: (typeof TEMPLATES)[number] | null) {
    setChoosing(false);
    setPreviewing(null);
    setEditing(
      template
        ? { name: template.name, steps: template.steps.map((step) => ({ ...step })) }
        : { name: "", steps: [{ ...BLANK_STEP }] }
    );
  }

  function validate(draft: Draft) {
    if (!draft.name.trim()) return "Give your sequence a name.";
    if (draft.steps.length === 0) return "Add at least one step.";
    const index = draft.steps.findIndex((step) => step.type === "email" && (!step.subject.trim() || !step.body.trim()));
    if (index >= 0) return `Step ${index + 1} is an email: add a subject and a message.`;
    return "";
  }

  async function save() {
    if (!editing) return;
    const problem = validate(editing);
    if (problem) {
      showToast(problem);
      return;
    }

    setBusy(true);
    const response = await fetch("/api/sequences", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not save the sequence.");
      return;
    }

    const wasNew = !editing.id;
    setEditing(null);
    showToast(wasNew ? "Sequence created. Next step: add leads to start it." : "Changes saved.");
    void load();
  }

  async function toggle(sequence: Sequence) {
    await fetch("/api/sequences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sequence.id, active: !sequence.active }),
    });
    showToast(sequence.active ? `"${sequence.name}" paused. No more steps will run until you resume it.` : `"${sequence.name}" is running again.`);
    void load();
  }

  async function remove(sequence: Sequence) {
    if (!window.confirm(`Delete "${sequence.name}"? Leads in it will stop receiving emails.`)) return;
    await fetch(`/api/sequences?id=${sequence.id}`, { method: "DELETE" });
    showToast("Sequence deleted.");
    void load();
  }

  async function openEnroll(sequence: Sequence) {
    setEnrolling(sequence);
    setPicked([]);
    setQuery("");
    setLeadsLoading(true);

    const { data } = await supabase
      .from("leads")
      .select("id, company, name, email, status, ai_score")
      .not("status", "in", "(won,lost)")
      .order("ai_score", { ascending: false, nullsFirst: false })
      .limit(300);

    setLeads((data ?? []) as LeadOption[]);
    setLeadsLoading(false);
  }

  async function enroll() {
    if (!enrolling || picked.length === 0) return;

    setBusy(true);
    const response = await fetch("/api/sequences/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId: enrolling.id, leadIds: picked }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Could not add leads.");
      return;
    }

    setEnrolling(null);
    showToast(
      `${result.enrolled} lead${result.enrolled === 1 ? "" : "s"} added · ${result.sent} first email${result.sent === 1 ? "" : "s"} sent${
        result.errors?.length ? ` · ${result.errors[0]}` : ""
      }`
    );
    void load();
  }

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (lead) =>
        (!onlyWithEmail || lead.email) &&
        (!q || `${lead.company} ${lead.name} ${lead.email}`.toLowerCase().includes(q))
    );
  }, [leads, query, onlyWithEmail]);

  const withoutEmail = useMemo(() => leads.filter((lead) => !lead.email).length, [leads]);

  async function findPeople() {
    const ids = (picked.length ? picked : leads.map((lead) => lead.id)).slice(0, 25);
    if (!ids.length) return;

    setBusy(true);
    showToast("Looking for owners and decision makers…");
    const response = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: ids }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      showToast(result.error || "Search failed.");
      return;
    }

    showToast(
      `Checked ${result.searched} companies · found decision makers for ${result.withContacts}${
        result.skipped ? ` · ${result.skipped} skipped (monthly limit)` : ""
      }`
    );
    if (enrolling) void openEnroll(enrolling);
  }

  /* ---------- editor helpers ---------- */

  function updateStep(index: number, patch: Partial<Step>) {
    if (!editing) return;
    setEditing({ ...editing, steps: editing.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) });
  }

  function moveStep(index: number, direction: -1 | 1) {
    if (!editing) return;
    const target = index + direction;
    if (target < 0 || target >= editing.steps.length) return;
    const steps = [...editing.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    setEditing({ ...editing, steps });
    setPreviewing(null);
  }

  function removeStep(index: number) {
    if (!editing) return;
    setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== index) });
    setPreviewing(null);
  }

  function addStep(type: StepType) {
    if (!editing || editing.steps.length >= MAX_STEPS) return;
    const first = editing.steps.length === 0;
    const lastEmail = [...editing.steps].reverse().find((step) => step.type === "email");
    const subject =
      type === "email"
        ? lastEmail?.subject ?? ""
        : type === "call"
          ? "Call {{company}}"
          : type === "linkedin"
            ? "Connect with {{first_name}} on LinkedIn"
            : "";
    setEditing({
      ...editing,
      steps: [...editing.steps, { delay_days: first ? 0 : 3, type, subject, body: "" }],
    });
  }

  function insertVariable(index: number, token: string) {
    if (!editing) return;
    const body = editing.steps[index].body ?? "";
    const at = cursor.current[index] ?? body.length;
    const next = body.slice(0, at) + token + body.slice(at);
    cursor.current[index] = at + token.length;
    updateStep(index, { body: next });
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

  const days = editing ? dayNumbers(editing.steps) : [];

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Sequences</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Automatic follow-ups. Write your steps once, add leads, and BaseLead sends each email on schedule. It stops as soon as a lead replies.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.2)] transition hover:-translate-y-0.5 hover:bg-[#2F74E8]"
        >
          <Plus size={16} /> New sequence
        </button>
      </div>

      {/* HOW IT WORKS */}
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Workflow, color: "#F472B6", title: "1. Build your steps", text: "Pick a template or write your own emails, calls and tasks." },
          { icon: UserPlus, color: "#F5C518", title: "2. Add leads", text: "Choose who should get it. The first email goes out right away." },
          { icon: MessageSquareReply, color: "#84CC16", title: "3. It runs by itself", text: "Follow-ups go out on schedule and stop when someone replies." },
        ].map(({ icon: Icon, color, title, text }) => (
          <li key={title} className="bl-card flex items-start gap-3 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4">
            <span className="bl-icon-tile" style={tile(color)}>
              <Icon size={16} strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* TOTALS */}
      {!loading && sequences.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Running", value: totals.running, icon: Play, color: "#84CC16" },
            { label: "Leads in progress", value: totals.inProgress, icon: Users, color: "#60A5FA" },
            { label: "Replied", value: totals.replied, icon: MessageSquareReply, color: "#22D3EE" },
            { label: "Finished", value: totals.finished, icon: CheckCircle2, color: "#A78BFA" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bl-card flex items-center gap-3 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4">
              <span className="bl-icon-tile" style={tile(color)}>
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-xl font-semibold tabular-nums">{value}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {loading && [0, 1].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />)}

        {!loading && sequences.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-6 sm:p-8 lg:col-span-2">
            <div className="text-center">
              <span className="bl-icon-tile mx-auto" style={tile("#F472B6")}>
                <Sparkles size={16} strokeWidth={2.2} />
              </span>
              <h2 className="mt-3 text-base font-semibold">Start with a ready-made sequence</h2>
              <p className="mt-1 text-sm text-gray-500">Pick one and edit the wording. You can change everything later.</p>
            </div>
            <TemplateGrid onPick={startFrom} />
          </div>
        )}

        {sequences.map((sequence) => {
          const stepDays = dayNumbers(sequence.steps);
          const replyRate = sequence.stats.total > 0 ? Math.round((sequence.stats.replied / sequence.stats.total) * 100) : 0;
          return (
            <article key={sequence.id} className="bl-card flex flex-col rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bl-icon-tile" style={tile("#F472B6")}>
                    <Workflow size={16} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{sequence.name}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {sequence.steps.length} step{sequence.steps.length === 1 ? "" : "s"} over {stepDays[stepDays.length - 1] ?? 1} day
                      {(stepDays[stepDays.length - 1] ?? 1) === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    sequence.active ? "bg-[#84CC16]/10 text-[#84CC16]" : "bg-white/5 text-gray-400"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sequence.active ? "bg-[#84CC16]" : "bg-gray-500"}`} />
                  {sequence.active ? "Running" : "Paused"}
                </span>
              </div>

              {/* timeline */}
              <ol className="mt-4 space-y-1.5">
                {sequence.steps.slice(0, 5).map((step, index) => {
                  const meta = STEP_TYPES[step.type] ?? STEP_TYPES.email;
                  const Icon = meta.icon;
                  return (
                    <li key={index} className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-2.5 py-2">
                      <span className="w-12 shrink-0 text-[11px] font-medium text-gray-500">Day {stepDays[index]}</span>
                      <span className="bl-icon-tile !h-7 !w-7 !rounded-lg" style={tile(meta.color)}>
                        <Icon size={13} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                        <span className="text-gray-500">{meta.label}: </span>
                        {step.subject || (step.type === "email" ? "(no subject)" : "Task")}
                      </span>
                    </li>
                  );
                })}
                {sequence.steps.length > 5 && (
                  <li className="px-2.5 text-[11px] text-gray-500">+{sequence.steps.length - 5} more steps</li>
                )}
              </ol>

              {/* stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "In progress", value: sequence.stats.active },
                  { label: "Replied", value: sequence.stats.replied },
                  { label: "Finished", value: sequence.stats.completed },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-[#202020] py-2">
                    <p className="text-base font-semibold tabular-nums">{stat.value}</p>
                    <p className="text-[10px] text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              {sequence.stats.total > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Reply rate</span>
                    <span>{replyRate}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#191919]">
                    <div className="h-full rounded-full bg-[#22D3EE]" style={{ width: `${replyRate}%` }} />
                  </div>
                </div>
              )}

              {/* actions */}
              <div className="mt-auto pt-5">
                {sequence.active ? (
                  <button
                    type="button"
                    onClick={() => void openEnroll(sequence)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
                  >
                    <UserPlus size={15} /> Add leads
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggle(sequence)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 py-2.5 text-sm font-semibold text-[#84CC16] transition hover:bg-[#84CC16]/20"
                  >
                    <Play size={15} /> Resume to add leads
                  </button>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewing(null);
                      setEditing({ id: sequence.id, name: sequence.name, steps: sequence.steps.map((step) => ({ ...step, subject: step.subject ?? "", body: step.body ?? "" })) });
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#202020] py-2 text-xs text-gray-300 transition hover:border-[#2A2A2A] hover:bg-[#171717]"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  {sequence.active && (
                    <button
                      type="button"
                      onClick={() => void toggle(sequence)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#202020] py-2 text-xs text-gray-300 transition hover:border-[#2A2A2A] hover:bg-[#171717]"
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(sequence)}
                    className="inline-flex items-center justify-center rounded-xl border border-[#202020] px-3 py-2 text-gray-400 transition hover:border-[#F0475C]/40 hover:text-[#F0475C]"
                    aria-label="Delete sequence"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* TEMPLATE PICKER */}
      {choosing && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setChoosing(false)}>
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0D0D0D] p-6 shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">New sequence</h3>
                <p className="mt-1 text-sm text-gray-500">Start from a template or from scratch. You can edit every step.</p>
              </div>
              <button type="button" onClick={() => setChoosing(false)} className="rounded-lg p-1.5 text-gray-500 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <TemplateGrid onPick={startFrom} withBlank />
          </div>
        </div>
      )}

      {/* EDITOR */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col rounded-t-3xl border border-white/10 bg-[#0D0D0D] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold">{editing.id ? "Edit sequence" : "New sequence"}</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-gray-500 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <label className="text-xs font-medium text-gray-400">Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm outline-none focus:border-[#3B82F6]/50"
                placeholder="e.g. New client outreach"
              />

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-400">Steps</p>
                <p className="text-[11px] text-gray-500">Follow-up emails are sent in the same email thread.</p>
              </div>

              <ol className="mt-2">
                {editing.steps.map((step, index) => {
                  const meta = STEP_TYPES[step.type] ?? STEP_TYPES.email;
                  const isEmail = step.type === "email";
                  const showPreview = previewing === index && isEmail;
                  return (
                    <li key={index} className="relative pl-10">
                      {/* timeline line */}
                      {index < editing.steps.length - 1 && (
                        <span className="absolute left-[15px] top-9 h-[calc(100%-20px)] w-px bg-white/10" aria-hidden />
                      )}
                      <span className="bl-icon-tile absolute left-0 top-1 !h-8 !w-8" style={tile(meta.color)}>
                        <meta.icon size={14} strokeWidth={2.2} />
                      </span>

                      {/* wait row */}
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs text-gray-500">
                        <span className="font-semibold text-white">Day {days[index]}</span>
                        {index === 0 ? (
                          <span>· sent right after a lead is added</span>
                        ) : (
                          <label className="flex items-center gap-1.5">
                            · wait
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={step.delay_days}
                              onChange={(e) => updateStep(index, { delay_days: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })}
                              className="w-14 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white outline-none focus:border-[#3B82F6]/50"
                            />
                            day{step.delay_days === 1 ? "" : "s"} after the previous step
                          </label>
                        )}
                      </div>

                      <div className="mb-4 mt-2 rounded-2xl border border-[#202020] bg-white/[0.02] p-4">
                        {/* type picker + tools */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(Object.keys(STEP_TYPES) as StepType[]).map((type) => {
                            const option = STEP_TYPES[type];
                            const active = step.type === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => updateStep(index, { type })}
                                data-active={active}
                                style={tile(option.color)}
                                className="bl-tab flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-gray-500"
                                title={option.hint}
                              >
                                <option.icon size={13} strokeWidth={2.2} style={{ color: option.color }} aria-hidden />
                                {option.label}
                              </button>
                            );
                          })}

                          <span className="ml-auto flex items-center gap-0.5">
                            <IconButton label="Move up" disabled={index === 0} onClick={() => moveStep(index, -1)}>
                              <ArrowUp size={14} />
                            </IconButton>
                            <IconButton label="Move down" disabled={index === editing.steps.length - 1} onClick={() => moveStep(index, 1)}>
                              <ArrowDown size={14} />
                            </IconButton>
                            <IconButton label="Remove step" danger onClick={() => removeStep(index)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] text-gray-500">{meta.hint}{!isEmail && " for the rep on that day"}.</p>

                        {showPreview ? (
                          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500">Preview with sample lead</p>
                            <p className="mt-2 text-sm font-semibold">{fillSample(step.subject) || "(no subject)"}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">{fillSample(step.body) || "(empty message)"}</p>
                          </div>
                        ) : (
                          <>
                            <input
                              value={step.subject ?? ""}
                              onChange={(e) => updateStep(index, { subject: e.target.value })}
                              placeholder={isEmail ? "Subject line" : "What should the rep do?"}
                              className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#3B82F6]/50"
                            />
                            <textarea
                              value={step.body ?? ""}
                              onChange={(e) => {
                                cursor.current[index] = e.target.selectionStart;
                                updateStep(index, { body: e.target.value });
                              }}
                              onSelect={(e) => {
                                cursor.current[index] = e.currentTarget.selectionStart;
                              }}
                              rows={isEmail ? 6 : 2}
                              placeholder={isEmail ? "Write your email…" : "Notes for the rep (optional)"}
                              className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#3B82F6]/50"
                            />
                          </>
                        )}

                        {isEmail && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {!showPreview && (
                              <>
                                <span className="text-[11px] text-gray-500">Insert:</span>
                                {VARIABLES.map((variable) => (
                                  <button
                                    key={variable.token}
                                    type="button"
                                    onClick={() => insertVariable(index, variable.token)}
                                    className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-gray-400 transition hover:border-[#3B82F6]/40 hover:text-[#3B82F6]"
                                    title={`Adds ${variable.token}`}
                                  >
                                    + {variable.label}
                                  </button>
                                ))}
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setPreviewing(showPreview ? null : index)}
                              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10"
                            >
                              {showPreview ? <Pencil size={11} /> : <Eye size={11} />}
                              {showPreview ? "Edit" : "Preview"}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {editing.steps.length < MAX_STEPS ? (
                <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-3">
                  <p className="text-center text-xs text-gray-500">Add a step</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(STEP_TYPES) as StepType[]).map((type) => {
                      const option = STEP_TYPES[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addStep(type)}
                          className="flex items-center justify-center gap-2 rounded-xl border border-[#202020] py-2.5 text-xs text-gray-300 transition hover:border-[#2A2A2A] hover:bg-[#171717]"
                        >
                          <span className="bl-icon-tile !h-6 !w-6 !rounded-md" style={tile(option.color)}>
                            <option.icon size={12} strokeWidth={2.2} />
                          </span>
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-gray-500">You can have up to {MAX_STEPS} steps.</p>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
              <p className="hidden flex-1 text-xs text-gray-500 sm:block">
                {editing.steps.length} step{editing.steps.length === 1 ? "" : "s"} · {days[days.length - 1] ?? 0} day{(days[days.length - 1] ?? 0) === 1 ? "" : "s"} total
              </p>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-11 rounded-xl border border-white/10 px-5 text-sm text-gray-300 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="h-11 flex-1 rounded-xl bg-[#3B82F6] px-6 text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-60 sm:flex-none"
              >
                {busy ? "Saving..." : editing.id ? "Save changes" : "Create sequence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLL */}
      {enrolling && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-white/10 bg-[#0D0D0D] shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">Add leads to “{enrolling.name}”</h3>
                <p className="mt-0.5 text-xs text-gray-500">The first step goes out right away. Leads who reply are taken out automatically.</p>
              </div>
              <button type="button" onClick={() => setEnrolling(null)} className="rounded-lg p-1.5 text-gray-500 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3">
                <Search size={15} className="text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by company, name or email"
                  className="h-11 flex-1 bg-transparent px-2 text-sm outline-none"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="text-gray-500 hover:text-white" aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPicked(visibleLeads.filter((l) => l.email).map((l) => l.id))}
                  className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/5 px-3 py-1 font-medium text-[#3B82F6] transition hover:bg-[#3B82F6]/10"
                >
                  Select all ({visibleLeads.filter((l) => l.email).length})
                </button>
                {picked.length > 0 && (
                  <button type="button" onClick={() => setPicked([])} className="rounded-full px-2 py-1 text-gray-500 hover:text-white">
                    Clear
                  </button>
                )}
                <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-gray-400">
                  <input type="checkbox" checked={onlyWithEmail} onChange={(e) => setOnlyWithEmail(e.target.checked)} className="accent-[#3B82F6]" />
                  Only leads with email
                </label>
              </div>

              {withoutEmail > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void findPeople()}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/[0.06] px-3 py-2.5 text-left transition hover:bg-[#60A5FA]/10 disabled:opacity-50"
                >
                  <span className="bl-icon-tile !h-7 !w-7 !rounded-lg" style={tile("#60A5FA")}>
                    <Sparkles size={13} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-[#93C5FD]">Find decision makers&apos; emails</span>
                    <span className="block text-[11px] text-gray-500">
                      {withoutEmail} lead{withoutEmail === 1 ? " has" : "s have"} no email. We&apos;ll look for the owner or manager ({picked.length ? `${Math.min(picked.length, 25)} selected` : "up to 25"}).
                    </span>
                  </span>
                </button>
              )}
            </div>

            <ul className="mt-3 min-h-[160px] flex-1 space-y-1.5 overflow-y-auto px-6">
              {leadsLoading &&
                [0, 1, 2, 3].map((i) => <li key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />)}

              {!leadsLoading && visibleLeads.length === 0 && (
                <li className="py-10 text-center text-sm text-gray-500">
                  {leads.length === 0 ? "You don't have open leads yet. Find some with New Search." : "No leads match your search."}
                </li>
              )}

              {!leadsLoading &&
                visibleLeads.map((lead) => {
                  const checked = picked.includes(lead.id);
                  return (
                    <li key={lead.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          checked ? "border-[#3B82F6]/40 bg-[#3B82F6]/[0.06]" : "border-[#202020] hover:border-[#2A2A2A]"
                        } ${lead.email ? "" : "cursor-not-allowed opacity-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!lead.email}
                          onChange={() => setPicked((current) => (checked ? current.filter((id) => id !== lead.id) : [...current, lead.id]))}
                          className="h-4 w-4 accent-[#3B82F6]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{lead.company || lead.name}</p>
                          <p className="truncate text-[11px] text-gray-500">
                            {lead.email || "No email yet"} · {lead.status || "new"}
                          </p>
                        </div>
                        {lead.ai_score != null && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] tabular-nums text-gray-400" title="Lead score">
                            {lead.ai_score}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
            </ul>

            <div className="border-t border-white/10 px-6 py-4">
              <button
                type="button"
                disabled={busy || picked.length === 0}
                onClick={() => void enroll()}
                className="h-12 w-full rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50"
              >
                {busy
                  ? "Starting..."
                  : picked.length === 0
                    ? "Select leads to continue"
                    : `Start sequence for ${picked.length} lead${picked.length === 1 ? "" : "s"}`}
              </button>
            </div>
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

function TemplateGrid({ onPick, withBlank = false }: { onPick: (template: (typeof TEMPLATES)[number] | null) => void; withBlank?: boolean }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {TEMPLATES.map((template) => {
        const days = dayNumbers(template.steps);
        return (
          <button
            key={template.key}
            type="button"
            onClick={() => onPick(template)}
            className="bl-card group flex items-start gap-3 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 text-left transition hover:border-[#2A2A2A]"
          >
            <span className="bl-icon-tile" style={tile(template.color)}>
              <template.icon size={16} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{template.name}</span>
              <span className="mt-0.5 block text-xs leading-5 text-gray-500">{template.description}</span>
              <span className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                <Clock size={11} /> {template.steps.length} steps · {days[days.length - 1]} days
              </span>
            </span>
          </button>
        );
      })}
      {withBlank && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="bl-card flex items-start gap-3 rounded-2xl border border-dashed border-[#2A2A2A] p-4 text-left transition hover:border-[#3B82F6]/40"
        >
          <span className="bl-icon-tile" style={tile("#9CA3AF")}>
            <Plus size={16} strokeWidth={2.2} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Start from scratch</span>
            <span className="mt-0.5 block text-xs leading-5 text-gray-500">An empty sequence with one email step.</span>
          </span>
        </button>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 text-gray-500 transition disabled:opacity-30 ${danger ? "hover:text-[#F0475C]" : "hover:text-white"}`}
    >
      {children}
    </button>
  );
}
