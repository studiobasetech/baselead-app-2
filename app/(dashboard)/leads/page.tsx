"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  CalendarDays,
  ChevronDown,
  Clipboard,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  List,
  Send,
  MessageCircle,
  Handshake,
  Download,
  LayoutGrid,
  GitBranch,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { recommendedServices } from "@/lib/recommendations";
import OpportunityMap from "@/components/maps/OpportunityMap";

/* =========================================================
   TYPES
========================================================= */

type LeadStatus =
  | "new"
  | "contacted"
  | "responded"
  | "client"
  | "pipeline"
  | "qualified"
  | "lost"
  | string;

type RecentRange =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "90d";

type Lead = {
  id: string;
  name: string;
  company: string;
  category: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website: string;
  logo: string;
  score: number;
  opportunity:
    | "High Opportunity"
    | "Medium Opportunity";
  services: string[];
  projectValue: string;

  instagram?: boolean;
  facebook?: boolean;
  linkedin?: boolean;
  x?: boolean;
  tiktok?: boolean;
  pinterest?: boolean;
  googleMaps?: boolean;

  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  xUrl?: string;
  tiktokUrl?: string;
  pinterestUrl?: string;
  googleMapsUrl?: string;

  websiteExists: boolean;
  reviews: number;
  founded: number | null;
  employees: string;
  reason: string[];
  phoneNumbers: string[];
  emailAddresses: string[];
  notes: string;
  status: LeadStatus;
  source?: string;
  rating?: number | null;
  createdAt?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type DiscoveryView =
  | "Leads"
  | "Opportunity Radar";

type CompanyContext = {
  id: string;
  companyName: string;
  industry: string;
  niche: string;
  targetCustomer: string;
  targetLocations: string[];
  services: string[];
  minProjectValue: number | null;
  maxProjectValue: number | null;
  sellingPoints: string;
};

type AdvancedFilters = {
  status: string;
  minScore: string;
  website: string;
  social: string;
  industry: string;
  minProjectValue: string;
  minRating: string;
};

/* =========================================================
   SUPABASE
========================================================= */

const supabase = createClient();

/* =========================================================
   HELPERS
========================================================= */

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? "",
    )
    .join("");
}

function formatProjectValue(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (
    (!min || min <= 0) &&
    (!max || max <= 0)
  ) {
    return "Not estimated";
  }

  const format = (value: number) => {
    if (value >= 1000000) {
      const formatted =
        value / 1000000;

      return `$${Number.isInteger(
        formatted,
      )
        ? formatted
        : formatted.toFixed(1)}M`;
    }

    if (value >= 1000) {
      const formatted =
        value / 1000;

      return `$${Number.isInteger(
        formatted,
      )
        ? formatted
        : formatted.toFixed(1)}K`;
    }

    return `$${Math.round(value)}`;
  };

  if (
    min &&
    min > 0 &&
    max &&
    max > 0
  ) {
    return `${format(min)} – ${format(max)}`;
  }

  if (min && min > 0) {
    return `${format(min)}+`;
  }

  return `Up to ${format(max ?? 0)}`;
}

function getScoreClass(
  score: number,
) {
  if (score >= 80) {
    return "text-[#84CC16]";
  }

  return "text-[#3B82F6]";
}

function getOpportunity(
  score: number,
) {
  return score >= 80
    ? "High Opportunity"
    : "Medium Opportunity";
}

function parseProjectValue(
  value: string | number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const text = String(value)
    .trim()
    .toUpperCase();

  if (!text) {
    return 0;
  }

  const matches = [
    ...text.matchAll(
      /(\d+(?:\.\d+)?)\s*(K|M|B)?/g,
    ),
  ];

  if (matches.length === 0) {
    return 0;
  }

  return Math.max(
    ...matches.map((match) => {
      const number =
        Number(match[1]) || 0;

      const suffix =
        match[2] || "";

      if (suffix === "B") {
        return number * 1000000000;
      }

      if (suffix === "M") {
        return number * 1000000;
      }

      if (suffix === "K") {
        return number * 1000;
      }

      return number;
    }),
  );
}

function normalizeExternalUrl(
  value?: string | null,
) {
  const trimmed =
    value?.trim() || "";

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith(
      "http://",
    ) ||
    trimmed.startsWith(
      "https://",
    )
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeSocialUrl(
  value?: string | null,
) {
  return Boolean(
    value && value.trim(),
  );
}

function hasSocialPresence(
  lead: Lead,
) {
  return Boolean(
    lead.instagramUrl ||
      lead.facebookUrl ||
      lead.linkedinUrl ||
      lead.xUrl ||
      lead.tiktokUrl ||
      lead.pinterestUrl,
  );
}

function normalizeText(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function locationMatches(
  lead: Lead,
  selectedLocation: string,
) {
  if (
    !selectedLocation ||
    selectedLocation ===
      "All locations"
  ) {
    return true;
  }

  const target =
    normalizeText(
      selectedLocation,
    );

  const candidates = [
    lead.location,
    lead.address,
    lead.city,
    lead.state,
    lead.country,
    [
      lead.city,
      lead.state,
    ]
      .filter(Boolean)
      .join(", "),
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (
    candidates.some(
      (candidate) =>
        candidate === target ||
        candidate.includes(target) ||
        target.includes(candidate),
    )
  ) {
    return true;
  }

  const targetParts =
    target
      .split(",")
      .map((part) =>
        part.trim(),
      )
      .filter(Boolean);

  if (targetParts.length > 0) {
    return targetParts.every(
      (part) =>
        candidates.some(
          (candidate) =>
            candidate.includes(
              part,
            ),
        ),
    );
  }

  return false;
}

function isRecent(
  createdAt: string | undefined,
  range: RecentRange,
) {
  if (
    range === "all" ||
    !createdAt
  ) {
    return true;
  }

  const created =
    new Date(createdAt);

  if (
    Number.isNaN(
      created.getTime(),
    )
  ) {
    return false;
  }

  const now = new Date();

  if (range === "today") {
    return (
      created.getFullYear() ===
        now.getFullYear() &&
      created.getMonth() ===
        now.getMonth() &&
      created.getDate() ===
        now.getDate()
    );
  }

  const days =
    range === "7d"
      ? 7
      : range === "30d"
        ? 30
        : 90;

  const cutoff =
    Date.now() -
    days *
      24 *
      60 *
      60 *
      1000;

  return (
    created.getTime() >= cutoff
  );
}

function getRecentLabel(
  range: RecentRange,
) {
  switch (range) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    default:
      return "All Leads";
  }
}

/* =========================================================
   TARGET LOCATIONS
========================================================= */

function normalizeTargetLocations(
  value: unknown,
): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => {
            if (
              typeof item ===
              "string"
            ) {
              return [item];
            }

            if (
              item &&
              typeof item ===
                "object"
            ) {
              const object =
                item as Record<
                  string,
                  unknown
                >;

              const candidate =
                object.name ??
                object.location ??
                object.label ??
                object.address ??
                object.city;

              if (
                typeof candidate ===
                "string"
              ) {
                return [candidate];
              }
            }

            return [];
          })
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(trimmed);

      if (parsed !== value) {
        return normalizeTargetLocations(
          parsed,
        );
      }
    } catch {
      // Legacy plain text.
    }

    return Array.from(
      new Set(
        trimmed
          .split(/[\n;,]+/)
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean),
      ),
    );
  }

  if (
    typeof value === "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    const candidate =
      object.name ??
      object.location ??
      object.label ??
      object.address ??
      object.city;

    if (
      typeof candidate ===
      "string"
    ) {
      return [candidate.trim()].filter(
        Boolean,
      );
    }

    for (const key of [
      "locations",
      "target_locations",
      "values",
      "items",
    ]) {
      if (object[key]) {
        const normalized =
          normalizeTargetLocations(
            object[key],
          );

        if (
          normalized.length > 0
        ) {
          return normalized;
        }
      }
    }
  }

  return [];
}

/* =========================================================
   COMPANY SERVICES
========================================================= */

function normalizeCompanyServices(
  value: unknown,
): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => {
            if (
              typeof item ===
              "string"
            ) {
              return [item];
            }

            if (
              item &&
              typeof item ===
                "object"
            ) {
              const object =
                item as Record<
                  string,
                  unknown
                >;

              const candidate =
                object.name ??
                object.service ??
                object.title ??
                object.label;

              if (
                typeof candidate ===
                "string"
              ) {
                return [candidate];
              }
            }

            return [];
          })
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(trimmed);

      if (parsed !== value) {
        return normalizeCompanyServices(
          parsed,
        );
      }
    } catch {
      // Legacy plain text.
    }

    return trimmed
      .split(/[\n;,]+/)
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);
  }

  if (
    typeof value ===
    "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    for (const key of [
      "services",
      "items",
      "values",
    ]) {
      if (object[key]) {
        const normalized =
          normalizeCompanyServices(
            object[key],
          );

        if (
          normalized.length > 0
        ) {
          return normalized;
        }
      }
    }

    const candidate =
      object.name ??
      object.service ??
      object.title ??
      object.label;

    if (
      typeof candidate ===
      "string"
    ) {
      return [candidate.trim()].filter(
        Boolean,
      );
    }
  }

  return [];
}

/* =========================================================
   COMPANY CONTEXT
========================================================= */

function getCompanyServiceSummary(
  services: string[],
) {
  if (services.length === 0) {
    return "No services configured yet";
  }

  if (services.length <= 2) {
    return services.join(" • ");
  }

  return `${services
    .slice(0, 2)
    .join(" • ")} +${services.length - 2} more`;
}

function getProjectValueSummary(
  min: number | null,
  max: number | null,
) {
  return formatProjectValue(
    min,
    max,
  );
}

/* =========================================================
   DATABASE → LEAD
========================================================= */

function databaseLeadToLead(
  row: any,
): Lead {
  const raw =
    row.raw_data ?? {};

  const phoneNumbers =
    Array.isArray(
      row.phone_numbers,
    )
      ? row.phone_numbers.filter(
          Boolean,
        )
      : row.phone
        ? [row.phone]
        : [];

  const emailAddresses =
    Array.isArray(
      row.email_addresses,
    )
      ? row.email_addresses.filter(
          Boolean,
        )
      : row.email
        ? [row.email]
        : [];

  const score = Math.max(
    0,
    Math.min(
      100,
      typeof row.ai_score ===
        "number"
        ? row.ai_score
        : typeof row.intent_score ===
            "number"
          ? row.intent_score
          : 0,
    ),
  );

  const category =
    row.category ||
    row.industry ||
    raw.category ||
    raw.industry ||
    "Business";

  const location =
    row.location ||
    [row.city, row.state]
      .filter(Boolean)
      .join(", ") ||
    "Location unavailable";

  const website =
    row.website ||
    raw.website ||
    "";

  const instagramUrl =
    normalizeExternalUrl(
      row.instagram_url,
    );

  const facebookUrl =
    normalizeExternalUrl(
      row.facebook_url,
    );

  const linkedinUrl =
    normalizeExternalUrl(
      row.linkedin_url,
    );

  const xUrl =
    normalizeExternalUrl(
      row.x_url,
    );

  const tiktokUrl =
    normalizeExternalUrl(
      row.tiktok_url,
    );

  const pinterestUrl =
    normalizeExternalUrl(
      row.pinterest_url,
    );

  const googleMapsUrl =
    normalizeExternalUrl(
      row.google_maps_url,
    );

  const reasons: string[] =
    [];

  if (score >= 80) {
    reasons.push(
      "High opportunity score based on your current lead criteria",
    );
  }

  if (website) {
    reasons.push(
      "Business has an existing online presence",
    );
  } else {
    reasons.push(
      "No website detected",
    );
  }

  if (
    instagramUrl ||
    facebookUrl ||
    linkedinUrl ||
    xUrl ||
    tiktokUrl ||
    pinterestUrl
  ) {
    reasons.push(
      "Business has an active social presence",
    );
  }

  if (row.review_count) {
    reasons.push(
      `Established local presence with ${row.review_count} reviews`,
    );
  }

  if (
    location !==
    "Location unavailable"
  ) {
    reasons.push(
      "Located in a defined target market",
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "Lead matches the current discovery criteria",
    );
  }

  const rawServices: unknown[] =
    recommendedServices(
      row.ai_recommendations,
    );

  const services =
    rawServices
      .map((item: any) => {
        if (
          typeof item ===
          "string"
        ) {
          return item;
        }

        if (item?.service) {
          return item.service;
        }

        if (item?.name) {
          return item.name;
        }

        return null;
      })
      .filter(Boolean)
      .slice(0, 3);

  return {
    id: String(row.id),

    name:
      row.name ||
      row.company ||
      "Unnamed Lead",

    company:
      row.company ||
      row.name ||
      "Unnamed Company",

    category,

    location,

    address:
      row.address || "",

    latitude:
      typeof row.latitude === "number"
        ? row.latitude
        : row.latitude
        ? Number(row.latitude)
        : null,

    longitude:
      typeof row.longitude === "number"
        ? row.longitude
        : row.longitude
        ? Number(row.longitude)
        : null,

    city:
      row.city || "",

    state:
      row.state || "",

    country:
      row.country || "",

    website,

    logo:
      getInitials(
        row.company ||
          row.name ||
          "Lead",
      ) || "LEAD",

    score,

    opportunity:
      getOpportunity(score),

    services,

    projectValue:
      raw.project_value ||
      row.project_value ||
      "Not estimated",

    instagram:
      Boolean(instagramUrl),

    facebook:
      Boolean(facebookUrl),

    linkedin:
      Boolean(linkedinUrl),

    x: Boolean(xUrl),

    tiktok:
      Boolean(tiktokUrl),

    pinterest:
      Boolean(pinterestUrl),

    googleMaps:
      Boolean(googleMapsUrl),

    instagramUrl,

    facebookUrl,

    linkedinUrl,

    xUrl,

    tiktokUrl,

    pinterestUrl,

    googleMapsUrl,

    websiteExists:
      Boolean(website),

    reviews:
      Number(
        row.review_count,
      ) || 0,

    founded:
      raw.founded ||
      raw.founding_year ||
      null,

    employees:
      raw.employees ||
      raw.employee_count ||
      "Not available",

    reason: reasons,

    phoneNumbers,

    emailAddresses,

    notes:
      row.notes || "",

    status:
      row.status || "new",

    source:
      row.source || "",

    rating:
      row.rating !== null &&
      row.rating !== undefined
        ? Number(row.rating)
        : null,

    createdAt:
      row.created_at ||
      undefined,
  };
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  title,
  value,
  change,
  iconClassName,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  iconClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-[#0D0D0D] p-4 lg:p-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        <div
          className={`baselead-icon-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            iconClassName ?? ""
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm leading-tight text-gray-400 sm:truncate">
            {title}
          </p>

          <p className="mt-0.5 text-xl font-medium tracking-tight text-white lg:text-2xl">
            {value}
          </p>

          <p className="mt-1 text-xs text-[#84CC16]">
            {change}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LEAD LOGO
========================================================= */

function LeadLogo({
  lead,
}: {
  lead: Lead;
}) {
  const logoClasses =
    lead.score >= 90
      ? "bg-black text-white"
      : lead.score >= 80
        ? "bg-[#18200B] text-white"
        : lead.score >= 70
          ? "bg-[#10243A] text-[#3B82F6]"
          : "bg-[#10243A] text-white";

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tracking-wide ${logoClasses} lg:h-14 lg:w-14 lg:text-xs`}
    >
      {lead.logo}
    </div>
  );
}

