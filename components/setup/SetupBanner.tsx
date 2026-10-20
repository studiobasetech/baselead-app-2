"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ListChecks } from "lucide-react";

/* Shows "Finish setup (3/5)" until every required launch step is done. */
export default function SetupBanner() {
  const [progress, setProgress] = useState<{ done: number; total: number; next?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/setup/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (!alive || !status) return;
        const next = status.checks.find(
          (check: { group: string; ok: boolean }) => check.group === "Required" && !check.ok
        );
        setProgress({ done: status.requiredDone, total: status.requiredTotal, next: next?.title });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!progress || progress.done >= progress.total) return null;

  return (
    <Link
      href="/setup"
      className="group mt-4 flex items-center gap-3 rounded-2xl border border-[#3B82F6]/25 bg-[#3B82F6]/[0.05] p-4 transition hover:border-[#3B82F6]/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/15 text-[#3B82F6]">
        <ListChecks size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          {`Finish setting up BaseLead (${progress.done}/${progress.total})`}
        </span>
        {progress.next && (
          <span className="block truncate text-xs text-gray-400">Next: {progress.next}</span>
        )}
      </span>
      <ArrowRight size={16} className="text-[#3B82F6] transition group-hover:translate-x-1" />
    </Link>
  );
}
