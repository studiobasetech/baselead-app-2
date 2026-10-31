import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, MessageSquareReply, Sparkles, Target, X } from "lucide-react";
import { LEGAL } from "@/components/legal/LegalPage";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { Faq, HowItWorksTabs, PricingPlans, TourVideo } from "@/components/marketing/LandingInteractive";

/*
 * Public home page (logged-out visitors). Also the homepage Google and Apple
 * review: it explains the product and links Privacy, Terms and Support.
 * Screens shown are real BaseLead screens with sample data (public/landing/).
 */

const WHO = [
  ["Marketing agencies", "#3B82F6"],
  ["Web designers", "#F5C518"],
  ["Contractors", "#2DD4BF"],
  ["Med spas", "#F472B6"],
  ["Real estate", "#84CC16"],
  ["Consultants", "#A78BFA"],
] as const;

const HIGHLIGHTS = [
  {
    tag: "AI lead score",
    color: "#F5C518",
    title: "Know exactly who to call first",
    text: "Every lead gets a 0–100 opportunity score, the reasons behind it, the service to offer and the estimated deal value.",
    images: ["/landing/phone-lead.webp", "/landing/phone-radar.webp"],
  },
  {
    tag: "Sequences",
    color: "#F472B6",
    title: "Follow-ups that stop when they reply",
    text: "Write your steps once. BaseLead sends each email on schedule from your Gmail, and takes a lead out the moment they answer.",
    images: ["/landing/phone-sequences.webp", "/landing/phone-outreach.webp"],
  },
  {
    tag: "Pipeline & proposals",
    color: "#84CC16",
    title: "Proposals that get signed and paid",
    text: "Leads move from New to Won on their own. Send a proposal, get an e-signature and take the deposit by card.",
    images: ["/landing/phone-pipeline.webp", "/landing/phone-proposals.webp"],
  },
];

