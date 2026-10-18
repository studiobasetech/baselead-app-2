"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileBarChart,
  FileText,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import PlanGate from "@/components/plans/PlanGate";
import type { PlanFeature } from "@/lib/plans";

/** Which plan feature unlocks each report tab. */
const TAB_FEATURE: Record<ReportTab, PlanFeature> = {
  Overview: "performance_reports",
  Leads: "performance_reports",
  Outreach: "performance_reports",
  Pipeline: "advanced_reports",
  Revenue: "advanced_reports",
  "Custom Reports": "custom_reports",
};

/** Midpoint of an AI "$5,000 - $15,000" estimate, or a score-based estimate. */
function estimateLeadValue(lead: Record<string, unknown>, score: number) {
  const recommendations = lead.ai_recommendations as
    | { estimated_project_value?: string }
    | string
    | null
    | undefined;

  const text =
    typeof recommendations === "string"
      ? recommendations
      : recommendations?.estimated_project_value ?? "";

  const numbers = (String(text).match(/\d[\d,]*/g) ?? []).map((n) =>
    Number(n.replace(/,/g, ""))
  );

  if (numbers.length >= 2) return Math.round((numbers[0] + numbers[1]) / 2);
  if (numbers.length === 1) return numbers[0];

  if (score >= 80) return 10000;
  if (score >= 60) return 7000;
  if (score >= 40) return 4500;
  return 2000;
}

type ReportTab =
  | "Overview"
  | "Leads"
  | "Outreach"
  | "Pipeline"
  | "Revenue"
  | "Custom Reports";

type Period =
  | "All Time"
  | "Last 7 Days"
  | "Last 30 Days";

