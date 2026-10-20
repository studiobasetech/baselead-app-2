"use client";

import type { ReactNode } from "react";
import { Lock, ArrowRight } from "lucide-react";

import { usePlan } from "@/components/plans/PlanProvider";
import type { PlanFeature } from "@/lib/plans";

type PlanGateProps = {
  feature: PlanFeature;
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
};

export default function PlanGate({
  feature,
  children,
  fallback,
  title = "Upgrade to unlock this feature",
  description = "This feature is available on a higher BaseLead plan.",
}: PlanGateProps) {
  const { loading, can } = usePlan();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-3 w-64 animate-pulse rounded bg-white/5" />
      </div>
    );
  }

  if (can(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
          <Lock size={18} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-gray-400">
            {description}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/settings?section=billing";
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2F74E8]"
          >
            View plans
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}