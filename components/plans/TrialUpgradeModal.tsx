"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Crown, Gift, Loader2, Rocket, Sparkles, X } from "lucide-react";

import { usePlan } from "@/components/plans/PlanProvider";
import { PLAN_DEFINITIONS, type PlanName } from "@/lib/plans";

/*
 * "Your BaseLead journey" — shown only when it matters:
 *  • once, on the first day of a new trial (welcome)
 *  • once a day when the trial is about to end (≤ 2 days or ≤ 20% of leads left)
 *  • whenever the trial has ended (until a plan is active)
 * Never for workspaces on an active paid plan.
 * Codes like FREEPLAN1295 can be redeemed right here.
 */

type Reason = "start" | "welcome" | "ending" | "expired";

const PLAN_STYLE: Record<PlanName, { color: string; tagline: string }> = {
  Starter: { color: "#3B82F6", tagline: "For solo sellers" },
  Pro: { color: "#F5C518", tagline: "Most popular · automation" },
  Scale: { color: "#A78BFA", tagline: "Teams & API" },
};

const DAY = 86400000;

function readStore(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export default function TrialUpgradeModal() {
  const {
    loading,
    isTrial,
    trialExpired,
    trialEndsAt,
    trialLeadsRemaining,
    trialLeadLimit,
    trialLeadsUsed,
    billingStatus,
    refreshPlan,
  } = usePlan();

  const [reason, setReason] = useState<Reason | null>(null);
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState<PlanName>("Pro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState<PlanName | null>(null);
  const [trialStarted, setTrialStarted] = useState(false);

  const daysLeft = useMemo(() => {
    if (!trialEndsAt) return 7;
    return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / DAY));
  }, [trialEndsAt]);

  // Decide whether the pop-up is needed right now.
  useEffect(() => {
    if (loading) return;
    if (billingStatus === "active" && !isTrial) return;

    const today = new Date().toDateString();
    let next: Reason | null = null;

    if (billingStatus === "inactive") {
      next = "start";
    } else if (trialExpired) {
      next = "expired";
    } else if (isTrial) {
      const lowLeads = trialLeadLimit > 0 && trialLeadsRemaining / trialLeadLimit <= 0.2;
      if ((daysLeft <= 2 || lowLeads) && readStore("baselead_journey_ending") !== today) {
        next = "ending";
      } else if (daysLeft >= 6 && !readStore("baselead_journey_welcome")) {
        next = "welcome";
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setReason(next);
  }, [loading, billingStatus, isTrial, trialExpired, trialLeadsRemaining, trialLeadLimit, daysLeft]);

  const close = useCallback(() => {
    if (reason === "welcome") writeStore("baselead_journey_welcome", "1");
    if (reason === "ending") writeStore("baselead_journey_ending", new Date().toDateString());
    setReason(null);
  }, [reason]);

  useEffect(() => {
    if (!reason) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reason, close]);

  async function redeem() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), plan, cycle: "monthly", apply: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "This code could not be applied.");
      if (result.type && result.type !== "free" && !result.activated) {
        throw new Error("This code gives a discount at checkout. Open the plans to use it.");
      }
      await refreshPlan();
      setActivated(plan);
      writeStore("baselead_journey_welcome", "1");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "This code could not be applied.");
    } finally {
      setBusy(false);
    }
  }

  async function startTrial() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/start-trial", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your trial could not be started. Please try again.");
      await refreshPlan();
      writeStore("baselead_journey_welcome", "1");
      setTrialStarted(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Your trial could not be started. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function goToPlans() {
    close();
    window.location.href = "/settings?section=billing";
  }

  if (!reason) return null;

  const usedPct = trialLeadLimit ? Math.min(100, Math.round((trialLeadsUsed / trialLeadLimit) * 100)) : 0;
  const dayOfTrial = Math.min(7, Math.max(1, 7 - daysLeft + (daysLeft === 0 ? 0 : 1)));

  const copy = {
    start: {
      eyebrow: "Welcome to BaseLead",
      title: "Start your 7-day free trial.",
      text: "Your free account is ready. Start the trial to unlock BaseLead for 7 days: 100 leads, AI scoring, personal emails, follow-ups and your pipeline. No credit card needed.",
    },
    welcome: {
      eyebrow: "Your BaseLead journey",
      title: "7 days to fill your pipeline.",
      text: "Find real leads, reach out from your inbox and watch deals move on their own. Here's your path:",
    },
    ending: {
      eyebrow: "Your BaseLead journey",
      title: daysLeft <= 0 ? "Your trial ends today." : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial.`,
      text: "Keep your leads, sequences and pipeline running without a pause. Pick a plan or use a code.",
    },
    expired: {
      eyebrow: "Your BaseLead journey",
      title: "Your trial has ended — your work is safe.",
      text: "Every lead, note and deal is still here. Choose a plan or redeem a code to continue.",
    },
  }[reason];

  const steps = [
    { day: 1, label: "Find leads" },
    { day: 3, label: "Reach out" },
    { day: 5, label: "Book meetings" },
    { day: 7, label: "Close deals" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <style>{`
        @keyframes blSpin { to { transform: rotate(360deg); } }
        @keyframes blFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes blConfetti { 0% { transform: translateY(-20px) rotate(0); opacity: 1 } 100% { transform: translateY(380px) rotate(540deg); opacity: 0 } }
        @keyframes blPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,.45) } 50% { box-shadow: 0 0 0 8px rgba(59,130,246,0) } }
      `}</style>

      {/* animated aurora border */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] p-[1.5px]">
        <div
          className="pointer-events-none absolute -inset-[60%]"
          style={{
            background: "conic-gradient(from 0deg, #F5C518, #A78BFA, #2DD4BF, #84CC16, #F5C518)",
            animation: "blSpin 8s linear infinite",
            opacity: 0.75,
          }}
        />

        <div className="bl-journey-panel relative max-h-[90vh] overflow-y-auto rounded-[calc(2rem-1.5px)] bg-[#0A0A0C]/95 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A78BFA]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#3B82F6]/10 blur-3xl" />

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {trialStarted ? (
            <div className="relative py-6 text-center">
              <span
                className="bl-icon-tile mx-auto !h-16 !w-16 !rounded-2xl"
                style={{ "--tab": "#3B82F6", animation: "blFloat 3s ease-in-out infinite" } as CSSProperties}
              >
                <Rocket size={30} strokeWidth={2} />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#3B82F6]">Trial started</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your 7 days start now 🚀</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
                Everything is unlocked. Start with a lead search: describe who you sell to and BaseLead finds them.
              </p>
              <a
                href="/search"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
              >
                Find my first leads <ArrowRight size={16} />
              </a>
            </div>
          ) : activated ? (
            /* ---------------- success ---------------- */
            <div className="relative py-6 text-center">
              {Array.from({ length: 26 }).map((_, index) => (
                <span
                  key={index}
                  className="pointer-events-none absolute top-0 h-2.5 w-1.5 rounded-sm"
                  style={{
                    left: `${(index * 37) % 100}%`,
                    background: ["#F5C518", "#A78BFA", "#2DD4BF", "#84CC16", "#F472B6"][index % 5],
                    animation: `blConfetti ${1.6 + (index % 5) * 0.25}s ease-out ${(index % 7) * 0.08}s forwards`,
                  }}
                />
              ))}
              <span
                className="bl-icon-tile mx-auto !h-16 !w-16 !rounded-2xl"
                style={{ "--tab": PLAN_STYLE[activated].color, animation: "blFloat 3s ease-in-out infinite" } as CSSProperties}
              >
                <Crown size={30} strokeWidth={2} />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#A78BFA]">Code applied</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">You&apos;re on {activated} 🎉</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
                Every {activated} feature is unlocked for your whole workspace. Your leads and pipeline are exactly where you left them.
              </p>
              <button
                type="button"
                onClick={() => setReason(null)}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
              >
                Let&apos;s go <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* header */}
              <div className="flex items-start gap-4 pr-12">
                <span
                  className="bl-icon-tile !h-14 !w-14 !rounded-2xl"
                  style={{ "--tab": reason === "expired" ? "#F472B6" : "#A78BFA", animation: "blFloat 4s ease-in-out infinite" } as CSSProperties}
                >
                  <Rocket size={26} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A78BFA]">{copy.eyebrow}</p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{copy.title}</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-400">{copy.text}</p>

              {/* journey timeline */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="relative">
                  <div className="absolute left-0 right-0 top-[11px] h-[3px] rounded-full bg-white/10" />
                  <div
                    className="absolute left-0 top-[11px] h-[3px] rounded-full bg-gradient-to-r from-[#A78BFA] via-[#2DD4BF] to-[#3B82F6] transition-all duration-700"
                    style={{ width: `${reason === "expired" ? 100 : ((dayOfTrial - 1) / 6) * 100}%` }}
                  />
                  <div className="relative flex justify-between">
                    {steps.map((step) => {
                      const reached = reason === "expired" || dayOfTrial >= step.day;
                      return (
                        <div key={step.day} className="flex w-16 flex-col items-center text-center first:items-start first:text-left last:items-end last:text-right">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                              reached ? "border-[#3B82F6] bg-[#3B82F6] text-white" : "border-white/20 bg-[var(--j-bg)] text-gray-500"
                            }`}
                            style={dayOfTrial === step.day && reason !== "expired" ? { animation: "blPulse 1.8s ease-in-out infinite" } : undefined}
                          >
                            {reached ? <Check size={12} strokeWidth={3} /> : step.day}
                          </span>
                          <span className={`mt-2 text-[11px] font-medium ${reached ? "text-white" : "text-gray-500"}`}>{step.label}</span>
                          <span className="text-[10px] text-gray-600">Day {step.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reason !== "start" && <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500">Trial leads used</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                      {trialLeadsUsed.toLocaleString()}<span className="text-sm text-gray-500"> / {trialLeadLimit.toLocaleString()}</span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#A78BFA]" style={{ width: `${usedPct}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/30 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500">Time left</p>
                    <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                      {reason === "expired" ? "Ended" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#F472B6]" style={{ width: `${reason === "expired" ? 0 : Math.round((daysLeft / 7) * 100)}%` }} />
                    </div>
                  </div>
                </div>}
              </div>

              {/* plan picker */}
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {(Object.keys(PLAN_DEFINITIONS) as PlanName[]).map((name) => {
                  const selected = plan === name;
                  const style = PLAN_STYLE[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setPlan(name)}
                      className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5"
                      style={{
                        borderColor: selected ? `${style.color}aa` : "var(--j-line)",
                        background: selected ? `${style.color}14` : "var(--j-soft)",
                        boxShadow: selected ? `0 0 28px -10px ${style.color}` : "none",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: style.color }}>{name}</span>
                        {selected && <Check size={15} style={{ color: style.color }} />}
                      </div>
                      <p className="mt-1 text-xl font-semibold text-white">
                        ${PLAN_DEFINITIONS[name].monthly}<span className="text-xs font-normal text-gray-500">/mo</span>
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">{style.tagline}</p>
                      <p className="mt-1 text-[11px] text-gray-500">{PLAN_DEFINITIONS[name].leadLimit.toLocaleString()} leads/mo</p>
                    </button>
                  );
                })}
              </div>

              {/* code */}
              <div className="mt-4 rounded-2xl border border-[#3B82F6]/25 bg-[#3B82F6]/[0.06] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#3B82F6]">
                  <Gift size={15} /> Have a code?
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.toUpperCase());
                      setError("");
                    }}
                    onKeyDown={(event) => event.key === "Enter" && code.trim() && void redeem()}
                    placeholder="Enter code"
                    className="h-11 flex-1 rounded-xl border border-[#3B82F6]/25 bg-black/30 px-3 text-sm font-semibold tracking-widest text-white outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-600 focus:border-[#3B82F6]/60"
                  />
                  <button
                    type="button"
                    onClick={() => void redeem()}
                    disabled={!code.trim() || busy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-black transition hover:bg-[#3B82F6] disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Activate {plan}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-[#F22F46]">{error}</p>}
              </div>

              {/* actions */}
              {reason === "start" ? (
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={goToPlans} className="h-11 rounded-xl px-4 text-sm text-gray-400 transition hover:text-white">
                    Compare plans first
                  </button>
                  <button
                    type="button"
                    onClick={() => void startTrial()}
                    disabled={busy}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-6 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(59,130,246,0.8)] transition hover:bg-[#2F74E8] disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                    Start my 7-day free trial
                  </button>
                </div>
              ) : (
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {reason !== "expired" ? (
                  <button type="button" onClick={close} className="h-11 rounded-xl px-4 text-sm text-gray-400 transition hover:text-white">
                    {reason === "welcome" ? "Start exploring" : "Remind me tomorrow"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-600">Your data stays safe while you decide.</span>
                )}
                <button
                  type="button"
                  onClick={goToPlans}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-6 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
                >
                  Compare all plans <ArrowRight size={16} />
                </button>
              </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
