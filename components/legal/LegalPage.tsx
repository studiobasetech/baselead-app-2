import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL = {
  product: "BaseLead",
  company: process.env.NEXT_PUBLIC_LEGAL_ENTITY || "Studio Base LLC",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@studiobase.tech",
  updated: "October 19, 2026",
  state: process.env.NEXT_PUBLIC_LEGAL_STATE || "Texas",
};

export function ContactLine() {
  return LEGAL.email ? (
    <a href={`mailto:${LEGAL.email}`} className="text-[#F5C518] hover:underline">
      {LEGAL.email}
    </a>
  ) : (
    <span>the contact option inside the app (Settings)</span>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-gray-300 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050505] px-5 py-12 text-white sm:py-16" data-no-translate>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            Base<span className="text-[#F5C518]">Lead</span>
          </Link>
          <nav className="flex gap-5 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </nav>
        </div>

        <h1 className="mt-12 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LEGAL.updated}</p>
        <div className="mt-6 text-[15px] leading-7 text-gray-300">{intro}</div>

        {children}

        <p className="mt-14 border-t border-white/10 pt-6 text-xs text-gray-600">
          © {new Date().getFullYear()} {LEGAL.company}. {LEGAL.product} is operated by {LEGAL.company}.
        </p>
      </div>
    </main>
  );
}
