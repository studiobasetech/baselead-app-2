"use client";

import {
  ArrowDown,
  Building2,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Filter,
  Globe2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { recommendationReasons } from "@/lib/recommendations";
import { supabase } from "@/components/lib/supabase";
import { usePreferences } from "@/components/preferences/PreferencesProvider";

type LeadStatus =
  | "New"
  | "Contacted"
  | "Responded"
  | "Meeting"
  | "Proposal"
  | "Won"
  | "Lost";

type LeadSource =
  | "Google Maps"
  | "Instagram"
  | "Facebook"
  | "Google Search"
  | "Website Scan";

type Opportunity = "High" | "Medium" | "Low";

type SocialProfile = {
  instagram: string;
  facebook: string;
  linkedin: string;
};

type Lead = {
  id: string;
  name: string;
  company: string;
  website: string;
  category: string;
  location: string;
  city: string;
  state: string;
  country: string;
  score: number;
  opportunity: Opportunity;
  projectValue: string;
  services: string[];
  lastActivity: string;
  activityType: string;
  source: LeadSource;
  status: LeadStatus;
  reviews: number;
  rating: number;
  founded: number;
  employees: string;
  social: SocialProfile;
  description: string;
  reasons: string[];
  email: string;
  phone: string;
  createdAt: string;
  address: string;
};

const ITEMS_PER_PAGE = 10;

/*
 * BaseLead / Dashboard color system
 *
 * Brand:
 * Yellow  #F5C518
 * Green   #84CC16
 * Purple  #A78BFA
 * Blue    #60A5FA
 * Red     #F0475C
 *
 * Dashboard layered surfaces:
 * Background       #050505
 * Deep section     #0A0A0A
 * Panel            #0D0D0D
 * Elevated         #101010
 * Inner surface    #171717
 * Progress         #191919
 * Border           #202020
 * Light border     #2A2A2A
 */

const SURFACES = {
  background: "#050505",
  deep: "#0A0A0A",
  panel: "#0D0D0D",
  elevated: "#101010",
  inner: "#171717",
  progress: "#191919",
  border: "#202020",
  borderLight: "#2A2A2A",
};

function scoreColor(score: number) {
  if (score >= 80) {
    return "text-[#84CC16]";
  }

  if (score >= 60) {
    return "text-[#F5C518]";
  }

  return "text-zinc-400";
}

function scoreRingColor(score: number) {
  if (score >= 80) {
    return "border-[#84CC16]";
  }

  if (score >= 60) {
    return "border-[#F5C518]";
  }

  return "border-zinc-500";
}

function opportunityStyle(opportunity: Opportunity) {
  if (opportunity === "High") {
    return "border-[#84CC16]/25 bg-[#84CC16]/10 text-[#84CC16]";
  }

  if (opportunity === "Medium") {
    return "border-[#F5C518]/25 bg-[#F5C518]/10 text-[#F5C518]";
  }

  return "border-[#2A2A2A] bg-[#191919] text-zinc-400";
}

function statusStyle(status: LeadStatus) {
  switch (status) {
    case "Contacted":
      return "border-[#60A5FA]/25 bg-[#60A5FA]/10 text-[#60A5FA]";

    case "Responded":
      return "border-[#A78BFA]/25 bg-[#A78BFA]/10 text-[#A78BFA]";

    case "Meeting":
      return "border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#22D3EE]";

    case "Proposal":
      return "border-[#F5C518]/25 bg-[#F5C518]/10 text-[#F5C518]";

    case "Won":
      return "border-[#84CC16]/25 bg-[#84CC16]/10 text-[#84CC16]";

    case "Lost":
      return "border-[#F0475C]/25 bg-[#F0475C]/10 text-[#F0475C]";

    default:
      return "border-[#A78BFA]/30 bg-[#A78BFA]/10 text-[#A78BFA]";
  }
}
function sourceIcon(source: LeadSource) {
  switch (source) {
    case "Google Maps":
      return (
        <MapPin className="h-3.5 w-3.5 text-[#F0475C]" />
      );

    case "Google Search":
      return (
        <Search className="h-3.5 w-3.5 text-[#60A5FA]" />
      );

    case "Instagram":
      return (
        <Sparkles className="h-3.5 w-3.5 text-[#A78BFA]" />
      );

    case "Facebook":
      return (
        <Users className="h-3.5 w-3.5 text-[#60A5FA]" />
      );

    default:
      return (
        <Globe2 className="h-3.5 w-3.5 text-[#F5C518]" />
      );
  }
}

function leadInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "Recently added";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently added";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getWebsiteUrl(website: string) {
  if (!website) {
    return "";
  }

  return website.startsWith("http")
    ? website
    : `https://${website}`;
}

function getSocialUrl(value: unknown) {
  if (!value) {
    return "";
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return "";
  }

  if (stringValue.startsWith("http")) {
    return stringValue;
  }

  return `https://${stringValue}`;
}

function extractSocialProfiles(rawData: unknown): SocialProfile {
  if (!rawData || typeof rawData !== "object") {
    return {
      instagram: "",
      facebook: "",
      linkedin: "",
    };
  }

  const raw = rawData as Record<string, unknown>;

  const instagram = getSocialUrl(
    raw.instagram ??
      raw.instagram_url ??
      raw.instagramUrl ??
      raw.instagram_profile
  );

  const facebook = getSocialUrl(
    raw.facebook ??
      raw.facebook_url ??
      raw.facebookUrl ??
      raw.facebook_profile
  );

  const linkedin = getSocialUrl(
    raw.linkedin ??
      raw.linkedin_url ??
      raw.linkedinUrl ??
      raw.linkedin_profile
  );

  return {
    instagram,
    facebook,
    linkedin,
  };
}

function deriveServices(lead: {
  website: string;
  social: SocialProfile;
  description: string;
  category: string;
}) {
  const services: string[] = [];

  if (!lead.website) {
    services.push("Website Design");
  } else {
    services.push("Website Redesign");
  }

  if (!lead.social.instagram && !lead.social.facebook) {
    services.push("Social Media");
  }

  const description = lead.description.toLowerCase();

  if (
    description.includes("booking") ||
    description.includes("appointment")
  ) {
    services.push("AI Booking Assistant");
  }

  if (
    description.includes("brand") ||
    description.includes("branding")
  ) {
    services.push("Branding");
  }

  if (services.length < 2) {
    services.push("AI Automation");
  }

  return Array.from(new Set(services)).slice(0, 3);
}