/* =========================================================
   SOCIAL ICONS
========================================================= */

function SocialIcons({
  lead,
  size = "small",
}: {
  lead: Lead;
  size?: "small" | "large";
}) {
  const iconClass =
    size === "large"
      ? "h-5 w-5 text-xs"
      : "h-4 w-4 text-[10px]";

  const links = [
    {
      label: "Instagram",
      url: lead.instagramUrl,
      content: "◎",
      className:
        "rounded-[6px] border border-[#F472B6] font-bold text-[#F472B6]",
    },
    {
      label: "Facebook",
      url: lead.facebookUrl,
      content: "f",
      className:
        "rounded-full bg-[#3B82F6] font-bold text-white",
    },
    {
      label: "LinkedIn",
      url: lead.linkedinUrl,
      content: "in",
      className:
        "rounded-[4px] bg-[#3B82F6] font-bold text-white",
    },
    {
      label: "X",
      url: lead.xUrl,
      content: "X",
      className:
        "rounded-full border border-white/30 font-bold text-white",
    },
    {
      label: "TikTok",
      url: lead.tiktokUrl,
      content: "♪",
      className:
        "rounded-full border border-white/20 font-bold text-white",
    },
    {
      label: "Pinterest",
      url: lead.pinterestUrl,
      content: "P",
      className:
        "rounded-full bg-[#F22F46] font-bold text-white",
    },
    {
      label: "Google Maps",
      url: lead.googleMapsUrl,
      content: "↗",
      className:
        "rounded-full border border-[#84CC16]/40 font-bold text-[#84CC16]",
    },
  ].filter(
    (item) => item.url,
  );

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
          title={item.label}
          onClick={(event) =>
            event.stopPropagation()
          }
          className={`flex ${iconClass} items-center justify-center transition hover:scale-110 ${item.className}`}
        >
          {item.content}
        </a>
      ))}
    </div>
  );
}

/* =========================================================
   LEAD CARD
========================================================= */

