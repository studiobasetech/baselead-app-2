"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Bell,
  Activity,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  Reply,
  Search,
  Send,
  SlidersHorizontal,
  TrendingUp,
  Zap,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/components/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type OutreachStatus =
  | "Draft"
  | "Sent"
  | "Opened"
  | "Replied"
  | "Interested"
  | "Scheduled";

type OutreachChannel = "Email";

type LeadRecord = {
  id: string;
  user_id?: string | null;
  company_id?: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  category: string | null;
  location: string | null;
  address?: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  ai_score: number | null;
  intent_score: number | null;
  ai_reason: string | null;
  ai_opportunity: string | null;
  ai_recommendations: unknown;
  notes: string | null;
};

type OutreachRecord = {
  id: string;
  user_id: string;
  lead_id: string | null;
  campaign: string | null;
  channel: string | null;
  subject: string | null;
  message: string | null;
  status: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  next_step: string | null;
  next_step_at: string | null;
  created_at: string;
  updated_at: string;
};

type Outreach = {
  id: string;
  leadId: string | null;
  lead: string;
  category: string;
  location: string;
  initials: string;
  avatarClass: string;
  campaign: string;
  sequence: string;
  channel: OutreachChannel;
  status: OutreachStatus;
  sent: string;
  opened: string;
  replied: string;
  nextStep: string;
  email: string;
  subject: string;
  message: string;
  score: number;
  website: string;
  services: string[];
  raw: OutreachRecord;
};

/* =========================================================
   CONSTANTS
========================================================= */

const GOLD = "#F5C518";

const PURPLE = "#A78BFA";
const BLUE = "#60A5FA";
const GREEN = "#84CC16";
const RED = "#F0475C";
const CYAN = "#22D3EE";

const PAGE_BACKGROUND = "#050505";
const DEEP_SURFACE = "#0A0A0A";
const PANEL = "#0D0D0D";
const ELEVATED = "#101010";
const INNER_SURFACE = "#171717";
const PROGRESS_SURFACE = "#191919";

const BORDER = "#202020";
const BORDER_LIGHT = "#2A2A2A";
const MUTED = "#777777";

const GOLD_SURFACE = "#332A0C";
const PURPLE_SURFACE = "#241A38";
const RED_SURFACE = "#3A1418";
const GREEN_SURFACE = "#18200B";
const BLUE_SURFACE = "#10243A";

const LIGHT_ICON_SURFACES = {
  gold: "#FFF7D6",
  purple: "#F0EAFF",
  red: "#FFEBEE",
  green: "#EFFBDC",
  blue: "#EAF3FF",
  cyan: "#E6FAFF",
  neutral: "#F1F1F4",
} as const;

const DARK_ICON_SURFACES = {
  gold: "#332A0C",
  purple: "#241A38",
  red: "#3A1418",
  green: "#18200B",
  blue: "#10243A",
  cyan: "#102A31",
  neutral: "#171717",
} as const;

function isLightMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("baselead-light");
}

function iconSurface(accent: string) {
  const light = isLightMode();
  const map = light
    ? {
        [GOLD]: LIGHT_ICON_SURFACES.gold,
        [PURPLE]: LIGHT_ICON_SURFACES.purple,
        [RED]: LIGHT_ICON_SURFACES.red,
        [GREEN]: LIGHT_ICON_SURFACES.green,
        [BLUE]: LIGHT_ICON_SURFACES.blue,
        [CYAN]: LIGHT_ICON_SURFACES.cyan,
      }
    : {
        [GOLD]: DARK_ICON_SURFACES.gold,
        [PURPLE]: DARK_ICON_SURFACES.purple,
        [RED]: DARK_ICON_SURFACES.red,
        [GREEN]: DARK_ICON_SURFACES.green,
        [BLUE]: DARK_ICON_SURFACES.blue,
        [CYAN]: DARK_ICON_SURFACES.cyan,
      };

  return map[accent as keyof typeof map] || (light ? LIGHT_ICON_SURFACES.neutral : DARK_ICON_SURFACES.neutral);
}


function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean;
  const number = parseInt(value, 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const STATUSES = [
  "All",
  "Drafts",
  "Scheduled",
  "Sent",
  "Opened",
  "Replied",
  "Follow-ups",
  "Interested",
] as const;

const AVAILABLE_CHANNELS: OutreachChannel[] = ["Email"];

const AVATAR_CLASSES = [
  "bg-black",
  "bg-pink-200",
  "bg-[#ead8c8]",
  "bg-[#19461f]",
  "bg-[#d9eadc]",
  "bg-blue-100",
  "bg-[#123b2c]",
  "bg-orange-500",
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(
  value: string | null
): OutreachStatus {
  const status = (value || "").toLowerCase().trim();

  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "opened":
      return "Opened";
    case "replied":
      return "Replied";
    case "interested":
      return "Interested";
    case "sent":
      return "Sent";
    default:
      return "Sent";
  }
}

function normalizeChannel(
  value: string | null
): OutreachChannel {
  return "Email";
}

function getLeadName(lead: LeadRecord) {
  return (
    lead.company?.trim() ||
    lead.name?.trim() ||
    "Unknown Lead"
  );
}

function getLeadCategory(lead: LeadRecord) {
  return (
    lead.category?.trim() ||
    lead.industry?.trim() ||
    "Business"
  );
}

function getLeadLocation(lead: LeadRecord) {
  return (
    lead.location?.trim() ||
    [lead.city, lead.state].filter(Boolean).join(", ") ||
    lead.country?.trim() ||
    "Unknown"
  );
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getAvatarClass(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }

  return AVATAR_CLASSES[
    Math.abs(hash) % AVATAR_CLASSES.length
  ];
}

function getScore(lead: LeadRecord) {
  const raw =
    lead.ai_score ??
    lead.intent_score ??
    0;

  const number = Number(raw);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

function parseRecommendations(
  value: unknown
): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          return [item];
        }

        if (
          item &&
          typeof item === "object"
        ) {
          const object =
            item as Record<
              string,
              unknown
            >;

          const candidate =
            object.service ??
            object.name ??
            object.title ??
            object.recommendation ??
            object.value;

          if (
            typeof candidate ===
            "string"
          ) {
            return [candidate];
          }
        }

        return [];
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return [];
    }

    try {
      const parsed = JSON.parse(text);

      if (parsed !== text) {
        return parseRecommendations(
          parsed
        );
      }
    } catch {
      // Plain text.
    }

    return text
      .split(/[,;\n|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const object =
      value as Record<
        string,
        unknown
      >;

    const nested =
      object.services ??
      object.recommendations ??
      object.items ??
      object.data;

    if (nested) {
      return parseRecommendations(
        nested
      );
    }

    const candidate =
      object.service ??
      object.name ??
      object.title ??
      object.recommendation ??
      object.value;

    if (
      typeof candidate ===
      "string"
    ) {
      return [candidate.trim()].filter(
        Boolean
      );
    }
  }

  return [];
}

function deriveServices(
  lead: LeadRecord
): string[] {
  const recommendations =
    parseRecommendations(
      lead.ai_recommendations
    );

  if (
    recommendations.length > 0
  ) {
    return recommendations.slice(
      0,
      3
    );
  }

  const industry =
    lead.industry?.toLowerCase() ||
    "";

  const category =
    lead.category?.toLowerCase() ||
    "";

  if (
    industry.includes("medical") ||
    industry.includes("health") ||
    industry.includes("spa") ||
    category.includes("medical") ||
    category.includes("health") ||
    category.includes("spa")
  ) {
    return [
      "Website Redesign",
      "AI Booking Assistant",
    ];
  }

  if (
    industry.includes("restaurant") ||
    industry.includes("hospitality") ||
    category.includes("restaurant") ||
    category.includes("hospitality")
  ) {
    return [
      "Website Experience",
      "Digital Booking",
    ];
  }

  if (
    industry.includes("real estate") ||
    category.includes("real estate")
  ) {
    return [
      "Lead Generation Website",
      "Conversion Optimization",
    ];
  }

  return ["Website Design"];
}

function formatRelativeDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  const difference =
    Date.now() - date.getTime();

  if (difference < 0) {
    const minutes = Math.round(
      Math.abs(difference) / 60000
    );

    if (minutes < 60) {
      return `in ${minutes}m`;
    }

    const hours = Math.round(
      minutes / 60
    );

    if (hours < 24) {
      return `in ${hours}h`;
    }

    return `in ${Math.round(
      hours / 24
    )}d`;
  }

  const minutes = Math.round(
    difference / 60000
  );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "Not yet";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not yet";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSequence(
  record: OutreachRecord
) {
  if (record.next_step?.trim()) {
    return record.next_step.trim();
  }

  if (
    record.status?.toLowerCase() ===
    "draft"
  ) {
    return "Draft";
  }

  return "Initial Outreach";
}

function mapOutreach(
  record: OutreachRecord,
  lead?: LeadRecord
): Outreach {
  const leadName = lead
    ? getLeadName(lead)
    : "Unknown Lead";

  return {
    id: record.id,
    leadId: record.lead_id,
    lead: leadName,
    category: lead
      ? getLeadCategory(lead)
      : "Business",
    location: lead
      ? getLeadLocation(lead)
      : "Unknown",
    initials: getInitials(leadName),
    avatarClass:
      getAvatarClass(leadName),
    campaign:
      record.campaign?.trim() ||
      "General Outreach",
    sequence: getSequence(record),
    channel: normalizeChannel(
      record.channel
    ),
    status: normalizeStatus(
      record.status
    ),
    sent: record.sent_at
      ? formatRelativeDate(
          record.sent_at
        )
      : record.status?.toLowerCase() ===
          "draft"
        ? "Not sent"
        : formatRelativeDate(
            record.created_at
          ),
    opened: record.opened_at
      ? formatRelativeDate(
          record.opened_at
        )
      : "No",
    replied: record.replied_at
      ? formatRelativeDate(
          record.replied_at
        )
      : "—",
    nextStep: record.next_step_at
      ? `${record.next_step || "Follow-up"}\n${new Date(
          record.next_step_at
        ).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })}`
      : record.next_step || "—",
    email:
      lead?.email?.trim() || "",
    subject:
      record.subject?.trim() || "",
    message: record.message || "",
    score: lead
      ? getScore(lead)
      : 0,
    website:
      lead?.website?.trim() || "",
    services: lead
      ? deriveServices(lead)
      : [],
    raw: record,
  };
}

/* =========================================================
   CHANNEL ICON
========================================================= */

function ChannelIcon({
  channel,
}: {
  channel: OutreachChannel;
}) {
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md border border-[#202020] bg-[#171717] transition-all duration-200 group-hover:border-[#2A2A2A] group-hover:bg-[#191919]">
      <Mail
        size={11}
        className="text-[#777]"
      />
    </span>
  );
}

/* =========================================================
   AVATAR
========================================================= */

