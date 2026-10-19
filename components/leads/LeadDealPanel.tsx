"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck2,
  CircleDollarSign,
  FileSignature,
  Mail,
  MessageSquareReply,
  StickyNote,
  UserRound,
  XCircle,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import LeadContacts from "@/components/leads/LeadContacts";
import LeadPhoneActions from "@/components/leads/LeadPhoneActions";

type Member = { user_id: string; label: string };

type ActivityRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
};

const ICON: Record<string, typeof Mail> = {
  email_sent: Mail,
  reply: MessageSquareReply,
  meeting_booked: CalendarCheck2,
  note: StickyNote,
  stage_change: CircleDollarSign,
};

const COLOR: Record<string, string> = {
  email_sent: "#F5C518",
  reply: "#22D3EE",
  meeting_booked: "#F0475C",
  note: "#60A5FA",
  stage_change: "#A78BFA",
};

/*
 * Deal details for one lead: owner, value, close date, timeline,
 * notes, add to sequence and mark as lost. Works on any page.
 */
export default function LeadDealPanel({
  leadId,
  onChanged,
}: {
  leadId: string;
  onChanged?: () => void;
}) {
  const { companyId } = usePlan();

  const [members, setMembers] = useState<Member[]>([]);
  const [owner, setOwner] = useState<string>("");
  const [value, setValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [note, setNote] = useState("");
  const [sequences, setSequences] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [doNotContact, setDoNotContact] = useState(false);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const load = useCallback(async () => {
    const [{ data: lead }, { data: rows }] = await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .maybeSingle(),
      supabase
        .from("lead_activities")
        .select("id, type, title, body, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setOwner(lead?.assigned_to || lead?.user_id || "");
    setValue(lead?.deal_value != null ? String(lead.deal_value) : "");
    setCloseDate(lead?.expected_close_date || "");
    setActivity((rows ?? []) as ActivityRow[]);
    setDoNotContact(Boolean(lead?.do_not_contact));
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Workspace members for the owner dropdown.
  useEffect(() => {
    if (!companyId) return;

    (async () => {
      const [{ data: company }, { data: team }, { data: { user } }] = await Promise.all([
        supabase.from("company_profiles").select("user_id").eq("id", companyId).maybeSingle(),
        supabase
          .from("team_members")
          .select("user_id, name, email, status")
          .eq("company_id", companyId)
          .eq("status", "active"),
        supabase.auth.getUser(),
      ]);

      const list: Member[] = [];
      if (company?.user_id) {
        list.push({
          user_id: company.user_id,
          label: company.user_id === user?.id ? "Me (owner)" : "Workspace owner",
        });
      }
      for (const member of team ?? []) {
        if (member.user_id && !list.some((item) => item.user_id === member.user_id)) {
          list.push({
            user_id: member.user_id,
            label: member.user_id === user?.id ? "Me" : member.name || member.email || "Team member",
          });
        }
      }
      setMembers(list);
    })();

    fetch("/api/sequences")
      .then((response) => response.json())
      .then((result) =>
        setSequences(
          (result.sequences ?? [])
            .filter((item: { active: boolean }) => item.active)
            .map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))
        )
      )
      .catch(() => undefined);
  }, [companyId]);

  async function patch(update: Record<string, unknown>, success: string) {
    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      flash(result.error || "Could not save.");
      return;
    }

    flash(success);
    onChanged?.();
  }

  async function addNote() {
    const text = note.trim();
    if (!text) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("lead_activities")
      .insert({
        lead_id: leadId,
        company_id: companyId,
        user_id: user?.id,
        type: "note",
        title: "Note",
        body: text,
      })
      .select("id, type, title, body, created_at")
      .single();

    if (error) {
      flash("Run the latest Supabase migration to enable notes.");
      return;
    }

    setNote("");
    setActivity((current) => [data as ActivityRow, ...current]);
  }

  async function enroll(sequenceId: string) {
    const response = await fetch("/api/sequences/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId, leadIds: [leadId] }),
    });
    const result = await response.json();
    flash(response.ok ? "Added to sequence." : result.error || "Could not add.");
    if (response.ok) void load();
  }

  async function markLost() {
    const reason = window.prompt("Why was this deal lost? (optional)") ?? "";
    await patch({ status: "lost", lost_reason: reason || null }, "Marked as lost.");
  }

  const relative = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) +
    " · " +
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="mt-6 space-y-4 border-t border-[#202020] pt-5">
      <LeadContacts leadId={leadId} onChanged={onChanged} />

      <LeadPhoneActions
        leadId={leadId}
        onChanged={() => {
          void load();
          onChanged?.();
        }}
      />

      <a
        href={`/proposals?lead=${leadId}`}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#A78BFA]/30 bg-[#A78BFA]/[0.06] text-xs font-medium text-[#A78BFA] transition hover:bg-[#A78BFA]/15"
      >
        <FileSignature size={13} /> Create proposal
      </a>

      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500">
            <UserRound size={11} /> Owner
          </span>
          <select
            value={owner}
            onChange={(event) => {
              setOwner(event.target.value);
              void patch({ assigned_to: event.target.value }, "Owner updated.");
            }}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#202020] bg-[#0A0A0A] px-2.5 text-xs text-gray-200 outline-none focus:border-[#F5C518]/40"
          >
            {members.length === 0 && <option value={owner}>Me</option>}
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Deal value ($)</span>
          <input
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => void patch({ deal_value: value ? Number(value) : null }, "Deal value saved.")}
            placeholder="0"
            className="mt-1.5 h-10 w-full rounded-lg border border-[#202020] bg-[#0A0A0A] px-2.5 text-xs text-gray-200 outline-none focus:border-[#F5C518]/40"
          />
        </label>

        <label>
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Expected close</span>
          <input
            type="date"
            value={closeDate}
            onChange={(event) => {
              setCloseDate(event.target.value);
              void patch({ expected_close_date: event.target.value || null }, "Close date saved.");
            }}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#202020] bg-[#0A0A0A] px-2.5 text-xs text-gray-200 outline-none focus:border-[#F5C518]/40"
          />
        </label>
      </div>

      {sequences.length > 0 && (
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) void enroll(event.target.value);
            event.target.value = "";
          }}
          className="h-10 w-full rounded-lg border border-[#202020] bg-[#0A0A0A] px-2.5 text-xs text-gray-300 outline-none"
        >
          <option value="">+ Add to a follow-up sequence…</option>
          {sequences.map((sequence) => (
            <option key={sequence.id} value={sequence.id}>
              {sequence.name}
            </option>
          ))}
        </select>
      )}

      <div>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addNote()}
            placeholder="Add a note or call summary…"
            className="h-10 flex-1 rounded-lg border border-[#202020] bg-[#0A0A0A] px-3 text-xs outline-none focus:border-[#F5C518]/40"
          />
          <button
            type="button"
            onClick={() => void addNote()}
            className="rounded-lg border border-[#202020] px-3 text-xs text-gray-300 transition hover:border-[#F5C518]/40 hover:text-[#F5C518]"
          >
            Save
          </button>
        </div>

        <ol className="relative mt-4 space-y-3 border-l border-[#202020] pl-4">
          {activity.length === 0 && (
            <li className="text-[11px] text-gray-600">No activity yet.</li>
          )}
          {activity.map((item) => {
            const Icon = ICON[item.type] ?? StickyNote;
            return (
              <li key={item.id} className="relative">
                <span
                  className="absolute -left-[22px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-[#0D0D0D]"
                  style={{ background: COLOR[item.type] ?? "#555" }}
                >
                  <Icon size={8} className="text-black" />
                </span>
                <p className="text-[11px] text-gray-200">{item.title}</p>
                {item.body && <p className="mt-0.5 line-clamp-3 text-[11px] text-gray-500">{item.body}</p>}
                <p className="mt-0.5 text-[10px] text-gray-600">{relative(item.created_at)}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        type="button"
        onClick={() =>
          void patch(
            { do_not_contact: !doNotContact },
            doNotContact ? "Emails allowed again." : "Marked do not contact. No more emails will be sent."
          ).then(() => load())
        }
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] transition ${
          doNotContact
            ? "border-[#F0475C]/40 bg-[#F0475C]/10 text-[#F0475C]"
            : "border-[#202020] text-gray-500 hover:border-[#F0475C]/30 hover:text-[#F0475C]"
        }`}
      >
        {doNotContact ? "Do not contact (unsubscribed) · undo" : "Mark as do not contact"}
      </button>

      <button
        type="button"
        onClick={() => void markLost()}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#202020] py-2 text-[11px] text-gray-500 transition hover:border-[#F0475C]/30 hover:text-[#F0475C]"
      >
        <XCircle size={12} /> Mark as lost
      </button>

      {message && <p className="text-center text-[11px] text-[#84CC16]">{message}</p>}
    </div>
  );
}