function estimatedProjectValue(
  score: number,
  services: string[]
) {
  if (services.length === 0) {
    return "Not estimated";
  }

  if (score >= 90) {
    return "$8K – $15K";
  }

  if (score >= 80) {
    return "$6K – $12K";
  }

  if (score >= 70) {
    return "$5K – $10K";
  }

  if (score >= 60) {
    return "$4K – $8K";
  }

  return "$3K – $6K";
}

function LeadAvatar({
  name,
  score,
}: {
  name: string;
  score?: number;
}) {
  const initials = leadInitials(name);

  let background = "bg-[#171717]";

  if (score !== undefined) {
    if (score >= 85) {
      background = "bg-[#84CC16]/10";
    } else if (score >= 70) {
      background = "bg-[#F5C518]/10";
    } else {
      background = "bg-[#171717]";
    }
  }

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 ${background} text-xs font-semibold text-white shadow-inner shadow-black/30 transition duration-300 group-hover:scale-[1.03]`}
    >
      {initials}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  detail,
  accent = "yellow",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  detail?: string;
  accent?: "yellow" | "green" | "blue" | "purple";
}) {
  const accentClasses = {
    yellow: {
      icon: "bg-[#F5C518]/10 text-[#F5C518]",
      hover:
        "hover:border-[#F5C518]/25 hover:shadow-[0_18px_45px_rgba(245,197,24,0.07)]",
    },
    green: {
      icon: "bg-[#84CC16]/10 text-[#84CC16]",
      hover:
        "hover:border-[#84CC16]/25 hover:shadow-[0_18px_45px_rgba(132,204,22,0.06)]",
    },
    blue: {
      icon: "bg-[#60A5FA]/10 text-[#60A5FA]",
      hover:
        "hover:border-[#60A5FA]/25 hover:shadow-[0_18px_45px_rgba(96,165,250,0.06)]",
    },
    purple: {
      icon: "bg-[#A78BFA]/10 text-[#A78BFA]",
      hover:
        "hover:border-[#A78BFA]/25 hover:shadow-[0_18px_45px_rgba(167,139,250,0.06)]",
    },
  };

  const style = accentClasses[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-0.5 ${style.hover}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {label}
        </span>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${style.icon}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>

      {detail && (
        <div className="mt-1 text-xs text-zinc-500">
          {detail}
        </div>
      )}
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="group relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 appearance-none rounded-xl border border-[#202020] bg-[#0D0D0D] pl-3 pr-9 text-sm text-zinc-300 outline-none shadow-[0_4px_14px_rgba(0,0,0,0.2)] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#101010] focus:border-[#F5C518]/40 focus:shadow-[0_0_0_3px_rgba(245,197,24,0.06)]"
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-hover:text-zinc-300">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

function SocialProfiles({
  social,
}: {
  social: SocialProfile;
}) {
  const hasInstagram = Boolean(social.instagram);
  const hasFacebook = Boolean(social.facebook);
  const hasLinkedin = Boolean(social.linkedin);

  if (
    !hasInstagram &&
    !hasFacebook &&
    !hasLinkedin
  ) {
    return (
      <div className="rounded-xl border border-dashed border-[#202020] bg-[#101010] p-4 text-sm text-zinc-500 shadow-inner shadow-black/20">
        No social media profiles detected yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {hasInstagram && (
        <a
          href={social.instagram}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-[#A78BFA]/20 bg-[#A78BFA]/[0.05] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#A78BFA]/40 hover:shadow-[0_12px_28px_rgba(167,139,250,0.08)]"
        >
          <div className="text-xs font-semibold text-[#A78BFA]">
            Instagram
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="truncate text-xs text-zinc-400">
              View profile
            </span>

            <ExternalLink className="h-3.5 w-3.5 text-zinc-600 transition group-hover:text-[#A78BFA]" />
          </div>
        </a>
      )}

      {hasFacebook && (
        <a
          href={social.facebook}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/[0.05] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#60A5FA]/40 hover:shadow-[0_12px_28px_rgba(96,165,250,0.08)]"
        >
          <div className="text-xs font-semibold text-[#60A5FA]">
            Facebook
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="truncate text-xs text-zinc-400">
              View profile
            </span>

            <ExternalLink className="h-3.5 w-3.5 text-zinc-600 transition group-hover:text-[#60A5FA]" />
          </div>
        </a>
      )}

      {hasLinkedin && (
        <a
          href={social.linkedin}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/[0.05] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#60A5FA]/40 hover:shadow-[0_12px_28px_rgba(96,165,250,0.08)]"
        >
          <div className="text-xs font-semibold text-[#60A5FA]">
            LinkedIn
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="truncate text-xs text-zinc-400">
              View profile
            </span>

            <ExternalLink className="h-3.5 w-3.5 text-zinc-600 transition group-hover:text-[#60A5FA]" />
          </div>
        </a>
      )}
    </div>
  );
}

function LeadDetailPanel({
  lead,
  onClose,
  showOpportunityScore,
}: {
  lead: Lead;
  onClose: () => void;
  showOpportunityScore: boolean;
}) {
  const score = formatScore(lead.score);

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[#202020] bg-[#0D0D0D] shadow-[-24px_0_70px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#F5C518]/10 to-transparent" />

      <div className="flex items-center justify-between border-b border-[color:var(--leads-divider)] bg-[#101010] px-6 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Lead details
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            {lead.name}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="group flex h-9 w-9 items-center justify-center rounded-lg border border-[#202020] bg-[#0D0D0D] text-zinc-400 shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#171717] hover:text-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
        >
          <X className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="relative overflow-hidden rounded-2xl border border-[#F5C518]/20 bg-gradient-to-br from-[#F5C518]/[0.07] via-[#0D0D0D] to-[#0A0A0A] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#F5C518]/[0.035] blur-3xl" />

          <div className="relative flex items-start gap-4">
            <LeadAvatar
              name={lead.name}
              score={lead.score}
            />

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-white">
                {lead.name}
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                {lead.category}
              </p>

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <MapPin className="h-3.5 w-3.5 text-[#F0475C]" />
                {lead.location}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${opportunityStyle(
                    lead.opportunity
                  )}`}
                >
                  {lead.opportunity} Opportunity
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${statusStyle(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showOpportunityScore && (
          <section className="mt-5 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 shadow-[0_8px_28px_rgba(0,0,0,0.24)] transition-all duration-300 hover:border-[#2A2A2A] hover:shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Opportunity Score
                </h3>

                <p className="mt-1 text-xs text-zinc-600">
                  AI qualification
                </p>
              </div>

              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full border-8 ${scoreRingColor(
                  score
                )} bg-[#171717] shadow-[inset_0_0_20px_rgba(0,0,0,0.45)]`}
              >
                <div className="text-center">
                  <div
                    className={`text-2xl font-semibold ${scoreColor(
                      score
                    )}`}
                  >
                    {score}
                  </div>

                  <div className="text-[9px] text-zinc-600">
                    /100
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-[#191919] shadow-inner">
                <div
                  className="h-full rounded-full bg-[#F5C518] shadow-[0_0_12px_rgba(245,197,24,0.25)] transition-all"
                  style={{
                    width: `${score}%`,
                  }}
                />
              </div>
            </div>
          </section>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010]">
            <div className="text-xs text-zinc-500">
              Reviews
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm text-white">
              <Star className="h-4 w-4 text-[#F5C518]" />

              {lead.reviews.toLocaleString()}
            </div>

            {lead.rating > 0 && (
              <div className="mt-1 text-xs text-zinc-600">
                {lead.rating.toFixed(1)} rating
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010]">
            <div className="text-xs text-zinc-500">
              Estimated value
            </div>

            <div className="mt-2 text-sm font-semibold text-white">
              {lead.projectValue}
            </div>
          </div>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-white">
            Why this is a great opportunity
          </h3>

          <div className="mt-3 space-y-3">
            {lead.reasons.length > 0 ? (
              lead.reasons.map(
                (reason, index) => (
                  <div
                    key={`${reason}-${index}`}
                    className="group flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-[#202020] hover:bg-[#101010]"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#84CC16]/10 text-[#84CC16] shadow-[0_0_14px_rgba(132,204,22,0.08)]">
                      <Check className="h-3 w-3" />
                    </div>

                    <p className="text-sm leading-5 text-zinc-400 transition group-hover:text-zinc-300">
                      {reason}
                    </p>
                  </div>
                )
              )
            ) : (
              <>
                {lead.website && (
                  <div className="flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-[#202020] hover:bg-[#101010]">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#84CC16]/10 text-[#84CC16]">
                      <Check className="h-3 w-3" />
                    </div>

                    <p className="text-sm text-zinc-400">
                      Business website detected.
                    </p>
                  </div>
                )}

                {lead.reviews > 100 && (
                  <div className="flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-[#202020] hover:bg-[#101010]">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#84CC16]/10 text-[#84CC16]">
                      <Check className="h-3 w-3" />
                    </div>

                    <p className="text-sm text-zinc-400">
                      Strong customer activity with{" "}
                      {lead.reviews.toLocaleString()} reviews.
                    </p>
                  </div>
                )}

                {!lead.website && (
                  <div className="flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-[#202020] hover:bg-[#101010]">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5C518]/10 text-[#F5C518]">
                      <Sparkles className="h-3 w-3" />
                    </div>

                    <p className="text-sm text-zinc-400">
                      No website detected — potential website opportunity.
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-[#202020] hover:bg-[#101010]">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#84CC16]/10 text-[#84CC16]">
                    <Check className="h-3 w-3" />
                  </div>

                  <p className="text-sm text-zinc-400">
                    Located in your discovered market.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-white">
            Recommended Services
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {lead.services.map(
              (service) => (
                <span
                  key={service}
                  className="rounded-lg border border-[#F5C518]/20 bg-[#F5C518] px-3 py-2 text-xs font-medium text-black shadow-[0_4px_16px_rgba(245,197,24,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(245,197,24,0.18)]"
                >
                  {service}
                </span>
              )
            )}
          </div>

          <div className="mt-3 rounded-xl border border-[#202020] bg-[#101010] p-4 text-xs leading-5 text-zinc-500 shadow-inner shadow-black/20">
            Services are suggested based on the business profile,
            online presence, and available AI analysis.
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-white">
            Business Information
          </h3>

          <div className="mt-3 space-y-2 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--leads-divider)] py-2">
              <span className="text-sm text-zinc-500">
                Company
              </span>

              <span className="text-right text-sm text-zinc-200">
                {lead.company || lead.name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--leads-divider)] py-2">
              <span className="text-sm text-zinc-500">
                Industry
              </span>

              <span className="text-right text-sm text-zinc-200">
                {lead.category}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--leads-divider)] py-2">
              <span className="text-sm text-zinc-500">
                Employees
              </span>

              <span className="text-right text-sm text-zinc-200">
                {lead.employees}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--leads-divider)] py-2">
              <span className="text-sm text-zinc-500">
                Founded
              </span>

              <span className="text-right text-sm text-zinc-200">
                {lead.founded > 0
                  ? lead.founded
                  : "Unknown"}
              </span>
            </div>

            {lead.address && (
              <div className="flex items-start justify-between gap-4 py-2">
                <span className="text-sm text-zinc-500">
                  Address
                </span>

                <span className="max-w-[240px] text-right text-sm text-zinc-200">
                  {lead.address}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-white">
            Social Profiles
          </h3>

          <div className="mt-3">
            <SocialProfiles social={lead.social} />
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-white">
            Contact
          </h3>

          <div className="mt-3 space-y-2">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="group flex items-center gap-3 rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 text-sm text-zinc-300 shadow-[0_5px_18px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F5C518]/30 hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_26px_rgba(0,0,0,0.28)]"
              >
                <Mail className="h-4 w-4 text-[#F5C518] transition-transform group-hover:scale-110" />

                <span className="truncate">
                  {lead.email}
                </span>
              </a>
            )}

            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="group flex items-center gap-3 rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 text-sm text-zinc-300 shadow-[0_5px_18px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F5C518]/30 hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_26px_rgba(0,0,0,0.28)]"
              >
                <Phone className="h-4 w-4 text-[#F5C518] transition-transform group-hover:scale-110" />

                <span>{lead.phone}</span>
              </a>
            )}

            {lead.website && (
              <a
                href={getWebsiteUrl(lead.website)}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 text-sm text-zinc-300 shadow-[0_5px_18px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F5C518]/30 hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_26px_rgba(0,0,0,0.28)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Globe2 className="h-4 w-4 shrink-0 text-[#F5C518] transition-transform group-hover:scale-110" />

                  <span className="truncate">
                    {lead.website}
                  </span>
                </div>

                <ExternalLink className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-[#F5C518]" />
              </a>
            )}

            {!lead.email &&
              !lead.phone &&
              !lead.website && (
                <div className="rounded-xl border border-dashed border-[#202020] bg-[#101010] p-4 text-sm text-zinc-500">
                  No contact information available yet.
                </div>
              )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-white">
            AI Analysis
          </h3>

          <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#F5C518]/10 bg-gradient-to-br from-[#F5C518]/[0.05] via-[#0D0D0D] to-[#0A0A0A] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#F5C518]/[0.04] blur-3xl" />

            <div className="relative flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5C518]/10 text-[#F5C518] shadow-[0_0_16px_rgba(245,197,24,0.08)]">
                <Sparkles className="h-3.5 w-3.5" />
              </div>

              <span className="text-xs font-medium uppercase tracking-wider text-[#F5C518]">
                AI qualification
              </span>
            </div>

            <p className="relative mt-4 text-sm leading-6 text-zinc-300">
              {lead.description}
            </p>
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">
              Lead source
            </span>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {sourceIcon(lead.source)}
              {lead.source}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#202020] pt-3">
            <span className="text-xs text-zinc-600">
              Added
            </span>

            <span className="text-xs text-zinc-400">
              {formatDate(lead.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LeadRow({
  lead,
  selected,
  onSelect,
  onOpen,
  showOpportunityScore,
}: {
  lead: Lead;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  showOpportunityScore: boolean;
}) {
  return (
    <div
      className={`group relative grid grid-cols-[32px_minmax(250px,1.7fr)_minmax(150px,1fr)_90px_120px_120px_110px] items-center gap-4 border-b border-[color:var(--leads-divider)] px-5 py-4 transition-all duration-300 ${
        selected
          ? "bg-[#F5C518]/[0.035] shadow-[inset_3px_0_0_rgba(245,197,24,0.45),0_8px_24px_rgba(0,0,0,0.18)]"
          : "hover:bg-[#101010] hover:shadow-[inset_3px_0_0_rgba(245,197,24,0.18),0_8px_24px_rgba(0,0,0,0.2)]"
      }`}
    >
      <button
        onClick={onSelect}
        className={`flex h-4 w-4 items-center justify-center rounded border transition-all duration-200 ${
          selected
            ? "border-[#F5C518] bg-[#F5C518] text-black shadow-[0_0_10px_rgba(245,197,24,0.2)]"
            : "border-zinc-700 bg-transparent hover:border-[#2A2A2A] hover:bg-[#171717]"
        }`}
      >
        {selected && (
          <Check className="h-3 w-3" />
        )}
      </button>

      <button
        onClick={onOpen}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <LeadAvatar
          name={lead.name}
          score={lead.score}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-white transition-colors duration-200 group-hover:text-[#F5C518]">
              {lead.name}
            </div>

            {showOpportunityScore &&
              lead.score >= 80 && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#84CC16] shadow-[0_0_8px_rgba(132,204,22,0.45)]" />
              )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <Building2 className="h-3 w-3 text-zinc-600 transition-colors group-hover:text-zinc-500" />

            <span className="truncate">
              {lead.category}
            </span>
          </div>

          {lead.website ? (
            <div className="mt-1 truncate text-xs text-zinc-600">
              {lead.website}
            </div>
          ) : (
            <div className="mt-1 text-xs text-zinc-700">
              No website
            </div>
          )}
        </div>
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#F0475C]" />

          <span className="truncate">
            {lead.location}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
          {sourceIcon(lead.source)}

          <span>{lead.source}</span>
        </div>
      </div>

      {showOpportunityScore ? (
        <div>
          <div
            className={`text-lg font-semibold ${scoreColor(
              lead.score
            )}`}
          >
            {formatScore(lead.score)}
          </div>

          <div className="text-[10px] uppercase tracking-wider text-zinc-600">
            Score
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm text-zinc-600">
            —
          </div>
        </div>
      )}

      <div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${opportunityStyle(
            lead.opportunity
          )}`}
        >
          {lead.opportunity}
        </span>
      </div>

      <div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${statusStyle(
            lead.status
          )}`}
        >
          {lead.status}
        </span>
      </div>

      <div className="text-xs text-zinc-500">
        {formatDate(lead.createdAt)}
      </div>
    </div>
  );
}

function MobileLeadRow({
  lead,
  selected,
  onSelect,
  onOpen,
  showOpportunityScore,
}: {
  lead: Lead;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  showOpportunityScore: boolean;
}) {
  return (
    <div
      className={`group rounded-2xl border p-4 shadow-[0_6px_22px_rgba(0,0,0,0.2)] transition-all duration-300 ${
        selected
          ? "border-[#F5C518]/20 bg-[#F5C518]/[0.03] shadow-[0_10px_30px_rgba(245,197,24,0.05)]"
          : "border-[#202020] bg-[#0D0D0D] hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_14px_32px_rgba(0,0,0,0.3)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onSelect}
          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
            selected
              ? "border-[#F5C518] bg-[#F5C518] text-black shadow-[0_0_10px_rgba(245,197,24,0.2)]"
              : "border-zinc-700 hover:border-[#2A2A2A]"
          }`}
        >
          {selected && (
            <Check className="h-3 w-3" />
          )}
        </button>

        <button
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <LeadAvatar
            name={lead.name}
            score={lead.score}
          />

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#F5C518]">
              {lead.name}
            </div>

            <div className="mt-1 truncate text-xs text-zinc-500">
              {lead.category}
            </div>

            <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600">
              <MapPin className="h-3 w-3 text-[#F0475C]" />

              <span className="truncate">
                {lead.location}
              </span>
            </div>
          </div>

          {showOpportunityScore && (
            <div className="ml-auto text-right">
              <div
                className={`text-xl font-semibold ${scoreColor(
                  lead.score
                )}`}
              >
                {formatScore(lead.score)}
              </div>

              <div className="text-[9px] uppercase tracking-wider text-zinc-600">
                Score
              </div>
            </div>
          )}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.03] bg-[#171717] p-3 shadow-inner shadow-black/20 transition group-hover:border-white/[0.05]">
          <div className="text-[11px] text-zinc-600">
            Opportunity
          </div>

          <div className="mt-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] shadow-sm ${opportunityStyle(
                lead.opportunity
              )}`}
            >
              {lead.opportunity}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.03] bg-[#171717] p-3 shadow-inner shadow-black/20 transition group-hover:border-white/[0.05]">
          <div className="text-[11px] text-zinc-600">
            Status
          </div>

          <div className="mt-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] shadow-sm ${statusStyle(
                lead.status
              )}`}
            >
              {lead.status}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.03] bg-[#171717] p-3 shadow-inner shadow-black/20">
          <div className="text-[11px] text-zinc-600">
            Reviews
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-300">
            <Star className="h-3 w-3 text-[#F5C518]" />

            {lead.reviews.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.03] bg-[#171717] p-3 shadow-inner shadow-black/20">
          <div className="text-[11px] text-zinc-600">
            Source
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-300">
            {sourceIcon(lead.source)}

            {lead.source}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
    const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setIsLightMode(
        document.documentElement.classList.contains(
          "baselead-light"
        )
      );
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  const {
    preferences,
    loading: preferencesLoading,
  } = usePreferences();

  const showOpportunityScore =
    preferences.show_opportunity_score;

  const defaultLeadView =
    preferences.default_lead_view;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [selectedLeadId, setSelectedLeadId] =
    useState<string | null>(null);

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [opportunity, setOpportunity] =
    useState("");
  const [source, setSource] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] =
    useState(false);

  async function getCurrentCompanyId(
    userId: string
  ): Promise<string | null> {
    const {
      data: ownedCompany,
      error: ownerError,
    } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (ownerError) {
      throw ownerError;
    }

    if (ownedCompany?.id) {
      return String(ownedCompany.id);
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("team_members")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    return membership?.company_id
      ? String(membership.company_id)
      : null;
  }

  async function loadLeads() {
    setIsLoading(true);
    setLoadError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Unable to verify user:",
        userError
      );

      setLoadError(
        "Unable to verify your account."
      );
      setIsLoading(false);
      return;
    }

    let companyId: string | null = null;

    try {
      companyId = await getCurrentCompanyId(
        user.id
      );
    } catch (error) {
      console.error(
        "Unable to determine current company:",
        error
      );

      setLoadError(
        "Unable to determine your company."
      );
      setIsLoading(false);
      return;
    }

    if (!companyId) {
      console.error(
        "No company found for authenticated user:",
        user.id
      );

      setLoadError(
        "No company is associated with your account yet."
      );
      setIsLoading(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error loading company leads:",
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      );

      setLoadError(
        "Could not load your company leads."
      );
      setIsLoading(false);
      return;
    }

    const mappedLeads: Lead[] = (data ?? []).map(
      (lead) => {
        const rawScore = Number(
          lead.ai_score ??
            lead.intent_score ??
            0
        );

        const score = Number.isFinite(rawScore)
          ? formatScore(rawScore)
          : 0;

        const normalizedOpportunity =
          String(
            lead.ai_opportunity ?? ""
          ).toLowerCase();

        let opportunityValue: Opportunity =
          "Medium";

        if (
          normalizedOpportunity === "high" ||
          normalizedOpportunity ===
            "high opportunity"
        ) {
          opportunityValue = "High";
        } else if (
          normalizedOpportunity === "low" ||
          normalizedOpportunity ===
            "low opportunity"
        ) {
          opportunityValue = "Low";
        } else if (score >= 80) {
          opportunityValue = "High";
        } else if (score < 50) {
          opportunityValue = "Low";
        }

        const rawStatus = String(
          lead.status ?? "new"
        ).toLowerCase();

        const statusMap: Record<
          string,
          LeadStatus
        > = {
          new: "New",
          contacted: "Contacted",
          responded: "Responded",
          meeting: "Meeting",
          proposal: "Proposal",
          won: "Won",
          lost: "Lost",
        };

        const rawSource = String(
          lead.source ?? ""
        ).toLowerCase();

        let sourceValue: LeadSource =
          "Website Scan";

        if (rawSource.includes("map")) {
          sourceValue = "Google Maps";
        } else if (
          rawSource.includes("instagram")
        ) {
          sourceValue = "Instagram";
        } else if (
          rawSource.includes("facebook")
        ) {
          sourceValue = "Facebook";
        } else if (
          rawSource.includes("search")
        ) {
          sourceValue = "Google Search";
        }

        const description =
          (lead.ai_reason ??
            lead.notes) ||
          "No AI analysis available yet.";

        const social =
          extractSocialProfiles(
            lead.raw_data
          );

        const temporaryLead = {
          website: lead.website ?? "",
          social,
          description: String(description),
          category:
            lead.industry ?? "Business",
        };

        const services = deriveServices(
          temporaryLead
        );

        return {
          id: String(lead.id),

          name:
            lead.name ??
            lead.company ??
            "Unknown Lead",

          company:
            lead.company ??
            lead.name ??
            "Unknown Company",

          website: lead.website ?? "",

          category:
            lead.industry ?? "Business",

          location:
            (lead.location ??
              [lead.city, lead.state]
                .filter(Boolean)
                .join(", ")) ||
            "Unknown",

          city: lead.city ?? "",

          state: lead.state ?? "",

          country: lead.country ?? "",

          score,

          opportunity:
            opportunityValue,

          projectValue:
            estimatedProjectValue(
              score,
              services
            ),

          services,

          lastActivity: lead.created_at
            ? formatDate(lead.created_at)
            : "Recently added",

          activityType: "Added",

          source: sourceValue,

          status:
            statusMap[rawStatus] ??
            "New",

          reviews: Number(
            lead.review_count ?? 0
          ),

          rating: Number(
            lead.rating ?? 0
          ),

          founded: 0,

          employees: "Unknown",

          social,

          description: String(
            description
          ),

          reasons:
            recommendationReasons(
              lead.ai_recommendations
            ),

          email: lead.email ?? "",

          phone: lead.phone ?? "",

          createdAt:
            lead.created_at ?? "",

          address:
            lead.address ?? "",
        };
      }
    );

    setLeads(mappedLeads);
    setSelectedIds([]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const industries = useMemo(() => {
    return Array.from(
      new Set(
        leads
          .map((lead) => lead.category)
          .filter(Boolean)
      )
    ).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !query ||
        lead.name
          .toLowerCase()
          .includes(query) ||
        lead.company
          .toLowerCase()
          .includes(query) ||
        lead.category
          .toLowerCase()
          .includes(query) ||
        lead.location
          .toLowerCase()
          .includes(query) ||
        lead.website
          .toLowerCase()
          .includes(query);

      const matchesIndustry =
        !industry ||
        lead.category === industry;

      const matchesStatus =
        !status ||
        lead.status === status;

      const matchesOpportunity =
        !opportunity ||
        lead.opportunity === opportunity;

      const matchesSource =
        !source ||
        lead.source === source;

      return (
        matchesSearch &&
        matchesIndustry &&
        matchesStatus &&
        matchesOpportunity &&
        matchesSource
      );
    });
  }, [
    leads,
    search,
    industry,
    status,
    opportunity,
    source,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredLeads.length /
        ITEMS_PER_PAGE
    )
  );

  const visibleLeads = useMemo(() => {
    const start =
      (currentPage - 1) *
      ITEMS_PER_PAGE;

    return filteredLeads.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [
    filteredLeads,
    currentPage,
  ]);

  const selectedLead = useMemo(() => {
    return (
      leads.find(
        (lead) =>
          lead.id === selectedLeadId
      ) ?? null
    );
  }, [leads, selectedLeadId]);

  const highOpportunityCount =
    useMemo(() => {
      return leads.filter(
        (lead) =>
          lead.opportunity === "High"
      ).length;
    }, [leads]);

  const contactedCount = useMemo(() => {
    return leads.filter(
      (lead) =>
        lead.status !== "New" &&
        lead.status !== "Lost"
    ).length;
  }, [leads]);

  const averageScore = useMemo(() => {
    if (leads.length === 0) {
      return 0;
    }

    const total = leads.reduce(
      (sum, lead) =>
        sum + formatScore(lead.score),
      0
    );

    return Math.round(
      total / leads.length
    );
  }, [leads]);

  const totalReviews = useMemo(() => {
    return leads.reduce(
      (sum, lead) =>
        sum + lead.reviews,
      0
    );
  }, [leads]);

  const location = useMemo(() => {
    if (leads.length === 0) {
      return "All locations";
    }

    const firstLocation =
      leads[0].location;

    if (
      firstLocation &&
      leads.every(
        (lead) =>
          lead.location ===
          firstLocation
      )
    ) {
      return firstLocation;
    }

    return "All locations";
  }, [leads]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  }

  function toggleSelectAll() {
    const visibleIds =
      visibleLeads.map(
        (lead) => lead.id
      );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedIds.includes(id)
      );

    if (allSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) =>
            !visibleIds.includes(id)
        )
      );
    } else {
      setSelectedIds((current) =>
        Array.from(
          new Set([
            ...current,
            ...visibleIds,
          ])
        )
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setIndustry("");
    setStatus("");
    setOpportunity("");
    setSource("");
    setCurrentPage(1);
  }

  function exportCsv() {
    const rows = filteredLeads;

    if (rows.length === 0) {
      return;
    }

    const headers = [
      "Name",
      "Company",
      "Industry",
      "Location",
      "Score",
      "Opportunity",
      "Status",
      "Source",
      "Website",
      "Email",
      "Phone",
      "Instagram",
      "Facebook",
      "LinkedIn",
      "Reviews",
      "Rating",
      "Estimated Value",
    ];

    const csvRows = rows.map(
      (lead) =>
        [
          lead.name,
          lead.company,
          lead.category,
          lead.location,
          showOpportunityScore
            ? formatScore(lead.score)
            : "",
          lead.opportunity,
          lead.status,
          lead.source,
          lead.website,
          lead.email,
          lead.phone,
          lead.social.instagram,
          lead.social.facebook,
          lead.social.linkedin,
          lead.reviews,
          lead.rating,
          lead.projectValue,
        ]
          .map((value) => {
            const stringValue =
              String(value ?? "");

            return `"${stringValue.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
    );

    const csv = [
      headers.join(","),
      ...csvRows,
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "baselead-leads.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  const allVisibleSelected =
    visibleLeads.length > 0 &&
    visibleLeads.every((lead) =>
      selectedIds.includes(lead.id)
    );

  if (preferencesLoading && leads.length === 0) {
    return (
     <div
  style={
    {
      "--leads-divider": isLightMode
        ? "#E3E3E8"
        : "#202020",
    } as CSSProperties
  }
  className="min-h-full bg-[#050505] text-white"
>
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/5 shadow-[0_10px_30px_rgba(245,197,24,0.08)]">
            <RefreshCw className="h-5 w-5 animate-spin text-[#F5C518]" />
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            Loading preferences...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
  style={
    {
      "--leads-divider": isLightMode
        ? "#E3E3E8"
        : "#202020",
    } as CSSProperties
  }
  className="min-h-full bg-[#050505] text-white"
>
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setSelectedLeadId(null)
            }
          />

          <LeadDetailPanel
            lead={selectedLead}
            onClose={() =>
              setSelectedLeadId(null)
            }
            showOpportunityScore={
              showOpportunityScore
            }
          />
        </>
      )}

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>BaseLead</span>
              <span>/</span>
              <span className="text-zinc-300">
                Leads
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Leads
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Manage, qualify, and convert your discovered businesses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-sm text-zinc-400 shadow-[0_5px_18px_rgba(0,0,0,0.2)] transition hover:border-[#2A2A2A] hover:bg-[#101010] sm:flex">
              <MapPin className="h-4 w-4 text-[#F0475C]" />

              <span>{location}</span>

              <span className="text-zinc-600">
                ⌄
              </span>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-sm text-zinc-400 shadow-[0_5px_18px_rgba(0,0,0,0.2)] transition hover:border-[#2A2A2A] hover:bg-[#101010] md:flex">
              <CalendarDays className="h-4 w-4 text-[#60A5FA]" />

              <span>All time</span>

              <span className="text-zinc-600">
                ⌄
              </span>
            </div>

            <button
              onClick={loadLeads}
              disabled={isLoading}
              className="group flex h-10 items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 text-sm text-zinc-300 shadow-[0_5px_18px_rgba(0,0,0,0.2)] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 transition-transform ${
                  isLoading
                    ? "animate-spin"
                    : "group-hover:rotate-45"
                }`}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              onClick={exportCsv}
              disabled={
                filteredLeads.length === 0
              }
              className="group flex h-10 items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 text-sm text-zinc-300 shadow-[0_5px_18px_rgba(0,0,0,0.2)] transition-all duration-200 hover:border-[#84CC16]/25 hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_25px_rgba(132,204,22,0.05)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4 text-[#84CC16] transition-transform group-hover:-translate-y-0.5" />

              <span className="hidden sm:inline">
                Export
              </span>
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="Total Leads"
            value={leads.length}
            icon={
              <Users className="h-4 w-4" />
            }
            detail="Saved to your account"
            accent="yellow"
          />

          <Metric
            label="High Opportunity"
            value={highOpportunityCount}
            icon={
              <Sparkles className="h-4 w-4" />
            }
            detail="AI-qualified opportunities"
            accent="green"
          />

          <Metric
            label="Contacted"
            value={contactedCount}
            icon={
              <Mail className="h-4 w-4" />
            }
            detail="Leads beyond new"
            accent="blue"
          />

          <Metric
            label="Average Score"
            value={
              showOpportunityScore
                ? averageScore
                : "—"
            }
            icon={
              <Star className="h-4 w-4" />
            }
            detail={
              showOpportunityScore
                ? `${totalReviews.toLocaleString()} total reviews`
                : "Opportunity scores hidden"
            }
            accent="purple"
          />
        </div>

        <div className="relative mt-7 overflow-hidden rounded-2xl border border-[#202020] bg-[#0A0A0A] shadow-[0_12px_35px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="border-b border-[var(--leads-divider)] bg-[#0A0A0A] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="group relative min-w-0 flex-1 lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-[#F5C518]" />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    setCurrentPage(1);
                  }}
                  placeholder="Search leads..."
                  className="h-10 w-full rounded-xl border border-[#202020] bg-[#0D0D0D] pl-10 pr-4 text-sm text-white outline-none shadow-[0_5px_16px_rgba(0,0,0,0.2)] placeholder:text-zinc-600 transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#101010] focus:border-[#F5C518]/40 focus:bg-[#101010] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.05),0_8px_24px_rgba(0,0,0,0.25)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setShowFilters(
                      (value) => !value
                    )
                  }
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm shadow-[0_5px_16px_rgba(0,0,0,0.18)] transition-all duration-200 ${
                    showFilters
                      ? "border-[#F5C518]/30 bg-[#F5C518]/10 text-[#F5C518] shadow-[0_8px_24px_rgba(245,197,24,0.06)]"
                      : "border-[#202020] bg-[#0D0D0D] text-zinc-400 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />

                  <span>Filters</span>

                  {[
                    industry,
                    status,
                    opportunity,
                    source,
                  ].filter(Boolean).length >
                    0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5C518] px-1 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(245,197,24,0.2)]">
                      {
                        [
                          industry,
                          status,
                          opportunity,
                          source,
                        ].filter(Boolean)
                          .length
                      }
                    </span>
                  )}
                </button>

                {selectedIds.length > 0 && (
                  <div className="hidden items-center gap-2 rounded-xl border border-[#F5C518]/20 bg-[#F5C518]/5 px-3 text-xs text-[#F5C518] shadow-[0_5px_18px_rgba(245,197,24,0.04)] sm:flex">
                    {selectedIds.length}{" "}
                    selected
                  </div>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--leads-divider)] pt-4">
                <SelectControl
                  value={industry}
                  onChange={(value) => {
                    setIndustry(value);
                    setCurrentPage(1);
                  }}
                  options={industries}
                  placeholder="All industries"
                />

                <SelectControl
                  value={status}
                  onChange={(value) => {
                    setStatus(value);
                    setCurrentPage(1);
                  }}
                  options={[
                    "New",
                    "Contacted",
                    "Responded",
                    "Meeting",
                    "Proposal",
                    "Won",
                    "Lost",
                  ]}
                  placeholder="All statuses"
                />

                <SelectControl
                  value={opportunity}
                  onChange={(value) => {
                    setOpportunity(value);
                    setCurrentPage(1);
                  }}
                  options={[
                    "High",
                    "Medium",
                    "Low",
                  ]}
                  placeholder="All opportunities"
                />

                <SelectControl
                  value={source}
                  onChange={(value) => {
                    setSource(value);
                    setCurrentPage(1);
                  }}
                  options={[
                    "Google Maps",
                    "Google Search",
                    "Instagram",
                    "Facebook",
                    "Website Scan",
                  ]}
                  placeholder="All sources"
                />

                {[
                  industry,
                  status,
                  opportunity,
                  source,
                ].some(Boolean) && (
                  <button
                    onClick={resetFilters}
                    className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-zinc-500 transition hover:text-white"
                  >
                    <X className="h-4 w-4" />

                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {loadError && (
            <div className="m-4 flex flex-col gap-3 rounded-xl border border-[#F0475C]/20 bg-[#F0475C]/5 p-4 shadow-[0_8px_24px_rgba(240,71,92,0.04)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-[#F0475C]">
                  {loadError}
                </div>

                <div className="mt-1 text-xs text-[#F0475C]/60">
                  Check your Supabase connection and try again.
                </div>
              </div>

              <button
                onClick={loadLeads}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[#F0475C]/20 px-3 text-xs text-[#F0475C] transition hover:bg-[#F0475C]/10 hover:shadow-[0_6px_18px_rgba(240,71,92,0.06)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />

                Try again
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/5 shadow-[0_12px_35px_rgba(245,197,24,0.08)]">
                <RefreshCw className="h-6 w-6 animate-spin text-[#F5C518]" />
              </div>

              <div className="mt-4 text-sm font-medium text-white">
                Loading your leads...
              </div>

              <div className="mt-1 text-xs text-zinc-600">
                Connecting to your BaseLead database
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F5C518]/10 bg-[#F5C518]/5 shadow-[0_12px_35px_rgba(245,197,24,0.08)]">
                <Sparkles className="h-7 w-7 text-[#F5C518]" />
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                No leads yet
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Your discovered businesses will appear here once you run a search from Lead Discovery.
              </p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                <Filter className="h-5 w-5 text-zinc-600" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                No matching leads
              </h3>

              <p className="mt-1 text-xs text-zinc-600">
                Try changing your search or filters.
              </p>

              <button
                onClick={resetFilters}
                className="mt-4 rounded-lg border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-xs text-zinc-400 shadow-[0_4px_14px_rgba(0,0,0,0.2)] transition hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {defaultLeadView ===
              "Grid View" ? (
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleLeads.map(
                    (lead) => (
                      <button
                        key={lead.id}
                        onClick={() =>
                          setSelectedLeadId(
                            lead.id
                          )
                        }
                        className="group relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:border-[#F5C518]/25 hover:bg-[#101010] hover:shadow-[0_18px_42px_rgba(0,0,0,0.38),0_0_25px_rgba(245,197,24,0.035)]"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/0 to-transparent transition-all duration-300 group-hover:via-[#F5C518]/35" />

                        <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-[#F5C518]/0 blur-3xl transition-all duration-500 group-hover:bg-[#F5C518]/[0.04]" />

                        <div className="relative flex items-start gap-3">
                          <LeadAvatar
                            name={lead.name}
                            score={
                              lead.score
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#F5C518]">
                              {lead.name}
                            </div>

                            <div className="mt-1 truncate text-xs text-zinc-500">
                              {lead.category}
                            </div>

                            <div className="mt-2 flex items-center gap-1 text-xs text-zinc-600">
                              <MapPin className="h-3 w-3 text-[#F0475C]" />

                              <span className="truncate">
                                {lead.location}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="relative mt-5 flex items-center justify-between">
                          {showOpportunityScore ? (
                            <div>
                              <div
                                className={`text-2xl font-semibold ${scoreColor(
                                  lead.score
                                )}`}
                              >
                                {formatScore(
                                  lead.score
                                )}
                              </div>

                              <div className="text-[9px] uppercase tracking-wider text-zinc-600">
                                Opportunity Score
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-600">
                              Opportunity score hidden
                            </div>
                          )}

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${opportunityStyle(
                              lead.opportunity
                            )}`}
                          >
                            {lead.opportunity}
                          </span>
                        </div>

                        <div className="relative mt-4 flex items-center justify-between border-t border-[#202020] pt-4">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] shadow-sm ${statusStyle(
                              lead.status
                            )}`}
                          >
                            {lead.status}
                          </span>

                          <span className="text-xs text-zinc-600">
                            {formatDate(
                              lead.createdAt
                            )}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <div className="min-w-[1180px]">
                      <div className="grid grid-cols-[32px_minmax(250px,1.7fr)_minmax(150px,1fr)_90px_120px_120px_110px] items-center gap-4 border-b border-[color:var(--leads-divider)] bg-[#101010] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600 shadow-[0_5px_16px_rgba(0,0,0,0.2)]">
                        <button
                          onClick={toggleSelectAll}
                          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                            allVisibleSelected
                              ? "border-[#F5C518] bg-[#F5C518] text-black shadow-[0_0_10px_rgba(245,197,24,0.2)]"
                              : "border-zinc-700 hover:border-[#2A2A2A]"
                          }`}
                        >
                          {allVisibleSelected && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>

                        <span>Lead</span>

                        <span>Location</span>

                        <span>
                          {showOpportunityScore
                            ? "Score"
                            : ""}
                        </span>

                        <span>
                          Opportunity
                        </span>

                        <span>Status</span>

                        <span>Added</span>
                      </div>

                      {visibleLeads.map(
                        (lead) => (
                          <LeadRow
                            key={lead.id}
                            lead={lead}
                            selected={selectedIds.includes(
                              lead.id
                            )}
                            onSelect={() =>
                              toggleSelected(
                                lead.id
                              )
                            }
                            onOpen={() =>
                              setSelectedLeadId(
                                lead.id
                              )
                            }
                            showOpportunityScore={
                              showOpportunityScore
                            }
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 p-4 lg:hidden">
                    {visibleLeads.map(
                      (lead) => (
                        <MobileLeadRow
                          key={lead.id}
                          lead={lead}
                          selected={selectedIds.includes(
                            lead.id
                          )}
                          onSelect={() =>
                            toggleSelected(
                              lead.id
                            )
                          }
                          onOpen={() =>
                            setSelectedLeadId(
                              lead.id
                            )
                          }
                          showOpportunityScore={
                            showOpportunityScore
                          }
                        />
                      )
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3 border-t border-[#202020] bg-[#0A0A0A] px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.16)] sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-600">
                  Showing{" "}
                  <span className="text-zinc-400">
                    {filteredLeads.length ===
                    0
                      ? 0
                      : (currentPage - 1) *
                          ITEMS_PER_PAGE +
                        1}
                  </span>{" "}
                  –{" "}
                  <span className="text-zinc-400">
                    {Math.min(
                      currentPage *
                        ITEMS_PER_PAGE,
                      filteredLeads.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="text-zinc-400">
                    {filteredLeads.length}
                  </span>{" "}
                  leads
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202020] bg-[#0D0D0D] text-zinc-500 shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5 rotate-90" />
                  </button>

                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) =>
                      index + 1
                  )
                    .slice(
                      Math.max(
                        0,
                        currentPage - 3
                      ),
                      Math.min(
                        totalPages,
                        currentPage + 2
                      )
                    )
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() =>
                          setCurrentPage(
                            page
                          )
                        }
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs shadow-sm transition-all duration-200 ${
                          page ===
                          currentPage
                            ? "bg-[#F5C518] font-semibold text-black shadow-[0_0_14px_rgba(245,197,24,0.18)]"
                            : "text-zinc-500 hover:bg-[#171717] hover:text-white"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  <button
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202020] bg-[#0D0D0D] text-zinc-500 shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}