type Lead = {
  id: string;
  name?: string | null;
  company?: string | null;
  category?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  score?: number | null;
  status?: string | null;
  source?: string | null;
  industry?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type OutreachRecord = Record<string, unknown>;

type ModalType =
  | "opportunities"
  | "sources"
  | "leads"
  | "pipeline"
  | "outreach"
  | null;

const GOLD = "#F5C518";
const PURPLE = "#A78BFA";
const RED = "#F0475C";
const GREEN = "#84CC16";
const BLUE = "#60A5FA";

const PAGE_BG = "#050505";
const HERO_BG = "#0A0A0A";
const PANEL = "#0D0D0D";
const ELEVATED = "#101010";
const INNER = "#171717";
const PROGRESS = "#191919";
const BORDER = "#202020";
const BORDER_LIGHT = "#2A2A2A";
const MUTED = "#777777";
const MUTED_DARK = "#666666";
const MUTED_DEEP = "#555555";

const DARK_ICON_SURFACES = {
  [GOLD]: "#332A0C",
  [PURPLE]: "#241A38",
  [RED]: "#3A1418",
  [GREEN]: "#18200B",
  [BLUE]: "#10243A",
};

const LIGHT_ICON_SURFACES = {
  [GOLD]: "#FFF7D6",
  [PURPLE]: "#F0EAFF",
  [RED]: "#FFEBEE",
  [GREEN]: "#EFFBDC",
  [BLUE]: "#EAF3FF",
};

const DASHBOARD_COLORS = [
  GOLD,
  BLUE,
  PURPLE,
  GREEN,
  RED,
];

const tabs: ReportTab[] = [
  "Overview",
  "Leads",
  "Outreach",
  "Pipeline",
  "Revenue",
  "Custom Reports",
];

const THEME = {
  background: "var(--report-page-bg)",
  hero: "var(--report-hero-bg)",
  foreground: "var(--report-foreground)",
  panel: "var(--report-panel)",
  panelDark: "var(--report-hero-bg)",
  elevated: "var(--report-elevated)",
  inner: "var(--report-inner)",
  border: "var(--report-border)",
  borderLight: "var(--report-border-light)",
  muted: "var(--report-muted)",
  mutedDark: "var(--report-muted-dark)",
  mutedDeep: "var(--report-muted-deep)",
  hover: "var(--report-hover-bg)",
};

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");

  if (clean.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function softBackground(color: string) {
  return hexToRgba(color, 0.11);
}

function softBorder(color: string) {
  return hexToRgba(color, 0.55);
}

function softGlow(color: string) {
  return hexToRgba(color, 0.22);
}

function getIconBackground(color: string) {
  switch (color.toUpperCase()) {
    case GOLD:
      return "var(--report-icon-gold-bg)";
    case PURPLE:
      return "var(--report-icon-purple-bg)";
    case RED:
      return "var(--report-icon-red-bg)";
    case GREEN:
      return "var(--report-icon-green-bg)";
    case BLUE:
      return "var(--report-icon-blue-bg)";
    default:
      return "var(--report-icon-neutral-bg)";
  }
}

function getAccentHoverBackground(color: string) {
  switch (color.toUpperCase()) {
    case GOLD:
      return "var(--report-hover-gold-bg)";
    case PURPLE:
      return "var(--report-hover-purple-bg)";
    case RED:
      return "var(--report-hover-red-bg)";
    case GREEN:
      return "var(--report-hover-green-bg)";
    case BLUE:
      return "var(--report-hover-blue-bg)";
    default:
      return "var(--report-hover-bg)";
  }
}

function accentStyle(
  color: string,
): CSSProperties {
  return {
    "--report-item-border":
      softBorder(color),
    "--report-item-shadow": `0 14px 34px ${softGlow(
      color,
    )}`,
    "--report-item-hover-bg":
      getAccentHoverBackground(color),
  } as CSSProperties;
}

function currency(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCSV = (value: unknown) => {
    const stringValue =
      value == null ? "" : String(value);

    return `"${stringValue.replace(
      /"/g,
      '""',
    )}"`;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers
        .map((header) =>
          escapeCSV(row[header]),
        )
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function getLeadLocation(lead: Lead) {
  if (lead.location) {
    return lead.location;
  }

  const parts = [
    lead.city,
    lead.state,
    lead.country,
  ].filter(Boolean);

  return (
    parts.join(", ") ||
    "Unknown location"
  );
}

function getLeadCategory(lead: Lead) {
  return (
    lead.category ||
    lead.industry ||
    "Other"
  );
}

function getScore(lead: Lead) {
  const score = Number(lead.score);

  return Number.isFinite(score)
    ? score
    : 0;
}

function getStage(lead: Lead) {
  const status = String(
    lead.status || "",
  )
    .toLowerCase()
    .trim();

  if (
    status.includes("won") ||
    status.includes("closed won") ||
    status.includes("converted")
  ) {
    return "Won";
  }

  if (
    status.includes("proposal") ||
    status.includes("quote") ||
    status.includes("negotiation")
  ) {
    return "Proposal";
  }

  if (
    status.includes("qualified") ||
    status.includes("qualify")
  ) {
    return "Qualified";
  }

  if (
    status.includes("contact") ||
    status.includes("replied") ||
    status.includes("engaged")
  ) {
    return "Contacted";
  }

  if (
    status.includes("lost") ||
    status.includes("closed lost")
  ) {
    return "Lost";
  }

  return "New Lead";
}

function getDateLimit(period: Period) {
  if (period === "All Time") {
    return null;
  }

  const date = new Date();

  if (period === "Last 7 Days") {
    date.setDate(date.getDate() - 7);
  }

  if (period === "Last 30 Days") {
    date.setDate(date.getDate() - 30);
  }

  return date;
}

function getScoreColor(score: number) {
  if (score >= 80) return RED;
  if (score >= 60) return GOLD;
  if (score >= 40) return BLUE;

  return PURPLE;
}

function getStatusColor(value: string) {
  const status =
    value.toLowerCase();

  if (
    status.includes("sent") ||
    status.includes("contact") ||
    status.includes("replied")
  ) {
    return BLUE;
  }

  if (
    status.includes("qualified") ||
    status.includes("won") ||
    status.includes("success")
  ) {
    return GREEN;
  }

  if (
    status.includes("failed") ||
    status.includes("lost") ||
    status.includes("error")
  ) {
    return RED;
  }

  return PURPLE;
}

function Card({
  children,
  className = "",
  accentColor = PURPLE,
}: {
  children: ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        ...accentStyle(accentColor),
        backgroundColor:
          THEME.panel,
      }}
      className={[
        "rounded-2xl border",
        "border-[var(--report-border)]",
        "shadow-[var(--report-card-shadow)]",
        "transition-all duration-200",
        "hover:-translate-y-[2px]",
        "hover:border-[var(--report-item-border)]",
        "hover:shadow-[var(--report-item-shadow)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function IconBox({
  color,
  children,
  size = "md",
  className = "",
}: {
  color: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : size === "lg"
        ? "h-12 w-12 rounded-xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      style={{
        ...accentStyle(color),
        backgroundColor:
          getIconBackground(color),
        borderColor:
          softBorder(color),
        color,
      }}
      className={[
        sizeClass,
        "flex shrink-0 items-center justify-center border",
        "transition-all duration-200",
        "hover:-translate-y-[1px]",
        "hover:border-[var(--report-item-border)]",
        "hover:shadow-[var(--report-item-shadow)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* =========================================================
   HIGH-TECH KPI CARD
========================================================= */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  trend,
  trendLabel,
  progress,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accentColor: string;
  trend?: "up" | "down";
  trendLabel?: string;
  progress?: number;
}) {
  const safeProgress = Math.max(
    0,
    Math.min(100, progress ?? 0),
  );

  return (
    <div
      style={{
        ...accentStyle(accentColor),
        backgroundColor:
          THEME.panel,
      }}
      className={[
        "group relative min-w-0 overflow-hidden rounded-2xl border",
        "border-[var(--report-border)]",
        "shadow-[var(--report-card-shadow)]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-[4px]",
        "hover:border-[var(--report-item-border)]",
        "hover:shadow-[var(--report-item-shadow)]",
      ].join(" ")}
    >
      {/* Accent beam */}
      <div
        style={{
          backgroundColor:
            accentColor,
          boxShadow: `0 0 18px ${softGlow(
            accentColor,
          )}`,
        }}
        className="absolute inset-x-0 top-0 h-[2px] opacity-70 transition-all duration-300 group-hover:h-[3px] group-hover:opacity-100"
      />

      {/* Ambient glow */}
      <div
        style={{
          background:
            `radial-gradient(circle at 88% 5%, ${softGlow(
              accentColor,
            )} 0%, transparent 42%)`,
        }}
        className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <IconBox color={accentColor}>
            {icon}
          </IconBox>

          {trendLabel && (
            <div
              style={{
                color:
                  trend === "down"
                    ? RED
                    : GREEN,
                backgroundColor:
                  getIconBackground(
                    trend === "down"
                      ? RED
                      : GREEN,
                  ),
                borderColor:
                  softBorder(
                    trend === "down"
                      ? RED
                      : GREEN,
                  ),
              }}
              className="flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-bold"
            >
              {trend === "down" ? (
                <ArrowDownRight
                  size={10}
                />
              ) : (
                <ArrowUpRight
                  size={10}
                />
              )}

              {trendLabel}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div
            style={{
              color: THEME.muted,
            }}
            className="text-[10px] font-medium uppercase tracking-[0.08em]"
          >
            {title}
          </div>

          <div
            style={{
              color:
                THEME.foreground,
            }}
            className="mt-1 flex items-baseline gap-2"
          >
            <span className="text-[26px] font-bold leading-none tracking-[-0.04em]">
              {value}
            </span>
          </div>

          <div
            style={{
              color:
                THEME.mutedDark,
            }}
            className="mt-2 text-[9px]"
          >
            {subtitle}
          </div>
        </div>

        {/* Tiny data visualization */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span
              style={{
                color:
                  THEME.mutedDeep,
              }}
              className="text-[8px] uppercase tracking-[0.1em]"
            >
              Performance
            </span>

            <span
              style={{
                color: accentColor,
              }}
              className="text-[8px] font-semibold"
            >
              {Math.round(
                safeProgress,
              )}
              %
            </span>
          </div>

          <div
            style={{
              backgroundColor:
                "var(--report-chart-track)",
            }}
            className="mt-1.5 h-1 overflow-hidden rounded-full"
          >
            <div
              style={{
                width: `${safeProgress}%`,
                backgroundColor:
                  accentColor,
                boxShadow: `0 0 10px ${softGlow(
                  accentColor,
                )}`,
              }}
              className="h-full rounded-full transition-all duration-700"
            />
          </div>
        </div>

        {/* Decorative micro-bars */}
        <div className="absolute bottom-4 right-4 flex h-8 items-end gap-[3px] opacity-35 transition-opacity duration-300 group-hover:opacity-70">
          {[35, 52, 42, 70, 58, 82, 66].map(
            (height, index) => (
              <span
                key={index}
                style={{
                  height: `${height}%`,
                  backgroundColor:
                    accentColor,
                }}
                className="w-[3px] rounded-full"
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function LeadAvatar({
  lead,
  color = GOLD,
}: {
  lead: Lead;
  color?: string;
}) {
  const name =
    lead.company ||
    lead.name ||
    "Lead";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");

  return (
    <div
      style={{
        ...accentStyle(color),
        backgroundColor:
          getIconBackground(color),
        borderColor:
          softBorder(color),
        color,
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-200 hover:shadow-[var(--report-item-shadow)]"
    >
      {initials || "L"}
    </div>
  );
}

function SectionHeader({
  title,
  action,
  color = PURPLE,
}: {
  title: string;
  action?: ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-4">
      <div className="flex items-center gap-2">
        <IconBox
          color={color}
          size="sm"
        >
          <BarChart3 size={14} />
        </IconBox>

        <div>
          <h3
            style={{
              color:
                THEME.foreground,
            }}
            className="text-sm font-semibold"
          >
            {title}
          </h3>
        </div>
      </div>

      {action}
    </div>
  );
}

/* =========================================================
   LEADS BY SOURCE — EXPANDED ANALYTICS PANEL
========================================================= */

function SourceDonut({
  sources,
}: {
  sources: {
    name: string;
    count: number;
    color: string;
  }[];
}) {
  const total = sources.reduce(
    (sum, source) =>
      sum + source.count,
    0,
  );

  const topSource =
    sources.length > 0
      ? sources[0]
      : null;

  const segments = sources.map(
    (source, index) => {
      const start =
        sources
          .slice(0, index)
          .reduce(
            (sum, item) =>
              sum + item.count,
            0,
          ) /
        Math.max(total, 1);

      const end =
        start +
        source.count /
          Math.max(total, 1);

      return {
        ...source,
        start,
        end,
      };
    },
  );

  const gradient =
    segments.length > 0
      ? `conic-gradient(${segments
          .map(
            (segment) =>
              `${segment.color} ${
                segment.start * 100
              }% ${
                segment.end * 100
              }%`,
          )
          .join(", ")})`
      : `conic-gradient(${GOLD} 0% 100%)`;

  return (
    <Card
      className="min-h-[390px] p-5"
      accentColor={PURPLE}
    >
      <SectionHeader
        title="Leads by Source"
        color={PURPLE}
        action={
          <span
            style={{
              backgroundColor:
                getIconBackground(
                  PURPLE,
                ),
              color: PURPLE,
              borderColor:
                softBorder(PURPLE),
            }}
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
          >
            {sources.length} Sources
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        {/* Donut / source summary */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative flex h-40 w-40 items-center justify-center rounded-full"
            style={{
              background: gradient,
              boxShadow: `0 12px 40px ${softGlow(
                GOLD,
              )}`,
            }}
          >
            <div
              style={{
                backgroundColor:
                  THEME.panel,
                borderColor:
                  THEME.border,
              }}
              className="relative flex h-[108px] w-[108px] flex-col items-center justify-center rounded-full border shadow-inner"
            >
              <span
                style={{
                  color:
                    THEME.foreground,
                }}
                className="text-[28px] font-bold tracking-tight"
              >
                {total}
              </span>

              <span
                style={{
                  color:
                    THEME.muted,
                }}
                className="text-[9px] uppercase tracking-[0.1em]"
              >
                Total Leads
              </span>
            </div>
          </div>

          {topSource && (
            <div className="mt-5 text-center">
              <div
                style={{
                  color:
                    THEME.mutedDeep,
                }}
                className="text-[8px] uppercase tracking-[0.14em]"
              >
                Top Source
              </div>

              <div
                style={{
                  color:
                    topSource.color,
                }}
                className="mt-1 text-xs font-semibold"
              >
                {topSource.name}
              </div>

              <div
                style={{
                  color:
                    THEME.muted,
                }}
                className="mt-1 text-[9px]"
              >
                {topSource.count} leads
                {" · "}
                {total > 0
                  ? Math.round(
                      (topSource.count /
                        total) *
                        100,
                    )
                  : 0}
                %
              </div>
            </div>
          )}
        </div>

        {/* Ranked source list */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <span
              style={{
                color:
                  THEME.mutedDeep,
              }}
              className="text-[8px] font-semibold uppercase tracking-[0.12em]"
            >
              Source Distribution
            </span>

            <span
              style={{
                color:
                  THEME.mutedDeep,
              }}
              className="text-[8px]"
            >
              LEADS
            </span>
          </div>

          <div className="space-y-2">
            {sources.length ? (
              sources.map(
                (source, index) => {
                  const percentage =
                    total > 0
                      ? Math.round(
                          (source.count /
                            total) *
                            100,
                        )
                      : 0;

                  return (
                    <div
                      key={
                        source.name
                      }
                      style={accentStyle(
                        source.color,
                      )}
                      className={[
                        "group/source rounded-xl border border-transparent px-3 py-2.5",
                        "transition-all duration-200",
                        "hover:-translate-y-[1px]",
                        "hover:bg-[var(--report-item-hover-bg)]",
                        "hover:border-[var(--report-item-border)]",
                        "hover:shadow-[var(--report-item-shadow)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            color:
                              source.color,
                            backgroundColor:
                              getIconBackground(
                                source.color,
                              ),
                            borderColor:
                              softBorder(
                                source.color,
                              ),
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold"
                        >
                          {index +
                            1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span
                              style={{
                                color:
                                  THEME.foreground,
                              }}
                              className="truncate text-[11px] font-medium"
                            >
                              {
                                source.name
                              }
                            </span>

                            <span
                              style={{
                                color:
                                  source.color,
                              }}
                              className="text-[10px] font-bold"
                            >
                              {
                                source.count
                              }
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2">
                            <div
                              style={{
                                backgroundColor:
                                  "var(--report-chart-track)",
                              }}
                              className="h-1.5 flex-1 overflow-hidden rounded-full"
                            >
                              <div
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor:
                                    source.color,
                                  boxShadow: `0 0 10px ${softGlow(
                                    source.color,
                                  )}`,
                                }}
                                className="h-full rounded-full transition-all duration-500"
                              />
                            </div>

                            <span
                              style={{
                                color:
                                  THEME.muted,
                              }}
                              className="w-8 text-right text-[8px]"
                            >
                              {
                                percentage
                              }%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                },
              )
            ) : (
              <div
                style={{
                  color:
                    THEME.muted,
                }}
                className="flex h-48 items-center justify-center rounded-xl border border-dashed text-xs"
              >
                No source data
                available.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function IndustryChart({
  industries,
}: {
  industries: {
    name: string;
    count: number;
    color: string;
  }[];
}) {
  const max = Math.max(
    ...industries.map(
      (item) => item.count,
    ),
    1,
  );

  return (
    <Card
      className="min-h-[390px] p-5"
      accentColor={GOLD}
    >
      <SectionHeader
        title="Leads by Industry"
        color={GOLD}
        action={
          <span
            style={{
              backgroundColor:
                getIconBackground(GOLD),
              color: GOLD,
              borderColor:
                softBorder(GOLD),
            }}
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
          >
            {industries.length} Categories
          </span>
        }
      />

      <div className="space-y-2">
        {industries.map(
          (industry, index) => {
            const percentage =
              Math.round(
                (industry.count /
                  max) *
                  100,
              );

            return (
              <div
                key={industry.name}
                style={accentStyle(
                  industry.color,
                )}
                className={[
                  "rounded-xl border border-transparent px-3 py-2.5",
                  "transition-all duration-200",
                  "hover:-translate-y-[1px]",
                  "hover:bg-[var(--report-item-hover-bg)]",
                  "hover:border-[var(--report-item-border)]",
                  "hover:shadow-[var(--report-item-shadow)]",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      color:
                        industry.color,
                      backgroundColor:
                        getIconBackground(
                          industry.color,
                        ),
                      borderColor:
                        softBorder(
                          industry.color,
                        ),
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold"
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        style={{
                          color:
                            THEME.foreground,
                        }}
                        className="truncate text-[11px] font-medium"
                      >
                        {
                          industry.name
                        }
                      </span>

                      <span
                        style={{
                          color:
                            industry.color,
                        }}
                        className="text-[10px] font-bold"
                      >
                        {
                          industry.count
                        }
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor:
                          "var(--report-chart-track)",
                      }}
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          backgroundColor:
                            industry.color,
                          boxShadow: `0 0 10px ${softGlow(
                            industry.color,
                          )}`,
                        }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>
    </Card>
  );
}

function PipelineChart({
  pipeline,
}: {
  pipeline: {
    name: string;
    count: number;
    color: string;
  }[];
}) {
  const max = Math.max(
    ...pipeline.map(
      (item) => item.count,
    ),
    1,
  );

  return (
    <Card
      className="p-5"
      accentColor={RED}
    >
      <SectionHeader
        title="Pipeline"
        color={RED}
      />

      <div className="space-y-2">
        {pipeline.map((stage) => {
          const percentage =
            Math.round(
              (stage.count / max) *
                100,
            );

          return (
            <div
              key={stage.name}
              style={accentStyle(
                stage.color,
              )}
              className={[
                "rounded-xl border border-transparent px-3 py-2",
                "transition-all duration-200",
                "hover:-translate-y-[1px]",
                "hover:bg-[var(--report-item-hover-bg)]",
                "hover:border-[var(--report-item-border)]",
                "hover:shadow-[var(--report-item-shadow)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  style={{
                    color:
                      THEME.foreground,
                  }}
                  className="text-[11px]"
                >
                  {stage.name}
                </span>

                <span
                  style={{
                    color:
                      THEME.muted,
                  }}
                  className="text-[10px]"
                >
                  {stage.count}
                </span>
              </div>

              <div
                style={{
                  backgroundColor:
                    "var(--report-chart-track)",
                }}
                className="mt-1.5 h-2 overflow-hidden rounded-full"
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    backgroundColor:
                      stage.color,
                    boxShadow: `0 0 12px ${softGlow(
                      stage.color,
                    )}`,
                  }}
                  className="h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* =========================================================
   HIGH-TECH CONVERSION FUNNEL
========================================================= */

function Funnel({
  stages,
}: {
  stages: {
    name: string;
    count: number;
    color: string;
  }[];
}) {
  const total =
    stages[0]?.count || 0;

  return (
    <Card
      className="min-h-[390px] p-5"
      accentColor={GREEN}
    >
      <SectionHeader
        title="Conversion Funnel"
        color={GREEN}
        action={
          <span
            style={{
              color: GREEN,
              backgroundColor:
                getIconBackground(
                  GREEN,
                ),
              borderColor:
                softBorder(GREEN),
            }}
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
          >
            Live Funnel
          </span>
        }
      />

      <div className="space-y-2">
        {stages.map(
          (stage, index) => {
            const percentage =
              total > 0
                ? Math.round(
                    (stage.count /
                      total) *
                      100,
                  )
                : 0;

            const previous =
              index > 0
                ? stages[index - 1]
                    .count
                : stage.count;

            const stageConversion =
              previous > 0
                ? Math.round(
                    (stage.count /
                      previous) *
                      100,
                  )
                : 0;

            /*
             * Creates the actual funnel shape
             * rather than simply rendering bars.
             */
            const width =
              total > 0
                ? Math.max(
                    38,
                    Math.round(
                      (stage.count /
                        total) *
                        100,
                    ),
                  )
                : 38;

            return (
              <div
                key={stage.name}
                className="group/funnel"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor:
                          stage.color,
                        boxShadow: `0 0 10px ${softGlow(
                          stage.color,
                        )}`,
                      }}
                      className="h-2 w-2 rounded-full"
                    />

                    <span
                      style={{
                        color:
                          THEME.foreground,
                      }}
                      className="text-[10px] font-medium"
                    >
                      {stage.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        color:
                          THEME.muted,
                      }}
                      className="text-[8px]"
                    >
                      {percentage}% of
                      leads
                    </span>

                    <span
                      style={{
                        color:
                          stage.color,
                      }}
                      className="text-[11px] font-bold"
                    >
                      {stage.count}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div
                    style={{
                      width: `${width}%`,
                      background:
                        `linear-gradient(90deg, ${softBackground(
                          stage.color,
                        )}, ${getIconBackground(
                          stage.color,
                        )})`,
                      borderColor:
                        softBorder(
                          stage.color,
                        ),
                      boxShadow: `0 8px 22px ${softGlow(
                        stage.color,
                      )}`,
                    }}
                    className={[
                      "relative flex h-10 items-center justify-center overflow-hidden rounded-xl border",
                      "transition-all duration-300",
                      "group-hover/funnel:-translate-y-[1px]",
                    ].join(" ")}
                  >
                    <div
                      style={{
                        backgroundColor:
                          stage.color,
                      }}
                      className="absolute left-0 top-0 h-full w-1 opacity-80"
                    />

                    <span
                      style={{
                        color:
                          stage.color,
                      }}
                      className="text-[10px] font-bold"
                    >
                      {stage.count} leads
                    </span>

                    <div
                      style={{
                        backgroundColor:
                          stage.color,
                      }}
                      className="absolute bottom-0 left-0 h-[2px] opacity-70"
                    />
                  </div>
                </div>

                {index <
                  stages.length -
                    1 && (
                  <div className="flex h-6 items-center justify-center">
                    <div
                      style={{
                        backgroundColor:
                          THEME.border,
                      }}
                      className="relative h-full w-px"
                    >
                      <div
                        style={{
                          color:
                            THEME.mutedDeep,
                          backgroundColor:
                            THEME.panel,
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 text-[7px]"
                      >
                        {stageConversion}
                        % →
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      <div
        style={{
          backgroundColor:
            THEME.inner,
          borderColor:
            THEME.border,
        }}
        className="mt-5 flex items-center justify-between rounded-xl border px-3 py-3"
      >
        <div className="flex items-center gap-2">
          <IconBox
            color={GREEN}
            size="sm"
          >
            <Sparkles size={13} />
          </IconBox>

          <div>
            <div
              style={{
                color:
                  THEME.foreground,
              }}
              className="text-[10px] font-semibold"
            >
              Overall Conversion
            </div>

            <div
              style={{
                color:
                  THEME.muted,
              }}
              className="text-[8px]"
            >
              Leads converted to
              won
            </div>
          </div>
        </div>

        <span
          style={{
            color: GREEN,
          }}
          className="text-lg font-bold"
        >
          {total > 0
            ? Math.round(
                ((stages.find(
                  (stage) =>
                    stage.name ===
                    "Won",
                )?.count || 0) /
                  total) *
                  100,
              )
            : 0}
          %
        </span>
      </div>
    </Card>
  );
}

function Modal({
  title,
  children,
  onClose,
  accentColor = PURPLE,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  accentColor?: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <div
        style={{
          backgroundColor:
            THEME.panel,
          borderColor:
            THEME.border,
          boxShadow:
            "var(--report-modal-shadow)",
        }}
        className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border"
      >
        <div
          style={{
            borderColor:
              THEME.border,
            backgroundColor:
              THEME.elevated,
          }}
          className="flex items-center justify-between border-b px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <IconBox
              color={accentColor}
              size="sm"
            >
              <FileBarChart size={15} />
            </IconBox>

            <h2
              style={{
                color:
                  THEME.foreground,
              }}
              className="text-sm font-semibold"
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              ...accentStyle(RED),
              color: RED,
              borderColor:
                softBorder(RED),
              backgroundColor:
                getIconBackground(RED),
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--report-item-shadow)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-[calc(85vh-73px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [isLightMode, setIsLightMode] =
    useState(false);

  const { can: canUsePlan } = usePlan();

  const [activeTab, setActiveTab] =
    useState<ReportTab>("Overview");

  const [period, setPeriod] =
    useState<Period>("All Time");

  const [
    locationFilter,
    setLocationFilter,
  ] = useState("All Locations");

  const [
    showLocationMenu,
    setShowLocationMenu,
  ] = useState(false);

  const [
    showPeriodMenu,
    setShowPeriodMenu,
  ] = useState(false);

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [outreach, setOutreach] =
    useState<OutreachRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [modal, setModal] =
    useState<ModalType>(null);

  const [
    selectedLead,
    setSelectedLead,
  ] = useState<Lead | null>(null);

  const [toast, setToast] =
    useState("");

  useEffect(() => {
    const updateTheme = () => {
      setIsLightMode(
        document.documentElement.classList.contains(
          "baselead-light",
        ),
      );
    };

    updateTheme();

    const observer =
      new MutationObserver(
        updateTheme,
      );

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["class"],
      },
    );

    return () =>
      observer.disconnect();
  }, []);

  const reportThemeVars = useMemo(
    () =>
      ({
        "--report-page-bg":
          isLightMode
            ? "#F5F5F7"
            : PAGE_BG,

        "--report-hero-bg":
          isLightMode
            ? "#FFFFFF"
            : HERO_BG,

        "--report-foreground":
          isLightMode
            ? "#171717"
            : "#FFFFFF",

        "--report-panel":
          isLightMode
            ? "#FFFFFF"
            : PANEL,

        "--report-elevated":
          isLightMode
            ? "#FFFFFF"
            : ELEVATED,

        "--report-inner":
          isLightMode
            ? "#F8F8FA"
            : INNER,

        "--report-border":
          isLightMode
            ? "#E3E3E8"
            : BORDER,

        "--report-border-light":
          isLightMode
            ? "#D5D5DB"
            : BORDER_LIGHT,

        "--report-muted":
          isLightMode
            ? "#6B6B73"
            : MUTED,

        "--report-muted-dark":
          isLightMode
            ? "#55555D"
            : MUTED_DARK,

        "--report-muted-deep":
          isLightMode
            ? "#85858D"
            : MUTED_DEEP,

        "--report-progress":
          isLightMode
            ? "#ECECF0"
            : PROGRESS,

        "--report-chart-track":
          isLightMode
            ? "#E8E8EC"
            : BORDER,

        "--report-hover-bg":
          isLightMode
            ? "#FAFAFB"
            : ELEVATED,

        "--report-hover-border":
          isLightMode
            ? "#C9C9D1"
            : BORDER_LIGHT,

        "--report-card-shadow":
          isLightMode
            ? "0 8px 24px rgba(18,18,24,0.06), 0 2px 6px rgba(18,18,24,0.04)"
            : "0 10px 30px rgba(0,0,0,0.16)",

        "--report-hover-shadow":
          isLightMode
            ? "0 18px 42px rgba(18,18,24,0.12), 0 4px 12px rgba(18,18,24,0.05)"
            : "0 16px 38px rgba(0,0,0,0.28)",

        "--report-small-hover-shadow":
          isLightMode
            ? "0 8px 20px rgba(18,18,24,0.08)"
            : "0 10px 24px rgba(0,0,0,0.18)",

        "--report-icon-hover-shadow":
          isLightMode
            ? "0 8px 20px rgba(18,18,24,0.10)"
            : "0 0 18px rgba(245,197,24,0.08)",

        "--report-modal-shadow":
          isLightMode
            ? "0 28px 80px rgba(18,18,24,0.22)"
            : "0 24px 70px rgba(0,0,0,0.55)",

        "--report-icon-gold-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[GOLD]
            : DARK_ICON_SURFACES[GOLD],

        "--report-icon-purple-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[
                PURPLE
              ]
            : DARK_ICON_SURFACES[
                PURPLE
              ],

        "--report-icon-red-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[RED]
            : DARK_ICON_SURFACES[RED],

        "--report-icon-green-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[
                GREEN
              ]
            : DARK_ICON_SURFACES[
                GREEN
              ],

        "--report-icon-blue-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[
                BLUE
              ]
            : DARK_ICON_SURFACES[
                BLUE
              ],

        "--report-icon-neutral-bg":
          isLightMode
            ? "#F5F5F7"
            : "#171717",

        "--report-hover-gold-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[GOLD]
            : DARK_ICON_SURFACES[GOLD],

        "--report-hover-purple-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[
                PURPLE
              ]
            : DARK_ICON_SURFACES[
                PURPLE
              ],

        "--report-hover-red-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[RED]
            : DARK_ICON_SURFACES[RED],

        "--report-hover-green-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[
                GREEN
              ]
            : DARK_ICON_SURFACES[
                GREEN
              ],

        "--report-hover-blue-bg":
          isLightMode
            ? LIGHT_ICON_SURFACES[
                BLUE
              ]
            : DARK_ICON_SURFACES[
                BLUE
              ],
      }) as CSSProperties,
    [isLightMode],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user || cancelled) {
        if (!cancelled) {
          setLoading(false);
        }

        return;
      }

      const [
        leadResult,
        outreachResult,
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", {
            ascending: false,
          }),

        supabase
          .from("outreach")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (!cancelled) {
        setLeads(
          (leadResult.data ||
            []) as Lead[],
        );

        setOutreach(
          (outreachResult.data ||
            []) as OutreachRecord[],
        );

        setLoading(false);
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout =
      window.setTimeout(() => {
        setToast("");
      }, 3000);

    return () =>
      window.clearTimeout(timeout);
  }, [toast]);

  const locations = useMemo(() => {
    const unique = new Set<string>();

    leads.forEach((lead) => {
      const location =
        getLeadLocation(lead);

      if (
        location &&
        location !==
          "Unknown location"
      ) {
        unique.add(location);
      }
    });

    return [
      "All Locations",
      ...Array.from(unique).sort(),
    ];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const limit =
      getDateLimit(period);

    return leads.filter((lead) => {
      const matchesLocation =
        locationFilter ===
          "All Locations" ||
        getLeadLocation(lead) ===
          locationFilter;

      const createdAt =
        lead.created_at
          ? new Date(
              lead.created_at,
            )
          : null;

      const matchesPeriod =
        !limit ||
        !createdAt ||
        Number.isNaN(
          createdAt.getTime(),
        )
          ? !limit ||
            !createdAt ||
            Number.isNaN(
              createdAt.getTime(),
            )
          : createdAt >= limit;

      return (
        matchesLocation &&
        matchesPeriod
      );
    });
  }, [
    leads,
    locationFilter,
    period,
  ]);

  const totalLeads =
    filteredLeads.length;

  const highOpportunity =
    filteredLeads.filter(
      (lead) =>
        getScore(lead) >= 80,
    ).length;

  const contacted =
    filteredLeads.filter((lead) => {
      const stage =
        getStage(lead);

      return [
        "Contacted",
        "Qualified",
        "Proposal",
        "Won",
      ].includes(stage);
    }).length;

  const qualified =
    filteredLeads.filter(
      (lead) =>
        [
          "Qualified",
          "Proposal",
          "Won",
        ].includes(
          getStage(lead),
        ),
    ).length;

  const won =
    filteredLeads.filter(
      (lead) =>
        getStage(lead) === "Won",
    ).length;

  const conversionRate =
    totalLeads > 0
      ? (won / totalLeads) * 100
      : 0;

  const pipelineValue =
    filteredLeads.reduce(
      (sum, lead) =>
        sum +
        estimateLeadValue(
          lead as unknown as Record<string, unknown>,
          getScore(lead),
        ),
      0,
    );


  const sources = useMemo(() => {
    const counts =
      new Map<string, number>();

    filteredLeads.forEach(
      (lead) => {
        const source =
          lead.source ||
          "Unknown";

        counts.set(
          source,
          (counts.get(source) ||
            0) + 1,
        );
      },
    );

    return Array.from(
      counts.entries(),
    )
      .sort(
        (a, b) => b[1] - a[1],
      )
      .map(
        (
          [name, count],
          index,
        ) => ({
          name,
          count,
          color:
            DASHBOARD_COLORS[
              index %
                DASHBOARD_COLORS.length
            ],
        }),
      );
  }, [filteredLeads]);

  const industries =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      filteredLeads.forEach(
        (lead) => {
          const industry =
            getLeadCategory(
              lead,
            );

          counts.set(
            industry,
            (counts.get(
              industry,
            ) || 0) + 1,
          );
        },
      );

      return Array.from(
        counts.entries(),
      )
        .sort(
          (a, b) => b[1] - a[1],
        )
        .slice(0, 8)
        .map(
          (
            [name, count],
            index,
          ) => ({
            name,
            count,
            color:
              DASHBOARD_COLORS[
                index %
                  DASHBOARD_COLORS.length
              ],
          }),
        );
    }, [filteredLeads]);

  const pipeline = useMemo(() => {
    const stages = [
      {
        name: "New Leads",
        color: GOLD,
      },
      {
        name: "Contacted",
        color: BLUE,
      },
      {
        name: "Qualified",
        color: GREEN,
      },
      {
        name: "Proposal",
        color: PURPLE,
      },
      {
        name: "Won",
        color: RED,
      },
    ];

    return stages.map(
      (stage) => ({
        ...stage,
        count:
          stage.name ===
          "New Leads"
            ? filteredLeads.filter(
                (lead) =>
                  getStage(
                    lead,
                  ) ===
                  "New Lead",
              ).length
            : filteredLeads.filter(
                (lead) =>
                  getStage(
                    lead,
                  ) ===
                  stage.name,
              ).length,
      }),
    );
  }, [filteredLeads]);

  const funnel = [
    {
      name: "All Leads",
      count: totalLeads,
      color: GOLD,
    },
    {
      name: "Contacted",
      count: contacted,
      color: BLUE,
    },
    {
      name: "Qualified",
      count: qualified,
      color: GREEN,
    },
    {
      name: "Won",
      count: won,
      color: RED,
    },
  ];

  const topOpportunities =
    useMemo(
      () =>
        [...filteredLeads]
          .sort(
            (a, b) =>
              getScore(b) -
              getScore(a),
          )
          .slice(0, 5),
      [filteredLeads],
    );

  const reportRows = useMemo(
    () =>
      filteredLeads.map(
        (lead) => ({
          Company:
            lead.company ||
            lead.name ||
            "",
          Category:
            getLeadCategory(lead),
          Location:
            getLeadLocation(lead),
          Score: getScore(lead),
          Stage: getStage(lead),
          Source:
            lead.source || "",
          Created:
            lead.created_at || "",
          Updated:
            lead.updated_at || "",
        }),
      ),
    [filteredLeads],
  );

  // CSV export is part of Advanced reports (Pro/Scale).
  const exportRows = (
    filename: string,
    rows: Record<string, unknown>[],
  ) => {
    if (!canUsePlan("advanced_reports")) {
      setToast(
        "CSV export is available on the Pro and Scale plans.",
      );
      return;
    }

    downloadCSV(filename, rows);

    setToast(
      rows.length
        ? "Report exported successfully."
        : "There is no data to export.",
    );
  };

  const handleExport = () =>
    exportRows(
      "baselead-leads-report.csv",
      reportRows,
    );

  const exportPipelineReport = () => {
    const counts = new Map<string, { leads: number; value: number }>();

    for (const lead of filteredLeads) {
      const stage = getStage(lead);
      const current = counts.get(stage) ?? { leads: 0, value: 0 };
      current.leads += 1;
      current.value += estimateLeadValue(
        lead as unknown as Record<string, unknown>,
        getScore(lead),
      );
      counts.set(stage, current);
    }

    exportRows(
      "baselead-pipeline-report.csv",
      [...counts.entries()].map(([stage, item]) => ({
        Stage: stage,
        Leads: item.leads,
        "Share %": filteredLeads.length
          ? ((item.leads / filteredLeads.length) * 100).toFixed(1)
          : "0",
        "Estimated value (USD)": item.value,
      })),
    );
  };

  const exportRevenueReport = () =>
    exportRows(
      "baselead-revenue-report.csv",
      filteredLeads.map((lead) => ({
        Lead: lead.company || lead.name || "",
        Stage: getStage(lead),
        Score: getScore(lead),
        "Estimated value (USD)": estimateLeadValue(
          lead as unknown as Record<string, unknown>,
          getScore(lead),
        ),
      })),
    );

  const exportOutreachReport = () =>
    exportRows(
      "baselead-outreach-report.csv",
      outreach.map((item) => ({
        Campaign: item.campaign ?? "",
        Subject: item.subject ?? "",
        Status: item.status ?? "",
        Created: item.created_at ?? "",
        Sent: item.sent_at ?? "",
        Replied: item.replied_at ?? "",
        "Next step": item.next_step ?? "",
      })),
    );

  const renderLeadRow = (
    lead: Lead,
    index: number,
  ) => {
    const score =
      getScore(lead);

    const scoreColor =
      getScoreColor(score);

    return (
      <button
        key={
          lead.id ||
          `${lead.company}-${index}`
        }
        type="button"
        onClick={() =>
          setSelectedLead(lead)
        }
        style={accentStyle(
          scoreColor,
        )}
        className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
      >
        <LeadAvatar
          lead={lead}
          color={scoreColor}
        />

        <div className="min-w-0 flex-1">
          <div
            style={{
              color:
                THEME.foreground,
            }}
            className="truncate text-xs font-semibold"
          >
            {lead.company ||
              lead.name ||
              "Unnamed Lead"}
          </div>

          <div
            style={{
              color: THEME.muted,
            }}
            className="mt-0.5 truncate text-[10px]"
          >
            {getLeadCategory(
              lead,
            )}{" "}
            ·{" "}
            {getLeadLocation(
              lead,
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            style={{
              color: scoreColor,
            }}
            className="text-sm font-semibold"
          >
            {score}
          </div>

          <div
            style={{
              color: THEME.muted,
            }}
            className="text-[9px]"
          >
            score
          </div>
        </div>
      </button>
    );
  };

  const renderOverview = () => (
    <div className="space-y-5">
      {/* =====================================================
          METRIC COMMAND CENTER
      ====================================================== */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <KpiCard
          title="Total Leads"
          value={String(
            totalLeads,
          )}
          subtitle="From your database"
          accentColor={GOLD}
          progress={
            totalLeads > 0
              ? Math.min(
                  100,
                  totalLeads,
                )
              : 0
          }
          icon={
            <Users size={17} />
          }
        />

        <KpiCard
          title="High-Opportunity"
          value={String(
            highOpportunity,
          )}
          subtitle="Score 80+"
          accentColor={RED}
          progress={
            totalLeads > 0
              ? (highOpportunity /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Star size={17} />
          }
        />

        <KpiCard
          title="Contacted"
          value={String(
            contacted,
          )}
          subtitle="Current pipeline"
          accentColor={BLUE}
          progress={
            totalLeads > 0
              ? (contacted /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Send size={17} />
          }
        />

        <KpiCard
          title="Qualified"
          value={String(
            qualified,
          )}
          subtitle="Current pipeline"
          accentColor={GREEN}
          progress={
            totalLeads > 0
              ? (qualified /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Target size={17} />
          }
        />

        <KpiCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(
            1,
          )}%`}
          subtitle="Won / total leads"
          accentColor={GREEN}
          progress={
            conversionRate
          }
          icon={
            <Trophy size={17} />
          }
        />

        <KpiCard
          title="Pipeline Value"
          value={currency(
            pipelineValue,
          )}
          subtitle="Estimated opportunity"
          accentColor={GOLD}
          progress={
            totalLeads > 0
              ? Math.min(
                  100,
                  (pipelineValue /
                    Math.max(
                      totalLeads *
                        10000,
                      1,
                    )) *
                    100,
                )
              : 0
          }
          icon={
            <span className="text-base font-bold">
              $
            </span>
          }
        />
      </div>

      {/* =====================================================
          SOURCE + INDUSTRY ANALYTICS
      ====================================================== */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <SourceDonut
          sources={sources}
        />

        <IndustryChart
          industries={industries}
        />
      </div>

      {/* =====================================================
          PIPELINE + FUNNEL
      ====================================================== */}
      <div className="grid gap-5 xl:grid-cols-2">
        <PipelineChart
          pipeline={pipeline}
        />

        <Funnel
          stages={funnel}
        />
      </div>

      <Card
        className="p-5"
        accentColor={PURPLE}
      >
        <SectionHeader
          title="Top Opportunities"
          color={PURPLE}
          action={
            <button
              type="button"
              onClick={() =>
                setModal(
                  "opportunities",
                )
              }
              style={{
                ...accentStyle(
                  PURPLE,
                ),
                color: PURPLE,
                borderColor:
                  softBorder(
                    PURPLE,
                  ),
                backgroundColor:
                  getIconBackground(
                    PURPLE,
                  ),
              }}
              className="rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--report-item-shadow)]"
            >
              View All
            </button>
          }
        />

        <div className="space-y-2">
          {topOpportunities.length ? (
            topOpportunities.map(
              (
                lead,
                index,
              ) =>
                renderLeadRow(
                  lead,
                  index,
                ),
            )
          ) : (
            <div
              style={{
                color:
                  THEME.muted,
              }}
              className="rounded-xl py-8 text-center text-xs"
            >
              No opportunities
              found for this
              period.
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderLeads = () => (
    <div className="space-y-5">
      <Card
        className="p-5"
        accentColor={PURPLE}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3
              style={{
                color:
                  THEME.foreground,
              }}
              className="text-sm font-semibold"
            >
              Lead Performance
            </h3>

            <p
              style={{
                color:
                  THEME.muted,
              }}
              className="mt-1 text-[10px]"
            >
              Review the leads
              currently included
              in this report.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setModal("leads")
            }
            style={{
              ...accentStyle(
                PURPLE,
              ),
              color: PURPLE,
              backgroundColor:
                getIconBackground(
                  PURPLE,
                ),
              borderColor:
                softBorder(
                  PURPLE,
                ),
            }}
            className="rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--report-item-shadow)]"
          >
            View All
          </button>
        </div>

        <div className="space-y-1">
          {filteredLeads
            .slice(0, 12)
            .map(renderLeadRow)}

          {!filteredLeads.length && (
            <div
              style={{
                color:
                  THEME.muted,
              }}
              className="py-10 text-center text-xs"
            >
              No leads match the
              selected filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderOutreach = () => {
    const recentOutreach =
      outreach.slice(0, 12);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            title="Outreach Records"
            value={String(
              outreach.length,
            )}
            subtitle="All outreach activity"
            accentColor={PURPLE}
            progress={
              outreach.length
                ? 100
                : 0
            }
            icon={
              <Mail size={17} />
            }
          />

          <KpiCard
            title="Contacted Leads"
            value={String(
              contacted,
            )}
            subtitle="Current pipeline"
            accentColor={BLUE}
            progress={
              totalLeads
                ? (contacted /
                    totalLeads) *
                  100
                : 0
            }
            icon={
              <Send size={17} />
            }
          />

          <KpiCard
            title="Qualified"
            value={String(
              qualified,
            )}
            subtitle="Moved forward"
            accentColor={GREEN}
            progress={
              totalLeads
                ? (qualified /
                    totalLeads) *
                  100
                : 0
            }
            icon={
              <Check size={17} />
            }
          />

          <KpiCard
            title="Conversion"
            value={`${conversionRate.toFixed(
              1,
            )}%`}
            subtitle="Won / total leads"
            accentColor={RED}
            progress={
              conversionRate
            }
            icon={
              <Target size={17} />
            }
          />
        </div>

        <Card
          className="p-5"
          accentColor={PURPLE}
        >
          <SectionHeader
            title="Recent Outreach"
            color={PURPLE}
          />

          <div className="space-y-1">
            {recentOutreach.length ? (
              recentOutreach.map(
                (
                  record,
                  index,
                ) => {
                  const rawStatus =
                    String(
                      record.status ||
                        record.state ||
                        record.type ||
                        "Sent",
                    );

                  const color =
                    getStatusColor(
                      rawStatus,
                    );

                  const company =
                    String(
                      record.company ||
                        record.lead_company ||
                        record.name ||
                        "Lead",
                    );

                  const channel =
                    String(
                      record.channel ||
                        record.method ||
                        record.type ||
                        "Outreach",
                    );

                  return (
                    <div
                      key={`${company}-${index}`}
                      style={accentStyle(
                        color,
                      )}
                      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                    >
                      <IconBox
                        color={color}
                        size="sm"
                      >
                        <Mail
                          size={14}
                        />
                      </IconBox>

                      <div className="min-w-0 flex-1">
                        <div
                          style={{
                            color:
                              THEME.foreground,
                          }}
                          className="truncate text-xs font-medium"
                        >
                          {company}
                        </div>

                        <div
                          style={{
                            color:
                              THEME.muted,
                          }}
                          className="mt-0.5 truncate text-[10px]"
                        >
                          {channel}
                        </div>
                      </div>

                      <span
                        style={{
                          color,
                          backgroundColor:
                            getIconBackground(
                              color,
                            ),
                          borderColor:
                            softBorder(
                              color,
                            ),
                        }}
                        className="rounded-full border px-2.5 py-1 text-[9px] font-semibold"
                      >
                        {rawStatus}
                      </span>
                    </div>
                  );
                },
              )
            ) : (
              <div
                style={{
                  color:
                    THEME.muted,
                }}
                className="py-10 text-center text-xs"
              >
                No outreach activity
                found.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderPipeline = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Pipeline Leads"
          value={String(
            totalLeads,
          )}
          subtitle="Active report scope"
          accentColor={GOLD}
          progress={
            totalLeads
              ? 100
              : 0
          }
          icon={
            <BarChart3 size={17} />
          }
        />

        <KpiCard
          title="Qualified"
          value={String(
            qualified,
          )}
          subtitle="Qualified or later"
          accentColor={GREEN}
          progress={
            totalLeads
              ? (qualified /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Target size={17} />
          }
        />

        <KpiCard
          title="Won"
          value={String(won)}
          subtitle="Closed won"
          accentColor={GREEN}
          progress={
            totalLeads
              ? (won /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Trophy size={17} />
          }
        />

        <KpiCard
          title="Conversion"
          value={`${conversionRate.toFixed(
            1,
          )}%`}
          subtitle="Won / total leads"
          accentColor={RED}
          progress={
            conversionRate
          }
          icon={
            <Check size={17} />
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <PipelineChart
          pipeline={pipeline}
        />

        <Funnel
          stages={funnel}
        />
      </div>
    </div>
  );

  const renderRevenue = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          title="Estimated Pipeline"
          value={currency(
            pipelineValue,
          )}
          subtitle="Based on opportunity scores"
          accentColor={GOLD}
          progress={
            totalLeads
              ? Math.min(
                  100,
                  (pipelineValue /
                    Math.max(
                      totalLeads *
                        10000,
                      1,
                    )) *
                    100,
                )
              : 0
          }
          icon={
            <span className="text-base font-bold">
              $
            </span>
          }
        />

        <KpiCard
          title="High-Opportunity"
          value={String(
            highOpportunity,
          )}
          subtitle="Score 80+"
          accentColor={RED}
          progress={
            totalLeads
              ? (highOpportunity /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Star size={17} />
          }
        />

        <KpiCard
          title="Won Leads"
          value={String(won)}
          subtitle="Closed won"
          accentColor={GREEN}
          progress={
            totalLeads
              ? (won /
                  totalLeads) *
                100
              : 0
          }
          icon={
            <Trophy size={17} />
          }
        />
      </div>

      <Card
        className="p-5"
        accentColor={GOLD}
      >
        <SectionHeader
          title="Revenue Overview"
          color={GOLD}
        />

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label:
                "Estimated Pipeline",
              value:
                currency(
                  pipelineValue,
                ),
              color: GOLD,
            },
            {
              label:
                "Average Opportunity",
              value:
                totalLeads > 0
                  ? currency(
                      pipelineValue /
                        totalLeads,
                    )
                  : "$0",
              color: BLUE,
            },
            {
              label:
                "Estimated Won Value",
              value: currency(
                won * 10000,
              ),
              color: GREEN,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={accentStyle(
                item.color,
              )}
              className="rounded-xl border border-transparent p-4 transition-all duration-200 hover:-translate-y-[2px] hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
            >
              <div
                style={{
                  color:
                    THEME.muted,
                }}
                className="text-[10px]"
              >
                {item.label}
              </div>

              <div
                style={{
                  color:
                    item.color,
                }}
                className="mt-2 text-xl font-semibold"
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderCustomReports =
    () => {
      const customReports = [
        {
          name: "Lead Performance",
          onExport: handleExport,
          description:
            "Export lead scores, stages, sources, and locations.",
          color: PURPLE,
          icon: (
            <Users size={17} />
          ),
        },
        {
          name: "Pipeline Report",
          onExport: exportPipelineReport,
          description:
            "Export the current pipeline distribution.",
          color: RED,
          icon: (
            <BarChart3 size={17} />
          ),
        },
        {
          name: "Revenue Report",
          onExport: exportRevenueReport,
          description:
            "Export estimated opportunity and revenue data.",
          color: GOLD,
          icon: (
            <span className="font-bold">
              $
            </span>
          ),
        },
        {
          name: "Outreach Report",
          onExport: exportOutreachReport,
          description:
            "Export available outreach activity records.",
          color: BLUE,
          icon: <Mail size={17} />,
        },
      ];

      return (
        <div className="grid gap-5 md:grid-cols-2">
          {customReports.map(
            (report) => (
              <Card
                key={report.name}
                className="p-5"
                accentColor={
                  report.color
                }
              >
                <div className="flex items-start gap-3">
                  <IconBox
                    color={
                      report.color
                    }
                    size="lg"
                  >
                    {report.icon}
                  </IconBox>

                  <div className="min-w-0 flex-1">
                    <h3
                      style={{
                        color:
                          THEME.foreground,
                      }}
                      className="text-sm font-semibold"
                    >
                      {report.name}
                    </h3>

                    <p
                      style={{
                        color:
                          THEME.muted,
                      }}
                      className="mt-1 text-[10px] leading-5"
                    >
                      {
                        report.description
                      }
                    </p>

                    <button
                      type="button"
                      onClick={
                        report.onExport
                      }
                      style={{
                        ...accentStyle(
                          report.color,
                        ),
                        color:
                          report.color,
                        backgroundColor:
                          getIconBackground(
                            report.color,
                          ),
                        borderColor:
                          softBorder(
                            report.color,
                          ),
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-semibold transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--report-item-shadow)]"
                    >
                      <Download
                        size={13}
                      />
                      Export
                    </button>
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      );
    };

  const renderTab = () => {
    const feature = TAB_FEATURE[activeTab];

    if (!canUsePlan(feature)) {
      return (
        <PlanGate
          feature={feature}
          title={`${activeTab} reports are not included in your plan`}
          description={
            feature === "custom_reports"
              ? "Custom reports are available on the Scale plan."
              : "Pipeline and revenue analytics are available on the Pro and Scale plans."
          }
        >
          {null}
        </PlanGate>
      );
    }

    switch (activeTab) {
      case "Leads":
        return renderLeads();

      case "Outreach":
        return renderOutreach();

      case "Pipeline":
        return renderPipeline();

      case "Revenue":
        return renderRevenue();

      case "Custom Reports":
        return renderCustomReports();

      case "Overview":
      default:
        return renderOverview();
    }
  };

  return (
    <div
      style={reportThemeVars}
      className="min-h-full w-full transition-colors duration-200"
    >
      <div
        style={{
          backgroundColor:
            THEME.background,
          color:
            THEME.foreground,
        }}
        className="min-h-screen w-full px-4 py-5 sm:px-6 lg:px-8"
      >
        <div className="mx-auto w-full max-w-[1800px]">
          <header
            style={{
              backgroundColor:
                THEME.hero,
              borderColor:
                THEME.border,
              boxShadow:
                "var(--report-card-shadow)",
            }}
            className="rounded-2xl border p-5 sm:p-6"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    style={{
                      color:
                        THEME.foreground,
                    }}
                    className="text-2xl font-semibold tracking-tight"
                  >
                    Reports
                  </h1>

                  <span
                    style={{
                      color: GOLD,
                      backgroundColor:
                        getIconBackground(
                          GOLD,
                        ),
                      borderColor:
                        softBorder(GOLD),
                    }}
                    className="rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide"
                  >
                    Insights
                  </span>
                </div>

                <p
                  style={{
                    color:
                      THEME.muted,
                  }}
                  className="mt-1.5 text-xs"
                >
                  Track performance,
                  analyze trends,
                  and optimize
                  your lead
                  generation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowLocationMenu(
                        (value) =>
                          !value,
                      )
                    }
                    style={{
                      ...accentStyle(
                        GOLD,
                      ),
                      backgroundColor:
                        THEME.panel,
                      color:
                        THEME.foreground,
                    }}
                    className="flex h-9 items-center gap-2 rounded-xl border border-[var(--report-border)] px-3 text-[10px] font-medium transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                  >
                    <MapPin
                      size={13}
                      color={GOLD}
                    />

                    <span>
                      {
                        locationFilter
                      }
                    </span>

                    <ChevronDown
                      size={12}
                    />
                  </button>

                  {showLocationMenu && (
                    <div
                      style={{
                        backgroundColor:
                          THEME.panel,
                        borderColor:
                          THEME.border,
                        boxShadow:
                          "var(--report-hover-shadow)",
                      }}
                      className="absolute right-0 top-11 z-50 max-h-64 w-56 overflow-auto rounded-xl border p-1"
                    >
                      {locations.map(
                        (
                          location,
                        ) => {
                          const selected =
                            location ===
                            locationFilter;

                          return (
                            <button
                              type="button"
                              key={
                                location
                              }
                              onClick={() => {
                                setLocationFilter(
                                  location,
                                );
                                setShowLocationMenu(
                                  false,
                                );
                              }}
                              style={accentStyle(
                                GOLD,
                              )}
                              className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-[10px] transition-all duration-200 hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                            >
                              <span
                                style={{
                                  color:
                                    selected
                                      ? GOLD
                                      : THEME.foreground,
                                }}
                              >
                                {
                                  location
                                }
                              </span>

                              {selected && (
                                <Check
                                  size={
                                    12
                                  }
                                  color={
                                    GOLD
                                  }
                                />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPeriodMenu(
                        (value) =>
                          !value,
                      )
                    }
                    style={{
                      ...accentStyle(
                        BLUE,
                      ),
                      backgroundColor:
                        THEME.panel,
                      color:
                        THEME.foreground,
                    }}
                    className="flex h-9 items-center gap-2 rounded-xl border border-[var(--report-border)] px-3 text-[10px] font-medium transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                  >
                    <CalendarDays
                      size={13}
                      color={BLUE}
                    />

                    <span>
                      {period}
                    </span>

                    <ChevronDown
                      size={12}
                    />
                  </button>

                  {showPeriodMenu && (
                    <div
                      style={{
                        backgroundColor:
                          THEME.panel,
                        borderColor:
                          THEME.border,
                        boxShadow:
                          "var(--report-hover-shadow)",
                      }}
                      className="absolute right-0 top-11 z-50 w-44 rounded-xl border p-1"
                    >
                      {(
                        [
                          "All Time",
                          "Last 7 Days",
                          "Last 30 Days",
                        ] as Period[]
                      ).map(
                        (
                          option,
                        ) => {
                          const selected =
                            option ===
                            period;

                          return (
                            <button
                              type="button"
                              key={
                                option
                              }
                              onClick={() => {
                                setPeriod(
                                  option,
                                );
                                setShowPeriodMenu(
                                  false,
                                );
                              }}
                              style={accentStyle(
                                GOLD,
                              )}
                              className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-[10px] transition-all duration-200 hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                            >
                              <span
                                style={{
                                  color:
                                    selected
                                      ? GOLD
                                      : THEME.foreground,
                                }}
                              >
                                {
                                  option
                                }
                              </span>

                              {selected && (
                                <Check
                                  size={
                                    12
                                  }
                                  color={
                                    GOLD
                                  }
                                />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    handleExport
                  }
                  style={{
                    ...accentStyle(
                      GOLD,
                    ),
                    color: "#171717",
                    backgroundColor:
                      GOLD,
                    borderColor: GOLD,
                  }}
                  className="flex h-9 items-center gap-2 rounded-xl border px-3 text-[10px] font-semibold transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--report-item-shadow)]"
                >
                  <Download
                    size={13}
                  />
                  Export Report
                </button>
              </div>
            </div>

            <div
              style={{
                borderColor:
                  THEME.border,
              }}
              className="mt-6 overflow-x-auto border-b"
            >
              <div className="flex min-w-max items-center gap-5">
                {tabs.map((tab) => {
                  const active =
                    activeTab === tab;

                  return (
                    <button
                      type="button"
                      key={tab}
                      onClick={() =>
                        setActiveTab(
                          tab,
                        )
                      }
                      style={{
                        ...accentStyle(
                          GOLD,
                        ),
                        color: active
                          ? GOLD
                          : THEME.muted,
                        borderColor:
                          active
                            ? GOLD
                            : "transparent",
                      }}
                      className={[
                        "relative border-b-2 pb-3 text-xs font-medium transition-all duration-200",
                        "hover:-translate-y-[1px]",
                        !active
                          ? "hover:text-[var(--report-foreground)] hover:border-[var(--report-item-border)]"
                          : "",
                      ].join(" ")}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              style={{
                color:
                  THEME.muted,
              }}
              className="text-[10px]"
            >
              {locationFilter}
            </span>

            <span
              style={{
                color:
                  THEME.mutedDeep,
              }}
              className="text-[10px]"
            >
              •
            </span>

            <span
              style={{
                color:
                  THEME.muted,
              }}
              className="text-[10px]"
            >
              {period}
            </span>
          </div>

          <main className="mt-5">
            {loading ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
                  {Array.from({
                    length: 6,
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor:
                            THEME.panel,
                          borderColor:
                            THEME.border,
                        }}
                        className="h-32 animate-pulse rounded-2xl border"
                      />
                    ),
                  )}
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div
                    style={{
                      backgroundColor:
                        THEME.panel,
                      borderColor:
                        THEME.border,
                    }}
                    className="h-96 animate-pulse rounded-2xl border"
                  />

                  <div
                    style={{
                      backgroundColor:
                        THEME.panel,
                      borderColor:
                        THEME.border,
                    }}
                    className="h-96 animate-pulse rounded-2xl border"
                  />
                </div>
              </div>
            ) : (
              renderTab()
            )}
          </main>
        </div>
      </div>

      {selectedLead && (
        <Modal
          title={
            selectedLead.company ||
            selectedLead.name ||
            "Lead"
          }
          onClose={() =>
            setSelectedLead(null)
          }
          accentColor={getScoreColor(
            getScore(
              selectedLead,
            ),
          )}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <LeadAvatar
                lead={selectedLead}
                color={getScoreColor(
                  getScore(
                    selectedLead,
                  ),
                )}
              />

              <div className="min-w-0">
                <h3
                  style={{
                    color:
                      THEME.foreground,
                  }}
                  className="truncate text-base font-semibold"
                >
                  {selectedLead.company ||
                    selectedLead.name ||
                    "Unnamed Lead"}
                </h3>

                <p
                  style={{
                    color:
                      THEME.muted,
                  }}
                  className="mt-0.5 text-[10px]"
                >
                  {getLeadLocation(
                    selectedLead,
                  )}
                </p>
              </div>

              <div className="ml-auto text-right">
                <div
                  style={{
                    color:
                      getScoreColor(
                        getScore(
                          selectedLead,
                        ),
                      ),
                  }}
                  className="text-2xl font-semibold"
                >
                  {getScore(
                    selectedLead,
                  )}
                </div>

                <div
                  style={{
                    color:
                      THEME.muted,
                  }}
                  className="text-[9px]"
                >
                  Opportunity Score
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Stage",
                  value:
                    getStage(
                      selectedLead,
                    ),
                  color: BLUE,
                },
                {
                  label: "Category",
                  value:
                    getLeadCategory(
                      selectedLead,
                    ),
                  color: PURPLE,
                },
                {
                  label: "Source",
                  value:
                    selectedLead.source ||
                    "Unknown",
                  color: PURPLE,
                },
                {
                  label: "Created",
                  value:
                    selectedLead.created_at
                      ? new Date(
                          selectedLead.created_at,
                        ).toLocaleDateString()
                      : "Unknown",
                  color: GOLD,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={accentStyle(
                    item.color,
                  )}
                  className="rounded-xl border border-transparent p-4 transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                >
                  <div
                    style={{
                      color:
                        THEME.muted,
                    }}
                    className="text-[9px] uppercase tracking-wide"
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      color:
                        THEME.foreground,
                    }}
                    className="mt-1 text-xs font-medium"
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {modal ===
        "opportunities" && (
        <Modal
          title="Top Opportunities"
          onClose={() =>
            setModal(null)
          }
          accentColor={PURPLE}
        >
          <div className="space-y-1">
            {topOpportunities.length ? (
              topOpportunities.map(
                renderLeadRow,
              )
            ) : (
              <div
                style={{
                  color:
                    THEME.muted,
                }}
                className="py-10 text-center text-xs"
              >
                No opportunities
                found.
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === "leads" && (
        <Modal
          title="All Leads"
          onClose={() =>
            setModal(null)
          }
          accentColor={PURPLE}
        >
          <div className="space-y-1">
            {filteredLeads.length ? (
              filteredLeads.map(
                renderLeadRow,
              )
            ) : (
              <div
                style={{
                  color:
                    THEME.muted,
                }}
                className="py-10 text-center text-xs"
              >
                No leads found.
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === "sources" && (
        <Modal
          title="Lead Sources"
          onClose={() =>
            setModal(null)
          }
          accentColor={PURPLE}
        >
          <div className="space-y-2">
            {sources.map(
              (source) => (
                <div
                  key={source.name}
                  style={accentStyle(
                    source.color,
                  )}
                  className="flex items-center justify-between rounded-xl border border-transparent p-3 transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--report-item-hover-bg)] hover:border-[var(--report-item-border)] hover:shadow-[var(--report-item-shadow)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor:
                          source.color,
                      }}
                      className="h-2.5 w-2.5 rounded-full"
                    />

                    <span
                      style={{
                        color:
                          THEME.foreground,
                      }}
                      className="text-xs"
                    >
                      {
                        source.name
                      }
                    </span>
                  </div>

                  <span
                    style={{
                      color:
                        THEME.muted,
                    }}
                    className="text-[10px]"
                  >
                    {
                      source.count
                    }{" "}
                    leads
                  </span>
                </div>
              ),
            )}
          </div>
        </Modal>
      )}

      {modal === "pipeline" && (
        <Modal
          title="Pipeline"
          onClose={() =>
            setModal(null)
          }
          accentColor={RED}
        >
          <PipelineChart
            pipeline={pipeline}
          />
        </Modal>
      )}

      {modal === "outreach" && (
        <Modal
          title="Outreach"
          onClose={() =>
            setModal(null)
          }
          accentColor={BLUE}
        >
          {renderOutreach()}
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[120]">
          <div
            style={{
              ...accentStyle(
                GREEN,
              ),
              backgroundColor:
                THEME.panel,
              borderColor:
                softBorder(GREEN),
              boxShadow:
                "var(--report-item-shadow)",
            }}
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
          >
            <IconBox
              color={GREEN}
              size="sm"
            >
              <Check size={14} />
            </IconBox>

            <span
              style={{
                color:
                  THEME.foreground,
              }}
              className="text-xs font-medium"
            >
              {toast}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}