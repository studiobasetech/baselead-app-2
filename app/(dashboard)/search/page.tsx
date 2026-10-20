"use client";

import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlanGate from "@/components/plans/PlanGate";
import {
  recommendationReasons,
  recommendationValue,
  recommendedServices,
} from "@/lib/recommendations";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Globe2,
  History,
  Lightbulb,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Tag,
  Target,
  UserPlus,
  Users,
  WandSparkles,
  X,
  Zap,
  SlidersHorizontal,
  Brain,
  Crosshair,
  Radar,
  MousePointer2,
  CheckCircle2,
} from "lucide-react";

type SearchMode = "simple" | "advanced";
type ActiveTab = "builder" | "prompt" | "saved";
type ResultTab = "all" | "highIntent" | "contacted" | "responded" | "client";

type SavedSearch = {
  id: string;
  name: string;
  offer: string;
  client: string;
  location: string;
  leads: string;
};

type SearchResultLead = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  rating?: number | null;
  review_count?: number | null;
  ai_score?: number | null;
  intent_score?: number | null;
  ai_opportunity?: string | null;
  ai_reason?: string | null;
  ai_recommendations?: unknown;
  raw_data?: unknown;
};

type SelectOption = {
  label: string;
  value: string;
};

const supabase = createClient();

const companySizeOptions: SelectOption[] = [
  { label: "Any size", value: "" },
  { label: "1–10 employees", value: "1–10 employees" },
  { label: "2–50 employees", value: "2–50 employees" },
  { label: "51–200 employees", value: "51–200 employees" },
  { label: "201–500 employees", value: "201–500 employees" },
  { label: "500+ employees", value: "500+ employees" },
];

const revenueOptions: SelectOption[] = [
  { label: "Any revenue", value: "" },
  { label: "Under $500K", value: "Under $500K" },
  { label: "$500K – $1M", value: "$500K – $1M" },
  { label: "$1M – $10M", value: "$1M – $10M" },
  { label: "$10M – $50M", value: "$10M – $50M" },
  { label: "$50M+", value: "$50M+" },
];

const radiusOptions: SelectOption[] = [
  { label: "5 miles", value: "5 miles" },
  { label: "10 miles", value: "10 miles" },
  { label: "25 miles", value: "25 miles" },
  { label: "50 miles", value: "50 miles" },
  { label: "100 miles", value: "100 miles" },
];

const buyingIntentOptions: SelectOption[] = [
  { label: "Any intent", value: "" },
  { label: "Actively looking", value: "Actively looking" },
  { label: "High intent", value: "High intent" },
  { label: "Growing / expanding", value: "Growing / expanding" },
  { label: "Recently changed", value: "Recently changed" },
];

