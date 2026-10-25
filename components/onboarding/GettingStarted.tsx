"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Rocket, X } from "lucide-react";

/*
 * First-time welcome: 5 steps from sign-up to first reply.
 * Hides itself when everything is done or when dismissed.
 */

type Step = { id: string; title: string; detail: string; href: string; done: boolean };

const KEY = "baselead-getting-started-dismissed";

export default function GettingStarted() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    if (dismissed) return;
    setHidden(false);
    fetch("/api/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.steps && setSteps(json.steps))
      .catch(() => {});
  }, []);

  if (hidden || !steps) return null;
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  const pct = done / steps.length;
  const next = steps.find((s) => !s.done);
  const r = 22;
  const c = 2 * Math.PI * r;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setHidden(true);
  };

  return (
    <section className="bl-card relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111114] p-5 md:p-6 md:pr-12" style={{ "--hover-accent": "#3B82F6" } as CSSProperties}>
      <button type="button" onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-1.5 text-[#71717A] hover:bg-white/5 hover:text-white" aria-label="Hide getting started">
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4 md:w-[280px] md:shrink-0">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
              <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="5" />
              <circle cx="28" cy="28" r={r} fill="none" stroke="#3B82F6" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{done}/{steps.length}</span>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#3B82F6]">
              <Rocket className="h-3.5 w-3.5" /> Getting started
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">Set up BaseLead</h2>
            {next && <p className="text-sm text-[#A1A1AA]">Next: {next.title}</p>}
          </div>
        </div>

        <ol className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.id}>
              <Link
                href={step.href}
                title={step.detail}
                className={`group flex h-full items-start gap-2.5 rounded-xl border p-3 transition ${
                  step.done
                    ? "border-white/5 bg-white/[0.02]"
                    : step === next
                      ? "border-[#3B82F6]/40 bg-[#3B82F6]/[0.06] hover:border-[#3B82F6]/70"
                      : "border-white/10 hover:border-white/20"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    step.done ? "bg-[#3B82F6] text-white" : "border border-white/20 text-[#A1A1AA]"
                  }`}
                >
                  {step.done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${step.done ? "text-[#71717A] line-through" : "text-white"}`}>{step.title}</span>
                  {!step.done && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-[#8C8C96] group-hover:text-[#3B82F6]">
                      Start <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
