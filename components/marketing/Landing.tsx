import Link from "next/link";
import {
  ArrowRight, BarChart3, CalendarCheck, FileSignature, MailCheck, Radar, Sparkles, Target, Users, Workflow,
} from "lucide-react";
import { LEGAL } from "@/components/legal/LegalPage";
import { PLAN_DEFINITIONS } from "@/lib/plans";

/*
 * Public home page (logged-out visitors). Also serves as the homepage Google
 * and Apple review: it explains the product and links Privacy, Terms and Support.
 */

const FEATURES = [
  { icon: Radar, color: "#3B82F6", title: "Find real clients", text: "Describe what you sell and who you want. BaseLead searches real local businesses and adds the best fits." },
  { icon: Target, color: "#F5C518", title: "AI lead scoring", text: "Every lead gets a 0–100 opportunity score, the reasons behind it and the service to offer." },
  { icon: MailCheck, color: "#2DD4BF", title: "Personal emails, tracked", text: "AI drafts each email from your own Gmail. See opens and replies without leaving the app." },
  { icon: Workflow, color: "#F472B6", title: "Follow-ups on autopilot", text: "Sequences send each follow-up on schedule and stop the moment a lead replies." },
  { icon: CalendarCheck, color: "#84CC16", title: "Meetings booked for you", text: "Leads pick a time from your link; the meeting lands in Google Calendar with a Meet link." },
  { icon: FileSignature, color: "#A78BFA", title: "Proposals that get paid", text: "Send proposals, collect an e-signature and take the deposit by card." },
  { icon: BarChart3, color: "#F97316", title: "Pipeline & reports", text: "Deals move from New to Won on their own. Live dashboards for you and your team." },
  { icon: Users, color: "#2DD4BF", title: "Built for teams", text: "Invite your reps, set monthly goals and see who is closing on the leaderboard." },
];

const STEPS = [
  ["Tell BaseLead what you sell", "Your services, ideal client and target cities."],
  ["Get scored leads", "Real businesses, ranked by how likely they are to buy."],
  ["Reach out and follow up", "Personal emails and automatic follow-ups from your inbox."],
  ["Book, propose, close", "Meetings, proposals, signatures and payments in one place."],
];

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function Landing() {
  const plans = Object.values(PLAN_DEFINITIONS);
  return (
    <main className="min-h-screen bg-[#050505] text-white" data-no-translate>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-[radial-gradient(700px_380px_at_50%_0%,rgba(59,130,246,0.18),transparent_70%)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="BaseLead home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BaseLead" className="h-9 w-auto rounded-lg" />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <a href="#pricing" className="hidden rounded-lg px-3 py-2 text-gray-400 hover:text-white sm:block">Pricing</a>
          <Link href="/support" className="hidden rounded-lg px-3 py-2 text-gray-400 hover:text-white sm:block">Support</Link>
          <Link href="/login" className="rounded-lg px-3 py-2 text-gray-300 hover:text-white">Log in</Link>
          <Link href="/signup" className="rounded-xl bg-[#3B82F6] px-4 py-2 font-semibold text-white hover:bg-[#2F74E8]">Start free trial</Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-4xl px-5 pb-16 pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/30 bg-[#10243A] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#3B82F6]">
          <Sparkles className="h-3.5 w-3.5" /> AI sales app for growing businesses
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight [text-wrap:balance] sm:text-6xl">
          Find clients. Follow up. Close. All in one app.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-400">
          BaseLead finds local businesses that need what you sell, scores them with AI, writes the emails and follows up
          for you, so your team spends its time closing deals.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_-10px_rgba(59,130,246,0.8)] hover:bg-[#2F74E8]">
            Start your {7}-day free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-gray-200 hover:border-white/25">
            Log in
          </Link>
        </div>
        <p className="mt-3 text-xs text-gray-500">No credit card needed for the trial.</p>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, color, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-[#0D0D0F] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}22`, color }}>
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-white/10 p-5">
              <span className="text-sm font-semibold text-[#3B82F6]">Step {i + 1}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-400">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="text-center text-3xl font-bold tracking-tight">Simple pricing</h2>
        <p className="mt-2 text-center text-gray-400">Every plan starts with a 7-day free trial. Save about 15% with yearly billing.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-6 ${plan.name === "Pro" ? "border-[#3B82F6]/60 bg-[#0B1626]" : "border-white/10 bg-[#0D0D0F]"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.name === "Pro" && <span className="rounded-full bg-[#3B82F6] px-2.5 py-0.5 text-xs font-semibold">Most popular</span>}
              </div>
              <p className="mt-4 text-4xl font-bold tabular-nums">{money(plan.monthly)}<span className="text-base font-medium text-gray-500">/mo</span></p>
              <ul className="mt-5 space-y-2 text-sm text-gray-300">
                <li>{plan.leadLimit.toLocaleString("en-US")} leads</li>
                <li>{plan.teamLimit ? `Up to ${plan.teamLimit} team members` : "Unlimited team members"}</li>
                <li>{plan.campaignLimit ? `${plan.campaignLimit} active campaigns` : "Unlimited campaigns"}</li>
                <li>{plan.contactLookupLimit.toLocaleString("en-US")} decision-maker lookups / month</li>
                {plan.features.includes("outreach_automation") && <li>Automatic follow-ups & sequences</li>}
                {plan.features.includes("api_access") && <li>API access & custom reports</li>}
              </ul>
              <Link href="/signup" className={`mt-6 block rounded-xl px-4 py-2.5 text-center font-semibold ${plan.name === "Pro" ? "bg-[#3B82F6] text-white hover:bg-[#2F74E8]" : "border border-white/15 hover:border-white/30"}`}>
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {LEGAL.company}. BaseLead is a product of Studio Base.</p>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