function normalizeTargetLocations(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => {
            if (typeof item === "string") return [item];

            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              const candidate =
                obj.name ??
                obj.location ??
                obj.label ??
                obj.address ??
                obj.city;

              return typeof candidate === "string" ? [candidate] : [];
            }

            return [];
          })
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (parsed !== value) {
        return normalizeTargetLocations(parsed);
      }
    } catch {}

    return Array.from(
      new Set(
        trimmed
          .split(/[\n;,]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    const candidate =
      obj.name ??
      obj.location ??
      obj.label ??
      obj.address ??
      obj.city;

    if (typeof candidate === "string") {
      return [candidate.trim()].filter(Boolean);
    }

    for (const key of [
      "locations",
      "target_locations",
      "values",
      "items",
    ]) {
      if (obj[key]) {
        const normalized = normalizeTargetLocations(obj[key]);

        if (normalized.length) {
          return normalized;
        }
      }
    }
  }

  return [];
}

function getScore(lead: SearchResultLead) {
  return typeof lead.ai_score === "number"
    ? lead.ai_score
    : typeof lead.intent_score === "number"
      ? lead.intent_score
      : null;
}

function getOpportunityLabel(lead: SearchResultLead) {
  if (lead.ai_opportunity) return lead.ai_opportunity;

  const score = getScore(lead);

  if (score === null) return "Not analyzed";
  if (score >= 80) return "High Opportunity";
  if (score >= 60) return "Medium Opportunity";

  return "Low Opportunity";
}

function getOpportunityClass(lead: SearchResultLead) {
  const score = getScore(lead);

  if (score === null) {
    return "border-white/10 bg-white/5 text-gray-400";
  }

  if (score >= 80) {
    return "border-lime-400/20 bg-lime-400/10 text-lime-400";
  }

  if (score >= 60) {
    return "border-[#FFD000]/20 bg-[#FFD000]/10 text-[#FFD000]";
  }

  return "border-white/10 bg-white/5 text-gray-500";
}

function getScoreClass(lead: SearchResultLead) {
  const score = getScore(lead);

  if (score === null) return "text-gray-500";
  if (score >= 80) return "text-lime-400";
  if (score >= 60) return "text-[#FFD000]";

  return "text-gray-400";
}

function getLocation(lead: SearchResultLead) {
  if (lead.location) return lead.location;

  return (
    [lead.city, lead.state, lead.country].filter(Boolean).join(", ") ||
    "Location unavailable"
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarClass(index: number) {
  const classes = [
    "bg-gradient-to-br from-[#252525] to-[#111827] text-white",
    "bg-gradient-to-br from-[#f4b8c0] to-[#d98d9a] text-[#30151b]",
    "bg-gradient-to-br from-[#123b25] to-[#0a2417] text-white",
    "bg-gradient-to-br from-[#ead8bd] to-[#c9aa7b] text-[#3c3025]",
    "bg-gradient-to-br from-[#063e47] to-[#092a30] text-white",
    "bg-gradient-to-br from-[#3b315c] to-[#201a37] text-white",
    "bg-gradient-to-br from-[#5a3a27] to-[#322015] text-white",
  ];

  return classes[index % classes.length];
}

function getWebsiteLabel(website: string) {
  try {
    return new URL(
      website.startsWith("http") ? website : `https://${website}`
    ).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function getWebsiteUrl(website: string) {
  return website.startsWith("http") ? website : `https://${website}`;
}

const LAST_SEARCH_KEY = "baselead_last_search";

function parseRecommendations(value: unknown) {
  return recommendedServices(value);
}

function getRawDataObject(
  rawData: unknown
): Record<string, unknown> | null {
  return rawData &&
    typeof rawData === "object" &&
    !Array.isArray(rawData)
    ? (rawData as Record<string, unknown>)
    : null;
}

function findSocialUrl(
  lead: SearchResultLead,
  platform: "instagram" | "facebook"
) {
  const topLevel = (lead as Record<string, unknown>)[
    `${platform}_url`
  ];

  if (typeof topLevel === "string" && topLevel.trim()) {
    return topLevel;
  }

  const raw = getRawDataObject(lead.raw_data);

  if (!raw) return null;

  const keys =
    platform === "instagram"
      ? ["instagram", "instagram_url", "instagramUrl", "instagram_uri"]
      : ["facebook", "facebook_url", "facebookUrl", "facebook_uri"];

  for (const key of keys) {
    const value = raw[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getRecommendedServices(lead: SearchResultLead) {
  const existing = parseRecommendations(lead.ai_recommendations);

  if (existing.length) return existing;

  const raw = getRawDataObject(lead.raw_data);
  const values = raw?.recommended_services;

  return Array.isArray(values)
    ? values
        .filter((item): item is string => typeof item === "string")
        .slice(0, 4)
    : [];
}

function getEstimatedValue(lead: SearchResultLead) {
  const fromAi = recommendationValue(lead.ai_recommendations);

  if (fromAi) return fromAi;

  const raw = getRawDataObject(lead.raw_data);

  if (!raw) return null;

  for (const value of [
    raw.estimated_project_value,
    raw.estimatedProjectValue,
    raw.project_value,
    raw.projectValue,
  ]) {
    if (typeof value === "string" && value.trim()) return value;

    if (typeof value === "number") {
      return `$${value.toLocaleString()}`;
    }
  }

  return null;
}

function getOpportunityReasons(lead: SearchResultLead) {
  const aiReasons = recommendationReasons(lead.ai_recommendations);

  if (aiReasons.length) return aiReasons;

  const raw = getRawDataObject(lead.raw_data);

  if (Array.isArray(raw?.opportunity_reasons)) {
    const reasons = raw.opportunity_reasons
      .filter((item): item is string => typeof item === "string")
      .filter(Boolean)
      .slice(0, 6);

    if (reasons.length) return reasons;
  }

  if (lead.ai_reason) {
    return [
      lead.ai_reason,
      lead.website
        ? "Business website is available for review"
        : "No website detected",
      typeof lead.review_count === "number"
        ? `${lead.review_count.toLocaleString()} public reviews available`
        : "Public business information available",
    ];
  }

  const reasons: string[] = [];

  if (typeof lead.review_count === "number") {
    reasons.push(
      `Public presence with ${lead.review_count.toLocaleString()} reviews`
    );
  }

  if (
    findSocialUrl(lead, "instagram") ||
    findSocialUrl(lead, "facebook")
  ) {
    reasons.push("Active social presence detected");
  }

  reasons.push(
    lead.website
      ? "Business website is available for analysis"
      : "No business website detected"
  );

  reasons.push("Located in your target market");

  return reasons.slice(0, 6);
}

function isHighIntent(lead: SearchResultLead) {
  const score = getScore(lead);

  return (
    (score !== null && score >= 80) ||
    lead.ai_opportunity?.toLowerCase().includes("high") ||
    false
  );
}

function isContacted(lead: SearchResultLead) {
  return [
    "contacted",
    "responded",
    "meeting",
    "qualified",
    "proposal",
    "negotiation",
    "won",
  ].includes(lead.status?.toLowerCase() || "");
}

function isResponded(lead: SearchResultLead) {
  return [
    "responded",
    "meeting",
    "qualified",
    "proposal",
    "negotiation",
    "won",
  ].includes(lead.status?.toLowerCase() || "");
}

function isClient(lead: SearchResultLead) {
  return ["client", "won"].includes(lead.status?.toLowerCase() || "");
}

function InputBox({
  icon,
  label,
  placeholder,
  value,
  onChange,
  accent = "yellow",
}: {
  icon: ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  accent?: "yellow" | "purple" | "blue";
}) {
  const accentClasses = {
    yellow: "text-[#FFD000] bg-[#FFD000]/10",
    purple: "text-violet-400 bg-violet-400/10",
    blue: "text-sky-400 bg-sky-400/10",
  };

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentClasses[accent]}`}
        >
          {icon}
        </span>
        {label}
      </label>

      <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#070707] px-4 py-4 transition-all duration-200 focus-within:border-[#FFD000]/40 focus-within:bg-[#0a0a0a] focus-within:shadow-[0_0_35px_rgba(255,208,0,0.05)]">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SelectBox({
  label,
  value,
  options,
  icon,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  icon?: ReactNode;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">{label}</label>

      <div className="relative">
        <select
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-2xl border border-white/10 bg-[#070707] px-4 py-4 pr-10 text-sm text-gray-300 outline-none transition focus:border-[#FFD000]/40 disabled:cursor-not-allowed disabled:opacity-60 ${
            icon ? "pl-11" : ""
          }`}
        >
          {options.map((option) => (
            <option
              key={option.value || option.label}
              value={option.value}
              className="bg-[#090909] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
            {icon}
          </span>
        )}

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
        />
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
  icon,
  accent,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  icon: ReactNode;
  accent: "yellow" | "purple" | "blue" | "green";
}) {
  const iconClasses = {
    yellow: "bg-[#FFD000]/10 text-[#FFD000]",
    purple: "bg-violet-400/10 text-violet-400",
    blue: "bg-sky-400/10 text-sky-400",
    green: "bg-emerald-400/10 text-emerald-400",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all ${
        enabled
          ? "border-white/10 bg-[#080808]"
          : "border-white/5 bg-[#070707] opacity-70"
      }`}
    >
      <div
        className={`absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl transition-opacity ${
          enabled ? "opacity-20" : "opacity-0"
        } ${accent === "yellow" ? "bg-[#FFD000]" : accent === "purple" ? "bg-violet-500" : accent === "blue" ? "bg-sky-500" : "bg-emerald-500"}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClasses[accent]}`}
          >
            {icon}
          </span>

          <div className="min-w-0">
            <div className="text-sm font-medium">{title}</div>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            enabled ? "bg-[#FFD000]" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function PreviewItem({
  children,
  color = "green",
}: {
  children: ReactNode;
  color?: "green" | "yellow" | "purple";
}) {
  const colors = {
    green: "bg-emerald-400/10 text-emerald-400",
    yellow: "bg-[#FFD000]/10 text-[#FFD000]",
    purple: "bg-violet-400/10 text-violet-400",
  };

  return (
    <div className="flex items-center gap-3 text-sm text-gray-400">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}
      >
        <Check size={12} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[#FFD000]">✦</span>
      <span>{text}</span>
    </div>
  );
}

function InstagramIcon() {
  return (
    <span className="text-pink-500">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    </span>
  );
}

function FacebookIcon() {
  return (
    <span className="text-blue-500">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1Z" />
      </svg>
    </span>
  );
}

function SearchLeadCard({
  lead,
  index,
  selected,
  onSelect,
  onAddToPipeline,
  onGenerateOutreach,
}: {
  lead: SearchResultLead;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onAddToPipeline: (lead: SearchResultLead) => void;
  onGenerateOutreach: (lead: SearchResultLead) => void;
}) {
  const score = getScore(lead);
  const services = getRecommendedServices(lead);
  const instagram = findSocialUrl(lead, "instagram");
  const facebook = findSocialUrl(lead, "facebook");
  const estimatedValue = getEstimatedValue(lead);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl border bg-[#080808] p-4 text-left transition md:p-5 ${
        selected
          ? "border-[#FFD000]/60 bg-[#0b0b08] shadow-[0_0_30px_rgba(255,208,0,0.05)]"
          : "border-white/10 hover:border-white/20 hover:bg-[#0a0a0a]"
      }`}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(250px,1.15fr)_150px_minmax(220px,1fr)_92px] xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold ${getAvatarClass(index)}`}
            >
              {getInitials(lead.company || lead.name || "Lead")}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[17px] font-semibold text-white">
                  {lead.company || "Unknown Company"}
                </h3>
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
              </div>

              <p className="mt-1 truncate text-sm text-gray-500">
                {lead.industry || lead.category || "Business"}{" "}
                <span className="text-gray-700">•</span> {getLocation(lead)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {lead.website ? (
                  <span className="max-w-[180px] truncate text-sm text-sky-400">
                    {getWebsiteLabel(lead.website)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-600">No website</span>
                )}

                {instagram && (
                  <span title="Instagram detected">
                    <InstagramIcon />
                  </span>
                )}

                {facebook && (
                  <span title="Facebook detected">
                    <FacebookIcon />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="flex items-end gap-1">
            <span
              className={`text-3xl font-semibold leading-none ${getScoreClass(lead)}`}
            >
              {score ?? "—"}
            </span>

            {score !== null && (
              <span className="mb-0.5 text-sm text-gray-600">/100</span>
            )}
          </div>

          <div
            className={`mt-2 text-xs font-medium ${
              score === null
                ? "text-gray-600"
                : score >= 80
                  ? "text-lime-400"
                  : score >= 60
                    ? "text-[#FFD000]"
                    : "text-gray-500"
            }`}
          >
            {getOpportunityLabel(lead)}
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="text-xs text-gray-500">Recommended Services</div>

          {services.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((service) => (
                <span
                  key={service}
                  className="rounded-lg bg-[#FFD000] px-3 py-1.5 text-[11px] font-semibold text-black"
                >
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-700">
              AI recommendations pending
            </div>
          )}

          <div className="mt-3 text-xs text-gray-600">
            Est. Value{" "}
            <span className="text-gray-300">
              {estimatedValue || "Not estimated"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-start gap-2 border-t border-white/5 pt-4 xl:border-t-0 xl:pt-0">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
              selected
                ? "border-[#FFD000]/40 text-[#FFD000]"
                : "border-white/10 text-gray-500 group-hover:border-white/20 group-hover:text-white"
            }`}
            title="View details"
          >
            <Search size={17} />
          </span>

          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-gray-500 transition group-hover:border-white/20 group-hover:text-white"
            title="More options"
          >
            <MoreHorizontal size={17} />
          </span>
        </div>
      </div>

      {selected && (
        <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row">
          <span
            role="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddToPipeline(lead);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#FFD000] px-4 py-2.5 text-xs font-semibold text-black"
          >
            <UserPlus size={14} />
            Add to Pipeline
          </span>

          <span
            role="button"
            onClick={(event) => {
              event.stopPropagation();
              onGenerateOutreach(lead);
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5"
          >
            <Mail size={14} />
            Generate Outreach
          </span>
        </div>
      )}
    </button>
  );
}

function LeadDetailPanel({
  lead,
  onClose,
  onAddToPipeline,
  onGenerateOutreach,
}: {
  lead: SearchResultLead;
  onClose: () => void;
  onAddToPipeline: (lead: SearchResultLead) => void;
  onGenerateOutreach: (lead: SearchResultLead) => void;
}) {
  const score = getScore(lead);
  const services = getRecommendedServices(lead);
  const reasons = getOpportunityReasons(lead);
  const instagram = findSocialUrl(lead, "instagram");
  const facebook = findSocialUrl(lead, "facebook");
  const estimatedValue = getEstimatedValue(lead);

  return (
    <aside className="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto rounded-3xl border border-white/10 bg-[#070707] shadow-2xl">
      <div className="relative overflow-hidden border-b border-white/10 p-5">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute right-20 top-10 h-24 w-24 rounded-full bg-[#FFD000]/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#252525] to-[#111827] text-xs font-semibold text-white">
              {getInitials(lead.company || lead.name || "Lead")}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-semibold">
                  {lead.company || "Unknown Company"}
                </h2>
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              </div>

              <p className="mt-1 text-sm text-gray-500">
                {lead.industry || lead.category || "Business"}{" "}
                <span className="text-gray-700">•</span> {getLocation(lead)}
              </p>

              {lead.website && (
                <a
                  href={getWebsiteUrl(lead.website)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block truncate text-sm text-sky-400 hover:underline"
                >
                  {getWebsiteLabel(lead.website)}
                </a>
              )}

              <div className="mt-3 flex items-center gap-3">
                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <InstagramIcon />
                  </a>
                )}

                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FacebookIcon />
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="relative overflow-hidden rounded-3xl border border-[#FFD000]/10 bg-gradient-to-br from-[#11110a] via-[#090909] to-[#0b0814] p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFD000]/10 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                Opportunity Score
                <span className="text-gray-700">?</span>
              </div>

              <div className="mt-4 flex items-end gap-1">
                <span
                  className={`text-4xl font-semibold ${
                    score !== null && score >= 80
                      ? "text-lime-400"
                      : score !== null && score >= 60
                        ? "text-[#FFD000]"
                        : "text-gray-500"
                  }`}
                >
                  {score ?? "—"}
                </span>

                {score !== null && (
                  <span className="mb-1 text-sm text-gray-600">
                    /100
                  </span>
                )}
              </div>

              <span
                className={`mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs font-medium ${getOpportunityClass(
                  lead
                )}`}
              >
                {getOpportunityLabel(lead)}
              </span>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-[8px] border-white/5 bg-black/20">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${
                  score !== null && score >= 80
                    ? "border-lime-400"
                    : score !== null && score >= 60
                      ? "border-[#FFD000]"
                      : "border-gray-600"
                }`}
              >
                <Target size={24} className="text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7">
          <h3 className="text-base font-medium">
            Why this is a great opportunity
          </h3>

          <div className="mt-4 space-y-4">
            {reasons.map((reason, index) => (
              <div
                key={`${reason}-${index}`}
                className="flex gap-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                  <Check size={12} />
                </span>

                <span className="text-sm leading-5 text-gray-400">
                  {reason}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 border-t border-white/10 pt-6">
          <h3 className="text-base font-medium">
            Recommended Services
          </h3>

          {services.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {services.map((service) => (
                <span
                  key={service}
                  className="rounded-lg bg-[#FFD000] px-3 py-2 text-xs font-semibold text-black"
                >
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">
              AI recommendations are not available yet.
            </p>
          )}

          <p className="mt-4 text-sm leading-6 text-gray-500">
            {lead.ai_reason ||
              lead.notes ||
              "AI analysis will become available once this lead has been analyzed."}
          </p>

          {estimatedValue && (
            <div className="mt-4 text-sm text-gray-500">
              Estimated project value{" "}
              <span className="font-medium text-gray-300">
                {estimatedValue}
              </span>
            </div>
          )}
        </div>

        <div className="mt-7 border-t border-white/10 pt-6">
          <h3 className="text-base font-medium">
            Business Information
          </h3>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Industry</span>
              <span className="text-right text-gray-300">
                {lead.industry ||
                  lead.category ||
                  "Not available"}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Location</span>
              <span className="text-right text-gray-300">
                {getLocation(lead)}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Rating</span>
              <span className="flex items-center gap-1 text-gray-300">
                {typeof lead.rating === "number" ? (
                  <>
                    <Star
                      size={14}
                      className="fill-[#FFD000] text-[#FFD000]"
                    />
                    {lead.rating.toFixed(1)}
                  </>
                ) : (
                  "Not available"
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Reviews</span>
              <span className="text-right text-gray-300">
                {typeof lead.review_count === "number"
                  ? lead.review_count.toLocaleString()
                  : "Not available"}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">Status</span>
              <span className="capitalize text-right text-gray-300">
                {lead.status || "new"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 border-t border-white/10 pt-6">
          <h3 className="text-base font-medium">Contact</h3>

          <div className="mt-4 space-y-3">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white"
              >
                <Mail size={15} />
                {lead.email}
              </a>
            )}

            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white"
              >
                <span className="text-gray-500">☎</span>
                {lead.phone}
              </a>
            )}

            {!lead.email && !lead.phone && (
              <p className="text-sm text-gray-600">
                No contact information available yet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 space-y-2">
          <button
            type="button"
            onClick={() => onAddToPipeline(lead)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD000] py-3.5 text-sm font-semibold text-black transition hover:bg-[#ffe044]"
          >
            <UserPlus size={16} />
            Add to Pipeline
          </button>

          <button
            type="button"
            onClick={() => onGenerateOutreach(lead)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm text-gray-300 hover:bg-white/5"
          >
            <Mail size={16} />
            Generate Outreach
          </button>

          {lead.website && (
            <a
              href={getWebsiteUrl(lead.website)}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <ExternalLink size={16} />
              View Website
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}

function SearchResultsView({
  results,
  total,
  selectedLeadId,
  setSelectedLeadId,
  onCloseResults,
  onBackToSearch,
  searchSummary,
  onAddToPipeline,
  onGenerateOutreach,
}: {
  results: SearchResultLead[];
  total: number;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  onCloseResults: () => void;
  onBackToSearch: () => void;
  searchSummary: string;
  onAddToPipeline: (lead: SearchResultLead) => void;
  onGenerateOutreach: (lead: SearchResultLead) => void;
}) {
  const [activeResultTab, setActiveResultTab] =
    useState<ResultTab>("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [showFilters, setShowFilters] = useState(false);
  const [industryFilter, setIndustryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const selectedLead = useMemo(
    () =>
      selectedLeadId
        ? results.find((lead) => lead.id === selectedLeadId) || null
        : null,
    [results, selectedLeadId]
  );

  const counts = useMemo(
    () => ({
      all: results.length,
      highIntent: results.filter(isHighIntent).length,
      contacted: results.filter(isContacted).length,
      responded: results.filter(isResponded).length,
      client: results.filter(isClient).length,
    }),
    [results]
  );

  const filteredResults = useMemo(() => {
    let current = [...results];

    if (activeResultTab === "highIntent") {
      current = current.filter(isHighIntent);
    }

    if (activeResultTab === "contacted") {
      current = current.filter(isContacted);
    }

    if (activeResultTab === "responded") {
      current = current.filter(isResponded);
    }

    if (activeResultTab === "client") {
      current = current.filter(isClient);
    }

    if (query.trim()) {
      const search = query.trim().toLowerCase();

      current = current.filter(
        (lead) =>
          lead.company?.toLowerCase().includes(search) ||
          lead.name?.toLowerCase().includes(search) ||
          lead.website?.toLowerCase().includes(search) ||
          lead.industry?.toLowerCase().includes(search) ||
          getLocation(lead).toLowerCase().includes(search)
      );
    }

    if (industryFilter) {
      current = current.filter(
        (lead) =>
          (lead.industry || lead.category || "").toLowerCase() ===
          industryFilter.toLowerCase()
      );
    }

    if (locationFilter) {
      current = current.filter((lead) =>
        getLocation(lead)
          .toLowerCase()
          .includes(locationFilter.toLowerCase())
      );
    }

    current.sort((a, b) =>
      sortBy === "score"
        ? (getScore(b) ?? -1) - (getScore(a) ?? -1)
        : sortBy === "reviews"
          ? (b.review_count ?? -1) - (a.review_count ?? -1)
          : (a.company || "").localeCompare(b.company || "")
    );

    return current;
  }, [
    activeResultTab,
    industryFilter,
    locationFilter,
    query,
    results,
    sortBy,
  ]);

  const resultTabs: {
    value: ResultTab;
    label: string;
    count: number;
    emoji: string;
    color: string;
  }[] = [
    { value: "all", label: "All Leads", count: counts.all, emoji: "📋", color: "#F5C518" },
    { value: "highIntent", label: "High-Intent", count: counts.highIntent, emoji: "🔥", color: "#F97316" },
    { value: "contacted", label: "Contacted", count: counts.contacted, emoji: "📨", color: "#60A5FA" },
    { value: "responded", label: "Responded", count: counts.responded, emoji: "💬", color: "#A78BFA" },
    { value: "client", label: "Client", count: counts.client, emoji: "🤝", color: "#84CC16" },
  ];

  useEffect(() => {
    if (
      selectedLeadId &&
      filteredResults.some((lead) => lead.id === selectedLeadId)
    ) {
      return;
    }

    setSelectedLeadId(
      filteredResults.length ? filteredResults[0].id : null
    );
  }, [filteredResults, selectedLeadId, setSelectedLeadId]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#070707] px-5 py-3 lg:px-9">
        <button
          type="button"
          onClick={onBackToSearch}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0D0D0D] px-3.5 py-2 text-sm text-gray-300 transition hover:border-[#FFD000]/40 hover:text-[#FFD000]"
        >
          <ArrowLeft size={16} />
          Back to search
        </button>

        {searchSummary && (
          <p className="min-w-0 truncate text-sm text-gray-500">
            {searchSummary}
          </p>
        )}
      </div>

      <div className="relative overflow-hidden border-b border-white/10 bg-[#060606]">
        <div className="pointer-events-none absolute left-1/4 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-0 h-48 w-48 rounded-full bg-[#FFD000]/10 blur-3xl" />

        <div className="relative flex overflow-x-auto px-5 lg:px-9">
          {resultTabs.map((tab) => {
            const active = activeResultTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveResultTab(tab.value)}
                data-active={active}
                style={{ "--tab": tab.color } as CSSProperties}
                className={`bl-tab relative mr-3 my-2 flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active ? "text-white" : "text-gray-500"
                }`}
              >
                <span className="bl-tab-emoji" aria-hidden>{tab.emoji}</span>
                {tab.label}

                <span className="bl-tab-count rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-600">
                  {tab.count}
                </span>

                {active && (
                  <span className="absolute -bottom-2 left-3 right-3 h-0.5 rounded-full" style={{ background: tab.color, boxShadow: `0 0 12px ${tab.color}` }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative px-5 pb-5 pt-6 lg:px-9">
        <div className="absolute right-10 top-0 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#FFD000]">
                  <Radar size={13} />
                  AI Discovery
                </p>

                <h1 className="text-2xl font-semibold">
                  {filteredResults.length} leads found
                </h1>
              </div>

              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                Search complete
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              AI-discovered businesses matching your search criteria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCloseResults}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-gray-300 hover:bg-white/5"
            >
              <Plus size={17} />
              New Search
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
                showFilters
                  ? "border-[#FFD000]/40 bg-[#FFD000]/10 text-[#FFD000]"
                  : "border-white/10 bg-[#090909] text-gray-300 hover:bg-white/5"
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#090909] px-4 py-3 text-sm">
              <span className="text-gray-600">Sort:</span>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-gray-300 outline-none"
              >
                <option value="score" className="bg-[#090909]">
                  Opportunity
                </option>
                <option value="reviews" className="bg-[#090909]">
                  Reviews
                </option>
                <option value="name" className="bg-[#090909]">
                  Company
                </option>
              </select>

              <ChevronDown size={15} className="text-gray-600" />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-[#090909] p-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#070707] px-4 py-3">
              <Search size={16} className="text-gray-600" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search within results..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
              />
            </div>

            <select
              value={industryFilter}
              onChange={(event) =>
                setIndustryFilter(event.target.value)
              }
              className="rounded-xl border border-white/10 bg-[#070707] px-4 py-3 text-sm text-gray-300 outline-none"
            >
              <option value="" className="bg-[#090909]">
                All industries
              </option>

              {Array.from(
                new Set(
                  results
                    .map((lead) => lead.industry || lead.category)
                    .filter(Boolean)
                )
              ).map((value) => (
                <option
                  key={value}
                  value={value as string}
                  className="bg-[#090909]"
                >
                  {value}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#070707] px-4 py-3">
              <MapPin size={16} className="text-gray-600" />

              <input
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(event.target.value)
                }
                placeholder="Filter by location..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-20 lg:px-9">
        {filteredResults.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#090909] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
              <Search size={28} />
            </div>

            <h2 className="mt-5 text-lg font-medium">
              No leads match this view
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Try another tab or remove some filters.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-5 ${
              selectedLead
                ? "xl:grid-cols-[minmax(0,1fr)_420px]"
                : ""
            }`}
          >
            <div className="min-w-0 space-y-3">
              {filteredResults.map((lead, index) => (
                <SearchLeadCard
                  key={lead.id}
                  lead={lead}
                  index={index}
                  selected={selectedLeadId === lead.id}
                  onSelect={() => setSelectedLeadId(lead.id)}
                  onAddToPipeline={onAddToPipeline}
                  onGenerateOutreach={onGenerateOutreach}
                />
              ))}

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#080808] px-5 py-4">
                <Search size={18} className="text-gray-600" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search within your discovered leads..."
                  className="w-full bg-transparent text-sm text-gray-400 outline-none placeholder:text-gray-700"
                />
              </div>
            </div>

            {selectedLead && (
              <LeadDetailPanel
                lead={selectedLead}
                onClose={() => setSelectedLeadId(null)}
                onAddToPipeline={onAddToPipeline}
                onGenerateOutreach={onGenerateOutreach}
              />
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-10 text-center lg:px-9">
        <p className="text-xs text-gray-700">
          BaseLead uses available public business information to evaluate
          opportunities.
        </p>
      </div>
    </div>
  );
}

export default function NewSearchPage() {
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("advanced");
  const [activeTab, setActiveTab] =
    useState<ActiveTab>("builder");

  const [leads, setLeads] = useState("50");
  const [offer, setOffer] = useState("");
  const [idealClient, setIdealClient] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [revenue, setRevenue] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("25 miles");
  const [buyingIntent, setBuyingIntent] = useState("");

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [prompt, setPrompt] = useState("");

  const [savedSearches, setSavedSearches] = useState<
    SavedSearch[]
  >([]);

  const [saveMessage, setSaveMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchResults, setSearchResults] = useState<
    SearchResultLead[]
  >([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<
    string | null
  >(null);

  const [targetLocations, setTargetLocations] = useState<string[]>(
    []
  );

  const [targetLocationsLoading, setTargetLocationsLoading] =
    useState(true);

  const [companyLoadMessage, setCompanyLoadMessage] = useState("");

  const [toggles, setToggles] = useState({
    scoring: true,
    intent: true,
    enrichment: true,
    excludeExisting: true,
  });

  // Restore the last search (form + results) after a page reload.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(LAST_SEARCH_KEY);
      if (!saved) return;

      const data = JSON.parse(saved);

      if (Array.isArray(data.results) && data.results.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchResults(data.results);
        setSearchTotal(data.total ?? data.results.length);
      }

      if (data.form) {
        setOffer(data.form.offer ?? "");
        setIdealClient(data.form.idealClient ?? "");
        setLocation(data.form.location ?? "");
        setCompanySize(data.form.companySize ?? "");
        setRevenue(data.form.revenue ?? "");
        setBuyingIntent(data.form.buyingIntent ?? "");
        setTags(Array.isArray(data.form.tags) ? data.form.tags : []);
        setLeads(data.form.leads ?? "20");
      }
    } catch {
      // ignore
    }
  }, []);

  // Browser Back/Forward between the form and the results.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      setSearchComplete(Boolean(event.state?.baseleadResults));
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const targetLocationOptions = useMemo<SelectOption[]>(() => {
    if (targetLocations.length === 0) {
      return [
        {
          label: targetLocationsLoading
            ? "Loading target locations..."
            : "No target locations configured",
          value: "",
        },
      ];
    }

    return targetLocations.map((item) => ({
      label: item,
      value: item,
    }));
  }, [targetLocations, targetLocationsLoading]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        "baselead_saved_searches"
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setSavedSearches(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTargetLocations() {
      setTargetLocationsLoading(true);
      setCompanyLoadMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (mounted) {
          setTargetLocationsLoading(false);
          setCompanyLoadMessage(
            "Please sign in to use your saved Target Locations."
          );
        }

        return;
      }

      let companyId: string | null = null;

      const {
        data: ownedCompany,
        error: ownerError,
      } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerError) {
        console.error("Company lookup error:", ownerError);
      }

      companyId = ownedCompany?.id
        ? String(ownedCompany.id)
        : null;

      if (!companyId) {
        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("team_members")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          console.error(
            "Membership lookup error:",
            membershipError
          );
        }

        companyId = membership?.company_id
          ? String(membership.company_id)
          : null;
      }

      if (!companyId) {
        if (mounted) {
          setTargetLocations([]);
          setTargetLocationsLoading(false);
          setCompanyLoadMessage(
            "No company is associated with your account yet."
          );
        }

        return;
      }

      const {
        data: companyData,
        error: companyError,
      } = await supabase
        .from("company_profiles")
        .select("target_locations")
        .eq("id", companyId)
        .maybeSingle();

      if (companyError) {
        console.error(
          "Target locations load error:",
          companyError
        );

        if (mounted) {
          setTargetLocations([]);
          setTargetLocationsLoading(false);
          setCompanyLoadMessage(
            "Unable to load your Target Locations."
          );
        }

        return;
      }

      const normalized = normalizeTargetLocations(
        companyData?.target_locations
      );

      if (mounted) {
        setTargetLocations(normalized);
        setTargetLocationsLoading(false);

        if (normalized.length > 0) {
          setLocation((current) =>
            normalized.includes(current)
              ? current
              : normalized[0]
          );
        } else {
          setLocation("");
        }
      }
    }

    loadTargetLocations();

    return () => {
      mounted = false;
    };
  }, []);

  function handleSaveSearch() {
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name:
        idealClient.trim() ||
        offer.trim() ||
        "Untitled Search",
      offer: offer.trim() || "Not specified",
      client: idealClient.trim() || "Not specified",
      location: location || "Any location",
      leads: leads || "50",
    };

    const updated = [newSearch, ...savedSearches];

    setSavedSearches(updated);

    try {
      window.localStorage.setItem(
        "baselead_saved_searches",
        JSON.stringify(updated)
      );
    } catch {}

    setSaveMessage("Search saved");

    window.setTimeout(() => setSaveMessage(""), 2500);
  }

  function handleAddTag() {
    const value = tagInput.trim();

    if (!value) return;

    if (
      tags.some(
        (tag) => tag.toLowerCase() === value.toLowerCase()
      )
    ) {
      setTagInput("");
      return;
    }

    setTags((current) => [...current, value]);
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setTags((current) =>
      current.filter((item) => item !== tag)
    );
  }

  async function handleSearch() {
    if (isSearching) return;

    if (!offer.trim()) {
      setSearchMessage("Please enter what you offer.");
      return;
    }

    if (!idealClient.trim()) {
      setSearchMessage("Please enter your ideal client.");
      return;
    }

    if (!location.trim()) {
      setSearchMessage(
        targetLocations.length
          ? "Please select a Target Location."
          : "Add at least one Target Location in Settings → Company before searching."
      );

      return;
    }

    const requestedLeads = Math.min(
      60,
      Math.max(1, Number(leads) || 20)
    );

    setLeads(String(requestedLeads));
    setIsSearching(true);
    setSearchComplete(false);
    setSearchMessage("");
    setSearchResults([]);
    setSearchTotal(0);
    setSelectedLeadId(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer: offer.trim(),
          idealClient: idealClient.trim(),
          leads: requestedLeads,
          companySize: companySize || undefined,
          revenue: revenue || undefined,
          location: location.trim(),
          radius: radius || undefined,
          buyingIntent: buyingIntent || undefined,
          tags,
          scoring: toggles.scoring,
          intent: toggles.intent,
          enrichment: toggles.enrichment,
          excludeExisting: toggles.excludeExisting,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
  if (
    response.status === 402 ||
    data.code === "TRIAL_EXPIRED" ||
    data.code === "LEAD_LIMIT_REACHED" ||
    data.code === "SUBSCRIPTION_REQUIRED"
  ) {
    window.location.href =
      "/settings?section=billing";

    return;
  }

  throw new Error(
    data.error || "The search could not be completed."
  );
}

      const returnedLeads: SearchResultLead[] = Array.isArray(
        data.leads
      )
        ? data.leads
        : [];

      const total =
        typeof data.totalFound === "number"
          ? data.totalFound
          : returnedLeads.length;

      setSearchResults(returnedLeads);
      setSearchTotal(total);
      setSearchComplete(true);

      // Lets the browser's Back button return to the form.
      window.history.pushState(
        { ...window.history.state, baseleadResults: true },
        ""
      );
      window.scrollTo({ top: 0 });

      // Remember the last search for this browser tab.
      try {
        window.sessionStorage.setItem(
          LAST_SEARCH_KEY,
          JSON.stringify({
            results: returnedLeads,
            total,
            form: {
              offer,
              idealClient,
              location,
              companySize,
              revenue,
              buyingIntent,
              tags,
              leads: String(requestedLeads),
            },
          })
        );
      } catch {
        // Storage full or unavailable: ignore.
      }

      setSearchMessage(
        data.demo
          ? `Demo mode: showing ${total} sample businesses. Add a Google Places API key to search real businesses.`
          : `Search completed successfully with ${total} matching businesses.`
      );

      if (returnedLeads.length) {
        setSelectedLeadId(returnedLeads[0].id);
      }
    } catch (error) {
      console.error("BaseLead search error:", error);

      setSearchComplete(false);
      setSearchResults([]);
      setSearchTotal(0);

      setSearchMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while processing the search."
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handleGeneratePrompt() {
    const generated = [
      `Find up to ${leads || "50"} ${
        idealClient || "businesses"
      }`,
      offer ? `that may benefit from ${offer}` : "",
      idealClient
        ? `matching the ideal client profile of ${idealClient}`
        : "",
      location ? `located in ${location}` : "",
      radius ? `within ${radius}` : "",
      companySize ? `with ${companySize}` : "",
      revenue ? `with annual revenue around ${revenue}` : "",
      buyingIntent
        ? `prioritizing ${buyingIntent.toLowerCase()} businesses`
        : "",
      tags.length ? `matching ${tags.join(", ")}` : "",
      "Use available public business information, identify available contact information, evaluate fit, and rank the strongest opportunities.",
    ]
      .filter(Boolean)
      .join(" ");

    setPrompt(generated);
  }

  function handleGenerateOutreach(lead: SearchResultLead) {
    router.push(
      `/outreach?lead=${encodeURIComponent(lead.id)}`
    );
  }

  async function handleAddToPipeline(lead: SearchResultLead) {
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "new",
        }),
      });

      if (!response.ok) {
        throw new Error("Pipeline action failed.");
      }

      setSearchMessage(
        `${lead.company || "This lead"} is ready in your pipeline.`
      );
    } catch (error) {
      console.error("Pipeline error:", error);

      setSearchMessage(
        "The lead was found, but the pipeline action could not be completed."
      );
    }
  }


  // Back to the form with the same criteria; results are kept.
  function backToSearch() {
    setSearchComplete(false);
    setActiveTab("builder");
    window.scrollTo({ top: 0 });

    if (window.history.state?.baseleadResults) {
      window.history.back();
    }
  }

  function showLastResults() {
    if (!searchResults.length) return;

    setSearchComplete(true);
    window.history.pushState(
      { ...window.history.state, baseleadResults: true },
      ""
    );
    window.scrollTo({ top: 0 });
  }

  // "New Search": clear the form and the previous results.
  function startNewSearch() {
    setSearchComplete(false);
    setSearchMessage("");
    setSelectedLeadId(null);
    setSearchResults([]);
    setSearchTotal(0);
    setOffer("");
    setIdealClient("");
    setCompanySize("");
    setRevenue("");
    setBuyingIntent("");
    setTags([]);
    setPrompt("");
    setActiveTab("builder");

    try {
      window.sessionStorage.removeItem(LAST_SEARCH_KEY);
    } catch {
      // ignore
    }

    window.scrollTo({ top: 0 });
  }

  if (searchComplete) {
    return (
      <SearchResultsView
        results={searchResults}
        total={searchTotal}
        selectedLeadId={selectedLeadId}
        setSelectedLeadId={setSelectedLeadId}
        onCloseResults={startNewSearch}
        onBackToSearch={backToSearch}
        searchSummary={[
          idealClient,
          offer && `for ${offer}`,
          location && `in ${location}`,
        ]
          .filter(Boolean)
          .join(" ")}
        onAddToPipeline={handleAddToPipeline}
        onGenerateOutreach={handleGenerateOutreach}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white">


      <section className="min-w-0">
        <div className="relative overflow-hidden border-b border-white/10 bg-[#070707] px-5 pb-0 pt-6 lg:px-9 lg:pt-8">
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 top-0 h-64 w-64 rounded-full bg-[#FFD000]/5 blur-3xl" />
          <div className="pointer-events-none absolute left-1/4 top-20 h-48 w-48 rounded-full bg-sky-500/5 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FFD000]/15 bg-[#FFD000]/5 px-3 py-1.5 text-xs font-medium text-[#FFD000]">
                <Sparkles size={13} />
                AI Lead Discovery
                <span className="rounded bg-[#FFD000]/15 px-1.5 py-0.5 text-[9px] font-bold">
                  BETA
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight lg:text-[38px]">
                Find your next{" "}
                <span className="bg-gradient-to-r from-[#FFD000] via-[#ffe86b] to-violet-400 bg-clip-text text-transparent">
                  best client.
                </span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 lg:text-base">
                Tell BaseLead who you want to reach. AI finds,
                qualifies and organizes the businesses most
                relevant to your offer.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className="flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/5"
            >
              <History size={17} />
              Search History
            </button>
          </div>

          <div className="relative mt-8 flex gap-8 overflow-x-auto">
            {(
              [
                ["builder", "Search Builder", Search],
                ["prompt", "AI Prompt Builder", WandSparkles],
                ["saved", "Saved Searches", History],
              ] as const
            ).map(([value, label, Icon]) => {
              const active = activeTab === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`relative flex shrink-0 items-center gap-2 pb-4 text-sm font-medium transition ${
                    active
                      ? "text-white"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  <Icon
                    size={15}
                    className={
                      active ? "text-[#FFD000]" : ""
                    }
                  />

                  {label}

                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD000] shadow-[0_0_12px_rgba(255,208,0,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "prompt" && (
          <div className="px-5 pb-10 pt-6 lg:px-9">
            <div className="relative max-w-5xl overflow-hidden rounded-3xl border border-violet-400/25 bg-white p-5 text-gray-900 shadow-[0_0_45px_rgba(139,92,246,0.16),0_0_90px_rgba(139,92,246,0.07)] dark:bg-black dark:text-white dark:shadow-[0_0_45px_rgba(139,92,246,0.2),0_0_90px_rgba(139,92,246,0.1)] lg:p-7">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/20" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                    <WandSparkles size={20} />
                  </span>

                  <div>
                    <h2 className="text-xl font-medium">
                      AI Prompt Builder
                    </h2>

                    <p className="text-sm text-gray-500">
                      Turn your idea into a structured lead
                      discovery query.
                    </p>
                  </div>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) =>
                    setPrompt(e.target.value)
                  }
                  className="mt-6 h-48 w-full resize-none rounded-2xl border border-white/10 bg-[#070707]/90 p-5 text-sm leading-6 text-white outline-none placeholder:text-gray-700 focus:border-violet-400/40"
                  placeholder="Describe your ideal client, target location, service and what makes a lead valuable..."
                />

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleGeneratePrompt}
                    className="flex items-center gap-2 rounded-xl bg-[#FFD000] px-5 py-3.5 font-semibold text-black transition hover:bg-[#ffe044]"
                  >
                    <Sparkles size={17} />
                    Generate Prompt
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="rounded-xl border border-white/10 px-5 py-3.5 text-sm text-gray-400 hover:bg-white/5"
                  >
                    Clear
                  </button>
                </div>

                {prompt && (
                  <div className="mt-5 rounded-2xl border border-[#FFD000]/20 bg-[#FFD000]/5 p-5">
                    <p className="text-xs uppercase tracking-wide text-[#FFD000]">
                      Generated Search Prompt
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      {prompt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "saved" && (
          <div className="px-5 pb-10 pt-6 lg:px-9">
            <div className="rounded-3xl border border-white/10 bg-[#090909] p-5 lg:p-6">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                      <History size={17} />
                    </span>

                    <h2 className="text-xl font-medium">
                      Saved Searches
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Searches you have saved for later.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("builder")}
                  className="flex h-fit items-center gap-2 rounded-xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black"
                >
                  <Plus size={16} />
                  New Search
                </button>
              </div>

              {savedSearches.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-400">
                    <Save size={25} />
                  </div>

                  <p className="mt-4 text-sm text-gray-400">
                    No saved searches yet.
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    Your frequently used searches can live here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {savedSearches.map((search) => (
                    <div
                      key={search.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#070707] p-4 transition hover:border-white/20"
                    >
                      <div>
                        <p className="font-medium">
                          {search.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {search.client} · {search.location} ·{" "}
                          {search.leads} leads
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOffer(
                            search.offer === "Not specified"
                              ? ""
                              : search.offer
                          );

                          setIdealClient(
                            search.client === "Not specified"
                              ? ""
                              : search.client
                          );

                          setLocation(
                            search.location === "Any location"
                              ? ""
                              : search.location
                          );

                          setLeads(search.leads);
                          setActiveTab("builder");
                        }}
                        className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 hover:bg-white/5"
                      >
                        Load Search
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "builder" && searchResults.length > 0 && (
          <div className="px-5 pt-6 lg:px-9">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#FFD000]/20 bg-[#FFD000]/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-300">
                Your last search found{" "}
                <span className="font-semibold text-white">
                  {searchTotal || searchResults.length}
                </span>{" "}
                businesses. Edit the criteria below and search again, or go
                back to those results.
              </p>

              <button
                type="button"
                onClick={showLastResults}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFD000] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffe044]"
              >
                View results
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === "builder" && (
          <div className="grid gap-5 px-5 pb-24 pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-9 lg:pb-10">
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#090909] p-5 lg:p-7">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#FFD000]/5 blur-3xl" />
                <div className="absolute right-32 top-0 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl" />

                <div className="relative">
                  <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD000]/10 text-[#FFD000]">
                          <Crosshair size={20} />
                        </span>

                        <div>
                          <h2 className="text-xl font-medium">
                            Define your ideal client
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            Give AI the context it needs to find
                            better opportunities.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex rounded-xl border border-white/10 bg-[#080808] p-1">
                      <button
                        type="button"
                        onClick={() => setMode("simple")}
                        className={`rounded-lg px-5 py-2 text-sm transition ${
                          mode === "simple"
                            ? "bg-white/10 text-white"
                            : "text-gray-500"
                        }`}
                      >
                        Simple
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode("advanced")}
                        className={`rounded-lg px-5 py-2 text-sm transition ${
                          mode === "advanced"
                            ? "bg-[#FFD000]/10 text-[#FFD000]"
                            : "text-gray-500"
                        }`}
                      >
                        Advanced
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <InputBox
                      icon={<Sparkles size={17} />}
                      label="What do you offer?"
                      placeholder="e.g. Website Design, SEO, Marketing Services"
                      value={offer}
                      onChange={setOffer}
                      accent="yellow"
                    />

                    <InputBox
                      icon={<Users size={17} />}
                      label="Who is your ideal client?"
                      placeholder="e.g. Med Spas, Dental Clinics, Real Estate Agents"
                      value={idealClient}
                      onChange={setIdealClient}
                      accent="purple"
                    />
                  </div>

                  {mode === "advanced" && (
  <PlanGate
    feature="advanced_ai_lead_discovery"
    title="Advanced search filters are available on Pro and Scale"
    description="Upgrade to use company size, revenue, buying intent, and advanced lead targeting."
  >
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <SelectBox
        label="Company size"
        value={companySize}
        options={companySizeOptions}
        onChange={setCompanySize}
      />

      <SelectBox
        label="Annual revenue"
        value={revenue}
        options={revenueOptions}
        onChange={setRevenue}
      />
    </div>
  </PlanGate>
)}

                  <div className="mt-6">
                    <label className="mb-2 flex items-center justify-between text-sm text-gray-400">
                      <span>How many leads do you want?</span>
                      <span className="text-xs text-gray-600">
                        Up to 60 per search
                      </span>
                    </label>

                    <div className="relative">
                      <input
                        value={leads}
                        onChange={(e) =>
                          setLeads(e.target.value)
                        }
                        type="number"
                        min="1"
                        max="60"
                        className="w-full rounded-2xl border border-white/10 bg-[#070707] px-4 py-4 pr-20 text-white outline-none focus:border-[#FFD000]/40"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                        leads
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#090909] p-5 lg:p-7">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#FFD000]/5 blur-3xl" />
                <div className="absolute right-32 top-0 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                      <Globe2 size={19} />
                    </span>

                    <div>
                      <h2 className="text-xl font-medium">
                        Target Location
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Choose where BaseLead should look for
                        your ideal clients.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <SelectBox
                      label="Target Location"
                      value={location}
                      options={targetLocationOptions}
                      icon={<MapPin size={17} />}
                      onChange={setLocation}
                      disabled={
                        targetLocationsLoading ||
                        targetLocations.length === 0
                      }
                    />

                    <SelectBox
                      label="Search radius"
                      value={radius}
                      options={radiusOptions}
                      icon={<Globe2 size={17} />}
                      onChange={setRadius}
                    />
                  </div>

                  {companyLoadMessage && (
                    <div className="mt-4 rounded-xl border border-[#FFD000]/20 bg-[#FFD000]/5 p-3 text-xs text-gray-400">
                      {companyLoadMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#090909] p-5 lg:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                    <SlidersHorizontal size={19} />
                  </span>

                  <div>
                    <h2 className="text-xl font-medium">
                      Additional Filters
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Refine the businesses AI should prioritize.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <SelectBox
                    label="Buying intent"
                    value={buyingIntent}
                    options={buyingIntentOptions}
                    onChange={setBuyingIntent}
                  />

                  <div>
                    <label className="mb-2 block text-sm text-gray-400">
                      Tags
                    </label>

                    <div className="flex gap-2">
                      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-[#070707] px-4 py-3.5">
                        <Tag
                          size={17}
                          className="text-gray-600"
                        />

                        <input
                          value={tagInput}
                          onChange={(e) =>
                            setTagInput(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Add tags..."
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="rounded-xl border border-white/10 px-4 text-gray-400 hover:bg-white/5"
                      >
                        <Plus size={17} />
                      </button>
                    </div>

                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            type="button"
                            key={tag}
                            onClick={() =>
                              handleRemoveTag(tag)
                            }
                            className="flex items-center gap-1.5 rounded-full border border-[#FFD000]/20 bg-[#FFD000]/5 px-3 py-1.5 text-xs text-[#FFD000]"
                          >
                            {tag}
                            <X size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#090909] p-5 lg:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <Brain size={19} />
                  </span>

                  <div>
                    <h2 className="text-xl font-medium">
                      AI Search Settings
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Customize how BaseLead evaluates your
                      opportunities.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <ToggleCard
                    title="AI Lead Scoring"
                    description="Score leads based on fit, intent and conversion potential."
                    enabled={toggles.scoring}
                    onToggle={() =>
                      setToggles((current) => ({
                        ...current,
                        scoring: !current.scoring,
                      }))
                    }
                    icon={<Target size={17} />}
                    accent="yellow"
                  />

                  <ToggleCard
                    title="Intent Signals"
                    description="Use available signals to identify high-intent prospects."
                    enabled={toggles.intent}
                    onToggle={() =>
                      setToggles((current) => ({
                        ...current,
                        intent: !current.intent,
                      }))
                    }
                    icon={<Zap size={17} />}
                    accent="purple"
                  />

                  <ToggleCard
                    title="Enrichment"
                    description="Enrich leads with emails, phones, socials and more."
                    enabled={toggles.enrichment}
                    onToggle={() =>
                      setToggles((current) => ({
                        ...current,
                        enrichment: !current.enrichment,
                      }))
                    }
                    icon={<Sparkles size={17} />}
                    accent="blue"
                  />

                  <ToggleCard
                    title="Exclude Existing Leads"
                    description="Remove businesses already present in your database."
                    enabled={toggles.excludeExisting}
                    onToggle={() =>
                      setToggles((current) => ({
                        ...current,
                        excludeExisting:
                          !current.excludeExisting,
                      }))
                    }
                    icon={<Users size={17} />}
                    accent="green"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm text-gray-300 transition hover:bg-white/5"
                >
                  <Save size={17} />
                  {saveMessage || "Save Search"}
                </button>

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="group relative mt-3 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#FFD000] py-4 font-semibold text-black transition hover:bg-[#ffe044] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />

                  {isSearching ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Finding your clients...
                    </>
                  ) : (
                    <>
                      Find {leads || "50"} Clients
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {searchMessage && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                      <X size={17} />
                      Search failed
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      {searchMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-white p-5 text-gray-900 shadow-[0_0_45px_rgba(139,92,246,0.16),0_0_90px_rgba(139,92,246,0.07)] dark:bg-black dark:text-white dark:shadow-[0_0_45px_rgba(139,92,246,0.2),0_0_90px_rgba(139,92,246,0.1)]">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/20" />
                <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#FFD000]/5 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                      <Sparkles size={18} />
                    </span>

                    <h2 className="font-medium">
                      AI Search Assistant
                    </h2>

                    <span className="rounded bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                      BETA
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-700 dark:text-white">
                    Describe your ideal client naturally. BaseLead
                    will turn it into structured search criteria.
                  </p>

                  <textarea
                    value={prompt}
                    onChange={(e) =>
                      setPrompt(e.target.value)
                    }
                    className="mt-4 h-32 w-full resize-none rounded-2xl border border-white/10 bg-[#070707]/80 p-4 text-sm leading-6 text-white outline-none placeholder:text-gray-700 focus:border-violet-400/40"
                    placeholder="Example: Find med spas in my target locations that are actively investing in their online presence..."
                  />

                  <button
                    type="button"
                    onClick={handleGeneratePrompt}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD000] py-3.5 font-semibold text-black transition hover:bg-[#ffe044]"
                  >
                    <Sparkles size={17} />
                    Generate Search
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#090909] p-5">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-500/5 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium">
                        Search Preview
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Your AI search pipeline
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                      <Radar size={17} />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <PreviewItem>
                      Finding up to {leads || "50"} companies
                    </PreviewItem>

                    <PreviewItem color="purple">
                      {idealClient
                        ? `Targeting ${idealClient}`
                        : "Defining your ideal client"}
                    </PreviewItem>

                    <PreviewItem color="yellow">
                      {location
                        ? `Searching ${location} within ${radius}`
                        : "Target Location required"}
                    </PreviewItem>

                    {toggles.intent && (
                      <PreviewItem>
                        Analyzing intent signals
                      </PreviewItem>
                    )}

                    {toggles.scoring && (
                      <PreviewItem color="yellow">
                        Scoring top opportunities
                      </PreviewItem>
                    )}

                    {toggles.enrichment && (
                      <PreviewItem color="purple">
                        Enriching available business data
                      </PreviewItem>
                    )}

                    {toggles.excludeExisting && (
                      <PreviewItem>
                        Excluding existing leads
                      </PreviewItem>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-gray-600">
                    <CheckCircle2
                      size={14}
                      className="text-emerald-400"
                    />
                    Ready to search
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#090909] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD000]/10 text-[#FFD000]">
                    <Lightbulb size={18} />
                  </span>

                  <h2 className="font-medium">
                    Tips for Better Results
                  </h2>
                </div>

                <div className="mt-5 space-y-4 text-sm text-gray-400">
                  <Tip text="Be specific about the results you want" />
                  <Tip text="Choose a Target Location configured for your company" />
                  <Tip text="Use intent signals to find active buyers" />
                  <Tip text="Exclude your existing leads to find new ones" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-[#FFD000]/15 bg-gradient-to-br from-[#FFD000]/[0.06] to-[#090909] p-5">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#FFD000]/10 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD000]/10 text-[#FFD000]">
                      <MousePointer2 size={17} />
                    </span>

                    <h2 className="font-medium">
                      Need inspiration?
                    </h2>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Start with an example search and customize
                    the criteria to match your offer.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setOffer(
                        "Website Design, SEO & Marketing"
                      );
                      setIdealClient("Med Spas");
                      setCompanySize("2–50 employees");
                      setRevenue("$500K – $10M");

                      if (targetLocations.length) {
                        setLocation(targetLocations[0]);
                      }

                      setRadius("25 miles");
                      setBuyingIntent("Actively looking");
                      setLeads("50");
                      setActiveTab("builder");
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#FFD000]/40 py-3 text-sm text-[#FFD000] transition hover:bg-[#FFD000]/10"
                  >
                    Use Example Search
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <p className="px-6 pb-6 text-center text-[11px] text-gray-600">
        Lead data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">OpenStreetMap contributors</a> and Google Maps, where available.
      </p>
    </main>
  );
}