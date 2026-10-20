"use client";

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Download,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Sparkles,
  Target,
  Users,
  X,
  Trophy,
  BarChart3,
  Clock3,
  List,
  Columns3,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Globe,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import LeadDealPanel from "@/components/leads/LeadDealPanel";
import { emitEvent } from "@/lib/events-client";

type PipelineStage =
  | "New Lead"
  | "Contacted"
  | "Responded"
  | "Meeting"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won";

type DatabaseLead = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  category: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string | null;
  ai_score: number | null;
  intent_score: number | null;
  ai_reason: string | null;
  ai_opportunity: string | null;
  ai_recommendations: unknown;
  notes: string | null;
  review_count: number | null;
  raw_data: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  category: string;
  location: string;
  stage: PipelineStage;
  services: string[];
  lastActivity: string;
  score: number;
  instagram: boolean;
  facebook: boolean;
  description: string;
  owner: string;
  tags: string[];
  notes: string;
  reviews: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type ViewMode = "kanban" | "list";

const GOLD = "#F5C518";
const PANEL = "#0D0D0D";
const DEEP = "#0A0A0A";
const ELEVATED = "#101010";
const INNER = "#171717";
const BORDER = "#202020";
const BORDER_LIGHT = "#2A2A2A";
const MUTED = "#777777";

const stages: PipelineStage[] = [
  "New Lead",
  "Contacted",
  "Responded",
  "Meeting",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
];

const stageColors: Record<PipelineStage, string> = {
  "New Lead": "#E5E7EB",
  Contacted: GOLD,
  Responded: "#22D3EE",
  Meeting: "#F0475C",
  Qualified: "#60A5FA",
  Proposal: "#A78BFA",
  Negotiation: "#F97316",
  Won: "#84CC16",
};

const dbStatusByStage: Record<PipelineStage, string> = {
  "New Lead": "new",
  Contacted: "contacted",
  Responded: "responded",
  Meeting: "meeting",
  Qualified: "qualified",
  Proposal: "proposal",
  Negotiation: "negotiation",
  Won: "won",
};

function mapStatusToStage(
  status: string | null
): PipelineStage {
  switch (status?.toLowerCase()) {
    case "contacted":
      return "Contacted";
    case "responded":
    case "replied":
      return "Responded";
    case "meeting":
    case "meeting_scheduled":
      return "Meeting";
    case "qualified":
      return "Qualified";
    case "proposal":
      return "Proposal";
    case "negotiation":
      return "Negotiation";
    case "won":
      return "Won";
    case "new":
    default:
      return "New Lead";
  }
}

function getLocation(lead: DatabaseLead) {
  return (
    lead.location ||
    [lead.city, lead.state].filter(Boolean).join(", ") ||
    lead.country ||
    "Unknown"
  );
}

function extractSocialProfiles(rawData: unknown) {
  if (!rawData || typeof rawData !== "object") {
    return {
      instagram: false,
      facebook: false,
    };
  }

  const text = JSON.stringify(rawData).toLowerCase();

  return {
    instagram: text.includes("instagram.com"),
    facebook: text.includes("facebook.com"),
  };
}

function deriveServices(
  lead: DatabaseLead
): string[] {
  const recommendations = lead.ai_recommendations;

  if (
    recommendations === null ||
    recommendations === undefined
  ) {
    return [];
  }

  if (Array.isArray(recommendations)) {
    return recommendations
      .flatMap((item) => {
        if (typeof item === "string") {
          return item
            .split(/\n|,|•/)
            .map((value) => value.trim());
        }

        if (
          item &&
          typeof item === "object" &&
          "name" in item
        ) {
          const value = (
            item as { name?: unknown }
          ).name;

          return typeof value === "string"
            ? [value.trim()]
            : [];
        }

        return [];
      })
      .map((item) =>
        item.replace(/^[-*]\s*/, "").trim()
      )
      .filter(Boolean)
      .slice(0, 3);
  }

  if (typeof recommendations === "string") {
    const value = recommendations.trim();

    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);

      if (parsed !== value) {
        return deriveServices({
          ...lead,
          ai_recommendations: parsed,
        });
      }
    } catch {
      // Normal text, not JSON.
    }

    return value
      .split(/\n|,|•/)
      .map((item) =>
        item.replace(/^[-*]\s*/, "").trim()
      )
      .filter(Boolean)
      .slice(0, 3);
  }

  if (
    typeof recommendations === "object" &&
    recommendations !== null
  ) {
    const object = recommendations as Record<
      string,
      unknown
    >;

    const possibleKeys = [
      "recommendations",
      "services",
      "items",
      "results",
      "suggestions",
    ];

    for (const key of possibleKeys) {
      const value = object[key];

      if (Array.isArray(value)) {
        return value
          .flatMap((item) =>
            typeof item === "string"
              ? item
                  .split(/\n|,|•/)
                  .map((entry) => entry.trim())
              : []
          )
          .map((item) =>
            item.replace(/^[-*]\s*/, "").trim()
          )
          .filter(Boolean)
          .slice(0, 3);
      }

      if (typeof value === "string") {
        return value
          .split(/\n|,|•/)
          .map((item) =>
            item.replace(/^[-*]\s*/, "").trim()
          )
          .filter(Boolean)
          .slice(0, 3);
      }
    }
  }

  return [];
}

function deriveTags(lead: DatabaseLead) {
  const tags: string[] = [];

  if (lead.industry || lead.category) {
    tags.push(
      lead.industry ||
        lead.category ||
        "Business"
    );
  }

  if (
    lead.ai_opportunity &&
    lead.ai_opportunity
      .toLowerCase()
      .includes("high")
  ) {
    tags.push("High Opportunity");
  }

  return tags;
}

function formatRelativeDate(
  date: string | null
) {
  if (!date) return "No activity";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "No activity";
  }

  const diff = Math.max(
    0,
    Date.now() - timestamp
  );

  const days = Math.floor(
    diff / 86400000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30)
    return `${Math.floor(days / 7)}w ago`;

  return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(
  date: string | null
) {
  if (!date) return "Unknown date";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatScore(score: number) {
  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function normalizeWebsite(
  website: string
) {
  if (!website) return "";

  return website.startsWith("http://") ||
    website.startsWith("https://")
    ? website
    : `https://${website}`;
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replace(
    /"/g,
    '""'
  )}"`;
}

function LeadAvatar({
  lead,
}: {
  lead: Lead;
}) {
  const palette = [
    "#F5C518",
    "#22D3EE",
    "#A78BFA",
    "#84CC16",
    "#F472B6",
    "#60A5FA",
    "#F97316",
    "#2DD4BF",
  ];

  const hash = lead.id
    .split("")
    .reduce(
      (total, char) =>
        total + char.charCodeAt(0),
      0
    );

  const accent =
    palette[
      hash % palette.length
    ];

  const initials =
    lead.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className="bl-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200"
      style={{ "--tab": accent } as React.CSSProperties}
    >
      {initials}
    </div>
  );
}

function socialIcon(
  type: "instagram" | "facebook"
) {
  if (type === "instagram") {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md text-[7px] font-bold text-white shadow-[0_4px_12px_rgba(221,42,123,0.18)]"
        style={{
          background:
            "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF, #515BD4)",
        }}
      >
        IG
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.20)]">
      f
    </span>
  );
}