function LeadAvatar({
  outreach,
  large = false,
}: {
  outreach: Outreach;
  large?: boolean;
}) {
  const dark =
    outreach.avatarClass ===
      "bg-black" ||
    outreach.avatarClass ===
      "bg-[#19461f]" ||
    outreach.avatarClass ===
      "bg-[#123b2c]" ||
    outreach.avatarClass ===
      "bg-orange-500";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${
        outreach.avatarClass
      } ${
        large
          ? "h-12 w-12 text-[10px]"
          : "h-9 w-9 text-[10px]"
      } font-semibold tracking-wide transition-all duration-200 group-hover:shadow-[0_0_18px_rgba(245,197,24,0.10)] ${
        dark
          ? "text-white"
          : "text-black"
      }`}
    >
      {outreach.initials}
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: OutreachStatus;
}) {
  const accentByStatus: Record<OutreachStatus, string> = {
    Draft: MUTED,
    Sent: BLUE,
    Opened: PURPLE,
    Replied: GREEN,
    Interested: GOLD,
    Scheduled: CYAN,
  };

  const accent = accentByStatus[status];

  const lightSurfaceByStatus: Record<OutreachStatus, string> = {
    Draft: LIGHT_ICON_SURFACES.neutral,
    Sent: LIGHT_ICON_SURFACES.blue,
    Opened: LIGHT_ICON_SURFACES.purple,
    Replied: LIGHT_ICON_SURFACES.green,
    Interested: LIGHT_ICON_SURFACES.gold,
    Scheduled: LIGHT_ICON_SURFACES.cyan,
  };

  const darkSurfaceByStatus: Record<OutreachStatus, string> = {
    Draft: DARK_ICON_SURFACES.neutral,
    Sent: DARK_ICON_SURFACES.blue,
    Opened: DARK_ICON_SURFACES.purple,
    Replied: DARK_ICON_SURFACES.green,
    Interested: DARK_ICON_SURFACES.gold,
    Scheduled: DARK_ICON_SURFACES.cyan,
  };

  const lightBorder = status === "Draft"
    ? "#D7D7DD"
    : hexToRgba(accent, 0.30);
  const darkBorder = status === "Draft"
    ? "#2A2A2A"
    : hexToRgba(accent, 0.20);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all duration-200"
      style={{
        backgroundColor: isLightMode()
          ? lightSurfaceByStatus[status]
          : darkSurfaceByStatus[status],
        borderColor: isLightMode() ? lightBorder : darkBorder,
        color: status === "Draft" ? (isLightMode() ? "#66666E" : MUTED) : accent,
        boxShadow: status === "Draft"
          ? "none"
          : `0 0 14px ${hexToRgba(accent, isLightMode() ? 0.06 : 0.08)}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: status === "Draft" ? (isLightMode() ? "#8A8A92" : MUTED) : accent,
          boxShadow: status === "Draft" ? "none" : `0 0 10px ${hexToRgba(accent, 0.28)}`,
        }}
      />
      {status}
    </span>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  icon,
  label,
  value,
  detail,
  accent,
  surface,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: string;
  surface: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-[#0D0D0D] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-[#101010]"
      style={{ borderColor: hexToRgba(accent, 0.18) }}
      onMouseEnter={(event) => {
        const light = typeof document !== "undefined" && document.documentElement.classList.contains("baselead-light");
        event.currentTarget.style.borderColor = hexToRgba(accent, light ? 0.72 : 0.62);
        event.currentTarget.style.boxShadow = light
          ? `0 18px 42px rgba(18,18,24,0.12), 0 0 30px ${hexToRgba(accent, 0.20)}, inset 0 0 0 1px ${hexToRgba(accent, 0.18)}`
          : `0 20px 44px rgba(0,0,0,0.34), 0 0 34px ${hexToRgba(accent, 0.18)}, inset 0 0 0 1px ${hexToRgba(accent, 0.14)}`;
      }}
      onMouseLeave={(event) => {
        const light = typeof document !== "undefined" && document.documentElement.classList.contains("baselead-light");
        event.currentTarget.style.borderColor = hexToRgba(accent, light ? 0.26 : 0.18);
        event.currentTarget.style.boxShadow = light
          ? "0 8px 24px rgba(18,18,24,0.06), 0 2px 6px rgba(18,18,24,0.04)"
          : "0 8px 24px rgba(0,0,0,0.18)";
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] transition-all duration-300 group-hover:h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 18px ${hexToRgba(accent, 0.22)}` }} />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition-all duration-300 group-hover:scale-125" style={{ backgroundColor: hexToRgba(accent, 0.08) }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" style={{ backgroundColor: iconSurface(accent), borderColor: hexToRgba(accent, isLightMode() ? 0.30 : 0.24), boxShadow: isLightMode() ? `0 8px 20px rgba(18,18,24,0.08)` : `0 8px 20px rgba(0,0,0,0.12)` }}>
            <span style={{ color: accent }} className="transition-all duration-300 group-hover:drop-shadow-[0_0_8px_currentColor]">{icon}</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.15em]" style={{ borderColor: hexToRgba(accent, 0.16), backgroundColor: hexToRgba(accent, 0.05), color: accent }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${hexToRgba(accent, 0.35)}` }} />
            Live
          </span>
        </div>
        <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.12em] text-[#777]">{label}</p>
        <p className="mt-1 text-[24px] font-semibold tracking-tight text-white">{value}</p>
        <p className="mt-1 truncate text-[10px] text-[#666]">{detail}</p>
        <div className="mt-3 flex items-end gap-1 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
          {[0.35,0.55,0.42,0.72,0.5,0.85,0.62].map((height,index)=><span key={index} className="flex-1 rounded-full" style={{height:`${Math.max(3,height*12)}px`,backgroundColor:hexToRgba(accent,0.22+height*0.32)}} />)}
        </div>
      </div>
    </div>
  );
}

function EngagementPulse({ outreach }: { outreach: Outreach }) {
  const stages = [
    { active: Boolean(outreach.raw.sent_at) || ["Sent","Opened","Replied","Interested"].includes(outreach.status), color: BLUE },
    { active: Boolean(outreach.raw.opened_at), color: PURPLE },
    { active: Boolean(outreach.raw.replied_at), color: GREEN },
    { active: outreach.status === "Interested", color: GOLD },
  ];
  return (
    <div className="flex items-center gap-1" title="Engagement progression">
      {stages.map((stage,index)=>(
        <div key={index} className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full border" style={{borderColor:stage.active?stage.color:"#3A3A3A",backgroundColor:stage.active?stage.color:"transparent",boxShadow:stage.active?`0 0 10px ${hexToRgba(stage.color,0.3)}`:"none"}} />
          {index<stages.length-1 && <span className="h-px w-2" style={{backgroundColor:stages[index+1].active?hexToRgba(stages[index+1].color,0.4):"#292929"}} />}
        </div>
      ))}
    </div>
  );
}

