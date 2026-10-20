"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

/* Owner-only: wipe every lead to start fresh with real searches. */
export default function DeleteAllLeadsCard({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);

    const response = await fetch("/api/leads/delete-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE ALL LEADS" }),
    });
    const result = await response.json().catch(() => ({}));

    setBusy(false);

    if (!response.ok) {
      onToast(result.error || "Leads could not be deleted.");
      return;
    }

    setOpen(false);
    setText("");
    onToast(`${result.deleted} leads deleted. You're starting fresh.`);
  }

  return (
    <div className="rounded-2xl border border-[#F22F46]/20 bg-[#0D0D0D] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F22F46]/10">
            <Trash2 size={16} className="text-[#F22F46]" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#F22F46]">Delete all leads</h2>
            <p className="mt-1 text-[14px] text-gray-500">
              Removes every lead in this workspace, with its search history, outreach, notes, contacts and lead tasks. Your account, team, settings and plan stay.
            </p>
          </div>
        </div>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg border border-[#F22F46]/50 px-4 py-2.5 text-[14px] text-[#F22F46] transition hover:bg-[#F22F46]/10"
          >
            Delete all leads
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-[#F22F46]/20 bg-[#F22F46]/[0.04] p-4">
          <p className="text-sm text-gray-300">
            This can&apos;t be undone. Type <b className="text-[#F22F46]">DELETE ALL LEADS</b> to confirm.
          </p>
          <input
            value={text}
            onChange={(event) => setText(event.target.value.toUpperCase())}
            placeholder="DELETE ALL LEADS"
            className="mt-3 h-11 w-full rounded-lg border border-[#F22F46]/30 bg-black px-3 text-sm text-white outline-none focus:border-[#F22F46]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setText("");
              }}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || text !== "DELETE ALL LEADS"}
              onClick={() => void run()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F22F46] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#F22F46] disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete everything
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