function PipelineCard({
  lead,
  selected,
  onClick,
  onDragStart,
  onEdit,
}: {
  lead: Lead;
  selected: boolean;
  onClick: () => void;
  onDragStart: (
    event: DragEvent<HTMLButtonElement>,
    id: string
  ) => void;
  onEdit: (lead: Lead) => void;
}) {
  const stageColor =
    stageColors[lead.stage];

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) =>
        onDragStart(event, lead.id)
      }
      onClick={onClick}
      className={`group relative w-full rounded-xl border border-l-2 p-2.5 text-left transition-all duration-200 ease-out ${
        selected
          ? "border-[#F5C518]/50 border-l-[#F5C518] bg-[#F5C518]/[0.045] shadow-[0_14px_34px_rgba(0,0,0,0.32),0_0_28px_rgba(245,197,24,0.07)]"
          : "border-[#202020] border-l-transparent bg-[#0D0D0D] shadow-[0_8px_22px_rgba(0,0,0,0.20)] hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:border-l-[#F5C518]/50 hover:bg-[#101010] hover:shadow-[0_16px_36px_rgba(0,0,0,0.34),0_0_24px_rgba(245,197,24,0.045)]"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)`,
        }}
      />

      <div className="flex items-start gap-2.5">
        <LeadAvatar lead={lead} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="truncate text-[11px] font-semibold text-white transition-colors group-hover:text-white">
              {lead.name}
            </p>

            <span
              onClick={(event) => {
                event.stopPropagation();
                onEdit(lead);
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-gray-600 opacity-0 transition-all duration-150 hover:bg-[#171717] hover:text-white group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </span>
          </div>

          <p className="mt-1 truncate text-[9px] text-gray-500">
            {lead.category}
            <span className="mx-1">
              •
            </span>
            {lead.location}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[#202020] bg-[#101010] px-2.5 py-2 transition-all duration-200 group-hover:border-[#2A2A2A] group-hover:bg-[#171717]">
        <p className="text-[9px] text-gray-500">
          Opportunity Score
        </p>

        <p
          className={`mt-0.5 text-[10px] ${
            lead.score >= 80
              ? "text-[#84CC16]"
              : "text-gray-200"
          }`}
        >
          {lead.score}/100
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {lead.services
            .slice(0, 1)
            .map((service) => (
              <span
                key={service}
                className="truncate rounded-md border border-[#F5C518]/10 bg-[#332A0C] px-1.5 py-1 text-[8px] font-medium text-[#F5C518] transition-all duration-200 group-hover:border-[#F5C518]/20 group-hover:shadow-[0_0_16px_rgba(245,197,24,0.08)]"
              >
                {service}
              </span>
            ))}

          {lead.services.length === 0 && (
            <span className="text-[8px] text-gray-600">
              AI analysis pending
            </span>
          )}
        </div>

        <span className="shrink-0 text-[9px] text-gray-500">
          {lead.lastActivity}
        </span>
      </div>
    </button>
  );
}

function PipelineColumn({
  stage,
  leads,
  selectedLeadId,
  onSelect,
  onDrop,
  onDragStart,
  onAddLead,
  onEdit,
}: {
  stage: PipelineStage;
  leads: Lead[];
  selectedLeadId: string | null;
  onSelect: (lead: Lead) => void;
  onDrop: (
    event: DragEvent<HTMLDivElement>,
    stage: PipelineStage
  ) => void;
  onDragStart: (
    event: DragEvent<HTMLButtonElement>,
    id: string
  ) => void;
  onAddLead: (
    stage: PipelineStage
  ) => void;
  onEdit: (lead: Lead) => void;
}) {
  const color = stageColors[stage];

  return (
    <div
      onDragOver={(event) =>
        event.preventDefault()
      }
      onDrop={(event) =>
        onDrop(event, stage)
      }
      className="group flex w-[158px] min-w-[158px] flex-col rounded-xl border border-[#202020] bg-[#0A0A0A] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition-all duration-200 hover:border-[#2A2A2A] hover:shadow-[0_16px_36px_rgba(0,0,0,0.28)] sm:w-[185px] sm:min-w-[185px]"
    >
      <div className="relative rounded-lg bg-[#0D0D0D] px-2 py-2 shadow-[0_5px_16px_rgba(0,0,0,0.18)]">
        <div
          className="pointer-events-none absolute inset-x-2 top-0 h-px opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
              style={{
                backgroundColor: color,
                color,
              }}
            />

            <span className="truncate text-[11px] font-semibold text-white">
              {stage}
            </span>
          </div>

          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-[#202020] bg-[#171717] px-1.5 text-[9px] text-gray-300">
            {leads.length}
          </span>
        </div>

        <p className="mt-2 text-[10px] text-gray-500">
          {leads.length === 1
            ? "1 lead"
            : `${leads.length} leads`}
        </p>
      </div>

      <div className="flex min-h-[600px] flex-1 flex-col gap-2 pt-2">
        {leads.map((lead) => (
          <PipelineCard
            key={lead.id}
            lead={lead}
            selected={
              lead.id === selectedLeadId
            }
            onClick={() =>
              onSelect(lead)
            }
            onDragStart={onDragStart}
            onEdit={onEdit}
          />
        ))}

        <button
          type="button"
          onClick={() =>
            onAddLead(stage)
          }
          className="mt-auto flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#202020] bg-[#0D0D0D] text-[10px] text-gray-500 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_12px_26px_rgba(0,0,0,0.28)]"
        >
          <Plus size={14} />
          Add Lead
        </button>
      </div>
    </div>
  );
}

function LeadDetailPanel({
  lead,
  onClose,
  onEdit,
  onDelete,
  onGenerateOutreach,
  onViewProfile,
}: {
  lead: Lead;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onGenerateOutreach: (
    lead: Lead
  ) => void;
  onViewProfile: (lead: Lead) => void;
}) {
  const color = stageColors[lead.stage];

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="group flex min-w-0 items-center gap-3">
          <LeadAvatar lead={lead} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-semibold text-white">
                {lead.name}
              </h2>

              <span className="text-blue-500">
                ●
              </span>
            </div>

            <p className="mt-1 text-[10px] text-gray-500">
              {lead.category}
              <span className="mx-1.5">
                •
              </span>
              {lead.location}
            </p>

            {lead.website && (
              <a
                href={normalizeWebsite(
                  lead.website
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2 text-[10px] text-[#60A5FA] transition-colors hover:text-[#93C5FD]"
              >
                <span className="truncate">
                  {lead.website}
                </span>

                <ExternalLink
                  size={11}
                  className="shrink-0"
                />
              </a>
            )}

            <div className="mt-2 flex items-center gap-2">
              {lead.instagram &&
                socialIcon(
                  "instagram"
                )}

              {lead.facebook &&
                socialIcon(
                  "facebook"
                )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#202020] bg-[#0D0D0D] text-gray-400 shadow-[0_5px_16px_rgba(0,0,0,0.18)] transition-all hover:border-[#2A2A2A] hover:bg-[#171717] hover:text-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <div className="rounded-xl border border-[#202020] bg-[#0D0D0D] p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.20)] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">
                Opportunity Score
              </p>

              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className="text-3xl font-medium"
                  style={{
                    color:
                      lead.score >= 80
                        ? "#84CC16"
                        : GOLD,
                  }}
                >
                  {lead.score}
                </span>

                <span className="text-xs text-gray-500">
                  /100
                </span>
              </div>

              <span
                className={`mt-2 inline-flex rounded-md px-2 py-1 text-[10px] ${
                  lead.score >= 80
                    ? "border border-[#84CC16]/10 bg-[#18200B] text-[#84CC16]"
                    : "border border-[#F5C518]/10 bg-[#332A0C] text-[#F5C518]"
                }`}
              >
                {lead.score >= 80
                  ? "High Opportunity"
                  : "Opportunity"}
              </span>
            </div>

            <div
              className="relative h-16 w-16 transition-all duration-300"
              style={{
                filter: `drop-shadow(0 0 12px ${
                  lead.score >= 80
                    ? "rgba(132,204,22,0.16)"
                    : "rgba(245,197,24,0.14)"
                })`,
              }}
            >
              <div
                className="absolute inset-0 rounded-full border-[6px] border-[#202020]"
                style={{
                  borderTopColor:
                    lead.score >= 80
                      ? "#84CC16"
                      : GOLD,
                  borderLeftColor:
                    lead.score >= 80
                      ? "#84CC16"
                      : GOLD,
                  transform:
                    "rotate(-35deg)",
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center">
                <Target
                  size={17}
                  className="text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] font-medium text-gray-400">
          Recommended Services
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {lead.services.length > 0 ? (
            lead.services.map(
              (service) => (
                <span
                  key={service}
                  className="rounded-md border border-[#F5C518]/10 bg-[#F5C518] px-2 py-1.5 text-[9px] font-medium text-black shadow-[0_5px_14px_rgba(245,197,24,0.10)] transition-all hover:-translate-y-0.5 hover:bg-[#F5C518] hover:shadow-[0_8px_20px_rgba(245,197,24,0.18)]"
                >
                  {service}
                </span>
              )
            )
          ) : (
            <span className="text-[10px] text-gray-600">
              AI recommendations
              pending
            </span>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-5 text-gray-500">
          {lead.description}
        </p>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] text-gray-600">
          Contact
        </p>

        <div className="mt-3 space-y-2">
          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[10px] text-gray-400 transition-all hover:border-[#202020] hover:bg-[#101010] hover:text-white"
            >
              <Mail
                size={12}
                className="transition-colors group-hover:text-[#F5C518]"
              />

              <span className="truncate">
                {lead.email}
              </span>
            </a>
          ) : null}

          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[10px] text-gray-400 transition-all hover:border-[#202020] hover:bg-[#101010] hover:text-white"
            >
              <Phone
                size={12}
                className="transition-colors group-hover:text-[#F5C518]"
              />

              <span>
                {lead.phone}
              </span>
            </a>
          ) : null}

          {lead.website ? (
            <a
              href={normalizeWebsite(
                lead.website
              )}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[10px] text-gray-400 transition-all hover:border-[#202020] hover:bg-[#101010] hover:text-white"
            >
              <Globe
                size={12}
                className="transition-colors group-hover:text-[#60A5FA]"
              />

              <span className="truncate">
                {lead.website}
              </span>
            </a>
          ) : null}

          {!lead.email &&
            !lead.phone &&
            !lead.website && (
              <span className="text-[10px] text-gray-600">
                No contact
                information yet.
              </span>
            )}
        </div>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] text-gray-600">
          Stage
        </p>

        <div className="mt-2 flex items-center justify-between rounded-lg border border-[#202020] bg-[#0D0D0D] px-3 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 12px ${color}`,
              }}
            />

            <span className="text-xs text-gray-300">
              {lead.stage}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] text-gray-600">
          Owner
        </p>

        <div className="mt-2 flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 transition-all hover:border-[#202020] hover:bg-[#101010]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[7px] font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.30)]">
            YOU
          </div>

          <span className="truncate text-xs text-gray-300">
            {lead.owner}
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] text-gray-600">
          Tags
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {lead.tags.length > 0 ? (
            lead.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-[#202020] bg-[#171717] px-2 py-1 text-[9px] text-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.16)] transition-all hover:border-[#2A2A2A] hover:bg-[#1B1B1B]"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-gray-600">
              No tags
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] text-gray-600">
          Notes
        </p>

        <div className="mt-2 rounded-lg border border-[#202020] bg-[#0D0D0D] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.16)]">
          <p className="text-[11px] leading-5 text-gray-400">
            {lead.notes ||
              "No notes yet."}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-[#202020] pt-5">
        <p className="text-[11px] font-medium text-white">
          Activity
        </p>

        <div className="mt-4 space-y-4">
          <div className="group flex gap-3 rounded-lg border border-transparent p-2 transition-all hover:border-[#202020] hover:bg-[#101010]">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#60A5FA]/10 bg-[#10243A] shadow-[0_0_14px_rgba(96,165,250,0.08)]">
              <Search
                size={12}
                className="text-[#60A5FA]"
              />
            </div>

            <div>
              <p className="text-[10px] text-gray-300">
                Lead discovered
              </p>

              <p className="mt-0.5 text-[9px] text-gray-600">
                {formatDate(
                  lead.createdAt
                )}
              </p>
            </div>
          </div>

          <div className="group flex gap-3 rounded-lg border border-transparent p-2 transition-all hover:border-[#202020] hover:bg-[#101010]">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#60A5FA]/10 bg-[#10243A] shadow-[0_0_14px_rgba(96,165,250,0.08)]">
              <Plus
                size={12}
                className="text-[#60A5FA]"
              />
            </div>

            <div>
              <p className="text-[10px] text-gray-300">
                Last updated
              </p>

              <p className="mt-0.5 text-[9px] text-gray-600">
                {formatDate(
                  lead.updatedAt
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={() =>
            onGenerateOutreach(
              lead
            )
          }
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#F5C518] py-3 text-xs font-semibold text-black shadow-[0_8px_24px_rgba(245,197,24,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F5C518] hover:shadow-[0_14px_32px_rgba(245,197,24,0.22),0_0_22px_rgba(245,197,24,0.10)]"
        >
          <Sparkles
            size={14}
            className="transition-transform group-hover:scale-110"
          />
          Generate Outreach
        </button>

        <button
          type="button"
          onClick={() =>
            onViewProfile(lead)
          }
          className="group flex w-full items-center justify-center gap-2 rounded-lg border border-[#202020] bg-[#0D0D0D] py-3 text-xs text-gray-300 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_12px_26px_rgba(0,0,0,0.28)]"
        >
          <ExternalLink
            size={14}
            className="transition-colors group-hover:text-[#F5C518]"
          />
          View Lead Profile
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onEdit(lead)
            }
            className="group flex items-center justify-center gap-2 rounded-lg border border-[#202020] bg-[#0D0D0D] py-2.5 text-[10px] text-gray-400 shadow-[0_5px_16px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_22px_rgba(0,0,0,0.24)]"
          >
            <Pencil
              size={12}
              className="transition-colors group-hover:text-[#F5C518]"
            />
            Edit
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(lead)
            }
            className="group flex items-center justify-center gap-2 rounded-lg border border-[#F0475C]/20 bg-[#0D0D0D] py-2.5 text-[10px] text-[#F0475C] shadow-[0_5px_16px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 hover:border-[#F0475C]/30 hover:bg-[#3A1418] hover:shadow-[0_10px_24px_rgba(240,71,92,0.10)]"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>

      <LeadDealPanel leadId={lead.id} />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  change,
  iconClass,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  change: string;
  iconClass: string;
}) {
  return (
    <div className="group relative rounded-xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_16px_36px_rgba(0,0,0,0.30)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass} shadow-[0_6px_18px_rgba(0,0,0,0.20)] transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_8px_22px_rgba(245,197,24,0.08)]`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">
            {label}
          </p>

          <p className="mt-1 text-xl font-medium text-white">
            {value}
          </p>

          <p className="mt-1 text-[10px] text-gray-500">
            {change}
          </p>
        </div>
      </div>
    </div>
  );
}

function LeadFormModal({
  open,
  mode,
  lead,
  initialStage,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  mode: "add" | "edit";
  lead: Lead | null;
  initialStage: PipelineStage;
  onClose: () => void;
  onSave: (values: {
    name: string;
    company: string;
    email: string;
    phone: string;
    website: string;
    category: string;
    location: string;
    stage: PipelineStage;
    notes: string;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] =
    useState("");
  const [company, setCompany] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [website, setWebsite] =
    useState("");
  const [category, setCategory] =
    useState("");
  const [location, setLocation] =
    useState("");
  const [stage, setStage] =
    useState<PipelineStage>(
      initialStage
    );
  const [notes, setNotes] =
    useState("");

  useEffect(() => {
    if (!open) return;

    setName(lead?.name || "");
    setCompany(lead?.company || "");
    setEmail(lead?.email || "");
    setPhone(lead?.phone || "");
    setWebsite(lead?.website || "");
    setCategory(
      lead?.category || ""
    );
    setLocation(
      lead?.location || ""
    );
    setStage(
      lead?.stage || initialStage
    );
    setNotes(lead?.notes || "");
  }, [
    open,
    lead,
    initialStage,
  ]);

  if (!open) return null;

  return (
    <div
      data-baselead-modal-backdrop
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-[0_30px_80px_rgba(0,0,0,0.60),0_0_50px_rgba(245,197,24,0.035)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#202020] bg-[#0D0D0D]/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {mode === "add"
                ? "Add Lead"
                : "Edit Lead"}
            </h2>

            <p className="mt-1 text-[10px] text-gray-500">
              {mode === "add"
                ? "Add a business directly to your pipeline."
                : "Update the lead information."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202020] bg-[#101010] text-gray-400 shadow-[0_5px_16px_rgba(0,0,0,0.18)] transition-all hover:border-[#2A2A2A] hover:bg-[#171717] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();

            if (
              !name.trim() &&
              !company.trim()
            ) {
              return;
            }

            onSave({
              name: name.trim(),
              company:
                company.trim(),
              email: email.trim(),
              phone: phone.trim(),
              website:
                website.trim(),
              category:
                category.trim(),
              location:
                location.trim(),
              stage,
              notes: notes.trim(),
            });
          }}
          className="space-y-4 p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Contact name"
              value={name}
              onChange={setName}
              placeholder="John Smith"
            />

            <Field
              label="Company"
              value={company}
              onChange={setCompany}
              placeholder="Business name"
            />

            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="hello@company.com"
              type="email"
            />

            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="+1 555 123 4567"
            />

            <Field
              label="Website"
              value={website}
              onChange={setWebsite}
              placeholder="company.com"
            />

            <Field
              label="Industry"
              value={category}
              onChange={setCategory}
              placeholder="Med Spa"
            />

            <Field
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="Austin, TX"
            />

            <div>
              <label className="mb-1.5 block text-[10px] text-gray-500">
                Pipeline stage
              </label>

              <select
                value={stage}
                onChange={(event) =>
                  setStage(
                    event.target
                      .value as PipelineStage
                  )
                }
                className="h-10 w-full rounded-lg border border-[#202020] bg-[#0D0D0D] px-3 text-xs text-white shadow-[0_5px_16px_rgba(0,0,0,0.16)] outline-none transition-all focus:border-[#F5C518]/50 focus:bg-[#101010] focus:shadow-[0_0_20px_rgba(245,197,24,0.07)]"
              >
                {stages.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] text-gray-500">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Add notes about this lead..."
              rows={4}
              className="w-full resize-none rounded-lg border border-[#202020] bg-[#0D0D0D] px-3 py-2.5 text-xs text-white shadow-[0_5px_16px_rgba(0,0,0,0.16)] outline-none transition-all placeholder:text-gray-700 focus:border-[#F5C518]/50 focus:bg-[#101010] focus:shadow-[0_0_20px_rgba(245,197,24,0.07)]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#202020] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#202020] bg-[#0D0D0D] px-4 py-2.5 text-xs text-gray-400 shadow-[0_5px_16px_rgba(0,0,0,0.14)] transition-all hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                (!name.trim() &&
                  !company.trim())
              }
              className="flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2.5 text-xs font-semibold text-black shadow-[0_7px_20px_rgba(245,197,24,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#F5C518] hover:shadow-[0_12px_28px_rgba(245,197,24,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : (
                <Check size={13} />
              )}

              {mode === "add"
                ? "Add Lead"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] text-gray-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[#202020] bg-[#0D0D0D] px-3 text-xs text-white shadow-[0_5px_16px_rgba(0,0,0,0.16)] outline-none transition-all placeholder:text-gray-700 focus:border-[#F5C518]/50 focus:bg-[#101010] focus:shadow-[0_0_20px_rgba(245,197,24,0.07)]"
      />
    </div>
  );
}

function ListRow({
  lead,
  selected,
  onSelect,
  onEdit,
}: {
  lead: Lead;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const stageColor =
    stageColors[lead.stage];

  return (
    <div
      className={`group grid cursor-pointer grid-cols-[minmax(180px,1.5fr)_minmax(100px,1fr)_minmax(120px,1fr)_90px_100px_40px] items-center gap-3 border-b border-[#202020] border-l-2 px-4 py-3 transition-all duration-200 ${
        selected
          ? "border-l-[#F5C518] bg-[#F5C518]/[0.035] shadow-[inset_0_0_30px_rgba(245,197,24,0.025),0_0_24px_rgba(245,197,24,0.035)]"
          : "border-l-transparent hover:border-l-[#F5C518]/40 hover:bg-[#101010] hover:shadow-[inset_0_0_24px_rgba(245,197,24,0.018)]"
      }`}
      onClick={onSelect}
    >
      <div className="flex min-w-0 items-center gap-3">
        <LeadAvatar lead={lead} />

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white transition-colors group-hover:text-white">
            {lead.name}
          </p>

          <p className="mt-0.5 truncate text-[9px] text-gray-600">
            {lead.company ||
              lead.category}
          </p>
        </div>
      </div>

      <span className="truncate text-[10px] text-gray-400">
        {lead.category}
      </span>

      <span className="truncate text-[10px] text-gray-500">
        {lead.location}
      </span>

      <span
        className="inline-flex w-fit rounded-md border px-2 py-1 text-[9px] shadow-[0_4px_12px_rgba(0,0,0,0.14)]"
        style={{
          backgroundColor: `${stageColor}15`,
          borderColor: `${stageColor}25`,
          color: stageColor,
        }}
      >
        {lead.stage}
      </span>

      <span
        className={`text-[10px] ${
          lead.score >= 80
            ? "text-[#84CC16]"
            : "text-gray-300"
        }`}
      >
        {lead.score}/100
      </span>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-all hover:bg-[#171717] hover:text-white hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

export default function PipelinePage() {
  const { can: canUsePlan } = usePlan();
  const router = useRouter();

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [
    selectedLeadId,
    setSelectedLeadId,
  ] = useState<string | null>(
    null
  );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    mobileDetailOpen,
    setMobileDetailOpen,
  ] = useState(false);

  const [
    filterOpen,
    setFilterOpen,
  ] = useState(false);

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState(
    "All Categories"
  );

  const [
    stageFilter,
    setStageFilter,
  ] = useState<
    "All Stages" | PipelineStage
  >("All Stages");

  const [
    opportunityFilter,
    setOpportunityFilter,
  ] = useState<
    | "All Opportunities"
    | "High"
    | "Medium"
    | "Low"
  >("All Opportunities");

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>("kanban");

  const [
    draggedLeadId,
    setDraggedLeadId,
  ] = useState<string | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    savingLeadId,
    setSavingLeadId,
  ] = useState<string | null>(
    null
  );

  const [modalOpen, setModalOpen] =
    useState(false);

  const [modalMode, setModalMode] =
    useState<"add" | "edit">("add");

  const [
    editingLead,
    setEditingLead,
  ] = useState<Lead | null>(null);

  const [
    modalStage,
    setModalStage,
  ] =
    useState<PipelineStage>(
      "New Lead"
    );

  const [
    savingForm,
    setSavingForm,
  ] = useState(false);

  const selectedLead =
    leads.find(
      (lead) =>
        lead.id ===
        selectedLeadId
    ) ?? null;

  async function loadLeads() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "You must be logged in to view your pipeline."
      );
      setLoading(false);
      return;
    }

    // Leads I own or that were assigned to me.
    let {
      data,
      error: leadsError,
    } = await supabase
      .from("leads")
      .select("*")
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("updated_at", {
        ascending: false,
      });

    // Before the sales-automation migration there is no assigned_to.
    if (leadsError?.message?.includes("assigned_to")) {
      const fallback = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      data = fallback.data;
      leadsError = fallback.error;
    }

    if (leadsError) {
      console.error(
        "Pipeline load error:",
        leadsError
      );

      setError(
        "Could not load your pipeline."
      );

      setLoading(false);
      return;
    }

    const mappedLeads: Lead[] = (
      (data ?? []) as DatabaseLead[]
    )
      // Lost and nurture deals are not on the active board.
      .filter(
        (lead) =>
          !["lost", "nurture"].includes(
            (lead.status ?? "").toLowerCase()
          )
      )
      .map((lead) => {
      const social =
        extractSocialProfiles(
          lead.raw_data
        );

      const score = formatScore(
        lead.ai_score ??
          lead.intent_score ??
          0
      );

      return {
        id: lead.id,

        name:
          lead.name ||
          lead.company ||
          "Unnamed Lead",

        company:
          lead.company || "",

        email:
          lead.email || "",

        phone:
          lead.phone || "",

        website:
          lead.website || "",

        category:
          lead.industry ||
          lead.category ||
          "Business",

        location:
          getLocation(lead),

        stage:
          mapStatusToStage(
            lead.status
          ),

        services:
          deriveServices(lead),

        lastActivity:
          formatRelativeDate(
            lead.updated_at ||
              lead.created_at
          ),

        score,

        instagram:
          social.instagram,

        facebook:
          social.facebook,

        description:
          lead.ai_reason ||
          lead.notes ||
          "AI analysis not available yet.",

        owner:
          user.email || "You",

        tags:
          deriveTags(lead),

        notes:
          lead.notes || "",

        reviews:
          lead.review_count || 0,

        createdAt:
          lead.created_at,

        updatedAt:
          lead.updated_at,
      };
    });

    setLeads(mappedLeads);

    if (
      selectedLeadId &&
      !mappedLeads.some(
        (lead) =>
          lead.id ===
          selectedLeadId
      )
    ) {
      setSelectedLeadId(
        mappedLeads[0]?.id ??
          null
      );
    } else if (
      !selectedLeadId &&
      mappedLeads.length > 0
    ) {
      setSelectedLeadId(
        mappedLeads[0].id
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadLeads();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        leads
          .map(
            (lead) =>
              lead.category
          )
          .filter(Boolean)
      )
    ).sort();

    return [
      "All Categories",
      ...unique,
    ];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    const query =
      searchQuery
        .trim()
        .toLowerCase();

    if (query) {
      result = result.filter(
        (lead) =>
          lead.name
            .toLowerCase()
            .includes(query) ||
          lead.company
            .toLowerCase()
            .includes(query) ||
          lead.email
            .toLowerCase()
            .includes(query) ||
          lead.website
            .toLowerCase()
            .includes(query) ||
          lead.category
            .toLowerCase()
            .includes(query) ||
          lead.location
            .toLowerCase()
            .includes(query)
      );
    }

    if (
      categoryFilter !==
      "All Categories"
    ) {
      result =
        result.filter(
          (lead) =>
            lead.category ===
            categoryFilter
        );
    }

    if (
      stageFilter !==
      "All Stages"
    ) {
      result =
        result.filter(
          (lead) =>
            lead.stage ===
            stageFilter
        );
    }

    if (
      opportunityFilter !==
      "All Opportunities"
    ) {
      result =
        result.filter(
          (lead) => {
            if (
              opportunityFilter ===
              "High"
            ) {
              return lead.score >= 80;
            }

            if (
              opportunityFilter ===
              "Medium"
            ) {
              return (
                lead.score >= 50 &&
                lead.score < 80
              );
            }

            return lead.score < 50;
          }
        );
    }

    return result;
  }, [
    leads,
    searchQuery,
    categoryFilter,
    stageFilter,
    opportunityFilter,
  ]);

  const wonLeads =
    leads.filter(
      (lead) =>
        lead.stage === "Won"
    );

  const conversionRate =
    leads.length > 0
      ? (
          (wonLeads.length /
            leads.length) *
          100
        ).toFixed(1)
      : "0.0";

  const averageScore =
    leads.length > 0
      ? Math.round(
          leads.reduce(
            (total, lead) =>
              total +
              lead.score,
            0
          ) / leads.length
        )
      : 0;

  const highOpportunityCount =
    leads.filter(
      (lead) =>
        lead.score >= 80
    ).length;

  function selectLead(
    lead: Lead
  ) {
    setSelectedLeadId(
      lead.id
    );

    setMobileDetailOpen(
      true
    );
  }

  function openAddModal(
    stage: PipelineStage =
      "New Lead"
  ) {
    setModalMode("add");
    setEditingLead(null);
    setModalStage(stage);
    setModalOpen(true);
  }

  function openEditModal(
    lead: Lead
  ) {
    setModalMode("edit");
    setEditingLead(lead);
    setModalStage(
      lead.stage
    );
    setModalOpen(true);
  }

  function handleDragStart(
    event: DragEvent<HTMLButtonElement>,
    id: string
  ) {
    setDraggedLeadId(id);

    event.dataTransfer.setData(
      "leadId",
      id
    );

    event.dataTransfer.effectAllowed =
      "move";
  }

  async function handleDrop(
    event: DragEvent<HTMLDivElement>,
    stage: PipelineStage
  ) {
    event.preventDefault();

    const id =
      draggedLeadId ||
      event.dataTransfer.getData(
        "leadId"
      );

    if (!id) return;

    const currentLead =
      leads.find(
        (lead) =>
          lead.id === id
      );

    if (!currentLead) return;

    if (
      currentLead.stage ===
      stage
    ) {
      setDraggedLeadId(null);
      return;
    }

    const previousStage =
      currentLead.stage;

    const now =
      new Date().toISOString();

    setDraggedLeadId(null);
    setSavingLeadId(id);
    setError(null);

    setLeads((current) =>
      current.map(
        (lead) =>
          lead.id === id
            ? {
                ...lead,
                stage,
                lastActivity:
                  "Just now",
                updatedAt: now,
              }
            : lead
      )
    );

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setSavingLeadId(null);

      setError(
        "Your session has expired. Please log in again."
      );

      setLeads((current) =>
        current.map(
          (lead) =>
            lead.id === id
              ? {
                  ...lead,
                  stage:
                    previousStage,
                }
              : lead
        )
      );

      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("leads")
      .update({
        status:
          dbStatusByStage[
            stage
          ],
        updated_at: now,
      })
      .eq("id", id);

    setSavingLeadId(null);

    if (!updateError) {
      emitEvent("lead.status_changed", {
        id,
        from: previousStage,
        to: stage,
      });
    }

    if (updateError) {
      console.error(
        "Pipeline update error:",
        updateError
      );

      setLeads((current) =>
        current.map(
          (lead) =>
            lead.id === id
              ? {
                  ...lead,
                  stage:
                    previousStage,
                }
              : lead
        )
      );

      setError(
        "Could not save the stage change."
      );
    }
  }

  async function handleSaveLead(
    values: {
      name: string;
      company: string;
      email: string;
      phone: string;
      website: string;
      category: string;
      location: string;
      stage: PipelineStage;
      notes: string;
    }
  ) {
    setSavingForm(true);
    setError(null);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setSavingForm(false);

      setError(
        "Your session has expired. Please log in again."
      );

      return;
    }

    const now =
      new Date().toISOString();

    if (
      modalMode === "add"
    ) {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("leads")
        .insert({
          user_id: user.id,

          name:
            values.name || null,

          company:
            values.company ||
            null,

          email:
            values.email || null,

          phone:
            values.phone || null,

          website:
            values.website ||
            null,

          industry:
            values.category ||
            null,

          category:
            values.category ||
            null,

          location:
            values.location ||
            null,

          status:
            dbStatusByStage[
              values.stage
            ],

          notes:
            values.notes || null,

          ai_score: null,

          intent_score: null,

          updated_at: now,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error(
          "Add lead error:",
          insertError
        );

        setError(
          insertError.message ||
            "Could not add the lead."
        );

        setSavingForm(false);

        return;
      }

      const newLead =
        data as DatabaseLead;

      const social =
        extractSocialProfiles(
          newLead.raw_data
        );

      const mappedLead: Lead =
        {
          id: newLead.id,

          name:
            newLead.name ||
            newLead.company ||
            "Unnamed Lead",

          company:
            newLead.company ||
            "",

          email:
            newLead.email ||
            "",

          phone:
            newLead.phone ||
            "",

          website:
            newLead.website ||
            "",

          category:
            newLead.industry ||
            newLead.category ||
            "Business",

          location:
            getLocation(
              newLead
            ),

          stage:
            mapStatusToStage(
              newLead.status
            ),

          services:
            deriveServices(
              newLead
            ),

          lastActivity:
            "Just now",

          score: 0,

          instagram:
            social.instagram,

          facebook:
            social.facebook,

          description:
            newLead.notes ||
            "AI analysis not available yet.",

          owner:
            user.email || "You",

          tags:
            newLead.industry
              ? [
                  newLead.industry,
                ]
              : [],

          notes:
            newLead.notes ||
            "",

          reviews:
            newLead.review_count ||
            0,

          createdAt:
            newLead.created_at,

          updatedAt:
            newLead.updated_at,
        };

      setLeads(
        (current) => [
          mappedLead,
          ...current,
        ]
      );

      setSelectedLeadId(
        mappedLead.id
      );

      setModalOpen(false);
    } else if (
      editingLead
    ) {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("leads")
        .update({
          name:
            values.name || null,

          company:
            values.company ||
            null,

          email:
            values.email || null,

          phone:
            values.phone || null,

          website:
            values.website ||
            null,

          industry:
            values.category ||
            null,

          category:
            values.category ||
            null,

          location:
            values.location ||
            null,

          status:
            dbStatusByStage[
              values.stage
            ],

          notes:
            values.notes || null,

          updated_at: now,
        })
        .eq(
          "id",
          editingLead.id
        )
        .eq(
          "user_id",
          user.id
        )
        .select("*")
        .single();

      if (updateError) {
        console.error(
          "Edit lead error:",
          updateError
        );

        setError(
          updateError.message ||
            "Could not update the lead."
        );

        setSavingForm(false);

        return;
      }

      const updatedLead =
        data as DatabaseLead;

      const social =
        extractSocialProfiles(
          updatedLead.raw_data
        );

      const mappedLead: Lead =
        {
          id: updatedLead.id,

          name:
            updatedLead.name ||
            updatedLead.company ||
            "Unnamed Lead",

          company:
            updatedLead.company ||
            "",

          email:
            updatedLead.email ||
            "",

          phone:
            updatedLead.phone ||
            "",

          website:
            updatedLead.website ||
            "",

          category:
            updatedLead.industry ||
            updatedLead.category ||
            "Business",

          location:
            getLocation(
              updatedLead
            ),

          stage:
            mapStatusToStage(
              updatedLead.status
            ),

          services:
            deriveServices(
              updatedLead
            ),

          lastActivity:
            "Just now",

          score: formatScore(
            updatedLead.ai_score ??
              updatedLead.intent_score ??
              0
          ),

          instagram:
            social.instagram,

          facebook:
            social.facebook,

          description:
            updatedLead.ai_reason ||
            updatedLead.notes ||
            "AI analysis not available yet.",

          owner:
            user.email || "You",

          tags:
            deriveTags(
              updatedLead
            ),

          notes:
            updatedLead.notes ||
            "",

          reviews:
            updatedLead.review_count ||
            0,

          createdAt:
            updatedLead.created_at,

          updatedAt:
            updatedLead.updated_at,
        };

      setLeads((current) =>
        current.map(
          (lead) =>
            lead.id ===
            mappedLead.id
              ? mappedLead
              : lead
        )
      );

      setSelectedLeadId(
        mappedLead.id
      );

      setModalOpen(false);
    }

    setSavingForm(false);
  }

  async function handleDeleteLead(
    lead: Lead
  ) {
    const confirmed =
      window.confirm(
        `Delete ${
          lead.company ||
          lead.name
        }? This cannot be undone.`
      );

    if (!confirmed) return;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your session has expired. Please log in again."
      );

      return;
    }

    setError(null);

    const {
      error: deleteError,
    } = await supabase
      .from("leads")
      .delete()
      .eq("id", lead.id)
      .eq(
        "user_id",
        user.id
      );

    if (deleteError) {
      console.error(
        "Delete lead error:",
        deleteError
      );

      setError(
        "Could not delete the lead."
      );

      return;
    }

    setLeads((current) =>
      current.filter(
        (item) =>
          item.id !== lead.id
      )
    );

    setSelectedLeadId(
      (current) =>
        current === lead.id
          ? null
          : current
    );

    setMobileDetailOpen(false);
  }

  function exportPipeline() {
    // Export is part of Advanced pipeline (Pro/Scale).
    if (!canUsePlan("advanced_pipeline")) {
      setError(
        "Pipeline export and advanced filters are available on the Pro and Scale plans. Upgrade in Settings → Billing."
      );
      return;
    }

    const headers = [
      "Name",
      "Company",
      "Email",
      "Phone",
      "Website",
      "Industry",
      "Location",
      "Stage",
      "Score",
      "Services",
      "Reviews",
    ];

    const rows =
      filteredLeads.map(
        (lead) => [
          lead.name,
          lead.company,
          lead.email,
          lead.phone,
          lead.website,
          lead.category,
          lead.location,
          lead.stage,
          lead.score,
          lead.services.join(
            " + "
          ),
          lead.reviews,
        ]
      );

    const csv = [
      headers
        .map(escapeCsv)
        .join(","),
      ...rows.map((row) =>
        row
          .map(escapeCsv)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "baselead-pipeline.csv";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }

  function clearFilters() {
    setCategoryFilter(
      "All Categories"
    );

    setStageFilter(
      "All Stages"
    );

    setOpportunityFilter(
      "All Opportunities"
    );

    setSearchQuery("");
  }

  function handleGenerateOutreach(
    lead: Lead
  ) {
    router.push(
      `/outreach?lead=${encodeURIComponent(
        lead.id
      )}`
    );
  }

  function handleViewProfile(
    lead: Lead
  ) {
    router.push(
      `/leads?lead=${encodeURIComponent(
        lead.id
      )}`
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white transition-colors duration-200">
      <div className="px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">
              Pipeline
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Track and manage your leads from first contact to closed client.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              openAddModal()
            }
            className="group flex w-fit items-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-xs font-semibold text-black shadow-[0_8px_24px_rgba(245,197,24,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F5C518] hover:shadow-[0_14px_32px_rgba(245,197,24,0.22),0_0_24px_rgba(245,197,24,0.08)]"
          >
            <Plus
              size={15}
              className="transition-transform group-hover:scale-110"
            />

            Add Lead
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 overflow-hidden rounded-xl border border-[#202020] bg-[#0A0A0A] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.22)] md:grid-cols-3 xl:grid-cols-6 xl:gap-0 xl:p-0 xl:divide-x xl:divide-[#202020]">
          <KpiCard
            icon={
              <Target
                size={18}
                className="text-[#F5C518]"
              />
            }
            label="All Pipeline"
            value={String(
              leads.length
            )}
            change="Real leads"
            iconClass="border border-[#F5C518]/10 bg-[#332A0C]"
          />

          <KpiCard
            icon={
              <BarChart3
                size={18}
                className="text-[#A78BFA]"
              />
            }
            label="Pipeline Value"
            value="—"
            change="Deal values not tracked yet"
            iconClass="border border-[#A78BFA]/10 bg-[#241A38]"
          />

          <KpiCard
            icon={
              <Trophy
                size={18}
                className="text-[#84CC16]"
              />
            }
            label="Won"
            value={String(
              wonLeads.length
            )}
            change="Closed leads"
            iconClass="border border-[#84CC16]/10 bg-[#18200B]"
          />

          <KpiCard
            icon={
              <BarChart3
                size={18}
                className="text-orange-400"
              />
            }
            label="Conversion Rate"
            value={`${conversionRate}%`}
            change="Won / all leads"
            iconClass="border border-orange-500/10 bg-orange-500/10"
          />

          <KpiCard
            icon={
              <Target
                size={18}
                className="text-[#60A5FA]"
              />
            }
            label="Avg. Score"
            value={`${averageScore}/100`}
            change={`${highOpportunityCount} high opportunity`}
            iconClass="border border-[#60A5FA]/10 bg-[#10243A]"
          />

          <KpiCard
            icon={
              <Clock3
                size={18}
                className="text-cyan-400"
              />
            }
            label="Sales Cycle"
            value="—"
            change="Not tracked yet"
            iconClass="border border-cyan-500/10 bg-cyan-500/10"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setViewMode(
                  "kanban"
                )
              }
              className={`group flex h-10 w-10 items-center justify-center rounded-xl border shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 ${
                viewMode ===
                "kanban"
                  ? "border-[#F5C518]/40 bg-[#332A0C] text-[#F5C518] shadow-[0_0_22px_rgba(245,197,24,0.07)]"
                  : "border-[#202020] bg-[#0D0D0D] text-gray-400 hover:-translate-y-0.5 hover:border-[#F5C518]/45 hover:bg-[#101010] hover:text-[#F5C518] hover:shadow-[0_10px_24px_rgba(0,0,0,0.26),0_0_18px_rgba(245,197,24,0.06)]"
              }`}
              aria-label="Kanban view"
            >
              <Columns3 size={17} />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode(
                  "list"
                )
              }
              className={`group flex h-10 w-10 items-center justify-center rounded-xl border shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 ${
                viewMode === "list"
                  ? "border-[#F5C518]/40 bg-[#332A0C] text-[#F5C518] shadow-[0_0_22px_rgba(245,197,24,0.07)]"
                  : "border-[#202020] bg-[#0D0D0D] text-gray-400 hover:-translate-y-0.5 hover:border-[#F5C518]/45 hover:bg-[#101010] hover:text-[#F5C518] hover:shadow-[0_10px_24px_rgba(0,0,0,0.26),0_0_18px_rgba(245,197,24,0.06)]"
              }`}
              aria-label="List view"
            >
              <List size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                !canUsePlan(
                  "advanced_pipeline"
                )
              ) {
                setError(
                  "Advanced pipeline filters are available on the Pro and Scale plans. Upgrade in Settings → Billing."
                );
                return;
              }

              setFilterOpen(
                !filterOpen
              );
            }}
            className={`flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 ${
              filterOpen
                ? "border-[#F5C518]/40 bg-[#332A0C] text-[#F5C518] shadow-[0_0_22px_rgba(245,197,24,0.07)]"
                : "border-[#202020] bg-[#0D0D0D] text-gray-300 hover:-translate-y-0.5 hover:border-[#F5C518]/45 hover:bg-[#101010] hover:text-[#F5C518] hover:shadow-[0_10px_24px_rgba(0,0,0,0.26),0_0_18px_rgba(245,197,24,0.06)]"
            }`}
          >
            <Filter size={15} />
            Filter
          </button>

          <button
            type="button"
            onClick={exportPipeline}
            disabled={
              filteredLeads.length ===
              0
            }
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-4 text-xs text-gray-300 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#84CC16]/45 hover:bg-[#101010] hover:text-[#84CC16] hover:shadow-[0_10px_24px_rgba(0,0,0,0.26),0_0_18px_rgba(132,204,22,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export
          </button>

          <div className="group flex min-w-0 flex-1 items-center rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 focus-within:border-[#F5C518]/45 focus-within:bg-[#101010] focus-within:shadow-[0_0_22px_rgba(245,197,24,0.045)] xl:ml-auto xl:max-w-[250px]">
            <Search
              size={15}
              className="mr-2 shrink-0 text-gray-600 transition-colors group-focus-within:text-[#F5C518]"
            />

            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search pipeline..."
              className="w-full bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-gray-600"
            />
          </div>
        </div>

        {filterOpen && (
          <div className="mt-2 rounded-xl border border-[#202020] bg-[#0D0D0D] p-3 shadow-[0_14px_36px_rgba(0,0,0,0.28)] transition-all">
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center px-1 text-[10px] text-gray-600">
                Industry
              </span>

              {categories.map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter(
                        category
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-150 ${
                      categoryFilter ===
                      category
                        ? "border-[#F5C518]/30 bg-[#F5C518] text-black shadow-[0_0_18px_rgba(245,197,24,0.12)]"
                        : "border-[#202020] bg-[#101010] text-gray-400 hover:-translate-y-0.5 hover:border-[#F5C518]/40 hover:bg-[#171717] hover:text-[#F5C518] hover:shadow-[0_0_18px_rgba(245,197,24,0.05)]"
                    }`}
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#202020] pt-3">
              <span className="flex items-center px-1 text-[10px] text-gray-600">
                Stage
              </span>

              <button
                type="button"
                onClick={() =>
                  setStageFilter(
                    "All Stages"
                  )
                }
                className={`rounded-lg border px-3 py-2 text-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all ${
                  stageFilter ===
                  "All Stages"
                    ? "border-[#F5C518]/30 bg-[#F5C518] text-black shadow-[0_0_18px_rgba(245,197,24,0.12)]"
                    : "border-[#202020] bg-[#101010] text-gray-400 hover:border-[#F5C518]/40 hover:bg-[#171717] hover:text-[#F5C518]"
                }`}
              >
                All Stages
              </button>

              {stages.map(
                (stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() =>
                      setStageFilter(
                        stage
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all ${
                      stageFilter ===
                      stage
                        ? "border-[#F5C518]/30 bg-[#F5C518] text-black shadow-[0_0_18px_rgba(245,197,24,0.12)]"
                        : "border-[#202020] bg-[#101010] text-gray-400 hover:border-[#F5C518]/40 hover:bg-[#171717] hover:text-[#F5C518]"
                    }`}
                  >
                    {stage}
                  </button>
                )
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#202020] pt-3">
              <span className="flex items-center px-1 text-[10px] text-gray-600">
                Opportunity
              </span>

              {(
                [
                  "All Opportunities",
                  "High",
                  "Medium",
                  "Low",
                ] as const
              ).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setOpportunityFilter(
                        option
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all ${
                      opportunityFilter ===
                      option
                        ? "border-[#F5C518]/30 bg-[#F5C518] text-black shadow-[0_0_18px_rgba(245,197,24,0.12)]"
                        : "border-[#202020] bg-[#101010] text-gray-400 hover:border-[#F5C518]/40 hover:bg-[#171717] hover:text-[#F5C518]"
                    }`}
                  >
                    {option}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="ml-auto rounded-lg border border-[#202020] bg-[#101010] px-3 py-2 text-[10px] text-gray-500 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all hover:border-[#F5C518]/40 hover:bg-[#171717] hover:text-[#F5C518]"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#F0475C]/20 bg-[#3A1418] px-4 py-3 text-xs text-[#F0475C] shadow-[0_10px_28px_rgba(240,71,92,0.08)]">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="text-[#F0475C]/60 transition-colors hover:text-[#F0475C]"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex min-h-[400px] items-center justify-center rounded-xl border border-[#202020] bg-[#0D0D0D] shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#202020] border-t-[#F5C518] shadow-[0_0_20px_rgba(245,197,24,0.12)]" />

              <p className="mt-3 text-xs text-gray-500">
                Loading pipeline...
              </p>
            </div>
          </div>
        ) : leads.length ===
          0 ? (
          <div className="mt-6 flex min-h-[400px] items-center justify-center rounded-xl border border-[#202020] bg-[#0D0D0D] shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
            <div className="max-w-sm px-6 text-center">
              <Users
                size={30}
                className="mx-auto text-[#60A5FA]"
              />

              <p className="mt-4 text-sm text-gray-300">
                No leads in your pipeline yet.
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-600">
                Add a lead manually or run a lead search to start building
                your pipeline.
              </p>

              <button
                type="button"
                onClick={() =>
                  openAddModal()
                }
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2.5 text-xs font-semibold text-black shadow-[0_8px_22px_rgba(245,197,24,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#F5C518] hover:shadow-[0_12px_28px_rgba(245,197,24,0.20)]"
              >
                <Plus size={14} />
                Add Your First Lead
              </button>
            </div>
          </div>
        ) : filteredLeads.length ===
          0 ? (
          <div className="mt-6 flex min-h-[300px] items-center justify-center rounded-xl border border-[#202020] bg-[#0D0D0D] shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
            <div className="text-center">
              <Search
                size={28}
                className="mx-auto text-[#A78BFA]"
              />

              <p className="mt-4 text-sm text-gray-300">
                No leads match your filters.
              </p>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="mt-4 rounded-lg border border-[#202020] bg-[#101010] px-4 py-2 text-xs text-gray-400 shadow-[0_5px_16px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 hover:border-[#A78BFA]/40 hover:bg-[#171717] hover:text-[#A78BFA] hover:shadow-[0_0_18px_rgba(167,139,250,0.06)]"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : viewMode ===
          "kanban" ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl pb-3">
              <div className="flex min-w-max gap-2">
                {stages.map(
                  (stage) => (
                    <PipelineColumn
                      key={stage}
                      stage={stage}
                      leads={filteredLeads.filter(
                        (lead) =>
                          lead.stage ===
                          stage
                      )}
                      selectedLeadId={
                        selectedLeadId
                      }
                      onSelect={
                        selectLead
                      }
                      onDrop={
                        handleDrop
                      }
                      onDragStart={
                        handleDragStart
                      }
                      onAddLead={
                        openAddModal
                      }
                      onEdit={
                        openEditModal
                      }
                    />
                  )
                )}
              </div>
            </div>

            {savingLeadId && (
              <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#202020] bg-[#101010] px-4 py-2 text-[10px] text-gray-300 shadow-[0_12px_30px_rgba(0,0,0,0.40),0_0_20px_rgba(245,197,24,0.05)] xl:bottom-5">
                Saving stage...
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#202020] bg-[#0D0D0D] shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
            <div className="min-w-[780px]">
              <div className="grid grid-cols-[minmax(180px,1.5fr)_minmax(100px,1fr)_minmax(120px,1fr)_90px_100px_40px] gap-3 border-b border-[#202020] bg-[#101010] px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                <span className="text-[9px] uppercase tracking-wider text-gray-600">
                  Lead
                </span>

                <span className="text-[9px] uppercase tracking-wider text-gray-600">
                  Industry
                </span>

                <span className="text-[9px] uppercase tracking-wider text-gray-600">
                  Location
                </span>

                <span className="text-[9px] uppercase tracking-wider text-gray-600">
                  Stage
                </span>

                <span className="text-[9px] uppercase tracking-wider text-gray-600">
                  Score
                </span>

                <span />
              </div>

              {filteredLeads.map(
                (lead) => (
                  <ListRow
                    key={lead.id}
                    lead={lead}
                    selected={
                      lead.id ===
                      selectedLeadId
                    }
                    onSelect={() =>
                      selectLead(
                        lead
                      )
                    }
                    onEdit={() =>
                      openEditModal(
                        lead
                      )
                    }
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

      {selectedLead && (
        <aside className="fixed bottom-0 right-0 top-0 z-30 hidden w-[292px] overflow-hidden border-l border-[#202020] bg-[#0A0A0A] shadow-[-24px_0_60px_rgba(0,0,0,0.42),-4px_0_24px_rgba(245,197,24,0.018)] xl:block">
          <div className="h-full overflow-y-auto bg-[#0A0A0A] p-5">
            <LeadDetailPanel
              lead={selectedLead}
              onClose={() =>
                setSelectedLeadId(
                  null
                )
              }
              onEdit={
                openEditModal
              }
              onDelete={
                handleDeleteLead
              }
              onGenerateOutreach={
                handleGenerateOutreach
              }
              onViewProfile={
                handleViewProfile
              }
            />
          </div>
        </aside>
      )}

      {mobileDetailOpen &&
        selectedLead && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm xl:hidden">
            <div className="max-h-[75vh] w-full overflow-hidden rounded-t-2xl border border-[#202020] bg-[#0A0A0A] shadow-[0_-20px_60px_rgba(0,0,0,0.55),0_-4px_30px_rgba(245,197,24,0.025)]">
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-[#2A2A2A]" />
              </div>

              <div className="max-h-[calc(75vh-20px)] overflow-y-auto p-5 pb-8">
                <LeadDetailPanel
                  lead={selectedLead}
                  onClose={() =>
                    setMobileDetailOpen(
                      false
                    )
                  }
                  onEdit={
                    openEditModal
                  }
                  onDelete={
                    handleDeleteLead
                  }
                  onGenerateOutreach={
                    handleGenerateOutreach
                  }
                  onViewProfile={
                    handleViewProfile
                  }
                />
              </div>
            </div>
          </div>
        )}

      <LeadFormModal
        open={modalOpen}
        mode={modalMode}
        lead={editingLead}
        initialStage={modalStage}
        onClose={() => {
          if (!savingForm) {
            setModalOpen(false);
          }
        }}
        onSave={
          handleSaveLead
        }
        saving={savingForm}
      />

    </main>
  );
}