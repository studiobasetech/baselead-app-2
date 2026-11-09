"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Building2, Check, ChevronDown, Lock, Plus, X } from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { activeCompanyIdClient, clearActiveCompanyClient } from "@/lib/active-company";

type CompanyOption = { id: string; name: string; logoUrl: string | null; main: boolean };

const BRAND = "#3B82F6";
const GOLD = "#F5C518";
const BORDER = "#262626";
const MUTED = "#8C8C8C";

/**
 * Scale plan: run several companies (brands or clients) from one account.
 * Each company has its own leads, pipeline, team and settings.
 */
export default function CompanySwitcher() {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [limit, setLimit] = useState(1);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/companies", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const list = (data.companies ?? []) as CompanyOption[];
      setCompanies(list);
      setActiveId(data.activeId ?? null);
      setAllowed(Boolean(data.allowed));
      setLimit(Number(data.limit) || 1);

      // The selected company is gone or the plan no longer includes it: back to the main one.
      const cookieId = activeCompanyIdClient();
      const main = list.find((item) => item.main);
      if (cookieId && (!list.some((item) => item.id === cookieId) || (!data.allowed && cookieId !== main?.id))) {
        clearActiveCompanyClient();
        window.location.reload();
      }
    } catch {
      // Offline or signed out: no switcher.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    window.addEventListener("baselead-company-updated", load);
    return () => window.removeEventListener("baselead-company-updated", load);
  }, [load]);

  async function switchTo(companyId: string, afterPath?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/companies/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not switch company.");
      // Full reload so every page loads the new company's data.
      window.location.href = afterPath || window.location.pathname;
    } catch (switchError) {
      setError(t(switchError instanceof Error ? switchError.message : "Could not switch company."));
      setBusy(false);
    }
  }

  async function addCompany() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.company?.id) throw new Error(data.error || "Could not add the company.");
      setBusy(false);
      // Open the new company in Settings so its profile can be filled in.
      await switchTo(data.company.id, "/settings");
    } catch (addError) {
      setError(t(addError instanceof Error ? addError.message : "Could not add the company."));
      setBusy(false);
    }
  }

  if (companies.length === 0) return null;

  const active = companies.find((item) => item.id === activeId) ?? companies[0];
  const atLimit = companies.length >= limit;

  return (
    <div className="border-t px-3 py-2" style={{ borderColor: BORDER }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <Building2 size={18} strokeWidth={1.8} style={{ color: BRAND }} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide" style={{ color: MUTED }}>
            {t("Company")}
            {allowed && ` · ${companies.length}/${limit}`}
          </div>
          <div className="truncate text-sm font-semibold text-white">{active.name}</div>
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{ color: MUTED, transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-0.5 pb-1">
          {companies.map((company) => {
            const current = company.id === active.id;
            const locked = !company.main && !allowed;
            return (
              <button
                key={company.id}
                type="button"
                disabled={current || busy || locked}
                onClick={() => switchTo(company.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
                style={{ color: current ? BRAND : MUTED }}
              >
                <span className="min-w-0 flex-1 truncate">{company.name}</span>
                {company.main && (
                  <span className="text-[10px] uppercase" style={{ color: MUTED }}>
                    {t("Main")}
                  </span>
                )}
                {current && <Check size={15} style={{ color: BRAND }} />}
                {locked && <Lock size={13} />}
              </button>
            );
          })}

          {allowed ? (
            !atLimit && (
              <button
                type="button"
                onClick={() => {
                  setName("");
                  setError("");
                  setAdding(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-white/[0.04]"
                style={{ color: BRAND }}
              >
                <Plus size={15} />
                {t("Add company")}
              </button>
            )
          ) : (
            <Link
              href="/settings?section=billing"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]"
              style={{ color: MUTED }}
            >
              <Lock size={14} style={{ color: GOLD }} />
              <span className="flex-1">{t("Add company")}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "rgba(245,197,24,0.14)", color: GOLD }}
              >
                Scale
              </span>
            </Link>
          )}

          {allowed && atLimit && (
            <p className="px-3 py-1 text-xs" style={{ color: MUTED }}>
              {t("You've reached the {0}-company limit.").replace("{0}", String(limit))}
            </p>
          )}
          {error && !adding && <p className="px-3 py-1 text-xs text-[#F22F46]">{error}</p>}
        </div>
      )}

      {adding &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            onClick={() => !busy && setAdding(false)}
          >
            <div
              className="bl-phone-modal w-full max-w-md rounded-2xl border p-6"
              style={{ borderColor: BORDER, backgroundColor: "#0B0B0D" }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{t("Add a company")}</h2>
                  <p className="mt-1 text-sm leading-6" style={{ color: MUTED }}>
                    {t("Each company gets its own leads, pipeline, team and settings. It uses your Scale plan.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-full p-1 hover:bg-white/[0.06]"
                  style={{ color: MUTED }}
                  aria-label={t("Close")}
                >
                  <X size={18} />
                </button>
              </div>

              <label className="mt-5 block text-sm font-medium text-gray-300" htmlFor="new-company-name">
                {t("Company name")}
              </label>
              <input
                id="new-company-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && name.trim().length >= 2) addCompany();
                }}
                maxLength={120}
                className="mt-2 w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-[#3B82F6]"
                style={{ borderColor: BORDER }}
              />

              {error && <p className="mt-3 text-sm text-[#F22F46]">{error}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  disabled={busy}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/[0.05]"
                  style={{ color: MUTED }}
                >
                  {t("Cancel")}
                </button>
                <button
                  type="button"
                  onClick={addCompany}
                  disabled={busy || name.trim().length < 2}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: BRAND, color: "#FFFFFF" }}
                >
                  {busy ? t("Adding...") : t("Add company")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
