"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import { usePlan } from "@/components/plans/PlanProvider";

export default function TrialUpgradeModal() {
  const {
    loading,
    isTrial,
    trialExpired,
    trialEndsAt,
    trialLeadsRemaining,
    trialLeadLimit,
  } = usePlan();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    const alreadyShown = window.sessionStorage.getItem(
      "baselead_trial_popup_seen"
    );

    if (
  !alreadyShown ||
  trialExpired ||
  (isTrial && trialLeadsRemaining <= 20)
) {
  setOpen(true);
}
  }, [
  loading,
  trialExpired,
  isTrial,
  trialLeadsRemaining,
]);

  // Close with the Escape key.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeModal() {
    window.sessionStorage.setItem(
      "baselead_trial_popup_seen",
      "true"
    );

    setOpen(false);
  }

  function startTrial() {
    window.sessionStorage.setItem(
      "baselead_trial_popup_seen",
      "true"
    );

    setOpen(false);
  }

  function viewPlans() {
    window.sessionStorage.setItem(
      "baselead_trial_popup_seen",
      "true"
    );

    window.location.href =
      "/settings?section=billing";
  }

  if (
    loading ||
    !open ||
    (!isTrial && !trialExpired)
  ) {
    return null;
  }

  const daysRemaining = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEndsAt).getTime() -
            Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 7;

  if (trialExpired) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          // Clicking the dark background closes the modal.
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-violet-400/30 bg-[#111111] p-7 shadow-[0_25px_100px_rgba(124,58,237,0.3)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <button
            type="button"
            onClick={closeModal}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-300 shadow-[0_0_30px_rgba(167,139,250,0.2)]">
              <Clock3 size={26} />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
              Your BaseLead journey
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Ready to keep growing?
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
              Your free trial has ended. Choose a plan to continue finding,
              qualifying, and managing your best leads.
            </p>

            <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-violet-300" />

                <p className="text-sm font-medium text-white">
                  Your workspace is ready for more opportunities.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={viewPlans}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-5 py-4 text-sm font-semibold text-black transition hover:bg-[#ffe044]"
            >
              Explore subscription plans
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          // Clicking the dark background closes the modal.
          if (event.target === event.currentTarget) closeModal();
        }}
      >
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-violet-400/30 bg-[#111111] p-7 shadow-[0_25px_100px_rgba(124,58,237,0.3)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-gray-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-300 shadow-[0_0_30px_rgba(167,139,250,0.2)]">
            <Sparkles size={26} />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Welcome to BaseLead
          </p>

          <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-white">
            How would you like to get started?
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-6 text-gray-400">
            Try BaseLead free for 7 days with up to 100 leads, or choose a
            subscription now if you already know you are ready to grow.
          </p>
          {isTrial && trialLeadsRemaining <= 20 && (
  <div className="mt-5 rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/[0.08] p-4">
    <p className="text-sm font-semibold text-[#F5C518]">
      You are getting close to your trial limit
    </p>

    <p className="mt-1 text-sm leading-5 text-gray-400">
      You have{" "}
      {trialLeadsRemaining.toLocaleString()}{" "}
      trial leads left. Choose a plan now to keep finding new opportunities
      without interruption.
    </p>
  </div>
)}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={startTrial}
              className="group rounded-2xl border border-violet-400/30 bg-violet-400/[0.08] p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-violet-400/[0.14]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
                  <Clock3 size={19} />
                </div>

                <ArrowRight
                  size={17}
                  className="text-violet-300 transition group-hover:translate-x-1"
                />
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                Start with the free trial
              </h3>

              <p className="mt-2 text-sm leading-5 text-gray-400">
                Explore the app and discover what BaseLead can do for your
                business.
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Check size={14} className="text-violet-300" />
                  7 days to explore
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Check size={14} className="text-violet-300" />
                  Up to 100 leads
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={viewPlans}
              className="group rounded-2xl border border-[#F5C518]/35 bg-[#F5C518]/[0.08] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#F5C518]/60 hover:bg-[#F5C518]/[0.14]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5C518]/15 text-[#F5C518]">
                  <Zap size={19} />
                </div>

                <ArrowRight
                  size={17}
                  className="text-[#F5C518] transition group-hover:translate-x-1"
                />
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                Choose a plan now
              </h3>

              <p className="mt-2 text-sm leading-5 text-gray-400">
                Go directly to the subscription options and select the plan
                that fits your goals.
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm text-[#F5C518]">
                View Starter, Pro, and Scale
                <ArrowRight size={13} />
              </div>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Current trial access
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {trialLeadsRemaining.toLocaleString()} leads remaining
              </p>
            </div>

            <p className="text-sm text-gray-600">
              {daysRemaining} day{daysRemaining === 1 ? "" : "s"} available
              · {trialLeadLimit.toLocaleString()} lead limit
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-gray-600">
            You can explore the trial now or review the plans first.
          </p>
        </div>
      </div>
    </div>
  );
}