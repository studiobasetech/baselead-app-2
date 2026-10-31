"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Minus, Play, Plus } from "lucide-react";
import { PLAN_DEFINITIONS, type PlanName } from "@/lib/plans";

/* ---------------- How it works (tabs) ---------------- */

const STEPS = [
  {
    key: "find",
    label: "Find",
    color: "#3B82F6",
    title: "Real businesses that need what you sell",
    text: "Describe your offer and your ideal client. BaseLead searches real local businesses and organizes them for you.",
    points: ["Search by city, industry and service", "Contact details and social profiles", "Opportunity Radar map of your market"],
    image: "/landing/desk-leads.webp",
  },
  {
    key: "score",
    label: "Score",
    color: "#F5C518",
    title: "Know exactly who to call first",
    text: "Every lead gets an AI opportunity score from 0 to 100, the reasons behind it and the estimated deal value.",
    points: ["AI score and buying intent", "The service to offer each lead", "Live dashboard of your best opportunities"],
    image: "/landing/desk-dashboard.webp",
  },
  {
    key: "reach",
    label: "Reach out",
    color: "#2DD4BF",
    title: "Personal emails, written and tracked",
    text: "AI drafts a personal email for each lead and sends it from your own Gmail. See who opened and who replied.",
    points: ["Emails written for each business", "Opens and replies in real time", "Automatic follow-ups that stop when they reply"],
    image: "/landing/desk-outreach.webp",
  },
  {
    key: "close",
    label: "Close",
    color: "#84CC16",
    title: "A pipeline that moves on its own",
    text: "Leads move from New to Won as they reply, book meetings and sign. Send proposals and get paid in one place.",
    points: ["Pipeline by stage with deal values", "Proposals with e-signature", "Card deposits through Stripe"],
    image: "/landing/desk-pipeline.webp",
  },
];

export function HowItWorksTabs() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  return (
    <div>
      <div className="mt-9 flex flex-wrap justify-center gap-2.5" role="tablist" aria-label="How BaseLead works">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-[15px] font-semibold transition ${
              i === active ? "border-[#3B82F6]/60 bg-[#3B82F6]/10 text-white shadow-[0_0_30px_-10px_#3B82F6]" : "border-white/10 bg-[#0D0E12] text-gray-400 hover:text-white"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg text-xs" style={{ background: `${s.color}26`, color: s.color }}>
              {i + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.06),transparent_60%)] bg-[#0D0E12] p-6 text-left lg:grid-cols-[1fr_1.6fr] lg:p-9">
        <div key={step.key} className="bl-land-fade">
          <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ background: `${step.color}1f`, color: step.color }}>
            Step {active + 1} · {step.label}
          </span>
          <h3 className="mt-4 text-[28px] font-bold leading-tight tracking-tight">{step.title}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-400">{step.text}</p>
          <ul className="mt-5 space-y-3">
            {step.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-[15px] text-gray-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" strokeWidth={3} /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={step.image} src={step.image} alt={`BaseLead ${step.label} screen`} className="bl-land-fade block w-full" loading="lazy" width={1600} height={1000} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tour video ---------------- */

export function TourVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const { language } = useLanguage();
  const es = language === "es";
  return (
    <div className="relative mx-auto w-[290px] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_40px_90px_rgba(0,0,0,0.7)] sm:w-[340px]">
      <video
        key={language}
        ref={ref}
        src={es ? "/landing/tour-es.mp4" : "/landing/tour.mp4"}
        poster={es ? "/landing/tour-poster-es.jpg" : "/landing/tour-poster.jpg"}
        className="block aspect-[9/16] w-full object-cover"
        playsInline
        muted
        controls={playing}
        preload="metadata"
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            if (ref.current) {
              ref.current.muted = false;
              void ref.current.play();
            }
          }}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play the BaseLead tour"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#3B82F6]/95 shadow-[0_0_0_12px_rgba(59,130,246,0.18)] transition hover:scale-105">
            <Play className="ml-1 h-8 w-8 fill-white text-white" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ---------------- Pricing with monthly / yearly ---------------- */

