"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { LEGAL } from "@/components/legal/LegalPage";
import { LEGAL_TEXTS } from "@/lib/legal-content";

/** Turns emails and web addresses inside the legal text into links. */
function linkify(text: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] hover:underline break-words">{part}</a>;
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
      return <a key={i} href={`mailto:${part}`} className="text-[#3B82F6] hover:underline">{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
}

const NAV = {
  en: { privacy: "Privacy", terms: "Terms", support: "Support", rights: "All rights reserved." },
  es: { privacy: "Privacidad", terms: "Términos", support: "Soporte", rights: "Todos los derechos reservados." },
};

export default function LegalDoc({ doc }: { doc: "privacy" | "terms" }) {
  const { language } = useLanguage();
  const lang = language === "es" ? "es" : "en";
  const text = LEGAL_TEXTS[doc][lang];
  const nav = NAV[lang];

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-12 text-white sm:py-16" data-no-translate>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            Base<span className="text-[#3B82F6]">Lead</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-400 sm:gap-5">
            <Link href="/privacy" className="hover:text-white">{nav.privacy}</Link>
            <Link href="/terms" className="hover:text-white">{nav.terms}</Link>
            <Link href="/support" className="hidden hover:text-white sm:inline">{nav.support}</Link>
            <LanguageToggle />
          </nav>
        </div>

        <p className="mt-12 text-xs font-semibold uppercase tracking-[0.14em] text-[#3B82F6]">{LEGAL.company}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{text.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{text.effective}</p>

        {text.sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-7 text-gray-300">
              {section.paras.map((p, i) => <p key={i}>{linkify(p)}</p>)}
            </div>
          </section>
        ))}

        <p className="mt-14 border-t border-white/10 pt-6 text-xs text-gray-600">
          © {new Date().getFullYear()} {LEGAL.company}. {nav.rights}
        </p>
      </div>
    </main>
  );
}
