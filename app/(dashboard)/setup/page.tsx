"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, CircleDashed, RefreshCw, Rocket } from "lucide-react";

type Check = {
  id: string;
  group: "Required" | "Recommended" | "Optional";
  title: string;
  ok: boolean;
  detail: string;
  action?: { label: string; href: string };
};

type Status = {
  checks: Check[];
  requiredDone: number;
  requiredTotal: number;
  done: number;
  total: number;
};

const GROUPS: { name: Check["group"]; hint: string }[] = [
  { name: "Required", hint: "BaseLead can't find or contact leads without these." },
  { name: "Recommended", hint: "Makes the sales process faster and automatic." },
  { name: "Optional", hint: "Extra channels and power features." },
];

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/setup/status", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not check setup.");
      setStatus(json);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not check setup.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const percent = status ? Math.round((status.done / status.total) * 100) : 0;
  const ready = status && status.requiredDone === status.requiredTotal;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f1f1f" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={ready ? "#84CC16" : "#F5C518"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 97.4} 97.4`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
              {percent}%
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#F5C518]">Launch checklist</p>
            <h1 className="mt-1 text-2xl font-semibold">
              {ready ? "BaseLead is ready to sell" : "Get BaseLead ready"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {status
                ? `${status.requiredDone} of ${status.requiredTotal} required steps done · ${status.done}/${status.total} overall`
                : "Checking your setup…"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#262626] bg-[#0D0D0D] px-4 py-2.5 text-sm text-gray-300 transition hover:border-[#F5C518]/50 hover:text-white disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Check again
        </button>
      </header>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>
      )}

      {ready && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#84CC16]/30 bg-[#18200B] p-4 text-sm text-[#bef264]">
          <Rocket size={18} />
          Everything required is set up. Start in Lead Discovery to find your first real leads.
        </div>
      )}

      {status &&
        GROUPS.map((group) => {
          const items = status.checks.filter((check) => check.group === group.name);
          if (!items.length) return null;

          return (
            <section key={group.name} className="mt-8">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold">{group.name}</h2>
                <p className="text-xs text-gray-500">{group.hint}</p>
              </div>

              <div className="space-y-3">
                {items.map((check) => (
                  <div
                    key={check.id}
                    className={`rounded-2xl border p-4 transition ${
                      check.ok ? "border-[#84CC16]/20 bg-[#0D0D0D]" : "border-[#262626] bg-[#0D0D0D] hover:border-[#F5C518]/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          check.ok ? "bg-[#84CC16] text-black" : "border border-[#3a3a3a] text-gray-500"
                        }`}
                      >
                        {check.ok ? <Check size={14} strokeWidth={3} /> : <CircleDashed size={14} />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${check.ok ? "text-white" : "text-gray-200"}`}>{check.title}</p>
                        <p className="mt-1 break-words text-xs leading-relaxed text-gray-500">{check.detail}</p>
                      </div>

                      {!check.ok && check.action && (
                        check.action.href.startsWith("http") ? (
                          <a
                            href={check.action.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden shrink-0 items-center gap-1 rounded-lg bg-[#F5C518] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ffe044] sm:inline-flex"
                          >
                            {check.action.label}
                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          <Link
                            href={check.action.href}
                            className="hidden shrink-0 items-center gap-1 rounded-lg bg-[#F5C518] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ffe044] sm:inline-flex"
                          >
                            {check.action.label}
                            <ArrowUpRight size={12} />
                          </Link>
                        )
                      )}
                    </div>

                    {!check.ok && check.action && (
                      <a
                        href={check.action.href}
                        target={check.action.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#F5C518] px-3 py-2 text-xs font-semibold text-black sm:hidden"
                      >
                        {check.action.label}
                        <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}

      <p className="mt-8 text-xs text-gray-600">
        Keys go in the <code>.env.local</code> file of the project (restart <code>npm run dev</code> after editing). Step-by-step
        instructions are in <code>SETUP-BASELEAD.md</code>.
      </p>
    </div>
  );
}
