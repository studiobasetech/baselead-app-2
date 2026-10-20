"use client";

import { use, useState } from "react";

/* Public page linked from every outreach email footer. */
export default function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    const response = await fetch(`/api/public/unsubscribe/${encodeURIComponent(token)}`, { method: "POST" });
    setState(response.ok ? "done" : "error");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-[#202020] bg-[#0D0D0D] p-8 text-center shadow-2xl">
        {state === "done" ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#84CC16]/15 text-2xl text-[#84CC16]">✓</div>
            <h1 className="mt-5 text-2xl font-semibold">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-gray-400">You won&apos;t receive any more emails from this sender. Sorry for the interruption.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Unsubscribe from these emails?</h1>
            <p className="mt-2 text-sm text-gray-400">You&apos;ll stop receiving sales emails from this sender.</p>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={state === "busy"}
              className="mt-6 h-12 w-full rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-gray-200 disabled:opacity-50"
            >
              {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
            </button>
            {state === "error" && (
              <p className="mt-3 text-sm text-[#F22F46]">This link isn&apos;t valid anymore. Reply to the email with “unsubscribe” instead.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