function LeadCard({
  lead,
  selected,
  onSelect,
  onQuickAction,
  checked = false,
  onToggleCheck,
  compact = false,
}: {
  lead: Lead;
  selected: boolean;
  onSelect: () => void;
  checked?: boolean;
  onToggleCheck?: () => void;
  compact?: boolean;
  onQuickAction: (
    action:
      | "view"
      | "pipeline"
      | "email",
  ) => void;
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (
          event.key ===
            "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`lead-discovery-row baselead-lead-card group w-full cursor-pointer rounded-xl border bg-[#0D0D0D] text-left transition ${
        selected
          ? "border-[#3B82F6]/70"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className={compact ? "grid gap-3 p-4" : "grid items-center gap-4 p-4 lg:grid-cols-[minmax(250px,1.3fr)_120px_minmax(250px,1fr)_70px] lg:px-5 lg:py-4"}>
        <div className="flex min-w-0 items-center gap-3">
          {onToggleCheck && (
            <input
              type="checkbox"
              checked={checked}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={onToggleCheck}
              aria-label={`Select ${lead.company || lead.name}`}
              className="h-4 w-4 shrink-0 cursor-pointer accent-[#3B82F6]"
            />
          )}
          <LeadLogo lead={lead} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-medium text-white">
                {lead.name}
              </h3>

              <span className="text-[#3B82F6]">
                ●
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {lead.category}

              <span className="mx-1.5">
                •
              </span>

              {lead.location}
            </p>

            <div className="mt-2 flex min-w-0 items-center gap-2">
              {lead.website ? (
                <a
                  href={normalizeExternalUrl(
                    lead.website,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  className="flex min-w-0 items-center gap-1 truncate text-sm text-[#3B82F6] hover:text-[#3B82F6]"
                >
                  <span className="truncate">
                    {lead.website}
                  </span>

                  <ExternalLink
                    size={12}
                    className="shrink-0"
                  />
                </a>
              ) : (
                <span className="text-sm text-gray-600">
                  No website
                </span>
              )}

              <SocialIcons
                lead={lead}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 lg:pl-5 lg:pt-0">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-medium ${getScoreClass(
                lead.score,
              )}`}
            >
              {lead.score}
            </span>

            <span className="text-sm text-gray-500">
              /100
            </span>
          </div>

          <p
            className={`mt-1 text-xs ${
              lead.opportunity ===
              "High Opportunity"
                ? "text-[#84CC16]"
                : "text-[#3B82F6]"
            }`}
          >
            {lead.opportunity}
          </p>
        </div>

        <div className="pt-3 lg:pl-5 lg:pt-0">
          <p className="mb-2 text-sm text-gray-400">
            Recommended Services
          </p>

          <div className="flex flex-wrap gap-1.5">
            {lead.services.length >
            0 ? (
              lead.services.map(
                (service) => (
                  <span
                    key={service}
                    className="rounded-md bg-[#3B82F6] px-2 py-1 text-xs font-medium text-white"
                  >
                    {service}
                  </span>
                ),
              )
            ) : (
              <span className="text-sm text-gray-600">
                Recommendations pending
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Est. Value:{" "}
            <span className="text-gray-300">
              {lead.projectValue}
            </span>
          </p>
        </div>

        <div className="relative hidden items-center justify-end gap-2 lg:flex">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickAction(
                "view",
              );
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-400 transition hover:border-white/20 hover:text-white"
            aria-label="View lead"
          >
            <Eye size={17} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(
                (current) =>
                  !current,
              );
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-400 transition hover:border-white/20 hover:text-white"
            aria-label="Lead actions"
          >
            <MoreHorizontal
              size={17}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#101010] p-1.5 shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onQuickAction(
                    "view",
                  );
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <Eye size={14} />
                View Details
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onQuickAction(
                    "pipeline",
                  );
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <Target size={14} />
                Add to Pipeline
              </button>

              {lead.emailAddresses
                .length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction(
                      "email",
                    );
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white"
                >
                  <Mail size={14} />
                  Email Lead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LEAD DETAIL PANEL
========================================================= */

function LeadDetailPanel({
  lead,
  companyContext,
  onClose,
  onPipeline,
  addingToPipeline,
  onSaveNotes,
  onGenerateOutreach,
}: {
  lead: Lead;
  companyContext:
    | CompanyContext
    | null;
  onClose: () => void;
  onPipeline: () => void;
  addingToPipeline: boolean;
  onSaveNotes: (
    notes: string,
  ) => Promise<void>;
  onGenerateOutreach: () => void;
}) {
  const [
    activeDetailTab,
    setActiveDetailTab,
  ] = useState<
    "info" | "notes"
  >("info");

  const [notes, setNotes] =
    useState(
      lead.notes || "",
    );

  const [savingNotes, setSavingNotes] =
    useState(false);

  useEffect(() => {
    setNotes(
      lead.notes || "",
    );
    setActiveDetailTab(
      "info",
    );
  }, [lead.id, lead.notes]);

  const isAlreadyPipeline =
    lead.status === "pipeline" ||
    lead.status ===
      "qualified" ||
    lead.status ===
      "contacted" ||
    lead.status ===
      "responded" ||
    lead.status === "client";

  async function saveNotes() {
    setSavingNotes(true);

    try {
      await onSaveNotes(
        notes,
      );
    } finally {
      setSavingNotes(false);
    }
  }

  function openEmail() {
    const email =
      lead.emailAddresses[0];

    if (!email) {
      return;
    }

    const subject =
      `Quick question for ${lead.company}`;

    const body =
      `Hi ${lead.name || "there"},\n\n`;

    window.location.href =
      `mailto:${email}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(
        body,
      )}`;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <LeadLogo lead={lead} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-lg font-medium text-white">
                {lead.name}
              </h2>

              <span className="text-[#3B82F6]">
                ●
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {lead.category}

              <span className="mx-1.5">
                •
              </span>

              {lead.location}
            </p>

            {lead.website && (
              <a
                href={normalizeExternalUrl(
                  lead.website,
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 truncate text-sm text-[#3B82F6] hover:text-[#3B82F6]"
              >
                <span className="truncate">
                  {lead.website}
                </span>

                <ExternalLink
                  size={12}
                  className="shrink-0"
                />
              </a>
            )}

            <div className="mt-2">
              <SocialIcons
                lead={lead}
                size="large"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:text-white"
          aria-label="Close lead details"
        >
          <X size={17} />
        </button>
      </div>

      {(lead.phoneNumbers
        .length > 0 ||
        lead.emailAddresses
          .length > 0 ||
        lead.address) && (
        <div className="mt-5 rounded-xl border border-white/10 bg-[#0D0D0D] p-4">
          <h3 className="text-sm font-medium text-white">
            Contact Information
          </h3>

          <div className="mt-3 space-y-3">
            {lead.phoneNumbers
              .length > 0 && (
              <div>
                <p className="text-xs text-gray-600">
                  Phone
                </p>

                <div className="mt-1 space-y-1">
                  {lead.phoneNumbers.map(
                    (phone) => (
                      <a
                        key={phone}
                        href={`tel:${phone}`}
                        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                      >
                        <Phone
                          size={13}
                        />
                        {phone}
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}

            {lead.emailAddresses
              .length > 0 && (
              <div>
                <p className="text-xs text-gray-600">
                  Email
                </p>

                <div className="mt-1 space-y-1">
                  {lead.emailAddresses.map(
                    (email) => (
                      <a
                        key={email}
                        href={`mailto:${email}`}
                        className="flex items-start gap-2 break-all text-sm text-[#3B82F6] hover:text-[#3B82F6]"
                      >
                        <Mail
                          size={13}
                          className="mt-0.5 shrink-0"
                        />
                        {email}
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}

            {lead.address && (
              <div>
                <p className="text-xs text-gray-600">
                  Address
                </p>

                <p className="mt-1 text-sm leading-5 text-gray-300">
                  {lead.address}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-white/10 bg-[#0D0D0D] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-medium">
                Opportunity Score
              </p>

              <span className="text-xs text-gray-600">
                ?
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              <span
                className={`text-3xl font-medium ${getScoreClass(
                  lead.score,
                )}`}
              >
                {lead.score}
              </span>

              <span className="text-sm text-gray-500">
                /100
              </span>
            </div>

            <span className="mt-2 inline-flex rounded-md bg-[#84CC16]/10 px-2.5 py-1 text-sm text-[#84CC16]">
              {lead.opportunity}
            </span>
          </div>

          <div className="relative h-20 w-20">
            <div
              className="absolute inset-0 rounded-full border-[7px] border-white/10"
              style={{
                borderTopColor:
                  lead.score >= 80
                    ? "#84CC16"
                    : "#3B82F6",
                borderLeftColor:
                  lead.score >= 80
                    ? "#84CC16"
                    : "#3B82F6",
                transform:
                  "rotate(-35deg)",
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <Target
                size={22}
                className="text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 border-b border-white/10 pb-5">
        <h3 className="text-base font-medium">
          Why this is a great opportunity
        </h3>

        <div className="mt-4 space-y-3">
          {lead.reason.map(
            (reason) => (
              <div
                key={reason}
                className="flex items-start gap-2.5"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#84CC16]/20 text-[10px] text-[#84CC16]">
                  ✓
                </span>

                <span className="text-sm leading-5 text-gray-400">
                  {reason}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-medium">
          Recommended Services
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {lead.services.length >
          0 ? (
            lead.services.map(
              (service) => (
                <span
                  key={service}
                  className="rounded-md bg-[#3B82F6] px-2.5 py-1.5 text-xs font-medium text-white"
                >
                  {service}
                </span>
              ),
            )
          ) : (
            <span className="text-sm text-gray-600">
              Recommendations will
              appear after analysis.
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-5 text-gray-500">
          Recommendations are based
          on the information available
          for this lead and your
          current company settings.
        </p>
      </div>

      <div className="mt-5">
        <p className="text-sm text-gray-500">
          Estimated Project Value
        </p>

        <p className="mt-2 text-xl font-medium text-white">
          {lead.projectValue}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {lead.emailAddresses.length >
          0 && (
          <button
            type="button"
            onClick={openEmail}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            <Mail size={16} />
            Email
          </button>
        )}

        {lead.phoneNumbers.length >
          0 && (
          <a
            href={`tel:${lead.phoneNumbers[0]}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            <Phone size={16} />
            Call
          </a>
        )}
      </div>

      <div className="mt-2 space-y-2">
        <button
          type="button"
          onClick={onGenerateOutreach}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-3 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
        >
          <Sparkles size={16} />
          Generate Outreach
        </button>

        <button
          type="button"
          onClick={onPipeline}
          disabled={
            addingToPipeline ||
            isAlreadyPipeline
          }
          className={`flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm transition ${
            isAlreadyPipeline
              ? "border-[#84CC16]/20 bg-[#84CC16]/5 text-[#84CC16]"
              : "border-white/10 text-gray-300 hover:bg-white/5"
          }`}
        >
          <span className="text-base leading-none">
            {isAlreadyPipeline
              ? "✓"
              : "+"}
          </span>

          {addingToPipeline
            ? "Adding..."
            : isAlreadyPipeline
              ? "In Pipeline"
              : "Add to Pipeline"}
        </button>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex gap-6 border-b border-white/10">
          <button
            type="button"
            onClick={() =>
              setActiveDetailTab(
                "info",
              )
            }
            className={`border-b-2 pb-3 text-sm ${
              activeDetailTab ===
              "info"
                ? "border-[#3B82F6] text-white"
                : "border-transparent text-gray-600"
            }`}
          >
            Company Info
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveDetailTab(
                "notes",
              )
            }
            className={`border-b-2 pb-3 text-sm ${
              activeDetailTab ===
              "notes"
                ? "border-[#3B82F6] text-white"
                : "border-transparent text-gray-600"
            }`}
          >
            Notes
          </button>
        </div>

        {activeDetailTab ===
          "info" && (
          <div className="mt-5 grid grid-cols-2 gap-y-5">
            <div>
              <p className="text-xs text-gray-600">
                Founded
              </p>

              <p className="mt-1 text-sm text-gray-300">
                {lead.founded ||
                  "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">
                Employees
              </p>

              <p className="mt-1 text-sm text-gray-300">
                {lead.employees}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">
                Category
              </p>

              <p className="mt-1 text-sm text-gray-300">
                {lead.category}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">
                Reviews
              </p>

              <p className="mt-1 text-sm text-gray-300">
                {lead.rating
                  ? `★ ${lead.rating.toFixed(1)}`
                  : "—"}{" "}
                <span className="text-gray-500">
                  {lead.reviews
                    ? `(${lead.reviews})`
                    : ""}
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">
                Status
              </p>

              <p className="mt-1 text-sm capitalize text-gray-300">
                {lead.status}
              </p>
            </div>

            {lead.source && (
              <div>
                <p className="text-xs text-gray-600">
                  Source
                </p>

                <p className="mt-1 text-sm text-gray-300">
                  {lead.source}
                </p>
              </div>
            )}
          </div>
        )}

        {activeDetailTab ===
          "notes" && (
          <div className="mt-5">
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target
                    .value,
                )
              }
              placeholder="Add notes about this lead..."
              className="min-h-[150px] w-full resize-y rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-sm leading-6 text-white outline-none placeholder:text-gray-700 focus:border-[#3B82F6]/40"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-600">
                Notes are saved to this
                lead in your company
                database.
              </p>

              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes}
                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50"
              >
                {savingNotes
                  ? "Saving..."
                  : "Save Notes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   RADAR LOCATION HELPERS
========================================================= */

function getRadarLocation(
  lead: Lead,
) {
  const parts = [
    lead.city,
    lead.state,
    lead.country,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return lead.location;
}

function getLocationKey(
  location: string,
) {
  return normalizeText(
    location,
  );
}

function getLocationShortName(
  location: string,
) {
  const parts = location
    .split(",")
    .map((part) =>
      part.trim(),
    )
    .filter(Boolean);

  return parts[0] || location;
}

/* =========================================================
   RADAR COLORS
========================================================= */

function getRadarColor(
  index: number,
) {
  const colors = [
    {
      border:
        "border-[#3B82F6]",
      softBorder:
        "border-[#3B82F6]/50",
      bg:
        "bg-[#3B82F6]/15",
      text:
        "text-[#3B82F6]",
      glow:
        "shadow-[0_0_25px_rgba(59,130,246,0.35)]",
      pulse:
        "border-[#3B82F6]/20",
      selected:
        "bg-[#3B82F6] text-white border-[#3B82F6]",
      dot:
        "bg-[#3B82F6]",
    },
    {
      border:
        "border-[#84CC16]",
      softBorder:
        "border-[#84CC16]/50",
      bg:
        "bg-[#84CC16]/15",
      text:
        "text-[#84CC16]",
      glow:
        "shadow-[0_0_25px_rgba(132,204,22,0.3)]",
      pulse:
        "border-[#84CC16]/20",
      selected:
        "bg-[#84CC16] text-black border-[#84CC16]",
      dot:
        "bg-[#84CC16]",
    },
    {
      border:
        "border-[#A78BFA]",
      softBorder:
        "border-[#A78BFA]/50",
      bg:
        "bg-[#A78BFA]/15",
      text:
        "text-[#A78BFA]",
      glow:
        "shadow-[0_0_25px_rgba(167,139,250,0.3)]",
      pulse:
        "border-[#A78BFA]/20",
      selected:
        "bg-[#A78BFA] text-black border-[#A78BFA]",
      dot:
        "bg-[#A78BFA]",
    },
    {
      border:
        "border-[#3B82F6]",
      softBorder:
        "border-[#3B82F6]/50",
      bg:
        "bg-[#3B82F6]/15",
      text:
        "text-[#3B82F6]",
      glow:
        "shadow-[0_0_25px_rgba(59,130,246,0.3)]",
      pulse:
        "border-[#3B82F6]/20",
      selected:
        "bg-[#3B82F6] text-black border-[#3B82F6]",
      dot:
        "bg-[#3B82F6]",
    },
    {
      border:
        "border-[#3B82F6]",
      softBorder:
        "border-[#3B82F6]/50",
      bg:
        "bg-[#3B82F6]/15",
      text:
        "text-[#3B82F6]",
      glow:
        "shadow-[0_0_25px_rgba(59,130,246,0.3)]",
      pulse:
        "border-[#3B82F6]/20",
      selected:
        "bg-[#F97316] text-black border-[#3B82F6]",
      dot:
        "bg-[#F97316]",
    },
    {
      border:
        "border-[#F22F46]",
      softBorder:
        "border-[#F22F46]/50",
      bg:
        "bg-[#F22F46]/15",
      text:
        "text-[#F22F46]",
      glow:
        "shadow-[0_0_25px_rgba(242,47,70,0.3)]",
      pulse:
        "border-[#F22F46]/20",
      selected:
        "bg-[#F22F46] text-black border-[#F22F46]",
      dot:
        "bg-[#F22F46]",
    },
  ];

  return colors[
    index % colors.length
  ];
}

function getRadarPosition(
  location: string,
  index: number,
) {
  let hash = 0;

  for (
    let i = 0;
    i < location.length;
    i++
  ) {
    hash =
      (hash * 31 +
        location.charCodeAt(i)) %
      100000;
  }

  const x =
    12 +
    ((hash * 37 + index * 17) %
      76);

  const y =
    18 +
    ((hash * 53 + index * 29) %
      64);

  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

/* =========================================================
   OPPORTUNITY RADAR
========================================================= */

function OpportunityRadar({
  leads,
  selectedLocation,
  onLocationChange,
  onSelectLead,
}: {
  leads: Lead[];
  selectedLocation: string;
  onLocationChange: (
    location: string,
  ) => void;
  onSelectLead: (
    leadId: string,
  ) => void;
}) {
  const locationGroups =
    useMemo(() => {
      const groups = new Map<
        string,
        {
          key: string;
          name: string;
          leads: Lead[];
        }
      >();

      leads.forEach((lead) => {
        const name =
          getRadarLocation(
            lead,
          );

        const key =
          getLocationKey(name);

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            name,
            leads: [],
          });
        }

        groups
          .get(key)!
          .leads.push(lead);
      });

      return Array.from(
        groups.values(),
      ).sort(
        (a, b) =>
          b.leads.length -
          a.leads.length,
      );
    }, [leads]);

  const filteredLocationGroups =
    useMemo(() => {
      if (
        selectedLocation ===
        "All locations"
      ) {
        return locationGroups;
      }

      return locationGroups.filter(
        (group) =>
          locationMatches(
            group.leads[0],
            selectedLocation,
          ) ||
          group.key ===
            getLocationKey(
              selectedLocation,
            ),
      );
    }, [
      locationGroups,
      selectedLocation,
    ]);

  const radarLeads =
    useMemo(() => {
      if (
        selectedLocation ===
        "All locations"
      ) {
        return leads;
      }

      return leads.filter(
        (lead) =>
          locationMatches(
            lead,
            selectedLocation,
          ),
      );
    }, [
      leads,
      selectedLocation,
    ]);

  const highOpportunityCount =
    radarLeads.filter(
      (lead) =>
        lead.score >= 80,
    ).length;

  const estimatedValue =
    radarLeads.reduce(
      (total, lead) =>
        total +
        parseProjectValue(
          lead.projectValue,
        ),
      0,
    );

  const estimatedValueFormatted =
    estimatedValue > 0
      ? estimatedValue >=
        1000000
        ? `$${(
            estimatedValue /
            1000000
          ).toFixed(1)}M`
        : `$${Math.round(
            estimatedValue / 1000,
          )}K`
      : "$0";

  const topOpportunities =
    [...radarLeads]
      .sort(
        (a, b) =>
          b.score - a.score,
      )
      .slice(0, 5);

  return (
    <div className="mt-5 space-y-4">
      <div className="relative overflow-hidden lead-discovery-surface rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 lg:p-6">
        <div className="pointer-events-none absolute -right-10 -top-20 h-40 w-40 rounded-full bg-[#A78BFA]/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6]/10">
                <Target
                  size={19}
                  className="text-[#3B82F6]"
                />

                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#A78BFA]" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Opportunity Radar
                </h2>

                <p className="mt-0.5 text-sm text-gray-500">
                  See where your strongest opportunities are concentrated.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">
                Opportunities
              </p>

              <p className="mt-0.5 text-lg font-medium text-white">
                {radarLeads.length}
              </p>
            </div>

            <div className="rounded-xl border border-[#84CC16]/10 bg-[#84CC16]/[0.03] px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">
                High Potential
              </p>

              <p className="mt-0.5 text-lg font-medium text-[#84CC16]">
                {highOpportunityCount}
              </p>
            </div>

            <div className="rounded-xl border border-[#3B82F6]/10 bg-[#3B82F6]/[0.03] px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">
                Est. Value
              </p>

              <p className="mt-0.5 text-lg font-medium text-[#3B82F6]">
                {estimatedValueFormatted}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_365px]">
        <div className="relative min-h-[540px] overflow-hidden lead-discovery-surface rounded-2xl border border-white/10 bg-[#0A0A0A]">
          <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-[#3B82F6]/[0.04] blur-3xl" />

          <div className="pointer-events-none absolute -right-20 bottom-20 h-64 w-64 rounded-full bg-[#A78BFA]/[0.05] blur-3xl" />

          <div className="pointer-events-none absolute left-5 right-5 top-5 z-20 flex items-start justify-between gap-4">
            <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/75 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.8)]" />

                <p className="text-xs uppercase tracking-[0.18em] text-gray-600">
                  Opportunity Map
                </p>
              </div>

              <p className="mt-1 text-sm text-gray-300">
                {selectedLocation ===
                "All locations"
                  ? "All target markets"
                  : selectedLocation}
              </p>
            </div>

          </div>

          <OpportunityMap
            leads={radarLeads}
            focusLocation={selectedLocation}
            onSelectLead={onSelectLead}
          />

          {leads.length === 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center lead-discovery-surface rounded-2xl border border-white/10 bg-[#0D0D0D]">
                  <Target
                    size={24}
                    className="text-[#3B82F6]"
                  />
                </div>

                <h3 className="mt-4 text-lg font-medium text-white">
                  Your opportunity radar is waiting
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Run a lead search to populate
                  your opportunity map with real
                  businesses and opportunities.
                </p>

                <a
                  href="/search"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
                >
                  <Search size={16} />
                  Start a Search
                </a>
              </div>
            </div>
          )}

          {leads.length > 0 &&
            radarLeads.length ===
              0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <div className="max-w-sm rounded-2xl border border-white/10 bg-black/75 p-7 text-center shadow-2xl backdrop-blur-md">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B82F6]/10">
                    <MapPin
                      size={21}
                      className="text-[#3B82F6]"
                    />
                  </div>

                  <h3 className="mt-4 text-base font-medium text-white">
                    No opportunities here yet
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    BaseLead has not discovered
                    businesses in{" "}
                    <span className="text-gray-300">
                      {selectedLocation}
                    </span>{" "}
                    yet.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      onLocationChange(
                        "All locations",
                      )
                    }
                    className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-400 transition hover:border-white/20 hover:text-white"
                  >
                    View all locations
                  </button>
                </div>
              </div>
            )}

          <div className="pointer-events-none absolute bottom-5 left-5 right-16 z-20 flex flex-wrap items-center justify-between gap-3">
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/75 px-4 py-2.5 backdrop-blur-md">
              <p className="text-xs text-gray-500">
                {filteredLocationGroups.length}{" "}
                {filteredLocationGroups.length === 1 ? "location" : "locations"}
              </p>

              {selectedLocation !== "All locations" && (
                <button
                  type="button"
                  onClick={() => onLocationChange("All locations")}
                  className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-gray-400 hover:border-[#3B82F6]/40 hover:text-[#3B82F6]"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-white/10 bg-black/75 px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                <span className="text-[11px] text-gray-500">
                  High 80+
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#84CC16]" />
                <span className="text-[11px] text-gray-500">
                  Strong 60–79
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#A78BFA]" />
                <span className="text-[11px] text-gray-500">
                  Emerging &lt;60
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lead-discovery-surface rounded-2xl border border-white/10 bg-[#0D0D0D] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-white">
                Top Opportunities
              </h3>

              <p className="mt-1 text-xs text-gray-600">
                Highest-scoring businesses in this view.
              </p>
            </div>

            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]/10">
              <Sparkles
                size={17}
                className="text-[#3B82F6]"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {topOpportunities.length >
            0 ? (
              topOpportunities.map(
                (lead, index) => {
                  const color =
                    getRadarColor(
                      index,
                    );

                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() =>
                        onSelectLead(
                          lead.id,
                        )
                      }
                      className="group w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-left transition hover:border-[#3B82F6]/30 hover:bg-[#101010]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color.bg} text-[11px] font-medium ${color.text}`}
                        >
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        <LeadLogo
                          lead={lead}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-white">
                              {lead.name}
                            </p>

                            <span
                              className={`shrink-0 text-sm font-medium ${getScoreClass(
                                lead.score,
                              )}`}
                            >
                              {lead.score}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-xs text-gray-600">
                            {lead.location}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-gray-500">
                              {lead.services[0] ||
                                "Opportunity"}
                            </span>

                            <span className="shrink-0 text-xs text-gray-400">
                              {lead.projectValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                },
              )
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-6 text-center">
                <MapPin
                  size={21}
                  className="mx-auto text-gray-600"
                />

                <p className="mt-3 text-sm text-gray-400">
                  No opportunities in
                  this location yet.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">
                Location Breakdown
              </h4>

              <span className="text-xs text-gray-600">
                {locationGroups.length}{" "}
                locations
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {locationGroups
                .slice(0, 6)
                .map(
                  (
                    group,
                    index,
                  ) => {
                    const highCount =
                      group.leads.filter(
                        (lead) =>
                          lead.score >=
                          80,
                      ).length;

                    const groupValue =
                      group.leads.reduce(
                        (
                          total,
                          lead,
                        ) =>
                          total +
                          parseProjectValue(
                            lead.projectValue,
                          ),
                        0,
                      );

                    const color =
                      getRadarColor(
                        index,
                      );

                    const isSelected =
                      group.leads.some(
                        (lead) =>
                          locationMatches(
                            lead,
                            selectedLocation,
                          ),
                      );

                    return (
                      <button
                        key={
                          group.key
                        }
                        type="button"
                        onClick={() =>
                          onLocationChange(
                            group.name,
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                          isSelected
                            ? `${color.softBorder} ${color.bg}`
                            : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color.bg}`}
                          >
                            <MapPin
                              size={14}
                              className={
                                color.text
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs text-gray-300">
                              {getLocationShortName(
                                group.name,
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-gray-600">
                              {group.leads.length}{" "}
                              leads •{" "}
                              {highCount}{" "}
                              high
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 text-xs text-gray-500">
                          {groupValue >
                          0
                            ? `$${Math.round(
                                groupValue /
                                  1000,
                              )}K`
                            : "—"}
                        </span>
                      </button>
                    );
                  },
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0D0D0D] p-4">
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/10">
            <Sparkles
              size={17}
              className="text-[#3B82F6]"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-white">
              BaseLead Opportunity
              Intelligence
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-600">
              Every pin is a real business at
              its real location. Pin color shows
              the opportunity score; click a pin
              to see details or open the lead.
              Dashed pins are placed at city level
              because the exact address was not
              available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function LeadsPage() {
  const [layout, setLayout] =
    useState<"list" | "grid">("list");
  const [checkedIds, setCheckedIds] =
    useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] =
    useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("baselead-leads-layout");
      if (saved === "list" || saved === "grid") setLayout(saved);
    } catch {}
  }, []);

  function changeLayout(next: "list" | "grid") {
    setLayout(next);
    try {
      localStorage.setItem("baselead-leads-layout", next);
    } catch {}
  }

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [
    selectedLeadId,
    setSelectedLeadId,
  ] = useState<string | null>(
    null,
  );

  const [activeTab, setActiveTab] =
    useState("All Leads");

  const [
    discoveryView,
    setDiscoveryView,
  ] = useState<DiscoveryView>(
    "Leads",
  );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [sort, setSort] =
    useState(
      "Opportunity Score",
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    addingToPipeline,
    setAddingToPipeline,
  ] = useState(false);

  const [toast, setToast] =
    useState("");

  const [
    companyContext,
    setCompanyContext,
  ] =
    useState<CompanyContext | null>(
      null,
    );

  const [
    targetLocations,
    setTargetLocations,
  ] = useState<string[]>([]);

  const [
    targetLocationsLoading,
    setTargetLocationsLoading,
  ] = useState(true);

  const [
    selectedTargetLocation,
    setSelectedTargetLocation,
  ] = useState(
    "All locations",
  );

  const [
    targetLocationMenuOpen,
    setTargetLocationMenuOpen,
  ] = useState(false);

  /* =======================================================
     RECENT LEADS
  ======================================================= */

  const [
    recentRange,
    setRecentRange,
  ] =
    useState<RecentRange>(
      "all",
    );

  const [
    recentMenuOpen,
    setRecentMenuOpen,
  ] = useState(false);

  /* =======================================================
     ADVANCED FILTERS
  ======================================================= */

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    advancedFilters,
    setAdvancedFilters,
  ] =
    useState<AdvancedFilters>({
      status: "all",
      minScore: "all",
      website: "all",
      social: "all",
      industry: "all",
      minProjectValue: "",
      minRating: "all",
    });

  /* =======================================================
     OUTREACH
  ======================================================= */

  const [
    outreachOpen,
    setOutreachOpen,
  ] = useState(false);

  const [
    outreachText,
    setOutreachText,
  ] = useState("");

  const [
    outreachCampaign,
    setOutreachCampaign,
  ] = useState("Lead Discovery");

  const [
    outreachSubject,
    setOutreachSubject,
  ] = useState("");

  const [
    outreachScheduledAt,
    setOutreachScheduledAt,
  ] = useState("");

  const [
    outreachSaving,
    setOutreachSaving,
  ] = useState(false);

  const [
    outreachCopied,
    setOutreachCopied,
  ] = useState(false);

  /* =======================================================
     CURRENT COMPANY
  ======================================================= */

  async function getCurrentCompanyId(
    userId: string,
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
      return String(
        ownedCompany.id,
      );
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
      ? String(
          membership.company_id,
        )
      : null;
  }

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadDiscoveryData() {
      setLoading(true);
      setError("");
      setTargetLocationsLoading(
        true,
      );

      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        if (mounted) {
          setLoading(false);
          setTargetLocationsLoading(
            false,
          );
          setError(
            "Please sign in to view your discovered leads.",
          );
        }

        return;
      }

      let companyId: string | null =
        null;

      try {
        companyId =
          await getCurrentCompanyId(
            user.id,
          );
      } catch (companyError) {
        console.error(
          "Unable to determine current company:",
          companyError,
        );

        if (mounted) {
          setLoading(false);
          setTargetLocationsLoading(
            false,
          );
          setError(
            "Unable to determine your company.",
          );
        }

        return;
      }

      if (!companyId) {
        if (mounted) {
          setLoading(false);
          setTargetLocationsLoading(
            false,
          );
          setError(
            "No company is associated with your account yet.",
          );
        }

        return;
      }

      const {
        data: companyData,
        error: companyError,
      } = await supabase
        .from("company_profiles")
        .select(
          "id, company_name, industry, niche, description, target_customer, target_locations, services, min_project_value, max_project_value, selling_points, ai_notes",
        )
        .eq("id", companyId)
        .maybeSingle();

      if (companyError) {
        console.error(
          "Company settings load error:",
          {
            message:
              companyError.message,
            code:
              companyError.code,
            details:
              companyError.details,
            hint:
              companyError.hint,
          },
        );

        if (mounted) {
          setLoading(false);
          setTargetLocationsLoading(
            false,
          );
          setError(
            "Unable to load your company settings.",
          );
        }

        return;
      }

      const normalizedLocations =
        normalizeTargetLocations(
          companyData?.target_locations,
        );

      const normalizedServices =
        normalizeCompanyServices(
          companyData?.services,
        );

      const nextCompanyContext: CompanyContext =
        {
          id: companyId,

          companyName:
            companyData?.company_name ||
            "",

          industry:
            companyData?.industry ||
            "",

          niche:
            companyData?.niche ||
            "",

          targetCustomer:
            companyData?.target_customer ||
            "",

          targetLocations:
            normalizedLocations,

          services:
            normalizedServices,

          minProjectValue:
            companyData?.min_project_value !==
              null &&
            companyData?.min_project_value !==
              undefined
              ? Number(
                  companyData.min_project_value,
                )
              : null,

          maxProjectValue:
            companyData?.max_project_value !==
              null &&
            companyData?.max_project_value !==
              undefined
              ? Number(
                  companyData.max_project_value,
                )
              : null,

          sellingPoints:
            companyData?.selling_points ||
            "",
        };

      const {
        data: leadsData,
        error: leadsError,
      } = await supabase
        .from("leads")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        });

      if (leadsError) {
        console.error(
          "Lead Discovery load error:",
          {
            message:
              leadsError.message,
            code:
              leadsError.code,
            details:
              leadsError.details,
            hint:
              leadsError.hint,
          },
        );

        if (mounted) {
          setLoading(false);
          setTargetLocationsLoading(
            false,
          );
          setError(
            leadsError.message ||
              "Unable to load your company leads.",
          );
        }

        return;
      }

      const mapped =
        (leadsData || []).map(
          databaseLeadToLead,
        );

      if (mounted) {
        setCompanyContext(
          nextCompanyContext,
        );

        setTargetLocations(
          normalizedLocations,
        );

        setTargetLocationsLoading(
          false,
        );

        setLeads(mapped);
        setLoading(false);

        setSelectedTargetLocation(
          (current) => {
            if (
              current &&
              current !==
                "All locations" &&
              normalizedLocations.some(
                (location) =>
                  getLocationKey(
                    location,
                  ) ===
                  getLocationKey(
                    current,
                  ),
              )
            ) {
              return current;
            }

            return "All locations";
          },
        );

        if (mapped.length > 0) {
          const requested =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("lead")
              : null;
          const target =
            (requested && mapped.find((item) => item.id === requested)) || mapped[0];
          setSelectedLeadId(target.id);
          if (requested && target.id === requested && window.innerWidth < 1280) {
            window.setTimeout(() => {
              document
                .getElementById("lead-detail-mobile")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 250);
          }
        } else {
          setSelectedLeadId(null);
        }
      }
    }

    loadDiscoveryData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOCATION VALIDATION
  ======================================================= */

  useEffect(() => {
    if (
      selectedTargetLocation ===
      "All locations"
    ) {
      return;
    }

    if (
      targetLocations.length ===
      0
    ) {
      return;
    }

    const isConfiguredTarget =
      targetLocations.some(
        (location) =>
          getLocationKey(
            location,
          ) ===
          getLocationKey(
            selectedTargetLocation,
          ),
      );

    const isRadarLocation =
      leads.some((lead) =>
        locationMatches(
          lead,
          selectedTargetLocation,
        ),
      );

    if (
      !isConfiguredTarget &&
      !isRadarLocation
    ) {
      setSelectedTargetLocation(
        "All locations",
      );
    }
  }, [
    targetLocations,
    selectedTargetLocation,
    leads,
  ]);

  /* =======================================================
     SELECTED LEAD
  ======================================================= */

  const selectedLead =
    leads.find(
      (lead) =>
        lead.id ===
        selectedLeadId,
    ) ?? null;

  /* =======================================================
     BULK SELECTION + CSV EXPORT
  ======================================================= */

  function toggleChecked(id: string) {
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportLeadsCsv(list: Lead[]) {
    if (list.length === 0) return;
    const header = [
      "Company", "Contact", "Category", "Location", "Address", "Website",
      "Emails", "Phones", "Score", "Opportunity", "Status", "Est. value",
      "Rating", "Reviews", "Source", "Added",
    ];
    const escape = (value: unknown) => {
      const text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = list.map((lead) => [
      lead.company, lead.name, lead.category, lead.location, lead.address ?? "",
      lead.website, lead.emailAddresses.join("; "), lead.phoneNumbers.join("; "),
      lead.score, lead.opportunity, lead.status, lead.projectValue,
      lead.rating ?? "", lead.reviews, lead.source ?? "",
      lead.createdAt ? lead.createdAt.slice(0, 10) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `baselead-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast(`Exported ${list.length} lead${list.length === 1 ? "" : "s"} to CSV.`);
  }

  async function addCheckedToPipeline() {
    setBulkBusy(true);
    try {
      for (const lead of leads.filter((item) => checkedIds.has(item.id))) {
        await addLeadToPipeline(lead);
      }
      setCheckedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  /* =======================================================
     STATS
  ======================================================= */

  const highIntentCount =
    leads.filter(
      (lead) => lead.score >= 80,
    ).length;

  const contactedCount =
    leads.filter(
      (lead) =>
        lead.status ===
        "contacted",
    ).length;

  const respondedCount =
    leads.filter(
      (lead) =>
        lead.status ===
        "responded",
    ).length;

  const clientCount =
    leads.filter(
      (lead) =>
        lead.status ===
        "client",
    ).length;

  const pipelineValue =
    leads.reduce(
      (total, lead) =>
        total +
        parseProjectValue(
          lead.projectValue,
        ),
      0,
    );

  const pipelineValueFormatted =
    pipelineValue > 0
      ? pipelineValue >=
        1000000
        ? `$${(
            pipelineValue /
            1000000
          ).toFixed(1)}M`
        : `$${Math.round(
            pipelineValue / 1000,
          )}K`
      : "$0";

  const conversionRate =
    leads.length > 0
      ? (
          (clientCount /
            leads.length) *
          100
        ).toFixed(1)
      : "0.0";

  /* =======================================================
     COMPANY SUMMARIES
  ======================================================= */

  const companyServicesLabel =
    useMemo(
      () =>
        getCompanyServiceSummary(
          companyContext?.services ??
            [],
        ),
      [companyContext],
    );

  const targetCustomerLabel =
    companyContext?.targetCustomer?.trim() ||
    "Not configured";

  const industryLabel =
    companyContext?.industry?.trim() ||
    companyContext?.niche?.trim() ||
    "Not configured";

  const projectValueLabel =
    getProjectValueSummary(
      companyContext?.minProjectValue ??
        null,
      companyContext?.maxProjectValue ??
        null,
    );

  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (searchQuery.trim()) {
      const query =
        searchQuery
          .toLowerCase()
          .trim();

      result = result.filter(
        (lead) =>
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
          (lead.address ||
            "")
            .toLowerCase()
            .includes(query) ||
          (lead.city ||
            "")
            .toLowerCase()
            .includes(query) ||
          (lead.state ||
            "")
            .toLowerCase()
            .includes(query) ||
          (lead.country ||
            "")
            .toLowerCase()
            .includes(query) ||
          lead.website
            .toLowerCase()
            .includes(query) ||
          (lead.source ||
            "")
            .toLowerCase()
            .includes(query) ||
          lead.phoneNumbers.some(
            (phone) =>
              phone
                .toLowerCase()
                .includes(query),
          ) ||
          lead.emailAddresses.some(
            (email) =>
              email
                .toLowerCase()
                .includes(query),
          ),
      );
    }

    if (
      activeTab ===
      "High-Intent"
    ) {
      result = result.filter(
        (lead) =>
          lead.score >= 80,
      );
    }

    if (
      activeTab ===
      "Contacted"
    ) {
      result = result.filter(
        (lead) =>
          lead.status ===
          "contacted",
      );
    }

    if (
      activeTab ===
      "Responded"
    ) {
      result = result.filter(
        (lead) =>
          lead.status ===
          "responded",
      );
    }

    if (
      activeTab ===
      "Client"
    ) {
      result = result.filter(
        (lead) =>
          lead.status ===
          "client",
      );
    }

    if (
      selectedTargetLocation !==
      "All locations"
    ) {
      result = result.filter(
        (lead) =>
          locationMatches(
            lead,
            selectedTargetLocation,
          ),
      );
    }

    result = result.filter(
      (lead) =>
        isRecent(
          lead.createdAt,
          recentRange,
        ),
    );

    if (
      advancedFilters.status !==
      "all"
    ) {
      result = result.filter(
        (lead) =>
          lead.status ===
          advancedFilters.status,
      );
    }

    if (
      advancedFilters.minScore !==
      "all"
    ) {
      const minimum =
        Number(
          advancedFilters.minScore,
        ) || 0;

      result = result.filter(
        (lead) =>
          lead.score >= minimum,
      );
    }

    if (
      advancedFilters.website !==
      "all"
    ) {
      result = result.filter(
        (lead) =>
          advancedFilters.website ===
          "with"
            ? lead.websiteExists
            : !lead.websiteExists,
      );
    }

    if (
      advancedFilters.social !==
      "all"
    ) {
      result = result.filter(
        (lead) =>
          advancedFilters.social ===
          "with"
            ? hasSocialPresence(
                lead,
              )
            : !hasSocialPresence(
                lead,
              ),
      );
    }

    if (
      advancedFilters.industry !==
        "all" &&
      advancedFilters.industry
    ) {
      result = result.filter(
        (lead) =>
          normalizeText(
            lead.category,
          ) ===
            normalizeText(
              advancedFilters.industry,
            ) ||
          normalizeText(
            lead.category,
          ).includes(
            normalizeText(
              advancedFilters.industry,
            ),
          ),
      );
    }

    if (
      advancedFilters.minProjectValue
    ) {
      const minimum =
        Number(
          advancedFilters.minProjectValue,
        ) || 0;

      result = result.filter(
        (lead) =>
          parseProjectValue(
            lead.projectValue,
          ) >= minimum,
      );
    }

    if (
      advancedFilters.minRating !==
      "all"
    ) {
      const minimum =
        Number(
          advancedFilters.minRating,
        ) || 0;

      result = result.filter(
        (lead) =>
          (lead.rating ?? 0) >=
          minimum,
      );
    }

    if (
      sort ===
      "Opportunity Score"
    ) {
      result.sort(
        (a, b) =>
          b.score - a.score,
      );
    }

    if (
      sort ===
      "Project Value"
    ) {
      result.sort(
        (a, b) =>
          parseProjectValue(
            b.projectValue,
          ) -
          parseProjectValue(
            a.projectValue,
          ),
      );
    }

    if (sort === "Newest") {
      result.sort((a, b) => {
        const aDate =
          a.createdAt
            ? new Date(
                a.createdAt,
              ).getTime()
            : 0;

        const bDate =
          b.createdAt
            ? new Date(
                b.createdAt,
              ).getTime()
            : 0;

        return bDate - aDate;
      });
    }

    return result;
  }, [
    leads,
    searchQuery,
    activeTab,
    selectedTargetLocation,
    recentRange,
    advancedFilters,
    sort,
  ]);

  /* =======================================================
     FILTER COUNT
  ======================================================= */

  const activeFilterCount =
    [
      advancedFilters.status !==
        "all",
      advancedFilters.minScore !==
        "all",
      advancedFilters.website !==
        "all",
      advancedFilters.social !==
        "all",
      advancedFilters.industry !==
        "all",
      Boolean(
        advancedFilters.minProjectValue,
      ),
      advancedFilters.minRating !==
        "all",
      selectedTargetLocation !==
        "All locations",
      recentRange !== "all",
    ].filter(Boolean).length;

  const availableIndustries =
    useMemo(() => {
      return Array.from(
        new Set(
          leads
            .map(
              (lead) =>
                lead.category.trim(),
            )
            .filter(Boolean),
        ),
      ).sort();
    }, [leads]);

  /* =======================================================
     ADD TO PIPELINE
  ======================================================= */

  async function addLeadToPipeline(
    lead: Lead | null = selectedLead,
  ) {
    if (!lead) {
      return;
    }

    if (!companyContext?.id) {
      setToast(
        "Unable to determine your company.",
      );
      return;
    }

    setAddingToPipeline(true);

    const {
      error: updateError,
    } = await supabase
      .from("leads")
      .update({
        status: "pipeline",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", lead.id)
      .eq(
        "company_id",
        companyContext.id,
      );

    if (updateError) {
      console.error(
        "Add to pipeline error:",
        {
          message:
            updateError.message,
          code:
            updateError.code,
          details:
            updateError.details,
          hint:
            updateError.hint,
        },
      );

      setToast(
        updateError.message ||
          "Unable to add lead to pipeline.",
      );

      setAddingToPipeline(false);
      return;
    }

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              status:
                "pipeline",
            }
          : item,
      ),
    );

    setToast(
      `${lead.name} was added to your pipeline.`,
    );

    setAddingToPipeline(false);

    window.setTimeout(() => {
      setToast("");
    }, 3000);
  }

  /* =======================================================
     SAVE NOTES
  ======================================================= */

  async function saveLeadNotes(
    notes: string,
  ) {
    if (
      !selectedLead ||
      !companyContext?.id
    ) {
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("leads")
      .update({
        notes,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        selectedLead.id,
      )
      .eq(
        "company_id",
        companyContext.id,
      );

    if (updateError) {
      console.error(
        "Save lead notes error:",
        {
          message:
            updateError.message,
          code:
            updateError.code,
          details:
            updateError.details,
          hint:
            updateError.hint,
        },
      );

      setToast(
        updateError.message ||
          "Unable to save notes.",
      );

      throw updateError;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id ===
        selectedLead.id
          ? {
              ...lead,
              notes,
            }
          : lead,
      ),
    );

    setToast(
      "Notes saved successfully.",
    );

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  }

  /* =======================================================
     OUTREACH
  ======================================================= */

  function openOutreachComposer(lead: Lead) {
    const companyName =
      companyContext?.companyName?.trim() ||
      "our company";

    const services =
      companyContext?.services
        ?.filter(Boolean)
        .slice(0, 3)
        .join(", ") ||
      lead.services
        .filter(Boolean)
        .slice(0, 3)
        .join(", ") ||
      "our services";

    const targetCustomer =
      companyContext?.targetCustomer?.trim() ||
      "businesses like yours";

    const sellingPoints =
      companyContext?.sellingPoints
        ?.split(/[\n;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ") || "";

    const firstName =
      lead.name.trim().split(/\s+/)[0] ||
      "there";

    const valueLine =
      lead.projectValue &&
      lead.projectValue !== "Not estimated"
        ? ` We typically work on projects around ${lead.projectValue}.`
        : "";

    const sellingLine =
      sellingPoints
        ? ` ${sellingPoints}`
        : "";

    const message = `Hi ${firstName},

I’m reaching out from ${companyName}. We work with ${targetCustomer} and help them with ${services}.${valueLine}

I came across ${lead.company} and thought there could be a good fit for what we do.${sellingLine}

Would you be open to a quick conversation to see if this could be useful for your business?

Best,
${companyName}`;

    setOutreachCampaign("Lead Discovery");
    setOutreachSubject(
      `Quick question for ${lead.company}`,
    );
    setOutreachText(message);
    setOutreachScheduledAt("");
    setOutreachOpen(true);
    setOutreachCopied(false);
  }

  function generateOutreach(lead: Lead) {
    openOutreachComposer(lead);
  }

  async function copyOutreach() {
    if (!outreachText) return;

    try {
      await navigator.clipboard.writeText(
        outreachText,
      );

      setOutreachCopied(true);

      window.setTimeout(() => {
        setOutreachCopied(false);
      }, 2500);
    } catch {
      setToast(
        "Unable to copy the outreach message.",
      );
    }
  }

  function closeOutreachComposer() {
    if (outreachSaving) return;

    setOutreachOpen(false);
    setOutreachCopied(false);
    setOutreachScheduledAt("");
  }

  async function saveOutreach(
    action: "draft" | "schedule" | "send",
  ) {
    if (!selectedLead) return;

    if (!outreachText.trim()) {
      setToast(
        "Please enter a message before saving the outreach.",
      );
      return;
    }

    if (!outreachSubject.trim()) {
      setToast(
        "Please enter an outreach subject.",
      );
      return;
    }

    if (
      action === "schedule" &&
      !outreachScheduledAt
    ) {
      setToast(
        "Choose a date and time before scheduling.",
      );
      return;
    }

    setOutreachSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setToast(
          "You must be logged in to save outreach.",
        );
        return;
      }

      const scheduledAt =
        action === "schedule"
          ? new Date(
              outreachScheduledAt,
            ).toISOString()
          : null;

      /*
       * BaseLead does not have a real email-sending
       * provider connected yet. Send Outreach therefore
       * saves the record as ready-to-send instead of
       * falsely marking it as sent.
       */
      const status =
        action === "schedule"
          ? "scheduled"
          : "draft";

      const nextStep =
        action === "send"
          ? "Ready to send"
          : action === "schedule"
            ? "Scheduled"
            : "Draft";

      const { error: insertError } =
        await supabase
          .from("outreach")
          .insert({
            user_id: user.id,
            lead_id: selectedLead.id,
            campaign:
              outreachCampaign.trim() ||
              "Lead Discovery",
            channel: "Email",
            subject:
              outreachSubject.trim(),
            message:
              outreachText.trim(),
            status,
            scheduled_at: scheduledAt,
            sent_at: null,
            next_step: nextStep,
            next_step_at:
              action === "schedule"
                ? scheduledAt
                : null,
          });

      if (insertError) {
        console.error(
          "Save outreach error:",
          {
            message:
              insertError.message,
            code:
              insertError.code,
            details:
              insertError.details,
            hint:
              insertError.hint,
          },
        );

        setToast(
          insertError.message ||
            "Unable to save the outreach.",
        );
        return;
      }

      if (action === "send") {
        setToast(
          "Outreach saved. Open Outreach to send it from your Gmail.",
        );
      } else if (action === "schedule") {
        setToast(
          "Outreach scheduled and saved in Outreach.",
        );
      } else {
        setToast(
          "Outreach draft saved in Outreach.",
        );
      }

      setOutreachOpen(false);
      setOutreachCopied(false);
      setOutreachScheduledAt("");
    } catch (error) {
      console.error(
        "Unexpected outreach save error:",
        error,
      );

      setToast(
        error instanceof Error
          ? error.message
          : "Unable to save the outreach.",
      );
    } finally {
      setOutreachSaving(false);

      window.setTimeout(() => {
        setToast("");
      }, 4500);
    }
  }

  /* =======================================================
     TARGET LOCATION
  ======================================================= */

  function handleTargetLocationChange(
    location: string,
  ) {
    setSelectedTargetLocation(
      location,
    );

    setTargetLocationMenuOpen(
      false,
    );
  }

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearAllFilters() {
    setSearchQuery("");
    setActiveTab("All Leads");
    setSelectedTargetLocation(
      "All locations",
    );
    setRecentRange("all");

    setAdvancedFilters({
      status: "all",
      minScore: "all",
      website: "all",
      social: "all",
      industry: "all",
      minProjectValue: "",
      minRating: "all",
    });
  }

  /* =======================================================
     TABS
  ======================================================= */

  const LEAD_TAB_STYLE: Record<string, { icon: typeof Users; color: string }> = {
    "All Leads": { icon: List, color: "#3B82F6" },
    "High-Intent": { icon: Flame, color: "#F97316" },
    Contacted: { icon: Send, color: "#F472B6" },
    Responded: { icon: MessageCircle, color: "#A78BFA" },
    Client: { icon: Handshake, color: "#84CC16" },
  };

  const tabs = [
    ["All Leads", leads.length],
    [
      "High-Intent",
      highIntentCount,
    ],
    [
      "Contacted",
      contactedCount,
    ],
    [
      "Responded",
      respondedCount,
    ],
    ["Client", clientCount],
  ] as const;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="lead-discovery-page min-h-screen bg-[#050505] text-white">
      <div className="min-w-0">
        {/* =================================================
            TOP BAR
        ================================================= */}

        <div className="hidden items-center justify-end gap-3 px-6 pt-5 lg:flex">
          {/* TARGET LOCATIONS */}

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setTargetLocationMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={`flex items-center gap-2 rounded-xl border bg-[#0D0D0D] px-4 py-2.5 text-sm transition ${
                targetLocationMenuOpen
                  ? "border-[#3B82F6]/40 text-white"
                  : "border-white/10 text-gray-300 hover:border-white/20"
              }`}
            >
              <MapPin
                size={16}
                className={
                  selectedTargetLocation !==
                  "All locations"
                    ? "text-[#3B82F6]"
                    : "text-gray-500"
                }
              />

              <span>
                Target Locations
              </span>

              {selectedTargetLocation !==
                "All locations" && (
                <span className="max-w-[120px] truncate text-xs text-gray-500">
                  {selectedTargetLocation}
                </span>
              )}

              <ChevronDown
                size={14}
              />
            </button>

            {targetLocationMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close target locations menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() =>
                    setTargetLocationMenuOpen(
                      false,
                    )
                  }
                />

                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#101010] p-1.5 shadow-2xl shadow-black/50">
                  <div className="border-b border-white/10 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]/10">
                        <MapPin
                          size={14}
                          className="text-[#3B82F6]"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          Target Locations
                        </p>

                        <p className="text-[10px] text-gray-600">
                          From Settings →
                          Company
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleTargetLocationChange(
                          "All locations",
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        selectedTargetLocation ===
                        "All locations"
                          ? "bg-[#3B82F6]/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          selectedTargetLocation ===
                          "All locations"
                            ? "bg-[#3B82F6] text-white"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        <Target size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            selectedTargetLocation ===
                            "All locations"
                              ? "text-[#3B82F6]"
                              : "text-gray-300"
                          }`}
                        >
                          All locations
                        </p>

                        <p className="mt-0.5 text-[10px] text-gray-600">
                          Show all target markets
                        </p>
                      </div>

                      {selectedTargetLocation ===
                        "All locations" && (
                        <span className="text-[#3B82F6]">
                          ✓
                        </span>
                      )}
                    </button>

                    {targetLocations.length >
                    0 ? (
                      targetLocations.map(
                        (
                          location,
                          index,
                        ) => {
                          const color =
                            getRadarColor(
                              index,
                            );

                          const selected =
                            getLocationKey(
                              selectedTargetLocation,
                            ) ===
                            getLocationKey(
                              location,
                            );

                          return (
                            <button
                              key={
                                location
                              }
                              type="button"
                              onClick={() =>
                                handleTargetLocationChange(
                                  location,
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                selected
                                  ? color.bg
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.bg}`}
                              >
                                <MapPin
                                  size={15}
                                  className={
                                    color.text
                                  }
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`truncate text-sm ${
                                    selected
                                      ? color.text
                                      : "text-gray-300"
                                  }`}
                                >
                                  {location}
                                </p>

                                <p className="mt-0.5 text-[10px] text-gray-600">
                                  Target market{" "}
                                  {index +
                                    1}
                                </p>
                              </div>

                              {selected && (
                                <span
                                  className={
                                    color.text
                                  }
                                >
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        },
                      )
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <MapPin
                          size={18}
                          className="mx-auto text-gray-700"
                        />

                        <p className="mt-2 text-xs text-gray-500">
                          {targetLocationsLoading
                            ? "Loading target locations..."
                            : "No target locations configured"}
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-gray-700">
                          Add locations in
                          Settings →
                          Company.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RECENT LEADS */}

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setRecentMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={`flex items-center gap-2 rounded-xl border bg-[#0D0D0D] px-4 py-2.5 text-sm transition ${
                recentRange !== "all"
                  ? "border-[#3B82F6]/40 text-white"
                  : "border-white/10 text-gray-300 hover:border-white/20"
              }`}
            >
              <CalendarDays
                size={16}
                className={
                  recentRange !==
                  "all"
                    ? "text-[#3B82F6]"
                    : "text-gray-500"
                }
              />

              <span>
                {recentRange ===
                "all"
                  ? "Recent Leads"
                  : getRecentLabel(
                      recentRange,
                    )}
              </span>

              <ChevronDown
                size={14}
                className={`transition-transform ${
                  recentMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
              />

              {recentRange !==
                "all" && (
                <span className="rounded-full bg-[#3B82F6]/10 px-1.5 py-0.5 text-[10px] text-[#3B82F6]">
                  {filteredLeads.length}
                </span>
              )}
            </button>

            {recentMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close recent leads menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() =>
                    setRecentMenuOpen(
                      false,
                    )
                  }
                />

                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[230px] overflow-hidden rounded-2xl border border-white/10 bg-[#101010] p-1.5 shadow-2xl shadow-black/50">
                  <div className="px-3 py-3">
                    <p className="text-sm font-medium text-white">
                      Lead Recency
                    </p>

                    <p className="mt-1 text-[10px] text-gray-600">
                      Filter leads by when they
                      were discovered.
                    </p>
                  </div>

                  {(
                    [
                      [
                        "all",
                        "All Leads",
                        "Show every discovered lead",
                      ],
                      [
                        "today",
                        "Today",
                        "Discovered today",
                      ],
                      [
                        "7d",
                        "Last 7 Days",
                        "Discovered in the last 7 days",
                      ],
                      [
                        "30d",
                        "Last 30 Days",
                        "Discovered in the last 30 days",
                      ],
                      [
                        "90d",
                        "Last 90 Days",
                        "Discovered in the last 90 days",
                      ],
                    ] as const
                  ).map(
                    ([
                      value,
                      label,
                      description,
                    ]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setRecentRange(
                            value,
                          );
                          setRecentMenuOpen(
                            false,
                          );
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          recentRange ===
                          value
                            ? "bg-[#3B82F6]/10"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div>
                          <p
                            className={`text-sm ${
                              recentRange ===
                              value
                                ? "text-[#3B82F6]"
                                : "text-gray-300"
                            }`}
                          >
                            {label}
                          </p>

                          <p className="mt-0.5 text-[10px] text-gray-600">
                            {description}
                          </p>
                        </div>

                        {recentRange ===
                          value && (
                          <span className="text-[#3B82F6]">
                            ✓
                          </span>
                        )}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-7 lg:pt-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight lg:text-[27px]">
                  Leads
                </h1>

                <span className="hidden h-7 items-center rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-3 text-xs font-medium text-[#3B82F6] sm:flex">
                  AI POWERED
                </span>
              </div>

              <p className="mt-1 text-base text-gray-500">
                Find, qualify and
                connect with
                high-value clients for
                your business.
              </p>
            </div>

            <a
              href="/search"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
            >
              <Search size={16} />
              <span className="hidden sm:inline">New search</span>
            </a>
          </div>

          {/* DISCOVERY VIEW TABS */}

          <div className="mt-6 flex items-center gap-1 rounded-xl border border-white/10 bg-[#0D0D0D] p-1.5 sm:w-fit">
            <button
              type="button"
              onClick={() =>
                setDiscoveryView(
                  "Leads",
                )
              }
              data-active={discoveryView === "Leads"}
              style={{ "--tab": "#3B82F6" } as CSSProperties}
              className="bl-tab flex items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-gray-500"
            >
              <Users size={16} className="bl-tab-emoji" style={{ color: "#3B82F6" }} />
              Leads

              <span className="bl-tab-count rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-600">
                {leads.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setDiscoveryView(
                  "Opportunity Radar",
                )
              }
              data-active={discoveryView === "Opportunity Radar"}
              style={{ "--tab": "#2DD4BF" } as CSSProperties}
              className="bl-tab flex items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-gray-500"
            >
              <Target size={16} className="bl-tab-emoji" style={{ color: "#2DD4BF" }} />
              Opportunity Radar
            </button>
          </div>

          {discoveryView ===
            "Opportunity Radar" && (
            <OpportunityRadar
              leads={leads}
              selectedLocation={
                selectedTargetLocation
              }
              onLocationChange={
                handleTargetLocationChange
              }
              onSelectLead={(
                leadId,
              ) => {
                setSelectedLeadId(
                  leadId,
                );
              }}
            />
          )}

          {discoveryView ===
            "Leads" && (
            <>
              {/* STATS */}

              <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  title="Leads Found"
                  value={String(
                    leads.length,
                  )}
                  change={
                    leads.length >
                    0
                      ? "Live from your company database"
                      : "No leads yet"
                  }
                  icon={
                    <Users
                      size={20}
                      className="text-[#3B82F6]"
                    />
                  }
                  iconClassName="bg-[#3B82F6]/10"
                />

                <StatCard
                  title="High-Intent Leads"
                  value={String(
                    highIntentCount,
                  )}
                  change={
                    highIntentCount >
                    0
                      ? "Score 80+"
                      : "No high-intent leads yet"
                  }
                  icon={
                    <Flame
                      size={20}
                      className="text-[#F22F46]"
                    />
                  }
                  iconClassName="bg-[#F22F46]/10"
                />

                <StatCard
                  title="Pipeline Value"
                  value={
                    pipelineValueFormatted
                  }
                  change={
                    leads.length >
                    0
                      ? "Based on estimated lead values"
                      : "No value estimated"
                  }
                  icon={
                    <DollarSign
                      size={20}
                      className="text-[#F5C518]"
                    />
                  }
                  iconClassName="bg-[#F5C518]/10"
                />

                <StatCard
                  title="Conversion Rate"
                  value={`${conversionRate}%`}
                  change={
                    clientCount >
                    0
                      ? `${clientCount} clients`
                      : "No clients recorded yet"
                  }
                  icon={
                    <TrendingUp
                      size={20}
                      className="text-[#A78BFA]"
                    />
                  }
                  iconClassName="bg-[#A78BFA]/10"
                />
              </div>

              {/* COMPANY CONTEXT */}

              <div className="mt-4 rounded-xl border border-white/10 bg-[#0D0D0D] p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
                  <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5">
                    <span className="mb-1 block text-xs font-medium text-gray-500">
                      What are you selling?
                    </span>

                    <span className="block truncate text-sm text-gray-200">
                      {companyServicesLabel}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5">
                    <span className="mb-1 block text-xs font-medium text-gray-500">
                      Who do you want to sell to?
                    </span>

                    <span className="block truncate text-sm text-gray-200">
                      {targetCustomerLabel}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5">
                    <span className="mb-1 block text-xs font-medium text-gray-500">
                      Industry
                    </span>

                    <span className="block truncate text-sm text-gray-200">
                      {industryLabel}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171717] px-3 py-2.5">
                    <span className="mb-1 block text-xs font-medium text-gray-500">
                      Min. Project Value
                    </span>

                    <span className="block truncate text-sm text-gray-200">
                      {projectValueLabel}
                    </span>
                  </div>

                  <a
                    href="/search"
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0A0A0A] px-5 py-3 text-sm font-medium text-[#3B82F6] transition hover:bg-white/5"
                  >
                    <SlidersHorizontal
                      size={16}
                    />
                    Edit Search
                  </a>
                </div>

                {targetLocations.length >
                  0 && (
                  <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <MapPin
                      size={14}
                      className="shrink-0 text-[#3B82F6]"
                    />

                    <span className="text-xs text-gray-600">
                      Target markets:
                    </span>

                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {targetLocations
                        .slice(0, 6)
                        .map(
                          (
                            location,
                          ) => (
                            <button
                              key={
                                location
                              }
                              type="button"
                              onClick={() =>
                                handleTargetLocationChange(
                                  location,
                                )
                              }
                              className={`rounded-md border px-2 py-1 text-[10px] transition ${
                                getLocationKey(
                                  selectedTargetLocation,
                                ) ===
                                getLocationKey(
                                  location,
                                )
                                  ? "border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]"
                                  : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                              }`}
                            >
                              {location}
                            </button>
                          ),
                        )}

                      {targetLocations.length >
                        6 && (
                        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-gray-600">
                          +
                          {targetLocations.length -
                            6}{" "}
                          more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* TABS */}

              <div className="mt-5 flex gap-1 overflow-x-auto border-b border-white/10">
                {tabs.map(
                  ([
                    label,
                    count,
                  ]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          label,
                        )
                      }
                      data-active={activeTab === label}
                      style={{ "--tab": LEAD_TAB_STYLE[label].color } as CSSProperties}
                      className="bl-tab mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm text-gray-500"
                    >
                      {(() => { const TabIcon = LEAD_TAB_STYLE[label].icon; return <TabIcon size={15} strokeWidth={2.2} className="bl-tab-emoji" style={{ color: LEAD_TAB_STYLE[label].color }} aria-hidden />; })()}
                      {label}

                      <span className="bl-tab-count rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">
                        {count}
                      </span>
                    </button>
                  ),
                )}
              </div>

              {/* CONTROLS */}

              <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  {filteredLeads.length > 0 && (
                    <input
                      type="checkbox"
                      checked={filteredLeads.every((lead) => checkedIds.has(lead.id))}
                      onChange={() =>
                        setCheckedIds((previous) =>
                          filteredLeads.every((lead) => previous.has(lead.id))
                            ? new Set()
                            : new Set(filteredLeads.map((lead) => lead.id)),
                        )
                      }
                      aria-label="Select all leads"
                      title="Select all"
                      className="h-4 w-4 cursor-pointer accent-[#3B82F6]"
                    />
                  )}
                  <p className="text-sm text-gray-400">
                    {filteredLeads.length}{" "}
                    {filteredLeads.length ===
                    1
                      ? "lead"
                      : "leads"}{" "}
                    found
                  </p>

                  {activeFilterCount >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        clearAllFilters
                      }
                      className="flex items-center gap-1.5 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/5 px-2.5 py-1 text-[11px] text-[#3B82F6] transition hover:bg-[#3B82F6]/10"
                    >
                      <X size={11} />
                      Clear filters
                      <span>
                        {activeFilterCount}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#0D0D0D] p-1">
                    {([
                      ["list", List, "List view"],
                      ["grid", LayoutGrid, "Card view"],
                    ] as const).map(([value, ViewIcon, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => changeLayout(value)}
                        aria-label={label}
                        title={label}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                          layout === value
                            ? "bg-[#3B82F6]/15 text-[#3B82F6]"
                            : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <ViewIcon size={15} />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      exportLeadsCsv(
                        checkedIds.size > 0
                          ? leads.filter((lead) => checkedIds.has(lead.id))
                          : filteredLeads,
                      )
                    }
                    disabled={filteredLeads.length === 0}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0D0D0D] px-4 py-2.5 text-sm text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>

                  <div className="flex items-center rounded-xl border border-white/10 bg-[#0D0D0D]">
                    <span className="hidden px-3 text-sm text-gray-500 sm:inline">
                      Sort by:
                    </span>

                    <select
                      value={sort}
                      onChange={(
                        event,
                      ) =>
                        setSort(
                          event.target
                            .value,
                        )
                      }
                      className="appearance-none bg-transparent px-3 py-2.5 text-sm text-gray-300 outline-none"
                    >
                      <option
                        value="Opportunity Score"
                        className="bg-[#0D0D0D]"
                      >
                        Opportunity Score
                      </option>

                      <option
                        value="Project Value"
                        className="bg-[#0D0D0D]"
                      >
                        Project Value
                      </option>

                      <option
                        value="Newest"
                        className="bg-[#0D0D0D]"
                      >
                        Newest
                      </option>
                    </select>

                    <ChevronDown
                      size={14}
                      className="mr-3 text-gray-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFiltersOpen(
                        (current) =>
                          !current,
                      )
                    }
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                      filtersOpen ||
                      activeFilterCount >
                        0
                        ? "border-[#3B82F6]/30 bg-[#3B82F6]/5 text-[#3B82F6]"
                        : "border-white/10 bg-[#0D0D0D] text-gray-300 hover:border-white/20"
                    }`}
                  >
                    <Filter size={15} />
                    Filters

                    {activeFilterCount >
                      0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3B82F6] px-1 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* ADVANCED FILTER PANEL */}

              {filtersOpen && (
                <div className="mt-3 lead-discovery-surface rounded-2xl border border-white/10 bg-[#0D0D0D] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        Advanced Filters
                      </h3>

                      <p className="mt-1 text-xs text-gray-600">
                        Refine the leads already
                        discovered for your company.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFiltersOpen(
                          false,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Status
                      </span>

                      <select
                        value={
                          advancedFilters.status
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              status:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-gray-300 outline-none"
                      >
                        <option
                          value="all"
                          className="bg-[#0D0D0D]"
                        >
                          All statuses
                        </option>

                        <option
                          value="new"
                          className="bg-[#0D0D0D]"
                        >
                          New
                        </option>

                        <option
                          value="contacted"
                          className="bg-[#0D0D0D]"
                        >
                          Contacted
                        </option>

                        <option
                          value="responded"
                          className="bg-[#0D0D0D]"
                        >
                          Responded
                        </option>

                        <option
                          value="qualified"
                          className="bg-[#0D0D0D]"
                        >
                          Qualified
                        </option>

                        <option
                          value="pipeline"
                          className="bg-[#0D0D0D]"
                        >
                          Pipeline
                        </option>

                        <option
                          value="client"
                          className="bg-[#0D0D0D]"
                        >
                          Client
                        </option>

                        <option
                          value="lost"
                          className="bg-[#0D0D0D]"
                        >
                          Lost
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Minimum Score
                      </span>

                      <select
                        value={
                          advancedFilters.minScore
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              minScore:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-gray-300 outline-none"
                      >
                        <option
                          value="all"
                          className="bg-[#0D0D0D]"
                        >
                          Any score
                        </option>

                        <option
                          value="60"
                          className="bg-[#0D0D0D]"
                        >
                          60+
                        </option>

                        <option
                          value="70"
                          className="bg-[#0D0D0D]"
                        >
                          70+
                        </option>

                        <option
                          value="80"
                          className="bg-[#0D0D0D]"
                        >
                          80+
                        </option>

                        <option
                          value="90"
                          className="bg-[#0D0D0D]"
                        >
                          90+
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Website
                      </span>

                      <select
                        value={
                          advancedFilters.website
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              website:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-gray-300 outline-none"
                      >
                        <option
                          value="all"
                          className="bg-[#0D0D0D]"
                        >
                          Any
                        </option>

                        <option
                          value="with"
                          className="bg-[#0D0D0D]"
                        >
                          Has website
                        </option>

                        <option
                          value="without"
                          className="bg-[#0D0D0D]"
                        >
                          No website
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Social Presence
                      </span>

                      <select
                        value={
                          advancedFilters.social
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              social:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-gray-300 outline-none"
                      >
                        <option
                          value="all"
                          className="bg-[#0D0D0D]"
                        >
                          Any
                        </option>

                        <option
                          value="with"
                          className="bg-[#0D0D0D]"
                        >
                          Has social
                        </option>

                        <option
                          value="without"
                          className="bg-[#0D0D0D]"
                        >
                          No social
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Industry
                      </span>

                      <select
                        value={
                          advancedFilters.industry
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              industry:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-gray-300 outline-none"
                      >
                        <option
                          value="all"
                          className="bg-[#0D0D0D]"
                        >
                          All industries
                        </option>

                        {availableIndustries.map(
                          (
                            industry,
                          ) => (
                            <option
                              key={
                                industry
                              }
                              value={
                                industry
                              }
                              className="bg-[#0D0D0D]"
                            >
                              {industry}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Minimum Project Value
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          advancedFilters.minProjectValue
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              minProjectValue:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="e.g. 5000"
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-700"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-gray-500">
                        Minimum Rating
                      </span>

                      <select
                        value={
                          advancedFilters.minRating
                        }
                        onChange={(
                          event,
                        ) =>
                          setAdvancedFilters(
                            (
                              current,
                            ) => ({
                              ...current,
                              minRating:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-gray-300 outline-none"
                      >
                        <option
                          value="all"
                          className="bg-[#0D0D0D]"
                        >
                          Any rating
                        </option>

                        <option
                          value="3"
                          className="bg-[#0D0D0D]"
                        >
                          3.0+
                        </option>

                        <option
                          value="3.5"
                          className="bg-[#0D0D0D]"
                        >
                          3.5+
                        </option>

                        <option
                          value="4"
                          className="bg-[#0D0D0D]"
                        >
                          4.0+
                        </option>

                        <option
                          value="4.5"
                          className="bg-[#0D0D0D]"
                        >
                          4.5+
                        </option>
                      </select>
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={
                          clearAllFilters
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-gray-400 transition hover:border-white/20 hover:text-white"
                      >
                        <X size={15} />
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {checkedIds.size > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 px-4 py-2.5">
                  <span className="text-sm font-medium text-white">
                    {checkedIds.size} selected
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => exportLeadsCsv(leads.filter((lead) => checkedIds.has(lead.id)))}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:text-white"
                  >
                    <Download size={13} />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => void addCheckedToPipeline()}
                    disabled={bulkBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50"
                  >
                    <GitBranch size={13} />
                    {bulkBusy ? "Adding..." : "Add to pipeline"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckedIds(new Set())}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:text-white"
                  >
                    <X size={13} />
                    Clear
                  </button>
                </div>
              )}

              {/* MAIN CONTENT */}

              <div
                className={`mt-3 grid gap-4 ${
                  selectedLead
                    ? "xl:grid-cols-[minmax(0,1fr)_365px]"
                    : "grid-cols-1"
                }`}
              >
                <div className="min-w-0">
                  {loading && (
                    <div className="rounded-xl border border-white/10 bg-[#0D0D0D] p-8 text-center">
                      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-[#3B82F6]" />

                      <p className="mt-4 text-base text-gray-400">
                        Loading your
                        discovered
                        leads...
                      </p>

                      <p className="mt-1 text-xs text-gray-700">
                        Loading your company
                        settings and lead
                        data
                      </p>
                    </div>
                  )}

                  {!loading &&
                    error && (
                      <div className="rounded-xl border border-[#F22F46]/20 bg-[#F22F46]/5 p-6">
                        <p className="text-base font-medium text-white">
                          Unable to load
                          leads
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          {error}
                        </p>
                      </div>
                    )}

                  {!loading &&
                    !error &&
                    filteredLeads.length ===
                      0 && (
                      <div className="rounded-xl border border-white/10 bg-[#0D0D0D] p-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3B82F6]/10">
                          <Search
                            size={21}
                            className="text-[#3B82F6]"
                          />
                        </div>

                        <h3 className="mt-4 text-lg font-medium text-white">
                          No leads found
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                          {leads.length ===
                          0
                            ? "Run your first search to discover businesses that match your ideal customer."
                            : activeFilterCount >
                                0
                              ? "No discovered leads match your current filters."
                              : "Try another search term or change the selected lead filters."}
                        </p>

                        {leads.length ===
                          0 && (
                          <a
                            href="/search"
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
                          >
                            <Search
                              size={16}
                            />
                            Start a
                            Search
                          </a>
                        )}

                        {leads.length >
                          0 &&
                          activeFilterCount >
                            0 && (
                            <button
                              type="button"
                              onClick={
                                clearAllFilters
                              }
                              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
                            >
                              <X
                                size={16}
                              />
                              Clear
                              Filters
                            </button>
                          )}
                      </div>
                    )}

                  {!loading &&
                    !error &&
                    filteredLeads.length >
                      0 && (
                      <div className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" : "space-y-2.5"}>
                        {filteredLeads.map(
                          (
                            lead,
                          ) => (
                            <LeadCard
                              checked={checkedIds.has(lead.id)}
                              onToggleCheck={() => toggleChecked(lead.id)}
                              compact={layout === "grid"}
                              key={
                                lead.id
                              }
                              lead={
                                lead
                              }
                              selected={
                                lead.id ===
                                selectedLeadId
                              }
                              onSelect={() =>
                                setSelectedLeadId(
                                  lead.id,
                                )
                              }
                              onQuickAction={(
                                action,
                              ) => {
                                setSelectedLeadId(
                                  lead.id,
                                );

                                if (
                                  action ===
                                  "pipeline"
                                ) {
                                  void addLeadToPipeline(
                                    lead,
                                  );
                                }

                                if (
                                  action ===
                                  "email"
                                ) {
                                  const email =
                                    lead
                                      .emailAddresses[0];

                                  if (
                                    email
                                  ) {
                                    window.location.href =
                                      `mailto:${email}`;
                                  }
                                }
                              }}
                            />
                          ),
                        )}
                      </div>
                    )}

                  <div className="mt-3 flex items-center rounded-xl border border-white/10 bg-[#0D0D0D] px-4 py-3">
                    <Search
                      size={17}
                      className="mr-3 shrink-0 text-gray-600"
                    />

                    <input
                      value={
                        searchQuery
                      }
                      onChange={(
                        event,
                      ) =>
                        setSearchQuery(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Search within your discovered leads..."
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() =>
                          setSearchQuery(
                            "",
                          )
                        }
                        className="ml-2 text-gray-500 hover:text-white"
                        aria-label="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {selectedLead && (
                  <div className="hidden min-w-0 lead-discovery-surface rounded-2xl border border-white/10 bg-[#0A0A0A] p-5 xl:block">
                    <LeadDetailPanel
                      lead={
                        selectedLead
                      }
                      companyContext={
                        companyContext
                      }
                      onClose={() =>
                        setSelectedLeadId(
                          null,
                        )
                      }
                      onPipeline={() =>
                        void addLeadToPipeline()
                      }
                      addingToPipeline={
                        addingToPipeline
                      }
                      onSaveNotes={
                        saveLeadNotes
                      }
                      onGenerateOutreach={() =>
                        generateOutreach(
                          selectedLead,
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {selectedLead && (
                <div id="lead-detail-mobile" className="mt-5 scroll-mt-20 lead-discovery-surface rounded-2xl border border-white/10 bg-[#0D0D0D] p-4 xl:hidden">
                  <LeadDetailPanel
                    lead={
                      selectedLead
                    }
                    companyContext={
                      companyContext
                    }
                    onClose={() =>
                      setSelectedLeadId(
                        null,
                      )
                    }
                    onPipeline={() =>
                      void addLeadToPipeline()
                    }
                    addingToPipeline={
                      addingToPipeline
                    }
                    onSaveNotes={
                      saveLeadNotes
                    }
                    onGenerateOutreach={() =>
                      generateOutreach(
                        selectedLead,
                      )
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          NEW OUTREACH MODAL
      ===================================================== */}

      {outreachOpen && selectedLead && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close outreach modal"
            className="absolute inset-0 cursor-default"
            onClick={closeOutreachComposer}
          />

          <div
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/60"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10">
                  <Sparkles
                    size={19}
                    className="text-[#3B82F6]"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">
                    New Outreach
                  </h2>

                  <p className="mt-1 truncate text-xs text-gray-600">
                    Personalized for{" "}
                    {selectedLead.company}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeOutreachComposer}
                disabled={outreachSaving}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-500">
                  Recipient
                </label>

                <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <Mail
                        size={16}
                        className="text-[#3B82F6]"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {selectedLead.name ||
                          selectedLead.company}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-600">
                        {selectedLead.company}
                      </p>
                    </div>
                  </div>

                  {selectedLead.emailAddresses.length > 0 ? (
                    <div className="mt-3 border-t border-white/[0.06] pt-3">
                      <p className="text-xs text-gray-600">
                        Email
                      </p>

                      <p className="mt-1 break-all text-sm text-[#3B82F6]">
                        {selectedLead.emailAddresses[0]}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-[#F97316]/10 bg-[#F97316]/[0.03] px-3 py-2.5">
                      <p className="text-xs text-[#3B82F6]">
                        This lead does not have an email address.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Sending channel
                </p>

                <div className="rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]">
                      <Mail
                        size={17}
                        className="text-white"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        Email
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-600">
                        Email is the available BaseLead outreach channel.
                      </p>
                    </div>

                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] text-[11px] font-bold text-white">
                      ✓
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-[10px] leading-4 text-gray-700">
                  Social channels are not shown because BaseLead
                  does not currently have direct sending integrations
                  for them.
                </p>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-gray-500">
                  Campaign
                </label>

                <input
                  type="text"
                  value={outreachCampaign}
                  onChange={(event) =>
                    setOutreachCampaign(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Lead Discovery"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-3 text-sm text-gray-200 outline-none transition placeholder:text-gray-700 focus:border-[#3B82F6]/40"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-gray-500">
                  Subject
                </label>

                <input
                  type="text"
                  value={outreachSubject}
                  onChange={(event) =>
                    setOutreachSubject(
                      event.target.value,
                    )
                  }
                  placeholder="Outreach subject"
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-3 text-sm text-gray-200 outline-none transition placeholder:text-gray-700 focus:border-[#3B82F6]/40"
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-xs font-medium text-gray-500">
                    Message
                  </label>

                  <span className="text-[10px] text-gray-700">
                    Personalized from your company settings
                  </span>
                </div>

                <textarea
                  value={outreachText}
                  onChange={(event) =>
                    setOutreachText(
                      event.target.value,
                    )
                  }
                  className="min-h-[240px] w-full resize-y rounded-xl border border-white/10 bg-[#0A0A0A] p-4 text-sm leading-6 text-gray-200 outline-none transition focus:border-[#3B82F6]/40"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-gray-500">
                  Schedule
                </label>

                <input
                  type="datetime-local"
                  value={outreachScheduledAt}
                  onChange={(event) =>
                    setOutreachScheduledAt(
                      event.target.value,
                    )
                  }
                  min={new Date()
                    .toISOString()
                    .slice(0, 16)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-3 text-sm text-gray-300 outline-none transition focus:border-[#3B82F6]/40"
                />

                <p className="mt-1.5 text-[10px] text-gray-700">
                  Leave this blank to keep the outreach as a draft.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLead) {
                      openOutreachComposer(
                        selectedLead,
                      );
                    }
                  }}
                  disabled={outreachSaving}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  <Sparkles size={14} />
                  Regenerate
                </button>

                <button
                  type="button"
                  onClick={copyOutreach}
                  disabled={
                    outreachSaving ||
                    !outreachText
                  }
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  {outreachCopied ? (
                    <>
                      <span className="text-[#84CC16]">
                        ✓
                      </span>
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeOutreachComposer}
                  disabled={outreachSaving}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 transition hover:border-white/20 hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveOutreach("draft")
                  }
                  disabled={
                    outreachSaving ||
                    !outreachText.trim()
                  }
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  {outreachSaving
                    ? "Saving..."
                    : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveOutreach("schedule")
                  }
                  disabled={
                    outreachSaving ||
                    !outreachText.trim() ||
                    !outreachScheduledAt
                  }
                  className="flex items-center gap-2 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-4 py-2.5 text-sm font-medium text-[#3B82F6] transition hover:bg-[#3B82F6]/15 disabled:opacity-40"
                >
                  <CalendarDays size={14} />
                  Schedule
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveOutreach("send")
                  }
                  disabled={
                    outreachSaving ||
                    !outreachText.trim() ||
                    selectedLead.emailAddresses.length === 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Mail size={15} />
                  {outreachSaving
                    ? "Saving..."
                    : "Send Outreach"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* =====================================================
           BASELEAD LEAD DISCOVERY VISUAL SYSTEM
           Lead Discovery is the visual source of truth for
           lead cards, icon badges, spacing, borders and depth.
        ===================================================== */

        .lead-discovery-surface {
          transition: transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease, background-color 260ms ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        }

        .lead-discovery-surface:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 55px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.025);
          border-color: rgba(255,255,255,0.13);
        }

        /* One consistent icon/emblem treatment.
           Other pages can reuse .baselead-icon-badge from globals. */
        .baselead-icon-badge {
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          border-radius: 9999px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.025);
          transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
        }

        .baselead-icon-badge:hover {
          transform: translateY(-1px) scale(1.025);
          filter: brightness(1.12);
          box-shadow: 0 5px 14px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(255,255,255,0.04);
        }

        /* Lead cards are individual Apple/macOS-style surfaces.
           No internal black divider rules: spacing + shadow do the separation. */
        .lead-discovery-row,
        .baselead-lead-card {
          box-shadow: 0 6px 22px rgba(0,0,0,0.12);
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease, background-color 220ms ease;
        }

        .lead-discovery-row:hover,
        .baselead-lead-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px rgba(0,0,0,0.30);
        }

        /* Keep the card's content visually continuous on desktop. */
        .lead-discovery-row > div > div[class*="border-l"],
        .lead-discovery-row > div > div[class*="border-t"] {
          border-left: 0 !important;
          border-top: 0 !important;
        }

        /* Light mode: preserve the same colored icon language while
           replacing dark surfaces with soft Apple-like neutrals. */
        :global(html.baselead-light) .lead-discovery-page .lead-discovery-row,
        :global(html.baselead-light) .lead-discovery-page .baselead-lead-card {
          background: #ffffff !important;
          border-color: rgba(0,0,0,0.075) !important;
          box-shadow: 0 2px 7px rgba(0,0,0,0.035), 0 10px 28px rgba(0,0,0,0.045);
        }

        :global(html.baselead-light) .lead-discovery-page .lead-discovery-row:hover,
        :global(html.baselead-light) .lead-discovery-page .baselead-lead-card:hover {
          border-color: rgba(0,0,0,0.11) !important;
          box-shadow: 0 5px 12px rgba(0,0,0,0.045), 0 18px 38px rgba(0,0,0,0.065);
        }

        :global(html.baselead-light) .lead-discovery-page .baselead-icon-badge {
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.035), 0 2px 7px rgba(0,0,0,0.025);
        }

        :global(html.baselead-light) .lead-discovery-page .baselead-icon-badge:hover {
          box-shadow: 0 5px 14px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.04);
        }

        :global(html.baselead-light) .lead-discovery-page .lead-discovery-row > div > div[class*="border-l"],
        :global(html.baselead-light) .lead-discovery-page .lead-discovery-row > div > div[class*="border-t"] {
          border-left: 0 !important;
          border-top: 0 !important;
        }

        .lead-discovery-page button,
        .lead-discovery-page a {
          -webkit-tap-highlight-color: transparent;
        }

        @media (prefers-reduced-motion: reduce) {
          .lead-discovery-surface,
          .lead-discovery-row,
          .baselead-lead-card,
          .baselead-icon-badge {
            transition: none;
          }

          .lead-discovery-surface:hover,
          .lead-discovery-row:hover,
          .baselead-lead-card:hover,
          .baselead-icon-badge:hover {
            transform: none;
          }
        }
      `}</style>

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[80] max-w-sm rounded-xl border border-white/10 bg-[#101010] px-4 py-3 shadow-2xl">
          <div className="flex items-start gap-3">
            <Clipboard
              size={16}
              className="mt-0.5 shrink-0 text-[#3B82F6]"
            />

            <p className="text-sm text-gray-200">
              {toast}
            </p>

            <button
              type="button"
              onClick={() =>
                setToast("")
              }
              className="text-gray-600 hover:text-white"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <p className="px-6 pb-6 text-center text-[11px] text-gray-600">
        Lead data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">OpenStreetMap contributors</a> and Google Maps, where available.
      </p>
    </main>
  );
}