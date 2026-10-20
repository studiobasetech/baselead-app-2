"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Copy, Loader2, Mail, Phone, Plus, Star, Trash2, UserSearch } from "lucide-react";

type Contact = {
  id: string;
  full_name: string | null;
  title: string | null;
  seniority: string | null;
  email: string | null;
  email_confidence: number | null;
  phone: string | null;
  linkedin_url: string | null;
  source: string;
  is_primary: boolean;
};

/* People who decide at the lead's company: find, pick the main one, call or email. */
export default function LeadContacts({
  leadId,
  onChanged,
}: {
  leadId: string;
  onChanged?: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [credits, setCredits] = useState<{ used: number; limit: number; configured: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: "", title: "", email: "", phone: "" });

  const load = useCallback(async () => {
    const response = await fetch(`/api/leads/${leadId}/contacts`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    setContacts(result.contacts ?? []);
    if (response.ok) setCredits({ used: result.used, limit: result.limit, configured: result.configured });
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function call(body: Record<string, string>) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/leads/${leadId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(result.error || "Something went wrong.");
      return false;
    }

    if (body.action === "find") {
      setMessage(result.found ? `Found ${result.found} people. The best match is now the main contact.` : "No people found for this company's website.");
      onChanged?.();
    }

    await load();
    return true;
  }

  return (
    <div className="rounded-xl border border-[#202020] bg-[#0A0A0A] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">Decision makers</p>
        {credits?.configured && (
          <span className="text-[10px] text-gray-600">
            {credits.used}/{credits.limit} lookups this month
          </span>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {contacts.map((contact) => (
          <div key={contact.id} className={`rounded-lg border p-2.5 ${contact.is_primary ? "border-[#3B82F6]/35 bg-[#3B82F6]/[0.04]" : "border-[#202020]"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs font-medium text-gray-100">
                  {contact.is_primary && <Star size={11} className="shrink-0 fill-[#3B82F6] text-[#3B82F6]" />}
                  {contact.full_name || contact.email}
                </p>
                {contact.title && <p className="truncate text-[11px] text-gray-500">{contact.title}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {!contact.is_primary && (
                  <button type="button" onClick={() => void call({ action: "primary", contactId: contact.id })} className="rounded-md p-1 text-gray-500 hover:text-[#3B82F6]" aria-label="Make main contact" title="Make main contact">
                    <Star size={12} />
                  </button>
                )}
                <button type="button" onClick={() => void call({ action: "delete", contactId: contact.id })} className="rounded-md p-1 text-gray-600 hover:text-[#F22F46]" aria-label="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {contact.email && (
                <>
                  <a href={`mailto:${contact.email}`} className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300 hover:text-white">
                    <Mail size={11} /> {contact.email}
                  </a>
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(contact.email ?? "")} className="rounded-md bg-white/[0.04] px-1.5 text-gray-500 hover:text-white" aria-label="Copy email">
                    <Copy size={11} />
                  </button>
                </>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 rounded-md bg-[#84CC16]/10 px-2 py-1 text-[11px] text-[#84CC16]">
                  <Phone size={11} /> Call
                </a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[#3B82F6]/10 px-2 py-1 text-[11px] text-[#3B82F6]">
                  <Briefcase size={11} /> LinkedIn
                </a>
              )}
              {contact.email_confidence != null && (
                <span className="rounded-md px-1.5 py-1 text-[10px] text-gray-600">{contact.email_confidence}% verified</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-2 space-y-1.5">
          {(["full_name", "title", "email", "phone"] as const).map((key) => (
            <input
              key={key}
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              placeholder={{ full_name: "Name", title: "Title (e.g. Owner)", email: "Email", phone: "Phone" }[key]}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs outline-none focus:border-[#3B82F6]/40"
            />
          ))}
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (await call({ action: "add", ...form })) {
                  setAdding(false);
                  setForm({ full_name: "", title: "", email: "", phone: "" });
                }
              }}
              className="h-9 flex-1 rounded-lg bg-[#3B82F6] text-xs font-semibold text-white"
            >
              Save contact
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-9 rounded-lg border border-white/10 px-3 text-xs text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void call({ action: "find" })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#3B82F6]/30 text-[11px] font-medium text-[#3B82F6] transition hover:bg-[#3B82F6]/10 disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <UserSearch size={12} />}
            Find decision makers
          </button>
          <button type="button" onClick={() => setAdding(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white" aria-label="Add contact manually">
            <Plus size={13} />
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-[11px] text-gray-400">{message}</p>}
    </div>
  );
}