function OutreachIntelligence({ outreach, onOpen }: { outreach: Outreach[]; onOpen: (id:string)=>void }) {
  const replied=outreach.filter(x=>Boolean(x.raw.replied_at));
  const opened=outreach.filter(x=>Boolean(x.raw.opened_at));
  const interested=outreach.filter(x=>x.status==="Interested");
  const primary=replied[0]||interested[0]||opened[0]||null;
  const label=replied.length?"Reply received — follow up":interested.length?"Interested lead needs attention":opened.length?"Engaged lead ready for follow-up":"Create your first outreach";
  const activity=[
    {label:"Sent",value:outreach.filter(x=>Boolean(x.raw.sent_at)).length,color:BLUE},
    {label:"Opened",value:opened.length,color:PURPLE},
    {label:"Replied",value:replied.length,color:GREEN},
    {label:"Interested",value:interested.length,color:GOLD},
  ];
  const max=Math.max(1,...activity.map(x=>x.value));
  return (
    <div className="mt-5 grid gap-3 xl:grid-cols-[1.25fr_0.95fr]">
      <div className="group relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#A78BFA]/30 hover:shadow-[0_18px_40px_rgba(167,139,250,0.08)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#A78BFA]/[0.06] blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A78BFA]/25 bg-[#F0EAFF] dark:bg-[#241A38]"><Sparkles size={14} className="text-[#A78BFA]" /></div><div><p className="text-[12px] font-semibold text-white">AI Next Actions</p><p className="text-[10px] text-[#666]">Prioritized from current outreach activity</p></div></div>
          <span className="rounded-full border border-[#84CC16]/25 bg-[#EFFBDC] dark:bg-[#18200B] px-2.5 py-1 text-[10px] font-medium text-[#84CC16]">{replied.length+interested.length} attention items</span>
        </div>
        {primary ? (
          <button type="button" onClick={()=>onOpen(primary.id)} className="group/action mt-4 flex w-full items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#101010] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A78BFA]/35 hover:bg-[#171717] hover:shadow-[0_12px_28px_rgba(167,139,250,0.08)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#A78BFA]/25 bg-[#F0EAFF] dark:bg-[#241A38]">{replied.length?<Reply size={16} className="text-[#84CC16]"/>:interested.length?<Star size={16} className="text-[#F5C518]"/>:<Mail size={16} className="text-[#A78BFA]"/>}</div>
            <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-[0.14em] text-[#777]">{label}</p><p className="mt-1 truncate text-[12px] font-semibold text-white">{primary.lead}</p><p className="mt-1 truncate text-[10px] text-[#666]">{primary.subject||primary.campaign}</p></div>
            <ChevronRight size={14} className="text-[#555] transition-all group-hover/action:translate-x-1 group-hover/action:text-[#A78BFA]"/>
          </button>
        ) : <div className="mt-4 rounded-xl border border-[#202020] bg-[#101010] p-4"><p className="text-[12px] font-semibold text-white">Your outreach engine is ready.</p><p className="mt-1 text-[10px] leading-4 text-[#666]">Create your first personalized message and BaseLead will surface engagement signals here.</p></div>}
        <div className="mt-4 grid grid-cols-3 gap-2">{[["Replies",replied.length,GREEN],["Interested",interested.length,GOLD],["Opened",opened.length,PURPLE]].map(([label,value,color])=><div key={String(label)} className="rounded-xl border border-[#202020] bg-[#101010] p-3"><p className="text-[10px] uppercase tracking-wider text-[#555]">{String(label)}</p><p className="mt-1 text-lg font-semibold" style={{color:String(color)}}>{String(value)}</p></div>)}</div>
      </div>
      <div className="group relative overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#60A5FA]/30 hover:shadow-[0_18px_40px_rgba(96,165,250,0.08)]">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#60A5FA]/25 bg-[#EAF3FF] dark:bg-[#10243A]"><Activity size={14} className="text-[#60A5FA]" /></div><div><p className="text-[12px] font-semibold text-white">Engagement Pulse</p><p className="text-[10px] text-[#666]">Current outreach momentum</p></div></div><TrendingUp size={14} className="text-[#84CC16]"/></div>
        <div className="mt-5 flex h-24 items-end gap-2">{activity.map(item=><div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="flex flex-1 items-end justify-center"><div className="w-full max-w-[28px] rounded-t-lg transition-all duration-500 group-hover:shadow-[0_0_18px_currentColor]" style={{height:`${Math.max(8,(item.value/max)*72)}px`,backgroundColor:item.color,opacity:0.82}}/></div><p className="text-center text-[10px] text-[#555]">{item.label}</p></div>)}</div>
        <div className="mt-3 flex items-center justify-between border-t border-[#202020] pt-3"><span className="text-[10px] text-[#666]">{outreach.length} total records</span><span className="flex items-center gap-1.5 text-[10px] text-[#84CC16]"><span className="h-1.5 w-1.5 rounded-full bg-[#84CC16] shadow-[0_0_8px_rgba(132,204,22,0.35)]"/>Live signal</span></div>
      </div>
    </div>
  );
}

/* =========================================================
   NEW OUTREACH MODAL
========================================================= */

function NewOutreachModal({
  leads,
  initialLeadId,
  saving,
  onClose,
  onCreate,
  onGenerate,
}: {
  leads: LeadRecord[];
  initialLeadId: string;
  saving: boolean;
  onClose: () => void;
  onCreate: (data: {
    leadId: string;
    campaign: string;
    channel: OutreachChannel;
    subject: string;
    message: string;
    status: OutreachStatus;
    scheduledAt: string | null;
    sendNow: boolean;
  }) => void;
  onGenerate: (
    lead: LeadRecord,
    campaign: string
  ) => {
    subject: string;
    message: string;
  };
}) {
  const firstLead =
    leads.find(
      (lead) =>
        String(lead.id) ===
        String(initialLeadId)
    ) ||
    leads[0] ||
    null;

  const [
    leadId,
    setLeadId,
  ] = useState(
    firstLead?.id || ""
  );

  const [
    campaign,
    setCampaign,
  ] = useState(
    "General Outreach"
  );

  const [channel] =
    useState<OutreachChannel>(
      "Email"
    );

  const [
    subject,
    setSubject,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    status,
    setStatus,
  ] =
    useState<OutreachStatus>(
      "Draft"
    );

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState("");

  const [
    generated,
    setGenerated,
  ] = useState(false);

  const selectedLead =
    leads.find(
      (lead) =>
        String(lead.id) ===
        String(leadId)
    ) || null;

  function generate() {
    if (!selectedLead) {
      return;
    }

    const result =
      onGenerate(
        selectedLead,
        campaign
      );

    setSubject(
      result.subject
    );

    setMessage(
      result.message
    );

    setGenerated(true);
  }

  function changeLead(
    value: string
  ) {
    setLeadId(value);
    setSubject("");
    setMessage("");
    setGenerated(false);
  }

  const canSave =
    !saving &&
    Boolean(leadId) &&
    Boolean(message.trim()) &&
    (status !== "Scheduled" ||
      Boolean(scheduledAt));

  const canSend =
    !saving &&
    Boolean(leadId) &&
    Boolean(message.trim()) &&
    Boolean(subject.trim());

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[94vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[24px] border border-[#2A2A2A] bg-[#0D0D0D] shadow-[0_30px_110px_rgba(0,0,0,0.72)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#F5C518]/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-20 h-56 w-56 rounded-full bg-[#A78BFA]/[0.05] blur-3xl" />
        <div className="flex shrink-0 items-center justify-between border-b border-[#202020] bg-[#101010] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] shadow-[0_0_20px_rgba(245,197,24,0.06)]">
              <Send
                size={17}
                className="text-[#F5C518]"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  New Outreach
                </h2>

                <span className="rounded-full border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#F5C518]">
                  Email
                </span>
              </div>

              <p className="mt-1 text-[10px] text-[#666]">
                Create and prepare a personalized email outreach.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202020] bg-[#171717] text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#191919] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">
            <section>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[#777]">
                Lead
              </p>

              <div className="rounded-xl border border-[#202020] bg-[#0D0D0D] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {selectedLead ? (
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getAvatarClass(
                        getLeadName(
                          selectedLead
                        )
                      )} text-[10px] font-bold`}
                    >
                      {getInitials(
                        getLeadName(
                          selectedLead
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#202020] bg-[#171717]">
                      <UserRound
                        size={16}
                        className="text-[#555]"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {selectedLead
                        ? getLeadName(
                            selectedLead
                          )
                        : "Select a lead"}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-[#777]">
                      {selectedLead
                        ? getLeadCategory(
                            selectedLead
                          )
                        : "—"}
                      {selectedLead &&
                        " • "}
                      {selectedLead
                        ? getLeadLocation(
                            selectedLead
                          )
                        : ""}
                    </p>

                    {selectedLead?.email && (
                      <p className="mt-1 truncate text-[10px] text-[#555]">
                        {
                          selectedLead.email
                        }
                      </p>
                    )}
                  </div>

                  <select
                    value={leadId}
                    onChange={(event) =>
                      changeLead(
                        event.target
                          .value
                      )
                    }
                    className="h-9 w-full rounded-lg border border-[#202020] bg-[#101010] px-2 text-[10px] text-gray-300 outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_16px_rgba(245,197,24,0.06)] sm:w-[190px]"
                  >
                    <option value="">
                      Select lead
                    </option>

                    {leads.map(
                      (lead) => (
                        <option
                          key={
                            lead.id
                          }
                          value={
                            lead.id
                          }
                        >
                          {getLeadName(
                            lead
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {selectedLead && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#202020] pt-3">
                    {deriveServices(
                      selectedLead
                    ).map(
                      (service) => (
                        <span
                          key={
                            service
                          }
                          className="rounded-md border border-[#202020] bg-[#171717] px-2 py-1 text-[10px] text-[#777]"
                        >
                          {
                            service
                          }
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>

            <div className="relative overflow-hidden rounded-2xl border border-[#A78BFA]/25 bg-[#F0EAFF] dark:bg-[#241A38]/70 p-4 shadow-[0_12px_30px_rgba(167,139,250,0.06)] transition-all duration-300 hover:border-[#A78BFA]/35 hover:shadow-[0_18px_40px_rgba(167,139,250,0.10)]">
              <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#F5C518]/[0.10] blur-3xl" />
              <div className="relative flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#A78BFA]/25 bg-[#F0EAFF] dark:bg-[#241A38] shadow-[0_0_18px_rgba(167,139,250,0.10)]"><Zap size={15} className="text-[#A78BFA]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-semibold text-white">AI Outreach Workspace</p><span className="rounded-full border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#F5C518]">Smart Draft</span></div>
                  <p className="mt-1 text-[10px] leading-4 text-[#777]">Select a lead, generate a personalized message, then choose whether to save or schedule it.</p>
                </div>
              </div>
            </div>

            <section>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[#777]">
                Campaign
              </p>

              <input
                value={campaign}
                onChange={(
                  event
                ) =>
                  setCampaign(
                    event.target
                      .value
                  )
                }
                placeholder="Website Redesign"
                className="h-11 w-full rounded-xl border border-[#202020] bg-[#101010] px-3 text-xs text-white outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_18px_rgba(245,197,24,0.05)]"
              />
            </section>

            <section>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[#777]">
                Sending Channel
              </p>

              <div className="group rounded-xl border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-[#F5C518]/35 hover:shadow-[0_12px_28px_rgba(245,197,24,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F5C518]/20 bg-[#FFF7D6] dark:bg-[#332A0C]">
                    <Mail
                      size={17}
                      className="text-[#F5C518]"
                    />
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold text-white">
                      Email
                    </p>

                    <p className="mt-1 text-[10px] text-[#777]">
                      Email sending will be connected later.
                    </p>
                  </div>

                  <Check
                    size={15}
                    className="ml-auto text-[#F5C518]"
                  />
                </div>
              </div>

              <p className="mt-2 text-[10px] text-[#555]">
                Other channels are hidden until BaseLead has real sending integrations for them.
              </p>
            </section>

            <section className="rounded-xl border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F5C518]/20 bg-[#FFF7D6] dark:bg-[#332A0C]">
                    <Sparkles
                      size={16}
                      className="text-[#F5C518]"
                    />
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold text-white">
                      Personalization
                    </p>

                    <p className="mt-1 max-w-md text-[10px] leading-4 text-[#777]">
                      Generate a personalized draft using the lead information already stored in BaseLead.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generate}
                  disabled={
                    !selectedLead ||
                    saving
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2.5 text-[10px] font-semibold text-black shadow-[0_6px_18px_rgba(245,197,24,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(245,197,24,0.18)] disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <Sparkles size={12} />

                  {generated
                    ? "Regenerate"
                    : "Generate"}
                </button>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#777]">
                  Subject
                </p>

                <span className="text-[10px] text-[#555]">
                  {subject.length}{" "}
                  characters
                </span>
              </div>

              <input
                value={subject}
                onChange={(
                  event
                ) =>
                  setSubject(
                    event.target
                      .value
                  )
                }
                placeholder="A quick idea for your business"
                className="h-11 w-full rounded-xl border border-[#202020] bg-[#101010] px-3 text-xs text-white outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_18px_rgba(245,197,24,0.05)]"
              />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#777]">
                  Message
                </p>

                <span className="text-[10px] text-[#666]">
                  {message.length}{" "}
                  characters
                </span>
              </div>

              <textarea
                value={message}
                onChange={(
                  event
                ) =>
                  setMessage(
                    event.target
                      .value
                  )
                }
                rows={10}
                placeholder="Write your email or generate a personalized draft..."
                className="w-full resize-none rounded-xl border border-[#202020] bg-[#101010] px-3 py-3 text-[12px] leading-5 text-gray-200 outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_18px_rgba(245,197,24,0.05)]"
              />
            </section>

            <section>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[#777]">
                Delivery
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatus(
                      "Draft"
                    );
                    setScheduledAt(
                      ""
                    );
                  }}
                  className={`group rounded-xl border p-3 text-left transition-all duration-200 ${
                    status ===
                    "Draft"
                      ? "border-[#F5C518]/30 bg-[#FFF7D6] dark:bg-[#332A0C] shadow-[0_0_20px_rgba(245,197,24,0.06)]"
                      : "border-[#202020] bg-[#101010] hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#171717] hover:shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
                  }`}
                >
                  <Edit3
                    size={14}
                    className={
                      status ===
                      "Draft"
                        ? "text-[#F5C518]"
                        : "text-[#777]"
                    }
                  />

                  <p className="mt-2 text-[12px] font-medium text-white">
                    Save as Draft
                  </p>

                  <p className="mt-1 text-[10px] text-[#666]">
                    Review before sending
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStatus(
                      "Scheduled"
                    )
                  }
                  className={`group rounded-xl border p-3 text-left transition-all duration-200 ${
                    status ===
                    "Scheduled"
                      ? "border-[#22D3EE]/35 bg-[#E6FAFF] shadow-[0_0_20px_rgba(34,211,238,0.10)] dark:bg-[#102A31]"
                      : "border-[#202020] bg-[#101010] hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#171717] hover:shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
                  }`}
                >
                  <CalendarCheck
                    size={14}
                    className={
                      status ===
                      "Scheduled"
                        ? "text-[#22D3EE]"
                        : "text-[#777]"
                    }
                  />

                  <p className="mt-2 text-[12px] font-medium text-white">
                    Schedule
                  </p>

                  <p className="mt-1 text-[10px] text-[#666]">
                    Choose when to send
                  </p>
                </button>
              </div>

              {status ===
                "Scheduled" && (
                <div className="mt-3">
                  <label className="mb-2 block text-[10px] text-[#777]">
                    Scheduled date & time
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      scheduledAt
                    }
                    min={new Date()
                      .toISOString()
                      .slice(
                        0,
                        16
                      )}
                    onChange={(
                      event
                    ) =>
                      setScheduledAt(
                        event.target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-[#202020] bg-[#101010] px-3 text-[12px] text-white outline-none transition-all focus:border-[#22D3EE]/40 focus:bg-[#171717] focus:shadow-[0_0_16px_rgba(34,211,238,0.06)]"
                  />

                  {!scheduledAt && (
                    <p className="mt-1 text-[10px] text-[#666]">
                      Choose a future date and time.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#202020] bg-[#101010] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#202020] bg-[#171717]">
                  <Mail
                    size={14}
                    className="text-[#777]"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-medium text-gray-300">
                    Email sending
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-[#666]">
                    The Send Outreach action is already part of the workflow. Actual email delivery will be connected when an email provider is added.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[#202020] bg-[#101010] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#202020] bg-[#171717] px-4 py-2.5 text-[12px] text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#191919] hover:text-white"
          >
            Cancel
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!canSave}
              onClick={() =>
                onCreate({
                  leadId,
                  campaign,
                  channel,
                  subject,
                  message,
                  status:
                    status ===
                    "Scheduled"
                      ? "Scheduled"
                      : "Draft",
                  scheduledAt:
                    status ===
                    "Scheduled"
                      ? scheduledAt
                      : null,
                  sendNow: false,
                })
              }
              className="flex items-center justify-center gap-2 rounded-lg border border-[#202020] bg-[#171717] px-4 py-2.5 text-[12px] font-medium text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#191919] hover:shadow-[0_8px_20px_rgba(0,0,0,0.22)] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {saving ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/10 border-t-gray-300" />
              ) : (
                <Edit3 size={13} />
              )}

              {status ===
              "Scheduled"
                ? "Save & Schedule"
                : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={!canSend}
              onClick={() =>
                onCreate({
                  leadId,
                  campaign,
                  channel,
                  subject,
                  message,
                  status: "Sent",
                  scheduledAt:
                    null,
                  sendNow: true,
                })
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-5 py-2.5 text-[12px] font-semibold text-black shadow-[0_6px_18px_rgba(245,197,24,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(245,197,24,0.20)] disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <Send size={13} />
              Send Outreach
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EDIT MODAL
========================================================= */

function EditOutreachModal({
  outreach,
  saving,
  onClose,
  onSave,
}: {
  outreach: Outreach;
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    campaign: string;
    subject: string;
    message: string;
    channel: OutreachChannel;
  }) => void;
}) {
  const [
    campaign,
    setCampaign,
  ] = useState(
    outreach.campaign
  );

  const [
    subject,
    setSubject,
  ] = useState(
    outreach.subject
  );

  const [
    message,
    setMessage,
  ] = useState(
    outreach.message
  );

  const [channel] =
    useState<OutreachChannel>(
      "Email"
    );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-[#202020] bg-[#101010] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Edit Outreach
            </h2>

            <p className="mt-1 text-[10px] text-[#666]">
              Update and save this email outreach.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#202020] bg-[#171717] p-2 text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#191919] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-2 block text-[10px] text-[#777]">
              Campaign
            </label>

            <input
              value={campaign}
              onChange={(
                event
              ) =>
                setCampaign(
                  event.target
                    .value
                )
              }
              className="h-10 w-full rounded-lg border border-[#202020] bg-[#101010] px-3 text-xs text-white outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_16px_rgba(245,197,24,0.05)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] text-[#777]">
              Sending Channel
            </label>

            <div className="group flex items-center gap-3 rounded-xl border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] p-3 transition-all duration-200 hover:border-[#F5C518]/35 hover:shadow-[0_10px_24px_rgba(245,197,24,0.06)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F5C518]/20 bg-[#FFF7D6] dark:bg-[#332A0C]">
                <Mail
                  size={15}
                  className="text-[#F5C518]"
                />
              </div>

              <div>
                <p className="text-[12px] font-medium text-white">
                  Email
                </p>

                <p className="mt-0.5 text-[10px] text-[#666]">
                  Currently the only available sending channel.
                </p>
              </div>

              <Check
                size={14}
                className="ml-auto text-[#F5C518]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] text-[#777]">
              Subject
            </label>

            <input
              value={subject}
              onChange={(
                event
              ) =>
                setSubject(
                  event.target
                    .value
                )
              }
              className="h-10 w-full rounded-lg border border-[#202020] bg-[#101010] px-3 text-xs text-white outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_16px_rgba(245,197,24,0.05)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] text-[#777]">
              Message
            </label>

            <textarea
              value={message}
              onChange={(
                event
              ) =>
                setMessage(
                  event.target
                    .value
                )
              }
              rows={12}
              className="w-full resize-none rounded-lg border border-[#202020] bg-[#101010] px-3 py-3 text-xs leading-5 text-gray-200 outline-none transition-all focus:border-[#F5C518]/40 focus:bg-[#171717] focus:shadow-[0_0_16px_rgba(245,197,24,0.05)]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#202020] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#202020] bg-[#171717] px-4 py-2.5 text-xs text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#191919] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                saving ||
                !message.trim()
              }
              onClick={() =>
                onSave({
                  campaign,
                  subject,
                  message,
                  channel,
                })
              }
              className="flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2.5 text-xs font-semibold text-black shadow-[0_6px_18px_rgba(245,197,24,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(245,197,24,0.18)] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : (
                <Check size={14} />
              )}

              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL PANEL
========================================================= */

function OutreachDetail({
  outreach,
  saving,
  onClose,
  onEdit,
  onFollowUp,
  onReply,
  onDelete,
  onStatusChange,
}: {
  outreach: Outreach;
  saving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onFollowUp: () => void;
  onReply: () => void;
  onDelete: () => void;
  onStatusChange: (
    status: OutreachStatus
  ) => void;
}) {
  const [
    actionsOpen,
    setActionsOpen,
  ] = useState(false);

  const websiteUrl =
    outreach.website
      ? outreach.website.startsWith(
          "http"
        )
        ? outreach.website
        : `https://${outreach.website}`
      : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-all duration-200 hover:border-[#2A2A2A] hover:shadow-[0_16px_36px_rgba(0,0,0,0.30)]">
        <div className="flex items-start justify-between gap-3">
          <div className="group flex min-w-0 items-center gap-3">
            <LeadAvatar
              outreach={outreach}
              large
            />

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">
                {outreach.lead}
              </h2>

              <p className="mt-1 text-[10px] text-[#777]">
                {outreach.category} •{" "}
                {outreach.location}
              </p>

              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-[10px] text-[#60A5FA] transition-colors hover:text-[#60A5FA]"
                >
                  <span className="truncate">
                    {outreach.website}
                  </span>

                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#202020] bg-[#171717] text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#191919] hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#202020] pt-3">
          <div className="flex items-center gap-2">
            <ChannelIcon
              channel={outreach.channel}
            />

            <span className="text-[10px] text-[#777]">
              {outreach.channel}
            </span>
          </div>

          <StatusBadge
            status={outreach.status}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="group rounded-xl border border-[#202020] bg-[#0D0D0D] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
          <p className="text-[10px] uppercase tracking-wider text-[#666]">
            Score
          </p>

          <p className="mt-1 text-lg font-semibold text-[#F5C518]">
            {outreach.score || "—"}
          </p>
        </div>

        <div className="group rounded-xl border border-[#202020] bg-[#0D0D0D] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
          <p className="text-[10px] uppercase tracking-wider text-[#666]">
            Opened
          </p>

          <p className="mt-1 text-lg font-semibold text-white">
            {outreach.raw
              .opened_at
              ? "Yes"
              : "—"}
          </p>
        </div>

        <div className="group rounded-xl border border-[#202020] bg-[#0D0D0D] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
          <p className="text-[10px] uppercase tracking-wider text-[#666]">
            Replied
          </p>

          <p className="mt-1 text-lg font-semibold text-white">
            {outreach.raw
              .replied_at
              ? "Yes"
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {outreach.services.map(
          (service) => (
            <span
              key={service}
              className="rounded-md border border-[#202020] bg-[#171717] px-2 py-1 text-[10px] text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#191919] hover:text-gray-300"
            >
              {service}
            </span>
          )
        )}
      </div>

      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#666]">
          {outreach.sequence}
        </p>

        <h3 className="mt-1 text-xs font-semibold text-white">
          {outreach.subject ||
            "No subject"}
        </h3>

        <div className="mt-3 rounded-xl border border-[#202020] bg-[#101010] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)]">
          <div className="flex gap-3">
            <span className="w-14 shrink-0 text-[10px] text-[#666]">
              To
            </span>

            <span
              className={
                outreach.email
                  ? "truncate text-[10px] text-gray-300"
                  : "text-[10px] text-[#666]"
              }
            >
              {outreach.email ||
                "No email"}
            </span>
          </div>

          <div className="mt-2 flex gap-3">
            <span className="w-14 shrink-0 text-[10px] text-[#666]">
              Campaign
            </span>

            <span className="truncate text-[10px] text-gray-300">
              {outreach.campaign}
            </span>
          </div>

          {outreach.raw
            .scheduled_at && (
            <div className="mt-2 flex gap-3">
              <span className="w-14 shrink-0 text-[10px] text-[#666]">
                Scheduled
              </span>

              <span className="text-[10px] text-[#22D3EE]">
                {formatDateTime(
                  outreach.raw
                    .scheduled_at
                )}
              </span>
            </div>
          )}
        </div>

        <p className="mb-2 mt-5 text-[10px] uppercase tracking-[0.15em] text-[#666]">
          Message
        </p>

        <div className="rounded-xl border border-[#202020] bg-[#101010] p-4 shadow-[0_6px_18px_rgba(0,0,0,0.14)]">
          <p className="whitespace-pre-line text-[12px] leading-5 text-gray-300">
            {outreach.message ||
              "No message yet."}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={saving}
          onClick={onFollowUp}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] py-3 text-[12px] font-semibold text-black shadow-[0_8px_22px_rgba(245,197,24,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(245,197,24,0.18)] disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <Sparkles size={13} />
          Generate Follow-up
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onReply}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#202020] bg-[#101010] py-2.5 text-[10px] text-gray-300 shadow-[0_6px_18px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#171717] hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)] disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Reply size={13} />
            Reply
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#202020] bg-[#101010] py-2.5 text-[10px] text-gray-300 shadow-[0_6px_18px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#171717] hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)] disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Edit3 size={13} />
            Edit
          </button>
        </div>

        <button
          type="button"
          disabled={
            saving ||
            !outreach.email
          }
          onClick={() => {
            onStatusChange(
              "Sent"
            );
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#F5C518]/25 bg-[#FFF7D6] dark:bg-[#332A0C] py-2.5 text-[10px] text-[#F5C518] shadow-[0_6px_18px_rgba(245,197,24,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F5C518]/35 hover:shadow-[0_10px_24px_rgba(245,197,24,0.10)] disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <Send size={13} />
          Mark as Sent
        </button>

        <button
          type="button"
          onClick={() =>
            setActionsOpen(
              (value) => !value
            )
          }
          className="flex w-full items-center justify-between rounded-xl border border-[#202020] bg-[#101010] px-4 py-2.5 text-[10px] text-[#777] shadow-[0_6px_18px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#171717] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
        >
          More Actions

          <ChevronDown
            size={13}
            className={`transition-transform ${
              actionsOpen
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        {actionsOpen && (
          <div className="overflow-hidden rounded-xl border border-[#202020] bg-[#101010] shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
            <p className="border-b border-[#202020] bg-[#0D0D0D] px-3 py-2 text-[10px] uppercase tracking-wider text-[#666]">
              Change status
            </p>

            {(
              [
                "Draft",
                "Scheduled",
                "Sent",
                "Opened",
                "Replied",
                "Interested",
              ] as OutreachStatus[]
            ).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  disabled={
                    saving ||
                    outreach.status ===
                      status
                  }
                  onClick={() => {
                    onStatusChange(
                      status
                    );
                    setActionsOpen(
                      false
                    );
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[10px] text-gray-300 transition-colors hover:bg-[#171717] disabled:opacity-50"
                >
                  {status}

                  {outreach.status ===
                    status && (
                    <Check
                      size={12}
                      className="text-[#F5C518]"
                    />
                  )}
                </button>
              )
            )}

            <button
              type="button"
              disabled={saving}
              onClick={
                onDelete
              }
              className="flex w-full items-center gap-2 border-t border-[#202020] px-3 py-2.5 text-left text-[10px] text-[#F0475C] transition-colors hover:bg-[#3A1418] disabled:opacity-50"
            >
              <Trash2 size={12} />
              Delete outreach
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-[#202020] pt-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#666]">
          Activity
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#777]" />

              <span className="text-[10px] text-[#777]">
                Created
              </span>
            </div>

            <span className="text-[10px] text-[#666]">
              {formatDateTime(
                outreach.raw
                  .created_at
              )}
            </span>
          </div>

          {outreach.raw
            .sent_at && (
            <div className="flex justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#60A5FA] shadow-[0_0_10px_rgba(96,165,250,0.25)]" />

                <span className="text-[10px] text-[#777]">
                  Sent
                </span>
              </div>

              <span className="text-[10px] text-[#666]">
                {formatDateTime(
                  outreach.raw
                    .sent_at
                )}
              </span>
            </div>
          )}

          {outreach.raw
            .opened_at && (
            <div className="flex justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#A78BFA] shadow-[0_0_10px_rgba(167,139,250,0.25)]" />

                <span className="text-[10px] text-[#777]">
                  Opened
                </span>
              </div>

              <span className="text-[10px] text-[#666]">
                {formatDateTime(
                  outreach.raw
                    .opened_at
                )}
              </span>
            </div>
          )}

          {outreach.raw
            .replied_at && (
            <div className="flex justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#84CC16] shadow-[0_0_10px_rgba(132,204,22,0.25)]" />

                <span className="text-[10px] text-[#777]">
                  Replied
                </span>
              </div>

              <span className="text-[10px] text-[#666]">
                {formatDateTime(
                  outreach.raw
                    .replied_at
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE ROW
========================================================= */

function OutreachRow({
  outreach,
  selected,
  onClick,
}: {
  outreach: Outreach;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group grid w-full grid-cols-[32px_minmax(220px,1.25fr)_minmax(150px,1fr)_110px_110px_90px_90px_100px_145px_30px] items-center gap-2 border-b border-[#202020] border-l-2 px-4 py-3 text-left transition-all duration-200 ease-out ${
        selected
          ? "border-l-[#F5C518] bg-[#332A0C]/60 shadow-[inset_0_0_30px_rgba(245,197,24,0.025)]"
          : "border-l-transparent hover:-translate-y-[1px] hover:border-l-[#F5C518]/30 hover:bg-[#101010] hover:shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
      }`}
    >
      <span
        className={`flex h-3.5 w-3.5 rounded border transition-all duration-200 ${
          selected
            ? "border-[#F5C518]/60 bg-[#F5C518]/10 shadow-[0_0_10px_rgba(245,197,24,0.10)]"
            : "border-[#555] bg-transparent group-hover:border-[#777]"
        }`}
      />

      <div className="flex min-w-0 items-center gap-3">
        <LeadAvatar
          outreach={outreach}
        />

        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-white">
            {outreach.lead}
          </p>

          <p className="truncate text-[12px] text-[#666]">
            {outreach.category} •{" "}
            {outreach.location}
          </p>

          <div className="mt-1">
            <EngagementPulse outreach={outreach} />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[10px] text-gray-300">
          {outreach.campaign}
        </p>

        <p className="truncate text-[10px] text-[#666]">
          {outreach.sequence}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ChannelIcon
          channel={outreach.channel}
        />

        <span className="text-[10px] text-[#777]">
          {outreach.channel}
        </span>
      </div>

      <StatusBadge
        status={outreach.status}
      />

      <span className="text-[10px] text-[#777]">
        {outreach.sent}
      </span>

      <span
        className={`text-[10px] ${
          outreach.opened === "No"
            ? "text-[#666]"
            : "text-[#84CC16]"
        }`}
      >
        {outreach.opened === "No"
          ? "No"
          : "Yes"}
      </span>

      <span
        className={`text-[10px] ${
          outreach.replied === "—"
            ? "text-[#666]"
            : "text-[#84CC16]"
        }`}
      >
        {outreach.replied === "—"
          ? "—"
          : "Yes"}
      </span>

      <span className="whitespace-pre-line text-[10px] text-[#777]">
        {outreach.nextStep}
      </span>

      <MoreHorizontal
        size={14}
        className="text-[#555] transition-colors group-hover:text-[#777]"
      />
    </button>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

function OutreachPageContent() {
  /*
   * IMPORTANT:
   * We intentionally do NOT use useSearchParams() here.
   *
   * Next.js 16 requires useSearchParams() to be handled through
   * a Suspense boundary during production prerendering.
   *
   * The only thing we need from the query string is ?lead=...
   * which can safely be read after the client mounts.
   */
  const [
    leadFromUrl,
    setLeadFromUrl,
  ] = useState("");

  const [leads, setLeads] =
    useState<LeadRecord[]>([]);

  const [
    outreach,
    setOutreach,
  ] = useState<Outreach[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    toast,
    setToast,
  ] = useState<string | null>(
    null
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    activeStatus,
    setActiveStatus,
  ] = useState("All");

  const [
    channelFilter,
    setChannelFilter,
  ] = useState("All Channels");

  const [
    campaignFilter,
    setCampaignFilter,
  ] = useState("All Campaigns");

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    newOpen,
    setNewOpen,
  ] = useState(false);

  const [
    editOpen,
    setEditOpen,
  ] = useState(false);

  const [
    mobileDetailOpen,
    setMobileDetailOpen,
  ] = useState(false);

  /* =====================================================
     READ LEAD FROM URL
  ===================================================== */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setLeadFromUrl(
      params.get("lead") || ""
    );
  }, []);

  /* =====================================================
     TOAST
  ===================================================== */

  const showToast =
    useCallback(
      (message: string) => {
        setToast(message);

        window.setTimeout(() => {
          setToast(null);
        }, 3000);
      },
      []
    );

  /* =====================================================
     CURRENT COMPANY
  ===================================================== */

  const getCurrentCompanyId =
    useCallback(
      async (userId: string) => {
        const {
          data: ownedCompany,
          error: ownerError,
        } = await supabase
          .from("company_profiles")
          .select("id")
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

        if (ownerError) {
          throw ownerError;
        }

        if (ownedCompany?.id) {
          return String(
            ownedCompany.id
          );
        }

        const {
          data: membership,
          error:
            membershipError,
        } = await supabase
          .from("team_members")
          .select("company_id")
          .eq(
            "user_id",
            userId
          )
          .eq(
            "status",
            "active"
          )
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        return membership?.company_id
          ? String(
              membership.company_id
            )
          : null;
      },
      []
    );

  /* =====================================================
     LOAD
  ===================================================== */

  const loadData =
    useCallback(
      async (silent = false) => {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        try {
          const {
            data: { user },
            error: authError,
          } =
            await supabase.auth.getUser();

          if (
            authError ||
            !user
          ) {
            throw new Error(
              "You must be logged in to view outreach."
            );
          }

          const companyId =
            await getCurrentCompanyId(
              user.id
            );

          if (!companyId) {
            setLeads([]);
            setOutreach([]);
            setSelectedId(null);
            return;
          }

          const {
            data: leadRows,
            error: leadsError,
          } =
            await supabase
              .from("leads")
              .select(
                "id,user_id,company_id,name,company,email,phone,website,industry,category,location,address,city,state,country,ai_score,intent_score,ai_reason,ai_opportunity,ai_recommendations,notes"
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "updated_at",
                {
                  ascending: false,
                }
              );

          if (leadsError) {
            throw new Error(
              leadsError.message
            );
          }

          const {
            data: outreachRows,
            error:
              outreachError,
          } =
            await supabase
              .from("outreach")
              .select("*")
              .eq(
                "user_id",
                user.id
              )
              .order(
                "updated_at",
                {
                  ascending: false,
                }
              );

          if (outreachError) {
            throw new Error(
              outreachError.message
            );
          }

          const typedLeads =
            (leadRows ||
              []) as LeadRecord[];

          const typedOutreach =
            (outreachRows ||
              []) as OutreachRecord[];

          const leadMap =
            new Map<
              string,
              LeadRecord
            >();

          typedLeads.forEach(
            (lead) => {
              leadMap.set(
                String(lead.id),
                lead
              );
            }
          );

          const mapped =
            typedOutreach
              .map((record) =>
                mapOutreach(
                  record,
                  record.lead_id
                    ? leadMap.get(
                        String(
                          record.lead_id
                        )
                      )
                    : undefined
                )
              )
              .filter(
                (item) =>
                  !item.leadId ||
                  leadMap.has(
                    String(
                      item.leadId
                    )
                  )
              );

          setLeads(
            typedLeads
          );

          setOutreach(
            mapped
          );

          setSelectedId(
            (current) => {
              if (
                current &&
                mapped.some(
                  (item) =>
                    item.id ===
                    current
                )
              ) {
                return current;
              }

              if (
                leadFromUrl
              ) {
                const matching =
                  mapped.find(
                    (item) =>
                      String(
                        item.leadId
                      ) ===
                      String(
                        leadFromUrl
                      )
                  );

                if (matching) {
                  return matching.id;
                }
              }

              return (
                mapped[0]?.id ||
                null
              );
            }
          );
        } catch (
          loadError
        ) {
          console.error(
            "Outreach load error:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Could not load outreach."
          );
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      [
        getCurrentCompanyId,
        leadFromUrl,
      ]
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadData(true);
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadData]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadData(true);
        }
      }, 60000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadData]);

  /* =====================================================
     FILTER DATA
  ===================================================== */

  const campaigns =
    useMemo(() => {
      return Array.from(
        new Set(
          outreach.map(
            (item) =>
              item.campaign
          )
        )
      ).sort();
    }, [outreach]);

  const filteredOutreach =
    useMemo(() => {
      let result = [
        ...outreach,
      ];

      const query =
        search
          .trim()
          .toLowerCase();

      if (query) {
        result =
          result.filter(
            (item) =>
              item.lead
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.email
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.campaign
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.subject
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.channel
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.location
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.category
                .toLowerCase()
                .includes(
                  query
                )
          );
      }

      if (
        activeStatus !==
        "All"
      ) {
        if (
          activeStatus ===
          "Drafts"
        ) {
          result =
            result.filter(
              (item) =>
                item.status ===
                "Draft"
            );
        } else if (
          activeStatus ===
          "Follow-ups"
        ) {
          result =
            result.filter(
              (item) =>
                item.sequence
                  .toLowerCase()
                  .includes(
                    "follow"
                  )
            );
        } else {
          result =
            result.filter(
              (item) =>
                item.status ===
                activeStatus
            );
        }
      }

      if (
        channelFilter !==
        "All Channels"
      ) {
        result =
          result.filter(
            (item) =>
              item.channel ===
              channelFilter
          );
      }

      if (
        campaignFilter !==
        "All Campaigns"
      ) {
        result =
          result.filter(
            (item) =>
              item.campaign ===
              campaignFilter
          );
      }

      return result;
    }, [
      outreach,
      search,
      activeStatus,
      channelFilter,
      campaignFilter,
    ]);

  /* =====================================================
     KPIS
  ===================================================== */

  const sentCount =
    outreach.filter(
      (item) =>
        Boolean(
          item.raw.sent_at
        ) ||
        [
          "Sent",
          "Opened",
          "Replied",
          "Interested",
        ].includes(
          item.status
        )
    ).length;

  const openedCount =
    outreach.filter(
      (item) =>
        Boolean(
          item.raw.opened_at
        )
    ).length;

  const repliedCount =
    outreach.filter(
      (item) =>
        Boolean(
          item.raw.replied_at
        )
    ).length;

  const interestedCount =
    outreach.filter(
      (item) =>
        item.status ===
        "Interested"
    ).length;

  const scheduledCount =
    outreach.filter(
      (item) =>
        item.status ===
        "Scheduled"
    ).length;

  const draftCount =
    outreach.filter(
      (item) =>
        item.status ===
        "Draft"
    ).length;

  const openRate =
    sentCount > 0
      ? (
          (openedCount /
            sentCount) *
          100
        ).toFixed(1)
      : "0.0";

  const replyRate =
    sentCount > 0
      ? (
          (repliedCount /
            sentCount) *
          100
        ).toFixed(1)
      : "0.0";

  const statusCounts: Record<
    string,
    number
  > = {
    All: outreach.length,
    Drafts: draftCount,
    Scheduled:
      scheduledCount,
    Sent: outreach.filter(
      (item) =>
        item.status ===
        "Sent"
    ).length,
    Opened: openedCount,
    Replied: repliedCount,
    "Follow-ups":
      outreach.filter(
        (item) =>
          item.sequence
            .toLowerCase()
            .includes(
              "follow"
            )
      ).length,
    Interested:
      interestedCount,
  };

  const selectedOutreach =
    outreach.find(
      (item) =>
        item.id ===
        selectedId
    ) || null;

  /* =====================================================
     PERSONALIZED DRAFT GENERATOR
  ===================================================== */

  function generateMessage(
    lead: LeadRecord,
    campaign: string
  ) {
    const business =
      getLeadName(lead);

    const category =
      getLeadCategory(
        lead
      );

    const location =
      getLeadLocation(
        lead
      );

    const services =
      deriveServices(
        lead
      );

    const serviceText =
      services
        .slice(0, 2)
        .join(
          " and "
        ) ||
      "a stronger digital experience";

    const reason =
      lead.ai_reason?.trim() ||
      lead.ai_opportunity?.trim() ||
      `I came across ${business} and noticed an opportunity to strengthen the digital experience around your business.`;

    return {
      subject:
        campaign &&
        campaign !==
          "General Outreach"
          ? `${campaign} idea for ${business}`
          : `A quick idea for ${business}`,

      message: `Hi there,

I came across ${business} and wanted to reach out with a quick idea.

${reason}

We work with businesses in the ${category.toLowerCase()} space on ${serviceText}, with a focus on creating a stronger digital experience and turning more visitors and inquiries into customers.

I had a few specific ideas for ${business} and would be happy to share them.

Would you be open to a quick conversation?

Best,
StudioBase

Location: ${location}`,
    };
  }

  /* =====================================================
     CREATE OUTREACH
  ===================================================== */

  async function createOutreach(
    data: {
      leadId: string;
      campaign: string;
      channel: OutreachChannel;
      subject: string;
      message: string;
      status: OutreachStatus;
      scheduledAt: string | null;
      sendNow: boolean;
    }
  ) {
    if (!data.leadId) {
      showToast(
        "Please select a lead."
      );
      return;
    }

    if (!data.message.trim()) {
      showToast(
        "Please add a message."
      );
      return;
    }

    if (
      !data.subject.trim() &&
      data.sendNow
    ) {
      showToast(
        "Please add an email subject."
      );
      return;
    }

    if (
      data.channel !==
      "Email"
    ) {
      showToast(
        "Email is currently the only connected channel."
      );
      return;
    }

    if (
      data.status ===
        "Scheduled" &&
      !data.scheduledAt
    ) {
      showToast(
        "Please choose a date and time."
      );
      return;
    }

    if (
      data.status ===
        "Scheduled" &&
      data.scheduledAt
    ) {
      const scheduledDate =
        new Date(
          data.scheduledAt
        );

      if (
        Number.isNaN(
          scheduledDate.getTime()
        ) ||
        scheduledDate.getTime() <=
          Date.now()
      ) {
        showToast(
          "Scheduled time must be in the future."
        );
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const companyId =
        await getCurrentCompanyId(
          user.id
        );

      if (!companyId) {
        throw new Error(
          "No company could be found for this account."
        );
      }

      const selectedLead =
        leads.find(
          (lead) =>
            String(
              lead.id
            ) ===
            String(
              data.leadId
            )
        );

      if (!selectedLead) {
        throw new Error(
          "That lead is not available in your current company."
        );
      }

      if (
        selectedLead.company_id &&
        String(
          selectedLead.company_id
        ) !==
          companyId
      ) {
        throw new Error(
          "That lead does not belong to your current company."
        );
      }

      if (data.sendNow) {
        const {
          data: created,
          error:
            createError,
        } =
          await supabase
            .from("outreach")
            .insert({
              user_id:
                user.id,
              lead_id:
                data.leadId,
              campaign:
                data.campaign.trim() ||
                "General Outreach",
              channel:
                "Email",
              subject:
                data.subject.trim(),
              message:
                data.message.trim(),
              status:
                "draft",
              scheduled_at:
                null,
              sent_at:
                null,
              next_step:
                "Ready to Send",
              next_step_at:
                null,
            })
            .select("*")
            .single();

        if (createError) {
          throw new Error(
            createError.message
          );
        }

        const mapped =
          mapOutreach(
            created as OutreachRecord,
            selectedLead
          );

        setOutreach(
          (current) => [
            mapped,
            ...current,
          ]
        );

        setSelectedId(
          mapped.id
        );

        setNewOpen(
          false
        );

        showToast(
          "Outreach saved as a draft. Email sending will be connected next."
        );

        return;
      }

      const scheduled =
        data.status ===
        "Scheduled";

      const scheduledIso =
        scheduled &&
        data.scheduledAt
          ? new Date(
              data.scheduledAt
            ).toISOString()
          : null;

      const {
        data: created,
        error: createError,
      } =
        await supabase
          .from("outreach")
          .insert({
            user_id:
              user.id,
            lead_id:
              data.leadId,
            campaign:
              data.campaign.trim() ||
              "General Outreach",
            channel:
              "Email",
            subject:
              data.subject.trim(),
            message:
              data.message.trim(),
            status:
              scheduled
                ? "scheduled"
                : "draft",
            scheduled_at:
              scheduledIso,
            sent_at: null,
            next_step:
              scheduled
                ? "Scheduled"
                : null,
            next_step_at:
              scheduledIso,
          })
          .select("*")
          .single();

      if (createError) {
        throw new Error(
          createError.message
        );
      }

      const mapped =
        mapOutreach(
          created as OutreachRecord,
          selectedLead
        );

      setOutreach(
        (current) => [
          mapped,
          ...current,
        ]
      );

      setSelectedId(
        mapped.id
      );

      setNewOpen(
        false
      );

      showToast(
        scheduled
          ? "Email outreach scheduled successfully."
          : "Email outreach saved successfully."
      );
    } catch (
      createError
    ) {
      console.error(
        "Create outreach error:",
        createError
      );

      showToast(
        createError instanceof
          Error
          ? createError.message
          : "Could not create outreach."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     EDIT
  ===================================================== */

  async function saveEdit(
    data: {
      campaign: string;
      subject: string;
      message: string;
      channel: OutreachChannel;
    }
  ) {
    if (!selectedOutreach) {
      return;
    }

    if (
      data.channel !==
      "Email"
    ) {
      showToast(
        "Email is currently the only connected channel."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const {
        data: updated,
        error:
          updateError,
      } =
        await supabase
          .from("outreach")
          .update({
            campaign:
              data.campaign.trim() ||
              "General Outreach",
            subject:
              data.subject.trim(),
            message:
              data.message.trim(),
            channel:
              "Email",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            selectedOutreach.id
          )
          .eq(
            "user_id",
            user.id
          )
          .select("*")
          .single();

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      const lead =
        leads.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              updated.lead_id
            )
        );

      const mapped =
        mapOutreach(
          updated as OutreachRecord,
          lead
        );

      setOutreach(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              mapped.id
                ? mapped
                : item
          )
      );

      setEditOpen(
        false
      );

      showToast(
        "Email outreach updated successfully."
      );
    } catch (
      updateError
    ) {
      console.error(
        "Update outreach error:",
        updateError
      );

      showToast(
        updateError instanceof
          Error
          ? updateError.message
          : "Could not update outreach."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     STATUS
  ===================================================== */

  async function changeStatus(
    status: OutreachStatus
  ) {
    if (!selectedOutreach) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const update: Record<
        string,
        unknown
      > = {
        status:
          status === "Draft"
            ? "draft"
            : status.toLowerCase(),
        updated_at:
          new Date().toISOString(),
      };

      if (
        status ===
        "Scheduled"
      ) {
        const existing =
          selectedOutreach.raw
            .scheduled_at;

        const existingDate =
          existing
            ? new Date(
                existing
              )
            : null;

        update.scheduled_at =
          existingDate &&
          !Number.isNaN(
            existingDate.getTime()
          ) &&
          existingDate.getTime() >
            Date.now()
            ? existing
            : new Date(
                Date.now() +
                  60 *
                    60 *
                    1000
              ).toISOString();

        update.next_step =
          "Scheduled";

        update.next_step_at =
          update.scheduled_at;
      }

      if (
        status === "Sent" &&
        !selectedOutreach.raw
          .sent_at
      ) {
        update.sent_at =
          new Date().toISOString();
      }

      if (
        status ===
          "Replied" &&
        !selectedOutreach.raw
          .replied_at
      ) {
        update.replied_at =
          new Date().toISOString();
      }

      if (
        status ===
          "Opened" &&
        !selectedOutreach.raw
          .opened_at
      ) {
        update.opened_at =
          new Date().toISOString();
      }

      const {
        data: updated,
        error:
          updateError,
      } =
        await supabase
          .from("outreach")
          .update(update)
          .eq(
            "id",
            selectedOutreach.id
          )
          .eq(
            "user_id",
            user.id
          )
          .select("*")
          .single();

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      const lead =
        leads.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              updated.lead_id
            )
        );

      const mapped =
        mapOutreach(
          updated as OutreachRecord,
          lead
        );

      setOutreach(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              mapped.id
                ? mapped
                : item
          )
      );

      showToast(
        `Status changed to ${status}.`
      );
    } catch (
      updateError
    ) {
      console.error(
        "Status update error:",
        updateError
      );

      showToast(
        updateError instanceof
          Error
          ? updateError.message
          : "Could not update status."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     FOLLOW UP
  ===================================================== */

  async function createFollowUp() {
    if (!selectedOutreach) {
      return;
    }

    const lead =
      leads.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            selectedOutreach.leadId
          )
      );

    if (!lead) {
      showToast(
        "The associated lead could not be found."
      );
      return;
    }

    const generated =
      generateMessage(
        lead,
        `${selectedOutreach.campaign} Follow-up`
      );

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const {
        data: created,
        error:
          createError,
      } =
        await supabase
          .from("outreach")
          .insert({
            user_id:
              user.id,
            lead_id:
              lead.id,
            campaign:
              selectedOutreach.campaign,
            channel:
              "Email",
            subject:
              generated.subject,
            message:
              generated.message,
            status:
              "draft",
            scheduled_at:
              null,
            sent_at:
              null,
            next_step:
              "Follow-up",
            next_step_at:
              null,
          })
          .select("*")
          .single();

      if (createError) {
        throw new Error(
          createError.message
        );
      }

      const mapped =
        mapOutreach(
          created as OutreachRecord,
          lead
        );

      setOutreach(
        (current) => [
          mapped,
          ...current,
        ]
      );

      setSelectedId(
        mapped.id
      );

      showToast(
        "Email follow-up draft created."
      );
    } catch (
      createError
    ) {
      console.error(
        "Follow-up error:",
        createError
      );

      showToast(
        createError instanceof
          Error
          ? createError.message
          : "Could not create follow-up."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     REPLY
  ===================================================== */

  async function createReply() {
    if (!selectedOutreach) {
      return;
    }

    const lead =
      leads.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            selectedOutreach.leadId
          )
      );

    if (!lead) {
      showToast(
        "The associated lead could not be found."
      );
      return;
    }

    const business =
      getLeadName(lead);

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const message = `Hi there,

Thanks for getting back to me.

I'd be happy to show you a few ideas specifically for ${business} and answer any questions you have.

Would you be available for a quick 15-minute conversation this week?

Best,
StudioBase`;

      const {
        data: created,
        error:
          createError,
      } =
        await supabase
          .from("outreach")
          .insert({
            user_id:
              user.id,
            lead_id:
              lead.id,
            campaign:
              selectedOutreach.campaign,
            channel:
              "Email",
            subject: `Re: ${
              selectedOutreach.subject ||
              selectedOutreach.campaign
            }`,
            message,
            status:
              "draft",
            scheduled_at:
              null,
            sent_at:
              null,
            next_step:
              "Reply",
            next_step_at:
              null,
          })
          .select("*")
          .single();

      if (createError) {
        throw new Error(
          createError.message
        );
      }

      const mapped =
        mapOutreach(
          created as OutreachRecord,
          lead
        );

      setOutreach(
        (current) => [
          mapped,
          ...current,
        ]
      );

      setSelectedId(
        mapped.id
      );

      showToast(
        "Email reply draft created."
      );
    } catch (
      createError
    ) {
      console.error(
        "Reply error:",
        createError
      );

      showToast(
        createError instanceof
          Error
          ? createError.message
          : "Could not create reply."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     DELETE
  ===================================================== */

  async function deleteSelected() {
    if (!selectedOutreach) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete this outreach for ${selectedOutreach.lead}?`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const {
        error:
          deleteError,
      } =
        await supabase
          .from("outreach")
          .delete()
          .eq(
            "id",
            selectedOutreach.id
          )
          .eq(
            "user_id",
            user.id
          );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setOutreach(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              selectedOutreach.id
          )
      );

      setSelectedId(
        null
      );

      setMobileDetailOpen(
        false
      );

      showToast(
        "Outreach deleted."
      );
    } catch (
      deleteError
    ) {
      console.error(
        "Delete outreach error:",
        deleteError
      );

      showToast(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Could not delete outreach."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     EXPORT
  ===================================================== */

  function exportOutreach() {
    if (
      filteredOutreach.length ===
      0
    ) {
      showToast(
        "There is nothing to export."
      );
      return;
    }

    const headers = [
      "Lead",
      "Category",
      "Location",
      "Campaign",
      "Sequence",
      "Channel",
      "Status",
      "Sent",
      "Opened",
      "Replied",
      "Next Step",
      "Email",
      "Subject",
      "Message",
    ];

    const rows =
      filteredOutreach.map(
        (item) => [
          item.lead,
          item.category,
          item.location,
          item.campaign,
          item.sequence,
          item.channel,
          item.status,
          item.sent,
          item.opened,
          item.replied,
          item.nextStep.replace(
            "\n",
            " "
          ),
          item.email,
          item.subject,
          item.message.replace(
            /\n/g,
            " "
          ),
        ]
      );

    const csv = [
      headers.join(","),
      ...rows.map(
        (row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value
                ).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",")
      ),
    ].join("\n");

    const blob =
      new Blob(
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
      "baselead-outreach.csv";

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

    showToast(
      "Outreach exported successfully."
    );
  }

  /* =====================================================
     CLEAR FILTERS
  ===================================================== */

  function clearFilters() {
    setSearch("");
    setActiveStatus("All");
    setChannelFilter(
      "All Channels"
    );
    setCampaignFilter(
      "All Campaigns"
    );

    showToast(
      "Filters cleared."
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main
  style={
    {
      "--outreach-border": isLightMode()
        ? "#E3E3E8"
        : BORDER,
    } as CSSProperties
  }
  className="min-h-screen bg-[#050505] text-white"
>
  <div className="border-b border-[var(--outreach-border)] bg-[#050505] px-4 py-4 sm:px-6 lg:px-7">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5C518] text-black shadow-[0_6px_18px_rgba(245,197,24,0.10)]">
          <Send size={14} />
            </div>

            <div>
              <p className="text-[12px] font-semibold text-white">
                Outreach
              </p>

              <p className="text-[12px] text-[#666]">
                Sales engagement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                showToast(
                  "Workspace location is configured in Company Settings."
                )
              }
              className="hidden items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 py-2 text-[10px] text-[#777] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)] sm:flex"
            >
              ◎ Workspace
              <ChevronDown
                size={11}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                showToast(
                  `You have ${scheduledCount} scheduled outreach item${
                    scheduledCount ===
                    1
                      ? ""
                      : "s"
                  }.`
                )
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#202020] bg-[#0D0D0D] text-[#777] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
            >
              <Bell size={15} />

              {scheduledCount >
                0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F5C518] text-[10px] font-bold text-black shadow-[0_0_12px_rgba(245,197,24,0.20)]">
                  {Math.min(
                    scheduledCount,
                    9
                  )}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-24 pt-6 sm:px-6 lg:px-7 lg:pb-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518] shadow-[0_0_10px_rgba(245,197,24,0.25)]" />

              <span className="text-[10px] uppercase tracking-[0.2em] text-[#F5C518]">
                Sales Engagement
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Outreach
            </h1>

            <p className="mt-1.5 max-w-xl text-xs text-[#777]">
              Create and manage personalized email outreach for your leads.
            </p>
          </div>

          <button
            type="button"
            disabled={
              leads.length ===
              0
            }
            onClick={() =>
              setNewOpen(true)
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-5 py-3 text-xs font-semibold text-black shadow-[0_8px_22px_rgba(245,197,24,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(245,197,24,0.18)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Plus size={15} />
            New Outreach
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            icon={
              <Send
                size={17}
                className="text-[#84CC16]"
              />
            }
            label="All Outreach"
            value={String(
              outreach.length
            )}
            detail="Live from Supabase"
            accent={GREEN}
            surface={GREEN_SURFACE}
          />

          <KpiCard
            icon={
              <Send
                size={17}
                className="text-[#60A5FA]"
              />
            }
            label="Sent"
            value={String(
              sentCount
            )}
            detail="Records marked sent"
            accent={BLUE}
            surface={BLUE_SURFACE}
          />

          <KpiCard
            icon={
              <Mail
                size={17}
                className="text-[#A78BFA]"
              />
            }
            label="Opened"
            value={String(
              openedCount
            )}
            detail={`${openRate}% open rate`}
            accent={PURPLE}
            surface={PURPLE_SURFACE}
          />

          <KpiCard
            icon={
              <Reply
                size={17}
                className="text-[#84CC16]"
              />
            }
            label="Replied"
            value={String(
              repliedCount
            )}
            detail={`${replyRate}% reply rate`}
            accent={GREEN}
            surface={GREEN_SURFACE}
          />

          <KpiCard
            icon={
              <Star
                size={17}
                className="text-[#F5C518]"
              />
            }
            label="Interested"
            value={String(
              interestedCount
            )}
            detail="Interested leads"
            accent={GOLD}
            surface={GOLD_SURFACE}
          />

          <KpiCard
            icon={
              <CalendarCheck
                size={17}
                className="text-[#22D3EE]"
              />
            }
            label="Scheduled"
            value={String(
              scheduledCount
            )}
            detail="Upcoming outreach"
            accent={CYAN}
            surface="#102A31"
          />
        </div>

        <OutreachIntelligence outreach={outreach} onOpen={(id) => setSelectedId(id)} />

        <div className="mt-7 overflow-x-auto border-b border-[var(--outreach-border)]">
          <div className="flex min-w-max items-center gap-1">
            {STATUSES.map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setActiveStatus(
                      status
                    )
                  }
                  className={`relative flex items-center gap-2 px-3 pb-3 pt-1 text-[10px] transition-colors ${
                    activeStatus ===
                    status
                      ? "text-white"
                      : "text-[#666] hover:text-gray-300"
                  }`}
                >
                  {activeStatus ===
                    status && (
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-[#F5C518] shadow-[0_0_10px_rgba(245,197,24,0.30)]" />
                  )}

                  {status}

                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      activeStatus ===
                      status
                        ? "border border-[#F5C518]/20 bg-[#FFF7D6] dark:bg-[#332A0C] text-[#F5C518]"
                        : "bg-[#171717] text-[#666]"
                    }`}
                  >
                    {
                      statusCounts[
                        status
                      ]
                    }
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row">
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-[#202020] bg-[#0D0D0D] px-3 shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-all duration-200 focus-within:border-[#2A2A2A] focus-within:bg-[#101010] focus-within:shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
            <Search
              size={14}
              className="mr-2 text-[#555]"
            />

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search leads, campaigns, channels..."
              className="w-full bg-transparent py-2.5 text-[12px] text-white outline-none placeholder:text-[#555]"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="text-[#666] transition-colors hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (value) =>
                  !value
              )
            }
            className={`flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-all duration-200 ${
              filtersOpen
                ? "border-[#F5C518]/40 bg-[#332A0C] text-[#F5C518] shadow-[0_0_18px_rgba(245,197,24,0.06)]"
                : "border-[#202020] bg-[#0D0D0D] text-[#777] hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
            }`}
          >
            <Filter size={14} />
            Filters
          </button>

          <button
            type="button"
            disabled={
              filteredOutreach.length ===
              0
            }
            onClick={
              exportOutreach
            }
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-4 text-[12px] text-[#777] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)] disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Download size={14} />
            Export
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void loadData()
            }
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-4 text-[12px] text-[#777] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#101010] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)] disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#202020] border-t-[#F5C518]" />
            ) : (
              "↻"
            )}
            Refresh
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-[#202020] bg-[#0A0A0A] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)] md:flex-row">
            <select
              value={
                channelFilter
              }
              onChange={(
                event
              ) =>
                setChannelFilter(
                  event.target
                    .value
                )
              }
              className="h-9 rounded-lg border border-[#202020] bg-[#101010] px-3 text-[10px] text-gray-300 outline-none transition-all focus:border-[#2A2A2A] focus:bg-[#171717]"
            >
              <option>
                All Channels
              </option>

              {AVAILABLE_CHANNELS.map(
                (channel) => (
                  <option
                    key={
                      channel
                    }
                    value={
                      channel
                    }
                  >
                    {channel}
                  </option>
                )
              )}
            </select>

            <select
              value={
                campaignFilter
              }
              onChange={(
                event
              ) =>
                setCampaignFilter(
                  event.target
                    .value
                )
              }
              className="h-9 rounded-lg border border-[#202020] bg-[#101010] px-3 text-[10px] text-gray-300 outline-none transition-all focus:border-[#2A2A2A] focus:bg-[#171717]"
            >
              <option>
                All Campaigns
              </option>

              {campaigns.map(
                (campaign) => (
                  <option
                    key={
                      campaign
                    }
                    value={
                      campaign
                    }
                  >
                    {campaign}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[#202020] bg-[#101010] px-4 text-[10px] text-[#777] transition-all duration-200 hover:border-[#2A2A2A] hover:bg-[#171717] hover:text-white"
            >
              Clear Filters
              <SlidersHorizontal
                size={12}
              />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#F0475C]/20 bg-[#3A1418] px-4 py-3 shadow-[0_8px_24px_rgba(240,71,92,0.05)]">
            <p className="text-[10px] text-[#F0475C]">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="rounded-lg border border-[#F0475C]/20 bg-[#3A1418] px-3 py-1.5 text-[10px] text-[#F0475C] transition-all hover:border-[#F0475C]/35"
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-4 rounded-2xl border border-[#202020] bg-[#0A0A0A] py-20 text-center shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#202020] border-t-[#F5C518] shadow-[0_0_16px_rgba(245,197,24,0.08)]" />

            <p className="mt-3 text-[10px] uppercase tracking-wider text-[#666]">
              Loading outreach
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          filteredOutreach.length ===
            0 && (
            <div className="mt-4 rounded-2xl border border-[#202020] bg-[#0A0A0A] px-5 py-20 text-center shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F5C518]/20 bg-[#FFF7D6] dark:bg-[#332A0C] shadow-[0_0_24px_rgba(245,197,24,0.06)]">
                <Send
                  size={21}
                  className="text-[#F5C518]"
                />
              </div>

              <h2 className="mt-5 text-sm font-semibold text-white">
                {outreach.length >
                0
                  ? "No matching outreach"
                  : "Your outreach workspace is empty"}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-[12px] leading-5 text-[#666]">
                {outreach.length >
                0
                  ? "Try changing your search or filters."
                  : "Create your first personalized email outreach message for one of your leads."}
              </p>

              {outreach.length >
              0 ? (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#202020] bg-[#101010] px-4 py-2.5 text-[10px] text-[#777] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:bg-[#171717] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
                >
                  <SlidersHorizontal
                    size={13}
                  />
                  Clear Filters
                </button>
              ) : leads.length >
                0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setNewOpen(
                      true
                    )
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-[10px] font-semibold text-black shadow-[0_6px_18px_rgba(245,197,24,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(245,197,24,0.18)]"
                >
                  <Plus size={13} />
                  Create Outreach
                </button>
              ) : (
                <p className="mt-5 text-[10px] text-[#555]">
                  Add a lead first to create outreach.
                </p>
              )}
            </div>
          )}

        {!loading &&
          filteredOutreach.length >
            0 && (
            <>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-[0_10px_30px_rgba(0,0,0,0.20)] lg:hidden">
                {filteredOutreach.map(
                  (item) => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() => {
                        setSelectedId(
                          item.id
                        );

                        setMobileDetailOpen(
                          true
                        );
                      }}
                      className={`group flex w-full items-center gap-3 border-b border-[#202020] border-l-2 px-4 py-3.5 text-left transition-all duration-200 ${
                        item.id ===
                        selectedId
                          ? "border-l-[#F5C518] bg-[#332A0C]/50"
                          : "border-l-transparent hover:border-l-[#F5C518]/30 hover:bg-[#101010] hover:shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
                      }`}
                    >
                      <LeadAvatar
                        outreach={
                          item
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12px] font-semibold text-white">
                            {
                              item.lead
                            }
                          </p>

                          <StatusBadge
                            status={
                              item.status
                            }
                          />
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <ChannelIcon
                            channel={
                              item.channel
                            }
                          />

                          <span className="truncate text-[10px] text-[#666]">
                            {
                              item.campaign
                            }
                          </span>

                          <span className="text-[#555]">
                            •
                          </span>

                          <span className="text-[10px] text-[#666]">
                            {
                              item.sent
                            }
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className="text-[#555] transition-all group-hover:translate-x-0.5 group-hover:text-[#777]"
                      />
                    </button>
                  )
                )}
              </div>

              <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-[0_10px_30px_rgba(0,0,0,0.20)] lg:block">
                <div className="flex items-center justify-between border-b border-[#202020] bg-[#101010] px-4 py-3">
                  <div>
                    <p className="text-[12px] font-semibold text-white">
                      Outreach Activity
                    </p>

                    <p className="mt-0.5 text-[12px] text-[#666]">
                      {
                        filteredOutreach.length
                      }{" "}
                      of{" "}
                      {
                        outreach.length
                      }{" "}
                      records
                    </p>
                  </div>

                  <span className="flex items-center gap-1.5 rounded-full border border-[#84CC16]/15 bg-[#18200B] px-2.5 py-1 text-[10px] text-[#84CC16] shadow-[0_0_14px_rgba(132,204,22,0.05)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#84CC16] shadow-[0_0_8px_rgba(132,204,22,0.30)]" />
                    Live
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[1160px]">
                    <div className="grid grid-cols-[32px_minmax(220px,1.25fr)_minmax(150px,1fr)_110px_110px_90px_90px_100px_145px_30px] items-center gap-2 border-b border-[#202020] bg-[#101010] px-4 py-3 text-[10px] uppercase tracking-wider text-[#555]">
                      <span>
                        <span className="flex h-3.5 w-3.5 rounded border border-[#555]" />
                      </span>

                      <span>
                        Lead
                      </span>

                      <span>
                        Campaign /
                        Sequence
                      </span>

                      <span>
                        Channel
                      </span>

                      <span>
                        Status
                      </span>

                      <span>
                        Sent
                      </span>

                      <span>
                        Opened
                      </span>

                      <span>
                        Replied
                      </span>

                      <span>
                        Next Step
                      </span>

                      <span />
                    </div>

                    {filteredOutreach.map(
                      (
                        item
                      ) => (
                        <OutreachRow
                          key={
                            item.id
                          }
                          outreach={
                            item
                          }
                          selected={
                            item.id ===
                            selectedId
                          }
                          onClick={() =>
                            setSelectedId(
                              item.id
                            )
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
      </div>

      {selectedOutreach && (
        <aside className="fixed bottom-0 right-0 top-0 z-30 hidden w-[330px] border-l border-[#202020] bg-[#0A0A0A] shadow-[-18px_0_40px_rgba(0,0,0,0.28)] xl:block">
          <div className="h-full overflow-y-auto p-5">
            <OutreachDetail
              outreach={
                selectedOutreach
              }
              saving={saving}
              onClose={() =>
                setSelectedId(
                  null
                )
              }
              onEdit={() =>
                setEditOpen(
                  true
                )
              }
              onFollowUp={
                createFollowUp
              }
              onReply={
                createReply
              }
              onDelete={
                deleteSelected
              }
              onStatusChange={
                changeStatus
              }
            />
          </div>
        </aside>
      )}

      {mobileDetailOpen &&
        selectedOutreach && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm xl:hidden"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setMobileDetailOpen(
                  false
                );
              }
            }}
          >
            <div className="max-h-[85vh] w-full overflow-hidden rounded-t-2xl border border-[#202020] bg-[#0A0A0A] shadow-[0_-20px_50px_rgba(0,0,0,0.45)]">
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-[#555]" />
              </div>

              <div className="max-h-[calc(85vh-20px)] overflow-y-auto p-5">
                <OutreachDetail
                  outreach={
                    selectedOutreach
                  }
                  saving={saving}
                  onClose={() =>
                    setMobileDetailOpen(
                      false
                    )
                  }
                  onEdit={() =>
                    setEditOpen(
                      true
                    )
                  }
                  onFollowUp={
                    createFollowUp
                  }
                  onReply={
                    createReply
                  }
                  onDelete={
                    deleteSelected
                  }
                  onStatusChange={
                    changeStatus
                  }
                />
              </div>
            </div>
          </div>
        )}

      {newOpen && (
        <NewOutreachModal
          leads={leads}
          initialLeadId={
            leadFromUrl
          }
          saving={saving}
          onClose={() =>
            setNewOpen(false)
          }
          onCreate={
            createOutreach
          }
          onGenerate={
            generateMessage
          }
        />
      )}

      {editOpen &&
        selectedOutreach && (
          <EditOutreachModal
            outreach={
              selectedOutreach
            }
            saving={saving}
            onClose={() =>
              setEditOpen(
                false
              )
            }
            onSave={saveEdit}
          />
        )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#101010] px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.42)]">
            <Check
              size={12}
              className="text-[#F5C518]"
            />

            <span className="text-[10px] text-gray-200">
              {toast}
            </span>
          </div>
        </div>
      )}

    </main>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function OutreachPage() {
  return (
    <OutreachPageContent />
  );
}