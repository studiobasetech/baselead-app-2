"use client";

import { useLanguage, type Language } from "@/components/i18n/LanguageProvider";

/* EN | ES switch for public pages (landing, login, sign up). */
export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const options: { value: Language; label: string; name: string }[] = [
    { value: "en", label: "EN", name: "English" },
    { value: "es", label: "ES", name: "Español" },
  ];
  return (
    <div
      data-no-translate
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-lg border border-white/15 bg-black/40 p-0.5 text-xs font-semibold ${className}`}
    >
      {options.map((option) => {
        const active = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.name}
            aria-pressed={active}
            onClick={() => void setLanguage(option.value)}
            className={`rounded-md px-2.5 py-1.5 transition ${
              active ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