function Phone({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`rounded-[38px] border border-white/15 bg-[#0b0d12] p-2 shadow-[0_40px_90px_rgba(0,0,0,0.7)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="BaseLead on a phone" className="block w-full rounded-[30px]" loading="lazy" width={600} height={1298} />
    </div>
  );
}

function Badge() {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-purple-500/60 bg-purple-500/[0.04] px-4 py-2">
      <Target className="h-4 w-4 text-purple-400" />
      <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-xs font-semibold uppercase tracking-wider text-transparent sm:text-sm">
        World&apos;s 1st AI powered B2B client finder
      </span>
    </span>
  );
}

export default function Landing() {
  return (
    <main className="bl-landing min-h-screen overflow-x-hidden bg-[#050507] text-white">
      <style>{`
        @keyframes blLandFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes blLandIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .bl-land-float { animation: blLandFloat 5s ease-in-out infinite; }
        .bl-land-fade { animation: blLandIn .45s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .bl-land-float, .bl-land-fade { animation: none; } }
      `}</style>

      {/* ---------- Header ---------- */}
      <header className="relative z-10 mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-5">
        <nav className="flex items-center gap-1 text-sm">
          <a href="#how" className="hidden rounded-lg px-3 py-2 text-gray-400 hover:text-white md:block">Product</a>
          <a href="#pricing" className="hidden rounded-lg px-3 py-2 text-gray-400 hover:text-white sm:block">Pricing</a>
          <Link href="/support" className="hidden rounded-lg px-3 py-2 text-gray-400 hover:text-white sm:block">Support</Link>
        </nav>
        <Link href="/" aria-label="BaseLead home" className="justify-self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-on-dark.png" alt="BaseLead" className="h-7 w-auto sm:h-9" />
        </Link>
        <nav className="flex items-center justify-end gap-2 text-sm">
          <LanguageToggle />
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-gray-300 hover:text-white sm:block">Log in</Link>
          <Link href="/signup" className="whitespace-nowrap rounded-xl bg-[#3B82F6] px-3 py-2 font-semibold text-white hover:bg-[#2F74E8] sm:px-4">
            <span className="sm:hidden">Try free</span>
            <span className="hidden sm:inline">Start free trial</span>
          </Link>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative pb-20 pt-6 lg:pb-28">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-[820px] bg-[radial-gradient(600px_380px_at_72%_42%,rgba(59,130,246,0.28),transparent_70%),radial-gradient(420px_300px_at_12%_18%,rgba(168,85,247,0.16),transparent_70%),radial-gradient(380px_260px_at_88%_88%,rgba(245,197,24,0.10),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.15fr]">
          <div className="text-center lg:text-left">
            <Badge />
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[64px]">
              Find clients.
              <br />
              Follow up.
              <br />
              <span className="bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] bg-clip-text text-transparent">Close.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-400 lg:mx-0">
              BaseLead finds local businesses that need what you sell, scores them with AI, writes the emails and follows up
              for you, so your team spends its time closing deals.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3.5 font-semibold text-white shadow-[0_14px_34px_-12px_rgba(59,130,246,0.9)] hover:bg-[#2F74E8]">
                Start your 7-day free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signup" className="rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-gray-200 hover:border-white/30">
                Sign up free
              </Link>
            </div>
            <p className="mt-3 text-xs text-gray-500">Create a free account, then start your 7-day trial whenever you’re ready. No credit card needed.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-400 lg:justify-start">
              <span>⚡ <b className="text-white">Real</b> local businesses</span>
              <span>🎯 <b className="text-white">AI</b> lead scores</span>
              <span>📬 Sends from <b className="text-white">your Gmail</b></span>
            </div>
          </div>

          {/* App preview */}
          <div className="relative mx-auto h-[420px] w-full max-w-[640px] sm:h-[520px]">
            <div className="absolute right-0 top-4 w-[88%] rounded-2xl border border-white/10 bg-gradient-to-b from-[#1b1f29] to-[#11141b] p-2 pb-0 shadow-[0_50px_120px_-30px_rgba(59,130,246,0.45),0_30px_80px_rgba(0,0,0,0.6)] sm:p-2.5 sm:pb-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/desk-today.webp" alt="BaseLead Today screen" className="block w-full rounded-t-[10px]" width={1600} height={1000} />
            </div>
            <Phone src="/landing/phone-leads.webp" className="absolute -left-2 top-28 w-[34%] sm:top-36" />

            <div className="bl-land-float absolute -right-2 -top-3 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0F1117]/95 px-3.5 py-2.5 text-[13px] shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF]"><MessageSquareReply className="h-4 w-4" /></span>
              <span>Jordan Hayes replied<small className="block text-[11px] text-gray-500">“Can we talk Thursday?”</small></span>
            </div>
            <div className="bl-land-float absolute -left-6 top-14 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0F1117]/95 px-3.5 py-2.5 text-[13px] shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur [animation-delay:1.2s] sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6]"><Target className="h-4 w-4" /></span>
              <span>New lead · score <b className="text-[#60A5FA]">92</b><small className="block text-[11px] text-gray-500">Maison Floral Design</small></span>
            </div>
            <div className="bl-land-float absolute bottom-2 right-6 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0F1117]/95 px-3.5 py-2.5 text-[13px] shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur [animation-delay:2.4s] sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F472B6]/15 text-[#F472B6]"><CalendarCheck className="h-4 w-4" /></span>
              <span>Meeting booked · 10:00 AM<small className="block text-[11px] text-gray-500">Pure Glow Med Spa · $7,200</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Who it's for ---------- */}
      <section className="border-y border-white/[0.08] py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2.5 px-5 text-sm text-gray-400">
          <span className="w-full text-center md:w-auto">Built for businesses that sell to local businesses:</span>
          {WHO.map(([name, color]) => (
            <span key={name} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-2 text-[13px] text-gray-200">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3B82F6]">How it works</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight [text-wrap:balance] sm:text-[44px]">
          From “who should I call?” to a signed deal
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-400">Four steps, one app. Tap a step to see that part of BaseLead.</p>
        <HowItWorksTabs />
      </section>

      {/* ---------- Tour video ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 lg:grid-cols-[1fr_auto]">
        <div className="text-center lg:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3B82F6]">See it in action</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-[44px]">See BaseLead in 30 seconds</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-gray-400 lg:mx-0">
            Watch BaseLead find real clients, score them with AI, write your emails, follow up for you and get deals signed. All from your phone.
          </p>
          <Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3.5 font-semibold text-white hover:bg-[#2F74E8]">
            Try it free for 7 days <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <TourVideo />
      </section>

      {/* ---------- Highlights ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        {HIGHLIGHTS.map((item, index) => (
          <div key={item.title} className="grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16">
            <div className={`text-center md:text-left ${index % 2 ? "md:order-2" : ""}`}>
              <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ background: `${item.color}1f`, color: item.color }}>
                {item.tag}
              </span>
              <h3 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{item.title}</h3>
              <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-gray-400 md:mx-0">{item.text}</p>
            </div>
            <div className="relative mx-auto h-[440px] w-full max-w-[460px] sm:h-[500px]">
              <div className="pointer-events-none absolute inset-12 rounded-full opacity-30 blur-[70px]" style={{ background: item.color }} />
              <Phone src={item.images[0]} className="absolute left-0 top-0 w-[52%]" />
              <Phone src={item.images[1]} className="absolute right-0 top-14 w-[52%]" />
            </div>
          </div>
        ))}
      </section>

      {/* ---------- Before / with ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-24 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3B82F6]">Why BaseLead</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-[44px]">Stop chasing. Start closing.</h2>
        <div className="mt-11 grid gap-5 text-left md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#0D0E12] p-7">
            <h3 className="text-lg font-semibold text-[#F87171]">Without BaseLead</h3>
            <ul className="mt-5 space-y-3.5 text-[15px] text-gray-300">
              {["Hours searching Google Maps and copying into spreadsheets", "Guessing which leads are worth your time", "Writing every email from scratch", "Follow-ups forgotten, deals going cold"].map((t) => (
                <li key={t} className="flex gap-3"><X className="mt-0.5 h-4 w-4 shrink-0 text-[#F22F46]" strokeWidth={3} />{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-[#3B82F6]/45 bg-[linear-gradient(180deg,rgba(59,130,246,0.10),transparent)] bg-[#0D0E12] p-7">
            <h3 className="text-lg font-semibold text-[#60A5FA]">With BaseLead</h3>
            <ul className="mt-5 space-y-3.5 text-[15px] text-gray-300">
              {["Real businesses found and organized in seconds", "AI scores tell you who to call first", "Personal emails written for you", "Automatic follow-ups and a pipeline that moves on its own"].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" strokeWidth={3} />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Pricing + FAQ ---------- */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-24 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3B82F6]">Pricing</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-[44px]">Simple plans. 7-day free trial.</h2>
        <PricingPlans />
        <h2 className="mt-24 text-3xl font-bold tracking-tight">Questions</h2>
        <Faq />
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="px-5 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-[#3B82F6]/35 bg-[radial-gradient(500px_260px_at_50%_0%,rgba(59,130,246,0.35),transparent_70%),radial-gradient(300px_200px_at_90%_100%,rgba(245,197,24,0.12),transparent_70%)] bg-[#0A0D14] px-6 py-16 text-center sm:px-16">
          <Sparkles className="mx-auto h-7 w-7 text-[#F5C518]" />
          <h2 className="mt-4 text-4xl font-bold tracking-tight [text-wrap:balance] sm:text-5xl">Your next client is already out there.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">Let BaseLead find them, write to them and remind you when to follow up.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3.5 font-semibold text-white hover:bg-[#2F74E8]">
              Start your 7-day free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup" className="rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-gray-200 hover:border-white/30">Sign up free</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {LEGAL.company}. All rights reserved.</p>
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