const PLAN_COPY: Record<PlanName, { tagline: string; bullets: (p: (typeof PLAN_DEFINITIONS)[PlanName]) => string[] }> = {
  Starter: { tagline: "For solo sellers", bullets: (p) => [`${p.leadLimit.toLocaleString("en-US")} leads`, `Up to ${p.teamLimit} team members`, "AI scoring & email drafts", "Pipeline & calendar"] },
  Pro: { tagline: "Automation for growing teams", bullets: (p) => [`${p.leadLimit.toLocaleString("en-US")} leads`, `Up to ${p.teamLimit} team members`, "Automatic follow-ups & sequences", "Advanced reports & integrations"] },
  Scale: { tagline: "Teams & API", bullets: (p) => [`${p.leadLimit.toLocaleString("en-US")} leads`, "Unlimited team members", "API access & custom reports", "Team permissions"] },
};

export function PricingPlans() {
  const [yearly, setYearly] = useState(false);
  const plans = Object.values(PLAN_DEFINITIONS);
  return (
    <div>
      <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-[#0D0E12] p-1 text-sm">
        <button type="button" onClick={() => setYearly(false)} className={`rounded-lg px-4 py-2 ${!yearly ? "bg-[#3B82F6] text-white" : "text-gray-400"}`}>Monthly</button>
        <button type="button" onClick={() => setYearly(true)} className={`rounded-lg px-4 py-2 ${yearly ? "bg-[#3B82F6] text-white" : "text-gray-400"}`}>
          Yearly <span className={yearly ? "text-white" : "text-[#F5C518]"}>· Save 15%</span>
        </button>
      </div>
      <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
        {plans.map((plan) => {
          const pro = plan.name === "Pro";
          const price = yearly ? Math.round(plan.yearly / 12) : plan.monthly;
          return (
            <div
              key={plan.name}
              className={`rounded-3xl border p-7 ${pro ? "border-[#3B82F6]/70 bg-[linear-gradient(180deg,rgba(59,130,246,0.14),transparent_70%)] bg-[#0D0E12] shadow-[0_30px_70px_-30px_rgba(59,130,246,0.8)] md:-translate-y-2.5" : "border-white/10 bg-[#0D0E12]"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {pro && <span className="rounded-full bg-[#3B82F6] px-2.5 py-0.5 text-xs font-bold">Most popular</span>}
              </div>
              <p className="mt-4 text-[44px] font-extrabold leading-none tabular-nums">
                ${price}
                <span className="text-base font-medium text-gray-500">/mo</span>
              </p>
              <p className="mt-2 text-sm text-gray-500">{yearly ? `$${Math.round(plan.yearly).toLocaleString("en-US")} billed yearly` : PLAN_COPY[plan.name].tagline}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-gray-300">
                {PLAN_COPY[plan.name].bullets(plan).map((b) => (
                  <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" strokeWidth={3} />{b}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-7 block rounded-xl px-4 py-3 text-center font-semibold ${pro ? "bg-[#3B82F6] text-white hover:bg-[#2F74E8]" : "border border-white/15 hover:border-white/30"}`}
              >
                Start free trial
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- FAQ ---------------- */

const FAQ = [
  ["Do I need a credit card for the free trial?", "No. Create a free account and start your 7-day trial whenever you’re ready. Pick a plan only if you want to keep going."],
  ["Does it send emails from my own Gmail?", "Yes. You connect your Gmail and every email goes out from your own address, so replies come straight to your inbox."],
  ["Can I cancel anytime?", "Yes. Change or cancel your plan anytime in Settings. Your leads and pipeline stay in your account."],
  ["Is my data safe?", "Your data is encrypted in transit, connection tokens are stored encrypted, and each company can only see its own workspace. Two-factor sign-in is available."],
  ["Can my whole team use it?", "Yes. Invite your reps, set monthly goals and see everyone’s results on the Team Performance page."],
  ["Where do the leads come from?", "BaseLead searches public business listings such as Google Maps and OpenStreetMap, then adds website and social details and scores each business with AI."],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left">
      {FAQ.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="rounded-2xl border border-white/10 bg-[#0D0E12]">
            <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={isOpen}>
              {q}
              {isOpen ? <Minus className="h-5 w-5 shrink-0 text-[#3B82F6]" /> : <Plus className="h-5 w-5 shrink-0 text-[#3B82F6]" />}
            </button>
            {isOpen && <p className="px-5 pb-5 text-[15px] leading-relaxed text-gray-400">{a}</p>}
          </div>
        );
      })}
    </div>
  );
}
