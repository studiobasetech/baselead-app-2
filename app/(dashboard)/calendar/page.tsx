"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  DollarSign,
  Flame,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Send,
  Settings,
  Star,
  Trash2,
  Video,
  X,
  Sun,
  Rows3,
  CalendarDays,
  CalendarRange,
  Crosshair,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type EventType =
  | "Meeting"
  | "Call"
  | "Email"
  | "Task"
  | "Break"
  | "Review";

type CalendarEvent = {
  id: number;
  /** Row id in Supabase (calendar_events.id). */
  dbId?: string;
  leadId?: string | null;
  title: string;
  lead: string;
  type: EventType;
  date: string;
  dateKey?: string;
  start: string;
  end?: string;
  color: string;
  icon: "video" | "phone" | "email" | "task" | "break" | "star";
  status?: string;
  host?: string;
  attendee?: string;
  category?: string;
  location?: string;
  source?: string;
  notes?: string;
  opportunityValue?: number;
  opportunityScore?: number;
};

type CalendarView =
  | "Day"
  | "Week"
  | "Month"
  | "Year"
  | "Focus";

type EventFilter =
  | "All Events"
  | "Meeting"
  | "Call"
  | "Email"
  | "Task";

/* =========================================================
   CONSTANTS
========================================================= */

const GOLD = "#F5C518";
const BRAND = "#3B82F6";
const PURPLE = "#A78BFA";
const BLUE = "#60A5FA";
const GREEN = "#84CC16";
const RED = "#F0475C";
const CYAN = "#22D3EE";

const supabase = createClient();

const DEFAULT_DATE = new Date();

const hours = [
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
];

/* =========================================================
   EVENTS
========================================================= */

/* Events are loaded from Supabase (calendar_events). */

type CalendarEventRow = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  status: string | null;
  attendee: string | null;
  lead_id: string | null;
  lead_name?: string | null;
  opportunity_value: number | null;
};

const EVENT_TYPES: EventType[] = [
  "Meeting",
  "Call",
  "Email",
  "Task",
  "Break",
  "Review",
];

function formatClock(date: Date) {
  const hours = date.getHours();
  const modifier = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")} ${modifier}`;
}

function rowToEvent(row: CalendarEventRow, index: number): CalendarEvent {
  const start = new Date(row.starts_at);
  const end = row.ends_at ? new Date(row.ends_at) : null;
  const type = (EVENT_TYPES.includes(row.type as EventType)
    ? row.type
    : "Meeting") as EventType;
  const isPast = (end ?? start).getTime() < Date.now();

  return {
    id: index + 1,
    dbId: row.id,
    leadId: row.lead_id,
    title: row.title,
    lead: row.lead_name || row.attendee || "",
    type,
    date: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    dateKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
    start: formatClock(start),
    end: end ? formatClock(end) : undefined,
    color: colorForType(type),
    icon: iconForType(type),
    location: row.location || undefined,
    notes: row.notes || undefined,
    attendee: row.attendee || undefined,
    status: row.status || (isPast ? "Completed" : "Upcoming"),
    source: "BaseLead",
    opportunityValue: row.opportunity_value ?? undefined,
  };
}

function eventToPayload(event: CalendarEvent) {
  const [year, month, day] = (event.dateKey ?? "").split("-").map(Number);

  const at = (time: string) => {
    const [clock, modifier] = time.split(" ");
    const [hours, m] = clock.split(":").map(Number);
    let h = hours;
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    return new Date(year, month - 1, day, h, m).toISOString();
  };

  return {
    id: event.dbId,
    title: event.title,
    type: event.type,
    starts_at: at(event.start),
    ends_at: event.end ? at(event.end) : null,
    location: event.location || null,
    notes: event.notes || null,
    status: event.status || "Upcoming",
    attendee: event.attendee || event.lead || null,
    lead_id: event.leadId ?? null,
    lead_name: event.lead || null,
    opportunity_value: event.opportunityValue ?? null,
  };
}

/* =========================================================
   THEME
========================================================= */

const DARK_ICON_SURFACES: Record<string, string> = {
  purple: "#241A38",
  blue: "#10243A",
  green: "#18200B",
  orange: "#332A0C",
  teal: "#0C2930",
  gray: "#171717",
};

const LIGHT_ICON_SURFACES: Record<string, string> = {
  purple: "#F0EAFF",
  blue: "#EAF3FF",
  green: "#EFFBDC",
  orange: "#FFF7D6",
  teal: "#E7FBFF",
  gray: "#F1F1F4",
};

const EVENT_ACCENTS: Record<string, string> = {
  purple: PURPLE,
  blue: BLUE,
  green: GREEN,
  orange: GOLD,
  teal: CYAN,
  gray: "#777777",
};

function hexToRgba(
  hex: string,
  alpha: number
) {
  const clean = hex.replace("#", "");

  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const number = parseInt(
    value,
    16
  );

  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function useLightMode() {
  const [isLightMode, setIsLightMode] =
    useState(false);

  useEffect(() => {
    const root =
      document.documentElement;

    const updateTheme = () => {
      setIsLightMode(
        root.classList.contains(
          "baselead-light"
        )
      );
    };

    updateTheme();

    const observer =
      new MutationObserver(
        updateTheme
      );

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () =>
      observer.disconnect();
  }, []);

  return isLightMode;
}

function getPalette(
  isLightMode: boolean
) {
  if (isLightMode) {
    return {
      page: "#F5F5F7",
      hero: "#FFFFFF",
      panel: "#FFFFFF",
      elevated: "#FFFFFF",
      inner: "#F8F8FA",
      border: "#E3E3E8",
      borderLight: "#D5D5DB",
      grid: "#E8E8EC",
      gridStrong: "#DEDEE4",
      foreground: "#171717",
      text: "#25252A",
      secondary: "#55555D",
      muted: "#6B6B73",
      mutedDark: "#85858D",
      progress: "#ECECF0",
      hover: "#FAFAFB",
      shadow:
        "0 8px 24px rgba(18,18,24,0.06), 0 2px 6px rgba(18,18,24,0.04)",
      hoverShadow:
        "0 18px 42px rgba(18,18,24,0.12), 0 4px 12px rgba(18,18,24,0.05)",
      smallShadow:
        "0 8px 20px rgba(18,18,24,0.08)",
      sidebarShadow:
        "-18px 0 45px rgba(18,18,24,0.10)",
    };
  }

  return {
    page: "#050505",
    hero: "rgba(10, 10, 12, 0.55)",
    panel: "rgba(13, 13, 15, 0.55)",
    elevated: "rgba(18, 18, 20, 0.6)",
    inner: "rgba(28, 28, 30, 0.6)",
    border: "#202020",
    borderLight: "#2A2A2A",
    grid: "rgba(255,255,255,0.045)",
    gridStrong: "#202020",
    foreground: "#FFFFFF",
    text: "#FFFFFF",
    secondary: "#B0B0B0",
    muted: "#777777",
    mutedDark: "#666666",
    progress: "#191919",
    hover: "rgba(30, 30, 32, 0.65)",
    shadow:
      "0 10px 30px rgba(0,0,0,0.22)",
    hoverShadow:
      "0 18px 42px rgba(0,0,0,0.30)",
    smallShadow:
      "0 8px 20px rgba(0,0,0,0.20)",
    sidebarShadow:
      "-18px 0 45px rgba(0,0,0,0.22)",
  };
}

function eventColors(
  color: string,
  isLightMode: boolean
) {
  const accent =
    EVENT_ACCENTS[color] ??
    "#777777";

  const surface =
    isLightMode
      ? LIGHT_ICON_SURFACES[color] ??
        "#F1F1F4"
      : DARK_ICON_SURFACES[color] ??
        "#171717";

  return {
    accent,
    bg: surface,
    border: hexToRgba(
      accent,
      isLightMode ? 0.38 : 0.50
    ),
    text: accent,
    iconBg: surface,
    glow: hexToRgba(
      accent,
      isLightMode ? 0.12 : 0.16
    ),
  };
}

/* =========================================================
   DATE HELPERS
========================================================= */

function pad(value: number) {
  return String(value).padStart(
    2,
    "0"
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function dateFromKey(key: string) {
  const [year, month, day] =
    key.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function eventDateKey(
  event: CalendarEvent
) {
  if (event.dateKey) {
    return event.dateKey;
  }

  const date = new Date(
    `${event.date}, 2025`
  );

  return toDateKey(date);
}

function formatShortDate(
  date: Date
) {
  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function formatLongDate(
  date: Date
) {
  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatMonthYear(
  date: Date
) {
  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function getWeekStart(
  date: Date
) {
  const copy = new Date(date);
  const day = copy.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  copy.setDate(
    copy.getDate() + difference
  );

  copy.setHours(0, 0, 0, 0);

  return copy;
}

function getWeekDays(
  date: Date
) {
  const start =
    getWeekStart(date);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const day = new Date(start);

      day.setDate(
        start.getDate() + index
      );

      return {
        short: day.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),
        date: formatShortDate(day),
        day: day.getDate(),
        key: toDateKey(day),
        fullDate: day,
      };
    }
  );
}

function parseTime(
  value: string
) {
  const [time, modifier] =
    value.split(" ");

  let [hoursPart, minutes] =
    time.split(":").map(Number);

  if (
    modifier === "PM" &&
    hoursPart !== 12
  ) {
    hoursPart += 12;
  }

  if (
    modifier === "AM" &&
    hoursPart === 12
  ) {
    hoursPart = 0;
  }

  return (
    hoursPart * 60 + minutes
  );
}

function getEventTop(
  start: string,
  rowHeight = 70
) {
  const calendarStart =
    8 * 60;

  return Math.max(
    0,
    (parseTime(start) -
      calendarStart) *
      (rowHeight / 60)
  );
}

function getEventHeight(
  event: CalendarEvent,
  rowHeight = 70
) {
  if (!event.end) {
    return 72;
  }

  const duration =
    parseTime(event.end) -
    parseTime(event.start);

  return Math.max(
    1,
    duration *
      (rowHeight / 60)
  );
}

function getMonthGrid(
  date: Date
) {
  const first = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  const firstDay =
    first.getDay();

  const mondayOffset =
    firstDay === 0
      ? 6
      : firstDay - 1;

  const gridStart = new Date(
    first
  );

  gridStart.setDate(
    first.getDate() -
      mondayOffset
  );

  return Array.from(
    { length: 42 },
    (_, index) => {
      const day = new Date(
        gridStart
      );

      day.setDate(
        gridStart.getDate() +
          index
      );

      return day;
    }
  );
}

function iconForType(
  type: EventType
): CalendarEvent["icon"] {
  if (type === "Meeting") {
    return "video";
  }

  if (type === "Call") {
    return "phone";
  }

  if (type === "Email") {
    return "email";
  }

  if (type === "Task") {
    return "task";
  }

  if (type === "Review") {
    return "star";
  }

  return "break";
}

function colorForType(
  type: EventType
) {
  if (type === "Meeting") {
    return "blue";
  }

  if (type === "Call") {
    return "green";
  }

  if (type === "Email") {
    return "orange";
  }

  if (type === "Task") {
    return "teal";
  }

  if (type === "Review") {
    return "purple";
  }

  return "gray";
}

/* =========================================================
   OPPORTUNITY INTELLIGENCE
========================================================= */

function getOpportunityProfile(event: CalendarEvent) {
  if (event.opportunityValue || event.opportunityScore) {
    const score = Math.min(
      100,
      Math.max(0, event.opportunityScore ?? 0)
    );

    return {
      value: event.opportunityValue ?? 0,
      score,
      priority:
        score >= 80
          ? "High"
          : score >= 55
          ? "Medium"
          : "Low",
    };
  }

  // No value or score recorded for this event yet.
  const profile = { value: 0, score: 0 };

  return {
    ...profile,
    priority:
      profile.score >= 80
        ? "High"
        : profile.score >= 55
        ? "Medium"
        : "Low",
  };
}

function formatCurrency(value: number) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getOpportunityColor(score: number) {
  if (score >= 80) return RED;
  if (score >= 55) return GOLD;
  if (score > 0) return GREEN;
  return "#777777";
}

function getAiMeetingBrief(event: CalendarEvent) {
  const profile = getOpportunityProfile(event);
  const lead = event.lead || "this lead";

  const talkingPoints = event.category
    ? [
        `Connect the conversation to ${event.category.toLowerCase()}-specific growth opportunities.`,
        event.notes || `Clarify the current ${event.category.toLowerCase()} workflow and its biggest friction point.`,
        `Position the next step around measurable business impact and a clear timeline.`,
      ]
    : [
        `Confirm the lead's biggest current business challenge.`,
        `Explore where better digital infrastructure or follow-up could create measurable impact.`,
        `Define a clear next step before ending the conversation.`,
      ];

  const questions = [
    `What is the biggest bottleneck you want to solve right now?`,
    `What would a successful outcome look like over the next 90 days?`,
    `What have you already tried, and what happened?`,
  ];

  const nextStep =
    event.type === "Email"
      ? `Use the reply to qualify ${lead} and schedule a conversation.`
      : profile.score >= 80
      ? `Confirm the decision process and move toward a proposal or implementation plan.`
      : `Confirm the next meeting or follow-up date before closing the conversation.`;

  return {
    talkingPoints,
    questions,
    nextStep,
  };
}

/* =========================================================
   EVENT ICON
========================================================= */

function EventIcon({
  icon,
  size = 14,
}: {
  icon: CalendarEvent["icon"];
  size?: number;
}) {
  if (icon === "video") {
    return <Video size={size} />;
  }

  if (icon === "phone") {
    return <Phone size={size} />;
  }

  if (icon === "email") {
    return <Send size={size} />;
  }

  if (icon === "task") {
    return <Paperclip size={size} />;
  }

  if (icon === "star") {
    return <Star size={size} />;
  }

  return (
    <CalendarIcon size={size} />
  );
}

/* =========================================================
   EVENT CARD
========================================================= */

function CalendarEventCard({
  event,
  onClick,
  isLightMode,
  compact = false,
}: {
  event: CalendarEvent;
  onClick: () => void;
  isLightMode: boolean;
  compact?: boolean;
}) {
  const colors = eventColors(
    event.color,
    isLightMode
  );
  const opportunity = getOpportunityProfile(event);
  const opportunityColor = getOpportunityColor(opportunity.score);

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        event.lead
          ? `${event.title} — ${event.lead}`
          : event.title
      }
      style={{
        borderColor:
          colors.border,
        backgroundColor:
          colors.bg,
        boxShadow: `0 5px 18px ${hexToRgba(
          colors.accent,
          isLightMode
            ? 0.08
            : 0.12
        )}`,
        top: `${getEventTop(
          event.start
        )}px`,
        height: `${getEventHeight(
          event
        )}px`,
      }}
      className={`group absolute left-2 right-2 z-10 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] ${compact ? "overflow-visible" : "overflow-hidden"}`}
    >
      <span
        className="absolute bottom-0 left-0 top-0 w-[3px] opacity-90"
        style={{
          backgroundColor: opportunityColor,
          opacity: opportunity.score > 0 ? 0.85 : 0.25,
        }}
      />

      <span
        className="absolute left-0 right-0 top-0 h-[2px] opacity-80 transition-all duration-200 group-hover:h-[3px]"
        style={{
          backgroundColor:
            colors.accent,
          boxShadow: `0 0 12px ${hexToRgba(
            colors.accent,
            0.35
          )}`,
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <span
          className={`${compact ? "text-[8px] leading-3" : "text-[9px] leading-4"} font-semibold`}
          style={{
            color:
              colors.accent,
          }}
        >
          {event.start}
        </span>

        <div className="flex items-center gap-1.5">
          {opportunity.value > 0 && (
            <span
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] font-semibold"
              style={{
                backgroundColor: hexToRgba(opportunityColor, isLightMode ? 0.10 : 0.14),
                color: opportunityColor,
              }}
            >
              <DollarSign size={9} />
              {opportunity.value >= 1000
                ? `${Math.round(opportunity.value / 1000)}k`
                : opportunity.value}
            </span>
          )}

          <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
          style={{
            backgroundColor:
              hexToRgba(
                colors.accent,
                isLightMode
                  ? 0.10
                  : 0.14
              ),
            color:
              colors.accent,
          }}
        >
          <EventIcon
            icon={event.icon}
            size={11}
          />
          </span>
        </div>
      </div>

      <p
        className={`${compact ? "mt-0.5 text-[9px] leading-3" : "mt-1 text-[10px] leading-[1.35]"} font-semibold break-words whitespace-normal`}
        style={{
          color:
            isLightMode
              ? "#25252A"
              : "#FFFFFF",
        }}
      >
        {event.title}
      </p>

      {!compact && event.lead && (
        <p
          className="mt-0.5 text-[9px] leading-3 break-words"
          style={{
            color:
              isLightMode
                ? "#6B6B73"
                : "#9A9A9A",
          }}
        >
          {event.lead}
        </p>
      )}
    </button>
  );
}

/* =========================================================
   DESKTOP WEEK CALENDAR
========================================================= */

function DesktopWeekCalendar({
  days,
  visibleEvents,
  onSelectEvent,
  isLightMode,
  selectedDate,
}: {
  days: ReturnType<
    typeof getWeekDays
  >;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (
    event: CalendarEvent
  ) => void;
  isLightMode: boolean;
  selectedDate: Date;
}) {
  const palette =
    getPalette(isLightMode);

  const todayKey =
    toDateKey(new Date());

  const showCurrentTime =
    days.some(
      (day) => day.key === todayKey
    );

  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const currentTop =
    Math.max(
      0,
      (currentMinutes -
        8 * 60) *
        (70 / 60)
    );

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div
        className="grid grid-cols-[60px_repeat(7,minmax(120px,1fr))]"
        style={{
          backgroundColor:
            palette.elevated,
          borderBottom: `1px solid ${palette.gridStrong}`,
        }}
      >
        <div
          className="flex h-[70px] items-center justify-center text-[9px]"
          style={{
            color:
              palette.mutedDark,
            borderRight: `1px solid ${palette.gridStrong}`,
          }}
        >
          CDT
        </div>

        {days.map((day) => {
          const isSelected =
            day.key ===
            toDateKey(selectedDate);

          return (
            <button
              type="button"
              key={day.key}
              onClick={() =>
                onSelectEvent
              }
              className="flex h-[70px] flex-col items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  isSelected
                    ? isLightMode
                      ? "#FAFAFB"
                      : "#101010"
                    : "transparent",
                borderRight: `1px solid ${palette.grid}`,
              }}
            >
              <span
                className="text-[10px]"
                style={{
                  color:
                    isSelected
                      ? GOLD
                      : palette.muted,
                }}
              >
                {day.short}
              </span>

              <span
                className="mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor:
                    isSelected
                      ? GOLD
                      : "transparent",
                  color:
                    isSelected
                      ? "#000000"
                      : palette.text,
                  boxShadow:
                    isSelected
                      ? `0 0 18px ${hexToRgba(
                          GOLD,
                          0.20
                        )}`
                      : "none",
                }}
              >
                {day.day}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative overflow-x-auto">
        <div
          className="grid min-w-[900px] grid-cols-[60px_repeat(7,minmax(120px,1fr))]"
          style={{
            height: `${
              hours.length * 70
            }px`,
          }}
        >
          <div
            style={{
              backgroundColor:
                isLightMode
                  ? "#FAFAFB"
                  : "#0A0A0A",
              borderRight: `1px solid ${palette.gridStrong}`,
            }}
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex h-[70px] items-start justify-center pt-5 text-[9px]"
                style={{
                  color:
                    palette.mutedDark,
                  borderBottom: `1px solid ${palette.grid}`,
                }}
              >
                {hour}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const isSelected =
              day.key ===
              toDateKey(selectedDate);

            const dayEvents =
              visibleEvents.filter(
                (event) =>
                  eventDateKey(event) ===
                  day.key
              );

            return (
              <div
                key={day.key}
                className="relative"
                style={{
                  backgroundColor:
                    isSelected
                      ? isLightMode
                        ? "#FCFCFD"
                        : "#0A0A0A"
                      : "transparent",
                  borderRight: `1px solid ${palette.grid}`,
                }}
              >
                {hours.map((hour) => (
                  <div
                    key={`${day.key}-${hour}`}
                    className="h-[70px]"
                    style={{
                      borderBottom: `1px solid ${palette.grid}`,
                    }}
                  />
                ))}

                {dayEvents.map(
                  (event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onClick={() =>
                        onSelectEvent(
                          event
                        )
                      }
                      compact
                      isLightMode={
                        isLightMode
                      }
                    />
                  )
                )}
              </div>
            );
          })}
        </div>

        {showCurrentTime &&
          currentMinutes >=
            8 * 60 &&
          currentMinutes <=
            20 * 60 && (
            <div
              className="pointer-events-none absolute left-[60px] right-0 z-20"
              style={{
                top: `${currentTop}px`,
              }}
            >
              <div
                className="relative h-px"
                style={{
                  backgroundColor:
                    RED,
                  boxShadow: `0 0 8px ${hexToRgba(
                    RED,
                    0.40
                  )}`,
                }}
              >
                <span
                  className="absolute -left-1 -top-1 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      RED,
                    boxShadow: `0 0 8px ${hexToRgba(
                      RED,
                      0.50
                    )}`,
                  }}
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

/* =========================================================
   MOBILE WEEK CALENDAR
========================================================= */

function MobileWeekCalendar({
  days,
  visibleEvents,
  onSelectEvent,
  isLightMode,
  selectedDate,
}: {
  days: ReturnType<
    typeof getWeekDays
  >;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (
    event: CalendarEvent
  ) => void;
  isLightMode: boolean;
  selectedDate: Date;
}) {
  const palette =
    getPalette(isLightMode);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-[52px_repeat(7,minmax(120px,1fr))]">
          <div
            className="sticky left-0 z-20 flex h-[70px] items-center justify-center text-[9px]"
            style={{
              color:
                palette.mutedDark,
              backgroundColor:
                palette.elevated,
              borderRight: `1px solid ${palette.gridStrong}`,
            }}
          >
            CDT
          </div>

          {days.map((day) => {
            const selected =
              day.key ===
              toDateKey(selectedDate);

            return (
              <div
                key={day.key}
                className="flex h-[70px] flex-col items-center justify-center"
                style={{
                  backgroundColor:
                    selected
                      ? isLightMode
                        ? "#FAFAFB"
                        : "#101010"
                      : palette.elevated,
                  borderRight: `1px solid ${palette.grid}`,
                }}
              >
                <span
                  className="text-[9px]"
                  style={{
                    color:
                      selected
                        ? GOLD
                        : palette.muted,
                  }}
                >
                  {day.short}
                </span>

                <span
                  className="mt-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    backgroundColor:
                      selected
                        ? GOLD
                        : "transparent",
                    color:
                      selected
                        ? "#000000"
                        : palette.text,
                  }}
                >
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className="grid min-w-[900px] grid-cols-[52px_repeat(7,minmax(120px,1fr))]"
          style={{
            height: `${
              hours.length * 70
            }px`,
          }}
        >
          <div
            className="sticky left-0 z-20"
            style={{
              backgroundColor:
                isLightMode
                  ? "#FAFAFB"
                  : "#0A0A0A",
              borderRight: `1px solid ${palette.gridStrong}`,
            }}
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex h-[70px] items-start justify-center pt-5 text-[8px]"
                style={{
                  color:
                    palette.mutedDark,
                  borderBottom: `1px solid ${palette.grid}`,
                }}
              >
                {hour}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents =
              visibleEvents.filter(
                (event) =>
                  eventDateKey(event) ===
                  day.key
              );

            return (
              <div
                key={day.key}
                className="relative"
                style={{
                  backgroundColor:
                    day.key ===
                    toDateKey(selectedDate)
                      ? isLightMode
                        ? "#FCFCFD"
                        : "#0A0A0A"
                      : "transparent",
                  borderRight: `1px solid ${palette.grid}`,
                }}
              >
                {hours.map((hour) => (
                  <div
                    key={`${day.key}-${hour}`}
                    className="h-[70px]"
                    style={{
                      borderBottom: `1px solid ${palette.grid}`,
                    }}
                  />
                ))}

                {dayEvents.map(
                  (event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onClick={() =>
                        onSelectEvent(
                          event
                        )
                      }
                      compact
                      isLightMode={
                        isLightMode
                      }
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DAY VIEW
========================================================= */

function DayCalendar({
  selectedDate,
  visibleEvents,
  onSelectEvent,
  isLightMode,
}: {
  selectedDate: Date;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (
    event: CalendarEvent
  ) => void;
  isLightMode: boolean;
}) {
  const palette =
    getPalette(isLightMode);

  const key =
    toDateKey(selectedDate);

  const dayEvents =
    visibleEvents.filter(
      (event) =>
        eventDateKey(event) === key
    );

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{
          borderColor:
            palette.border,
          backgroundColor:
            palette.elevated,
        }}
      >
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.14em]"
            style={{
              color:
                palette.mutedDark,
            }}
          >
            Day schedule
          </p>

          <h2
            className="mt-1 text-sm font-semibold"
            style={{
              color:
                palette.foreground,
            }}
          >
            {formatLongDate(
              selectedDate
            )}
          </h2>
        </div>

        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor:
              isLightMode
                ? "#FFF7D6"
                : "#332A0C",
            color: GOLD,
          }}
        >
          <CalendarIcon
            size={16}
          />
        </span>
      </div>

      <div className="grid grid-cols-[64px_1fr]">
        <div
          style={{
            backgroundColor:
              isLightMode
                ? "#FAFAFB"
                : "#0A0A0A",
            borderRight: `1px solid ${palette.gridStrong}`,
          }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex h-[74px] items-start justify-center pt-4 text-[9px]"
              style={{
                color:
                  palette.mutedDark,
                borderBottom: `1px solid ${palette.grid}`,
              }}
            >
              {hour}
            </div>
          ))}
        </div>

        <div
          className="relative"
          style={{
            minHeight:
              hours.length * 74,
          }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-[74px]"
              style={{
                borderBottom: `1px solid ${palette.grid}`,
              }}
            />
          ))}

          {dayEvents.map(
            (event) => (
              <button
                type="button"
                key={event.id}
                onClick={() =>
                  onSelectEvent(
                    event
                  )
                }
                className="absolute left-4 right-4 overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5"
                style={{
                  top: `${getEventTop(
                    event.start,
                    74
                  )}px`,
                  minHeight: `${getEventHeight(
                    event,
                    74
                  )}px`,
                  backgroundColor:
                    eventColors(
                      event.color,
                      isLightMode
                    ).bg,
                  borderColor:
                    eventColors(
                      event.color,
                      isLightMode
                    ).border,
                  boxShadow: `0 8px 24px ${eventColors(
                    event.color,
                    isLightMode
                  ).glow}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-semibold"
                      style={{
                        color:
                          eventColors(
                            event.color,
                            isLightMode
                          ).accent,
                      }}
                    >
                      {event.start}
                      {event.end
                        ? ` – ${event.end}`
                        : ""}
                    </p>

                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{
                        color:
                          palette.foreground,
                      }}
                    >
                      {event.title}
                    </p>

                    {event.lead && (
                      <p
                        className="mt-1 text-[11px]"
                        style={{
                          color:
                            palette.secondary,
                        }}
                      >
                        {event.lead}
                      </p>
                    )}
                  </div>

                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor:
                        hexToRgba(
                          eventColors(
                            event.color,
                            isLightMode
                          ).accent,
                          isLightMode
                            ? 0.10
                            : 0.14
                        ),
                      color:
                        eventColors(
                          event.color,
                          isLightMode
                        ).accent,
                    }}
                  >
                    <EventIcon
                      icon={
                        event.icon
                      }
                      size={15}
                    />
                  </span>
                </div>
              </button>
            )
          )}

          {dayEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      isLightMode
                        ? "#F0EAFF"
                        : "#241A38",
                    color:
                      PURPLE,
                  }}
                >
                  <CalendarIcon
                    size={22}
                  />
                </span>

                <p
                  className="mt-3 text-xs font-medium"
                  style={{
                    color:
                      palette.secondary,
                  }}
                >
                  No events scheduled
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      palette.mutedDark,
                  }}
                >
                  Create an event to add it to this day.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MONTH VIEW
========================================================= */

function MonthCalendar({
  selectedDate,
  visibleEvents,
  onSelectEvent,
  onSelectDate,
  isLightMode,
}: {
  selectedDate: Date;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (
    event: CalendarEvent
  ) => void;
  onSelectDate: (
    date: Date
  ) => void;
  isLightMode: boolean;
}) {
  const palette =
    getPalette(isLightMode);

  const days =
    getMonthGrid(selectedDate);

  const selectedKey =
    toDateKey(selectedDate);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div
        className="grid grid-cols-7 border-b"
        style={{
          borderColor:
            palette.border,
          backgroundColor:
            palette.elevated,
        }}
      >
        {[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((day) => (
          <div
            key={day}
            className="px-3 py-3 text-[9px] font-semibold uppercase tracking-wide"
            style={{
              color:
                palette.mutedDark,
              borderRight: `1px solid ${palette.grid}`,
            }}
          >
            {day.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key =
            toDateKey(day);

          const isCurrentMonth =
            day.getMonth() ===
            selectedDate.getMonth();

          const isSelected =
            key === selectedKey;

          const dayEvents =
            visibleEvents.filter(
              (event) =>
                eventDateKey(event) ===
                key
            );

          return (
            <button
              type="button"
              key={key}
              onClick={() =>
                onSelectDate(day)
              }
              className="relative min-h-[126px] p-2 text-left transition-all hover:z-10"
              style={{
                backgroundColor:
                  isSelected
                    ? isLightMode
                      ? "#FAFAFB"
                      : "#101010"
                    : "transparent",
                borderRight: `1px solid ${palette.grid}`,
                borderBottom: `1px solid ${palette.grid}`,
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor:
                    isSelected
                      ? GOLD
                      : "transparent",
                  color:
                    isSelected
                      ? "#000000"
                      : isCurrentMonth
                      ? palette.secondary
                      : palette.mutedDark,
                }}
              >
                {day.getDate()}
              </span>

              <div className="mt-1 space-y-1">
                {dayEvents
                  .slice(0, 3)
                  .map((event) => {
                    const colors =
                      eventColors(
                        event.color,
                        isLightMode
                      );

                    return (
                      <span
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(
                            event
                          );
                        }}
                        className="block rounded-md border px-1.5 py-1 text-[8px] font-medium leading-3 transition-all hover:-translate-y-0.5"
                        style={{
                          borderColor:
                            colors.border,
                          backgroundColor:
                            colors.bg,
                          color:
                            colors.accent,
                        }}
                        title={
                          event.title
                        }
                      >
                        {event.title}
                      </span>
                    );
                  })}

                {dayEvents.length >
                  3 && (
                  <span
                    className="block px-1.5 text-[8px]"
                    style={{
                      color:
                        palette.muted,
                    }}
                  >
                    +
                    {dayEvents.length -
                      3}{" "}
                    more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* =========================================================
   YEAR VIEW
========================================================= */

function FocusCalendar({
  selectedDate,
  visibleEvents,
  onSelectEvent,
  onCreateFollowUp,
  isLightMode,
}: {
  selectedDate: Date;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateFollowUp: (event: CalendarEvent) => void;
  isLightMode: boolean;
}) {
  const palette = getPalette(isLightMode);
  const [preparedEventId, setPreparedEventId] = useState<number | null>(null);

  const focusEvents = useMemo(() => {
    const key = toDateKey(selectedDate);
    return visibleEvents
      .filter((event) => eventDateKey(event) === key)
      .sort((a, b) => getOpportunityProfile(b).score - getOpportunityProfile(a).score);
  }, [selectedDate, visibleEvents]);

  const priorityEvents = focusEvents
    .filter((event) => getOpportunityProfile(event).score >= 55)
    .slice(0, 4);

  const revenue = focusEvents.reduce(
    (sum, event) => sum + getOpportunityProfile(event).value,
    0,
  );

  const highOpportunity = focusEvents.filter(
    (event) => getOpportunityProfile(event).score >= 80,
  ).length;

  const actionEvents = focusEvents.filter(
    (event) => event.type === "Email" || event.type === "Task" || event.title.toLowerCase().includes("follow-up"),
  );

  const preparedEvent = focusEvents.find((event) => event.id === preparedEventId) ?? null;
  const preparedBrief = preparedEvent ? getAiMeetingBrief(preparedEvent) : null;

  const hourlyPulse = Array.from({ length: 12 }, (_, index) => {
    const hour = index + 8;
    const events = focusEvents.filter((event) => {
      const start = parseTime(event.start);
      return Math.floor(start / 60) === hour;
    });
    return {
      hour,
      score: Math.min(100, Math.max(0, ...events.map((event) => getOpportunityProfile(event).score), 0)),
      count: events.length,
    };
  });

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: hexToRgba(GOLD, 0.28),
          backgroundColor: palette.panel,
          boxShadow: `0 18px 50px ${hexToRgba(GOLD, isLightMode ? 0.08 : 0.1)}`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl"
          style={{ backgroundColor: hexToRgba(GOLD, 0.12) }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: isLightMode ? "#FFF7D6" : "#332A0C", color: GOLD }}
              >
                <Sparkles size={17} />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
                  BaseLead Focus
                </p>
                <h2 className="mt-1 text-xl font-semibold" style={{ color: palette.foreground }}>
                  Your sales command center
                </h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-5" style={{ color: palette.muted }}>
              A live view of the opportunities, revenue and actions that deserve attention on {formatShortDate(selectedDate)}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["Pipeline", formatCurrency(revenue), GOLD],
              ["High opportunity", String(highOpportunity), RED],
              ["Actions", String(actionEvents.length), GREEN],
            ].map(([label, value, color]) => (
              <div
                key={label}
                className="min-w-[92px] rounded-xl border px-3 py-3"
                style={{ borderColor: palette.border, backgroundColor: palette.elevated }}
              >
                <p className="text-[9px]" style={{ color: palette.muted }}>{label}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: palette.border, backgroundColor: palette.panel, boxShadow: palette.shadow }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: palette.mutedDark }}>
                Priority opportunities
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: palette.foreground }}>
                Where your attention has the most leverage
              </p>
            </div>
            <Flame size={17} style={{ color: RED }} />
          </div>

          {priorityEvents.length === 0 ? (
            <div className="rounded-xl border p-5 text-center" style={{ borderColor: palette.border, backgroundColor: palette.elevated }}>
              <p className="text-xs font-medium" style={{ color: palette.foreground }}>No priority opportunities scheduled.</p>
              <p className="mt-1 text-[10px]" style={{ color: palette.muted }}>Add a meeting, call or follow-up to build your focus queue.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {priorityEvents.map((event) => {
                const profile = getOpportunityProfile(event);
                const color = getOpportunityColor(profile.score);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5"
                    style={{ borderColor: palette.border, backgroundColor: palette.elevated }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(color, 0.12), color }}>
                      <EventIcon icon={event.icon} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold" style={{ color: palette.foreground }}>{event.title}</span>
                      <span className="mt-1 block truncate text-[10px]" style={{ color: palette.muted }}>
                        {event.lead || "Internal"} · {event.start}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-semibold" style={{ color }}>{formatCurrency(profile.value)}</span>
                      <span className="mt-1 block text-[9px]" style={{ color: palette.muted }}>{profile.score}% opportunity</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: palette.border, backgroundColor: palette.panel, boxShadow: palette.shadow }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: palette.mutedDark }}>Day pulse</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: palette.foreground }}>Opportunity intensity</p>
            </div>
            <span className="text-[10px]" style={{ color: palette.muted }}>{focusEvents.length} events</span>
          </div>
          <div className="flex h-32 items-end gap-1.5">
            {hourlyPulse.map((item) => {
              const height = item.count ? Math.max(12, item.score) : 5;
              const color = getOpportunityColor(item.score);
              return (
                <div key={item.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="flex h-full w-full items-end rounded-md" style={{ backgroundColor: isLightMode ? "#F4F4F6" : "#171717" }}>
                    <div
                      className="w-full rounded-md transition-all"
                      style={{ height: `${height}%`, backgroundColor: color, boxShadow: item.count ? `0 0 12px ${hexToRgba(color, 0.22)}` : "none" }}
                    />
                  </div>
                  <span className="text-[8px]" style={{ color: palette.muted }}>{item.hour > 12 ? item.hour - 12 : item.hour}{item.hour >= 12 ? "p" : "a"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: palette.border, backgroundColor: palette.panel, boxShadow: palette.shadow }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: palette.mutedDark }}>AI briefing</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: palette.foreground }}>Prepare before you walk in</p>
            </div>
            <Sparkles size={17} style={{ color: PURPLE }} />
          </div>

          {preparedEvent && preparedBrief ? (
            <div className="space-y-3">
              <div className="rounded-xl border p-3" style={{ borderColor: hexToRgba(PURPLE, 0.28), backgroundColor: isLightMode ? "#F0EAFF" : "#241A38" }}>
                <p className="text-xs font-semibold" style={{ color: palette.foreground }}>{preparedEvent.title} · {preparedEvent.lead || "Internal"}</p>
                <p className="mt-1 text-[10px]" style={{ color: palette.muted }}>AI brief generated from the event context and opportunity profile.</p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: palette.mutedDark }}>Talking points</p>
                <div className="mt-2 space-y-1.5">
                  {preparedBrief.talkingPoints.map((point) => <p key={point} className="text-[10px] leading-4" style={{ color: palette.secondary }}>• {point}</p>)}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: palette.mutedDark }}>Suggested next step</p>
                <p className="mt-2 text-[10px] leading-4" style={{ color: palette.secondary }}>{preparedBrief.nextStep}</p>
              </div>
              <button type="button" onClick={() => onCreateFollowUp(preparedEvent)} className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-semibold text-white transition-all hover:-translate-y-0.5" style={{ backgroundColor: BRAND }}>
                <CheckCircle2 size={14} /> Create automatic follow-up
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {focusEvents.slice(0, 4).map((event) => (
                <button key={event.id} type="button" onClick={() => { setPreparedEventId(event.id); onSelectEvent(event); }} className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5" style={{ borderColor: palette.border, backgroundColor: palette.elevated }}>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold" style={{ color: palette.foreground }}>{event.title}</span>
                    <span className="mt-1 block text-[10px]" style={{ color: palette.muted }}>{event.lead || "Internal"} · {event.start}</span>
                  </span>
                  <span className="ml-3 shrink-0 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold" style={{ backgroundColor: isLightMode ? "#F0EAFF" : "#241A38", color: PURPLE }}>Prepare Me</span>
                </button>
              ))}
              {focusEvents.length === 0 && <p className="rounded-xl border p-4 text-[10px]" style={{ borderColor: palette.border, color: palette.muted }}>Nothing scheduled for this focus date.</p>}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: palette.border, backgroundColor: palette.panel, boxShadow: palette.shadow }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: palette.mutedDark }}>Action queue</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: palette.foreground }}>Keep momentum moving</p>
            </div>
            <CheckCircle2 size={17} style={{ color: GREEN }} />
          </div>
          {actionEvents.length === 0 ? (
            <div className="rounded-xl border p-5 text-center" style={{ borderColor: palette.border, backgroundColor: palette.elevated }}>
              <p className="text-xs font-medium" style={{ color: palette.foreground }}>No immediate actions.</p>
              <p className="mt-1 text-[10px]" style={{ color: palette.muted }}>Your focus queue is clear.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actionEvents.map((event) => {
                const profile = getOpportunityProfile(event);
                return (
                  <div key={event.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: palette.border, backgroundColor: palette.elevated }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: isLightMode ? "#EFFBDC" : "#18200B", color: GREEN }}><CheckCircle2 size={14} /></span>
                    <button type="button" onClick={() => onSelectEvent(event)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-semibold" style={{ color: palette.foreground }}>{event.title}</span>
                      <span className="mt-1 block truncate text-[10px]" style={{ color: palette.muted }}>{event.lead || "Internal"} · {formatCurrency(profile.value)} opportunity</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function YearCalendar({
  selectedDate,
  visibleEvents,
  onSelectEvent,
  onSelectDate,
  isLightMode,
}: {
  selectedDate: Date;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
  isLightMode: boolean;
}) {
  const palette = getPalette(isLightMode);
  const year = selectedDate.getFullYear();

  return (
    <div
      className="rounded-2xl border p-3 sm:p-4 lg:p-5"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.panel,
        boxShadow: palette.shadow,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: palette.mutedDark }}
          >
            Year overview
          </p>
          <p
            className="mt-1 text-lg font-semibold"
            style={{ color: palette.foreground }}
          >
            {year}
          </p>
        </div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            backgroundColor: isLightMode ? "#FFF7D6" : "#332A0C",
            color: GOLD,
          }}
        >
          <CalendarIcon size={17} />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthDate = new Date(year, monthIndex, 1);
          const monthDays = getMonthGrid(monthDate);
          const monthEvents = visibleEvents.filter((event) => {
            const key = eventDateKey(event);
            const eventDate = dateFromKey(key);
            return (
              eventDate.getFullYear() === year &&
              eventDate.getMonth() === monthIndex
            );
          });

          return (
            <div
              key={monthIndex}
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.elevated,
              }}
            >
              <button
                type="button"
                onClick={() => onSelectDate(monthDate)}
                className="flex w-full items-center justify-between border-b px-3 py-2.5 text-left transition-all hover:-translate-y-0.5"
                style={{ borderColor: palette.border }}
              >
                <span
                  className="text-xs font-semibold"
                  style={{ color: palette.foreground }}
                >
                  {monthDate.toLocaleDateString("en-US", { month: "long" })}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[8px] font-semibold"
                  style={{
                    backgroundColor:
                      monthEvents.length > 0
                        ? isLightMode ? "#FFF7D6" : "#332A0C"
                        : palette.inner,
                    color:
                      monthEvents.length > 0 ? GOLD : palette.muted,
                  }}
                >
                  {monthEvents.length} {monthEvents.length === 1 ? "event" : "events"}
                </span>
              </button>

              <div
                className="grid grid-cols-7 border-b px-2 py-1.5 text-center text-[7px] font-medium"
                style={{ color: palette.mutedDark, borderColor: palette.border }}
              >
                {['M','T','W','T','F','S','S'].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1 p-2">
                {monthDays.map((day) => {
                  const dayKey = toDateKey(day);
                  const inMonth = day.getMonth() === monthIndex;
                  const dayEvents = monthEvents.filter(
                    (event) => eventDateKey(event) === dayKey
                  );
                  const isSelected = dayKey === toDateKey(selectedDate);

                  return (
                    <button
                      type="button"
                      key={dayKey}
                      onClick={() => onSelectDate(day)}
                      className="relative flex h-6 items-center justify-center rounded-md text-[8px] transition-all hover:-translate-y-0.5"
                      style={{
                        backgroundColor: isSelected
                          ? GOLD
                          : dayEvents.length > 0
                          ? isLightMode ? "#FAFAFB" : "#171717"
                          : "transparent",
                        color: isSelected
                          ? "#000000"
                          : inMonth
                          ? palette.secondary
                          : palette.mutedDark,
                        fontWeight: dayEvents.length > 0 || isSelected ? 600 : 400,
                      }}
                    >
                      {day.getDate()}
                      {dayEvents.length > 0 && !isSelected && (
                        <span
                          className="absolute bottom-0.5 h-1 w-1 rounded-full"
                          style={{ backgroundColor: GOLD }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {monthEvents.length > 0 && (
                <div className="border-t px-2 py-2" style={{ borderColor: palette.border }}>
                  {monthEvents.slice(0, 2).map((event) => {
                    const colors = eventColors(event.color, isLightMode);
                    return (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className="mb-1 block w-full truncate rounded-md border px-2 py-1 text-left text-[8px] font-medium last:mb-0 transition-all hover:-translate-y-0.5"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: colors.bg,
                          color: colors.accent,
                        }}
                        title={event.title}
                      >
                        {event.title}
                      </button>
                    );
                  })}
                  {monthEvents.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onSelectDate(monthDate)}
                      className="mt-1 text-[8px] font-medium"
                      style={{ color: palette.muted }}
                    >
                      +{monthEvents.length - 2} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCompanyProfileImage(company: Record<string, unknown> | null) {
  if (!company) return null;

  const candidates = [
    "profile_image_url",
    "avatar_url",
    "logo_url",
    "company_logo_url",
    "profile_image",
    "company_logo",
    "image_url",
    "avatar",
    "logo",
  ];

  for (const key of candidates) {
    const value = company[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/* =========================================================
   EVENT DETAIL
========================================================= */

function EventDetail({
  event,
  onClose,
  onEdit,
  onDelete,
  onJoin,
  onCreateFollowUp,
  hostProfileImage,
  isLightMode,
}: {
  event: CalendarEvent;
  onClose?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onJoin: () => void;
  onCreateFollowUp: () => void;
  hostProfileImage?: string | null;
  isLightMode: boolean;
}) {
  const palette =
    getPalette(isLightMode);

  const colors = eventColors(
    event.color,
    isLightMode
  );
  const opportunity = getOpportunityProfile(event);
  const opportunityColor = getOpportunityColor(opportunity.score);
  const aiBrief = getAiMeetingBrief(event);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div
        className="p-5"
        style={{
          backgroundColor:
            palette.elevated,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-xs font-semibold"
              style={{
                color:
                  colors.accent,
              }}
            >
              {event.start}
              {event.end
                ? ` – ${event.end}`
                : ""}
            </p>

            <h2
              className="mt-3 text-base font-semibold"
              style={{
                color:
                  palette.foreground,
              }}
            >
              {event.title}
            </h2>

            {event.lead && (
              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    palette.muted,
                }}
              >
                {event.lead}
              </p>
            )}

            {(event.category ||
              event.location) && (
              <p
                className="mt-2 text-[10px]"
                style={{
                  color:
                    palette.mutedDark,
                }}
              >
                {event.category}
                {event.category &&
                event.location
                  ? " • "
                  : ""}
                {event.location}
              </p>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.panel,
                color:
                  palette.muted,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {event.host && (
          <div>
            <p
              className="text-[10px]"
              style={{
                color:
                  palette.mutedDark,
              }}
            >
              Host
            </p>

            <div className="mt-2 flex items-center gap-2">
              {hostProfileImage ? (
                <img
                  src={hostProfileImage}
                  alt={`${event.host} profile`}
                  className="h-7 w-7 rounded-full border object-cover"
                  style={{
                    borderColor: GOLD,
                  }}
                />
              ) : (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{
                    backgroundColor: BRAND,
                  }}
                >
                  SB
                </span>
              )}

              <span
                className="text-xs"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                {event.host}
              </span>
            </div>
          </div>
        )}

        {event.attendee && (
          <div>
            <p
              className="text-[10px]"
              style={{
                color:
                  palette.mutedDark,
              }}
            >
              Attendees
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-black"
                style={{
                  backgroundColor:
                    PURPLE,
                }}
              >
                AO
              </span>

              <span
                className="text-xs"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                {event.attendee}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p
              className="text-[10px]"
              style={{
                color:
                  palette.mutedDark,
              }}
            >
              Type
            </p>

            <span
              className="mt-2 inline-flex rounded-lg border px-2 py-1 text-[9px]"
              style={{
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.bg,
                color:
                  colors.accent,
              }}
            >
              {event.type}
            </span>
          </div>

          {event.source && (
            <div>
              <p
                className="text-[10px]"
                style={{
                  color:
                    palette.mutedDark,
                }}
              >
                Source
              </p>

              <p
                className="mt-2 text-xs"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                {event.source}
              </p>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: hexToRgba(PURPLE, 0.28),
            background: isLightMode
              ? "linear-gradient(135deg, #F7F3FF 0%, #FFFFFF 100%)"
              : "linear-gradient(135deg, #1D1630 0%, #0D0D0D 100%)",
            boxShadow: `0 10px 28px ${hexToRgba(PURPLE, isLightMode ? 0.08 : 0.12)}`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: PURPLE }}
              >
                <Sparkles size={12} />
                AI Meeting Brief
              </p>
              <p
                className="mt-1 text-[10px]"
                style={{ color: palette.muted }}
              >
                Prepared from the event and lead context.
              </p>
            </div>
            <span
              className="rounded-md px-2 py-1 text-[8px] font-semibold"
              style={{
                backgroundColor: isLightMode ? "#F0EAFF" : "#241A38",
                color: PURPLE,
              }}
            >
              AI
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[9px] font-semibold" style={{ color: palette.foreground }}>
              Talking points
            </p>
            <div className="mt-2 space-y-2">
              {aiBrief.talkingPoints.map((point) => (
                <div key={point} className="flex gap-2 text-[10px] leading-4" style={{ color: palette.secondary }}>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: PURPLE }} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[9px] font-semibold" style={{ color: palette.foreground }}>
              Questions to ask
            </p>
            <div className="mt-2 space-y-2">
              {aiBrief.questions.map((question) => (
                <div key={question} className="rounded-lg border px-3 py-2 text-[10px]" style={{ borderColor: palette.border, backgroundColor: palette.inner, color: palette.secondary }}>
                  {question}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: hexToRgba(GREEN, 0.28), backgroundColor: isLightMode ? "#F5FBEA" : "#121B09" }}>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold" style={{ color: GREEN }}>
              <CheckCircle2 size={12} />
              Suggested next step
            </p>
            <p className="mt-1 text-[10px] leading-4" style={{ color: palette.secondary }}>
              {aiBrief.nextStep}
            </p>
          </div>
        </div>

        {event.notes && (
          <div
            className="rounded-xl border p-3"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.inner,
            }}
          >
            <p
              className="text-[10px]"
              style={{
                color:
                  palette.mutedDark,
              }}
            >
              Notes
            </p>

            <p
              className="mt-2 text-[11px] leading-5"
              style={{
                color:
                  palette.secondary,
              }}
            >
              {event.notes}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onCreateFollowUp}
          className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[10px] font-semibold transition-all hover:-translate-y-0.5"
          style={{
            borderColor: hexToRgba(BLUE, 0.30),
            backgroundColor: isLightMode ? "#EAF3FF" : "#10243A",
            color: BLUE,
          }}
        >
          <CheckCircle2 size={13} />
          Create Automatic Follow-up
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onJoin}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-semibold text-black transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor:
                GOLD,
              boxShadow: `0 7px 20px ${hexToRgba(
                GOLD,
                0.12
              )}`,
            }}
          >
            <Video size={14} />
            Join Call
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] transition-all hover:-translate-y-0.5"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.elevated,
              color:
                palette.secondary,
            }}
          >
            <Settings size={13} />
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] transition-all hover:-translate-y-0.5"
            style={{
              borderColor:
                hexToRgba(
                  RED,
                  0.30
                ),
              backgroundColor:
                isLightMode
                  ? "#FFEBEE"
                  : "#3A1418",
              color: RED,
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MINI CALENDAR
========================================================= */

function MiniCalendar({
  selectedDate,
  onSelectDate,
  isLightMode,
}: {
  selectedDate: Date;
  onSelectDate: (
    date: Date
  ) => void;
  isLightMode: boolean;
}) {
  const palette =
    getPalette(isLightMode);

  const monthDays =
    getMonthGrid(selectedDate);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span
            className="text-xs font-semibold"
            style={{
              color:
                palette.foreground,
            }}
          >
            {formatMonthYear(
              selectedDate
            )}
          </span>
        </div>

        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            backgroundColor:
              isLightMode
                ? "#FFF7D6"
                : "#332A0C",
            color: GOLD,
          }}
        >
          <CalendarIcon size={14} />
        </span>
      </div>

      <div
        className="mb-3 grid grid-cols-7 text-center text-[9px]"
        style={{
          color:
            palette.mutedDark,
        }}
      >
        {[
          "M",
          "T",
          "W",
          "T",
          "F",
          "S",
          "S",
        ].map((day, index) => (
          <span
            key={`${day}-${index}`}
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {monthDays.map((day) => {
          const selected =
            toDateKey(day) ===
            toDateKey(selectedDate);

          const currentMonth =
            day.getMonth() ===
            selectedDate.getMonth();

          return (
            <button
              type="button"
              key={toDateKey(day)}
              onClick={() =>
                onSelectDate(day)
              }
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[10px] transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor:
                  selected
                    ? GOLD
                    : "transparent",
                color: selected
                  ? "#000000"
                  : currentMonth
                  ? palette.secondary
                  : palette.mutedDark,
                fontWeight: selected
                  ? 600
                  : 400,
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   EVENT FORM MODAL
========================================================= */

function EventModal({
  open,
  event,
  defaultDate,
  onClose,
  onSave,
  isLightMode,
}: {
  open: boolean;
  event: CalendarEvent | null;
  defaultDate: Date;
  onClose: () => void;
  onSave: (
    event: CalendarEvent
  ) => void;
  isLightMode: boolean;
}) {
  const palette =
    getPalette(isLightMode);

  const [title, setTitle] =
    useState("");
  const [lead, setLead] =
    useState("");
  const [type, setType] =
    useState<EventType>("Meeting");
  const [date, setDate] =
    useState(toDateKey(defaultDate));
  const [start, setStart] =
    useState("10:00");
  const [end, setEnd] =
    useState("10:45");
  const [location, setLocation] =
    useState("");
  const [notes, setNotes] =
    useState("");

  const [leadOptions, setLeadOptions] =
    useState<
      Array<{
        id: string;
        name: string;
        company: string;
      }>
    >([]);
  const [leadsLoading, setLeadsLoading] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function loadLeadOptions() {
      setLeadsLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) {
            setLeadOptions([]);
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
          throw ownerError;
        }

        if (ownedCompany?.id) {
          companyId = String(ownedCompany.id);
        } else {
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
            throw membershipError;
          }

          companyId = membership?.company_id
            ? String(membership.company_id)
            : null;
        }

        if (!companyId) {
          if (mounted) {
            setLeadOptions([]);
          }
          return;
        }

        const {
          data: leadsData,
          error: leadsError,
        } = await supabase
          .from("leads")
          .select("id, name, company")
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          });

        if (leadsError) {
          throw leadsError;
        }

        if (mounted) {
          setLeadOptions(
            (leadsData ?? []).map((item) => ({
              id: String(item.id),
              name: item.name || "",
              company: item.company || "",
            })),
          );
        }
      } catch (error) {
        console.error(
          "Calendar lead list load error:",
          error,
        );

        if (mounted) {
          setLeadOptions([]);
        }
      } finally {
        if (mounted) {
          setLeadsLoading(false);
        }
      }
    }

    loadLeadOptions();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (event) {
      setTitle(event.title);
      setLead(event.lead);
      setType(event.type);
      setDate(
        eventDateKey(event)
      );
      setStart(
        convertTo24Hour(event.start)
      );
      setEnd(
        event.end
          ? convertTo24Hour(
              event.end
            )
          : "10:45"
      );
      setLocation(
        event.location ?? ""
      );
      setNotes(
        event.notes ?? ""
      );
    } else {
      setTitle("");
      setLead("");
      setType("Meeting");
      setDate(
        toDateKey(defaultDate)
      );
      setStart("10:00");
      setEnd("10:45");
      setLocation("");
      setNotes("");
    }
  }, [
    open,
    event,
    defaultDate,
  ]);

  if (!open) {
    return null;
  }

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    const dateObject =
      dateFromKey(date);

    const matchedLead = leadOptions.find(
      (option) =>
        (option.company || option.name) === lead
    );

    const nextEvent: CalendarEvent =
      {
        id:
          event?.id ??
          Date.now(),
        dbId: event?.dbId,
        leadId:
          matchedLead?.id ??
          event?.leadId ??
          null,
        title: title.trim(),
        lead: lead.trim(),
        type,
        date: formatShortDate(
          dateObject
        ),
        dateKey: date,
        start: formatTimeInput(
          start
        ),
        end: end
          ? formatTimeInput(end)
          : undefined,
        color:
          event?.color ??
          colorForType(type),
        icon: iconForType(type),
        location:
          location.trim(),
        notes:
          notes.trim() ||
          undefined,
        category:
          event?.category,
        host:
          event?.host,
        attendee:
          event?.attendee,
        source:
          event?.source ??
          "BaseLead",
        status:
          event?.status ??
          "Upcoming",
      };

    onSave(nextEvent);
  }

  const inputClass =
    "mt-1 w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px]">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border p-5 sm:p-6"
        style={{
          backgroundColor:
            palette.panel,
          borderColor:
            palette.border,
          boxShadow:
            "0 28px 80px rgba(0,0,0,0.24)",
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.14em]"
              style={{
                color:
                  palette.mutedDark,
              }}
            >
              Calendar
            </p>

            <h2
              className="mt-1 text-lg font-semibold"
              style={{
                color:
                  palette.foreground,
              }}
            >
              {event
                ? "Edit Event"
                : "New Event"}
            </h2>

            <p
              className="mt-1 text-xs"
              style={{
                color:
                  palette.muted,
              }}
            >
              Add the details for this calendar item.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.elevated,
              color:
                palette.muted,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label
              className="text-[10px] font-medium"
              style={{
                color:
                  palette.secondary,
              }}
            >
              Title
            </label>

            <input
              required
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="Discovery Call"
              className={inputClass}
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.elevated,
                color:
                  palette.foreground,
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-[10px] font-medium"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                Lead / Company
              </label>

              <select
                value={lead}
                onChange={(e) =>
                  setLead(
                    e.target.value
                  )
                }
                className={inputClass}
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color:
                    palette.foreground,
                }}
              >
                <option value="">
                  {leadsLoading
                    ? "Loading leads..."
                    : leadOptions.length === 0
                    ? "No leads available"
                    : "Select a lead / company"}
                </option>

                {leadOptions.map((leadOption) => {
                  const displayCompany =
                    leadOption.company ||
                    leadOption.name ||
                    "Unnamed Company";

                  const displayName =
                    leadOption.name &&
                    leadOption.company &&
                    leadOption.name !==
                      leadOption.company
                      ? leadOption.name
                      : "";

                  return (
                    <option
                      key={leadOption.id}
                      value={displayCompany}
                    >
                      {displayCompany}
                      {displayName
                        ? ` — ${displayName}`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                className="text-[10px] font-medium"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                Type
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target
                      .value as EventType
                  )
                }
                className={inputClass}
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color:
                    palette.foreground,
                }}
              >
                <option>
                  Meeting
                </option>
                <option>
                  Call
                </option>
                <option>
                  Email
                </option>
                <option>
                  Task
                </option>
                <option>
                  Break
                </option>
                <option>
                  Review
                </option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                className="text-[10px] font-medium"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value
                  )
                }
                className={inputClass}
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color:
                    palette.foreground,
                }}
              />
            </div>

            <div>
              <label
                className="text-[10px] font-medium"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                Start
              </label>

              <input
                type="time"
                value={start}
                onChange={(e) =>
                  setStart(
                    e.target.value
                  )
                }
                className={inputClass}
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color:
                    palette.foreground,
                }}
              />
            </div>

            <div>
              <label
                className="text-[10px] font-medium"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                End
              </label>

              <input
                type="time"
                value={end}
                onChange={(e) =>
                  setEnd(
                    e.target.value
                  )
                }
                className={inputClass}
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color:
                    palette.foreground,
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="text-[10px] font-medium"
              style={{
                color:
                  palette.secondary,
              }}
            >
              Location
            </label>

            <input
              value={location}
              onChange={(e) =>
                setLocation(
                  e.target.value
                )
              }
              placeholder="Office address or meeting link"
              className={inputClass}
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.elevated,
                color:
                  palette.foreground,
              }}
            />
          </div>

          <div>
            <label
              className="text-[10px] font-medium"
              style={{
                color:
                  palette.secondary,
              }}
            >
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              rows={4}
              placeholder="Add notes..."
              className={`${inputClass} resize-none`}
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.elevated,
                color:
                  palette.foreground,
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2.5 text-xs transition-all hover:-translate-y-0.5"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.elevated,
                color:
                  palette.secondary,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-xs font-semibold text-black transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor:
                  GOLD,
                boxShadow: `0 8px 22px ${hexToRgba(
                  GOLD,
                  0.15
                )}`,
              }}
            >
              {event
                ? "Save Changes"
                : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   TIME FORMATTING
========================================================= */

function convertTo24Hour(
  value: string
) {
  const [time, modifier] =
    value.split(" ");

  let [hoursPart, minutes] =
    time.split(":").map(Number);

  if (
    modifier === "PM" &&
    hoursPart !== 12
  ) {
    hoursPart += 12;
  }

  if (
    modifier === "AM" &&
    hoursPart === 12
  ) {
    hoursPart = 0;
  }

  return `${pad(
    hoursPart
  )}:${pad(minutes)}`;
}

function formatTimeInput(
  value: string
) {
  const [hoursPart, minutes] =
    value.split(":").map(Number);

  const modifier =
    hoursPart >= 12 ? "PM" : "AM";

  const hour =
    hoursPart % 12 || 12;

  return `${hour}:${pad(
    minutes
  )} ${modifier}`;
}

/* =========================================================
   OPPORTUNITY HEATMAP
========================================================= */

function OpportunityHeatmap({
  selectedDate,
  events,
  isLightMode,
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  isLightMode: boolean;
}) {
  const palette = getPalette(isLightMode);
  const days = getWeekDays(selectedDate);

  const dayScores = days.map((day) => {
    const dayEvents = events.filter(
      (event) => eventDateKey(event) === day.key
    );
    const value = dayEvents.reduce(
      (sum, event) => sum + getOpportunityProfile(event).value,
      0
    );
    const score = dayEvents.length
      ? Math.round(
          dayEvents.reduce(
            (sum, event) => sum + getOpportunityProfile(event).score,
            0
          ) / dayEvents.length
        )
      : 0;

    return { ...day, value, score };
  });

  return (
    <section
      className="mt-4 rounded-2xl border p-4"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.panel,
        boxShadow: palette.shadow,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em]" style={{ color: palette.mutedDark }}>
            <Flame size={12} style={{ color: RED }} />
            Opportunity Heatmap
          </p>
          <p className="mt-1 text-[10px]" style={{ color: palette.muted }}>
            Lead opportunity intensity across this week.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[8px]" style={{ color: palette.muted }}>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: GREEN }} />Low</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />Medium</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: RED }} />High</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {dayScores.map((day) => {
          const intensity = day.score;
          const color = getOpportunityColor(intensity);
          const selected = day.key === toDateKey(selectedDate);

          return (
            <div
              key={day.key}
              className="rounded-xl border p-2.5 transition-all hover:-translate-y-0.5"
              style={{
                borderColor: selected ? hexToRgba(color, 0.65) : palette.border,
                backgroundColor: intensity
                  ? hexToRgba(color, isLightMode ? 0.07 + intensity / 1000 : 0.10 + intensity / 1100)
                  : palette.elevated,
                boxShadow: selected ? `0 8px 22px ${hexToRgba(color, 0.10)}` : "none",
              }}
            >
              <p className="text-[9px] font-semibold" style={{ color: selected ? color : palette.secondary }}>
                {day.short}
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: palette.foreground }}>
                {day.score || "—"}
              </p>
              <p className="mt-0.5 text-[8px]" style={{ color: palette.mutedDark }}>
                {day.value ? `${formatCurrency(day.value)} pipeline` : "No pipeline"}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: palette.progress }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, intensity)}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================
   MOBILE DAY SUMMARY
========================================================= */

function MobileDaySummary({
  selectedDate,
  selectedEvent,
  visibleEvents,
  onSelectEvent,
  onCreate,
  isLightMode,
}: {
  selectedDate: Date;
  selectedEvent: CalendarEvent | null;
  visibleEvents: CalendarEvent[];
  onSelectEvent: (
    event: CalendarEvent
  ) => void;
  onCreate: () => void;
  isLightMode: boolean;
}) {
  const palette =
    getPalette(isLightMode);

  const dayKey =
    toDateKey(selectedDate);

  const dayEvents =
    visibleEvents.filter(
      (event) =>
        eventDateKey(event) ===
        dayKey
    );

  return (
    <section
      className="mt-4 rounded-2xl border p-4"
      style={{
        borderColor:
          palette.border,
        backgroundColor:
          palette.panel,
        boxShadow:
          palette.shadow,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                isLightMode
                  ? "#EAF3FF"
                  : "#10243A",
              color: BLUE,
            }}
          >
            <CalendarIcon
              size={15}
            />
          </span>

          <h2
            className="truncate text-sm font-semibold"
            style={{
              color:
                palette.foreground,
            }}
          >
            {formatLongDate(
              selectedDate
            )}
          </h2>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="shrink-0 text-[10px]"
          style={{
            color: GOLD,
          }}
        >
          Add Event
          <Plus
            size={12}
            className="ml-1 inline"
          />
        </button>
      </div>

      {selectedEvent &&
        eventDateKey(
          selectedEvent
        ) === dayKey && (
          <button
            type="button"
            onClick={() =>
              onSelectEvent(
                selectedEvent
              )
            }
            className="mt-4 flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5"
            style={{
              borderColor:
                hexToRgba(
                  GREEN,
                  0.35
                ),
              backgroundColor:
                isLightMode
                  ? "#EFFBDC"
                  : "#18200B",
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Video
                size={18}
                className="shrink-0"
                style={{
                  color: GREEN,
                }}
              />

              <div className="min-w-0">
                <p
                  className="text-[10px]"
                  style={{
                    color:
                      GREEN,
                  }}
                >
                  {selectedEvent.start}{" "}
                  –{" "}
                  {selectedEvent.end}
                </p>

                <p
                  className="text-xs font-semibold"
                  style={{
                    color:
                      palette.foreground,
                  }}
                >
                  {selectedEvent.title}
                  {selectedEvent.lead
                    ? ` — ${selectedEvent.lead}`
                    : ""}
                </p>
              </div>
            </div>

            <ChevronRight
              size={15}
              className="shrink-0"
              style={{
                color:
                  palette.muted,
              }}
            />
          </button>
        )}

      <div className="mt-3">
        {dayEvents.length === 0 ? (
          <div
            className="rounded-xl border p-5 text-center"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.elevated,
            }}
          >
            <p
              className="text-xs font-medium"
              style={{
                color:
                  palette.secondary,
              }}
            >
              No events scheduled
            </p>
          </div>
        ) : (
          dayEvents
            .filter(
              (event) =>
                event.id !==
                selectedEvent?.id
            )
            .map((event) => {
              const colors =
                eventColors(
                  event.color,
                  isLightMode
                );

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() =>
                    onSelectEvent(
                      event
                    )
                  }
                  className="group flex w-full items-center gap-3 rounded-xl border-b py-3 text-left"
                  style={{
                    borderColor:
                      palette.border,
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor:
                        colors.iconBg,
                      color:
                        colors.accent,
                    }}
                  >
                    <EventIcon
                      icon={
                        event.icon
                      }
                      size={15}
                    />
                  </span>

                  <span
                    className="w-16 shrink-0 text-[10px]"
                    style={{
                      color:
                        palette.muted,
                    }}
                  >
                    {event.start}
                  </span>

                  <span
                    className="min-w-0 flex-1 text-xs font-medium"
                    style={{
                      color:
                        palette.secondary,
                    }}
                  >
                    {event.title}
                    {event.lead
                      ? ` — ${event.lead}`
                      : ""}
                  </span>

                  <ChevronRight
                    size={14}
                    style={{
                      color:
                        palette.mutedDark,
                    }}
                  />
                </button>
              );
            })
        )}
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs transition-all hover:-translate-y-0.5"
        style={{
          borderColor:
            palette.border,
          backgroundColor:
            palette.elevated,
          color:
            palette.secondary,
        }}
      >
        <Plus size={15} />
        Add Task or Event
      </button>
    </section>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function CalendarPage() {
  const isLightMode =
    useLightMode();

  const palette =
    getPalette(isLightMode);

  const [view, setView] =
    useState<CalendarView>(
      "Week"
    );

  const [selectedDate, setSelectedDate] =
    useState(
      DEFAULT_DATE
    );

  const [calendarEvents, setCalendarEvents] =
    useState<CalendarEvent[]>([]);

  const [selectedEventId, setSelectedEventId] =
    useState<number | null>(null);



  const [filterOpen, setFilterOpen] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState<EventFilter>(
      "All Events"
    );

  const [mobileEventOpen, setMobileEventOpen] =
    useState(false);

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [location, setLocation] =
    useState("All locations");

  const [locationOpen, setLocationOpen] =
    useState(false);

  const [datePickerOpen, setDatePickerOpen] =
    useState(false);


  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [eventModalOpen, setEventModalOpen] =
    useState(false);

  const [editingEvent, setEditingEvent] =
    useState<CalendarEvent | null>(
      null
    );

  const [toastMessage, setToastMessage] =
    useState<string | null>(null);

  // Load the workspace's real events.
  useEffect(() => {
    let mounted = true;

    fetch("/api/calendar/events")
      .then((response) => response.json())
      .then((result) => {
        if (!mounted) return;

        const rows = (result.events ?? []) as CalendarEventRow[];
        const events = rows.map(rowToEvent);
        setCalendarEvents(events);

        // Attach each lead's real opportunity score.
        const leadIds = events
          .map((event) => event.leadId)
          .filter((id): id is string => Boolean(id));

        if (leadIds.length) {
          supabase
            .from("leads")
            .select("id, ai_score, intent_score")
            .in("id", leadIds)
            .then(({ data }) => {
              if (!mounted || !data) return;
              const scores = new Map(
                data.map((lead) => [
                  String(lead.id),
                  Number(lead.ai_score ?? lead.intent_score ?? 0),
                ])
              );
              setCalendarEvents((current) =>
                current.map((event) =>
                  event.leadId && scores.has(event.leadId)
                    ? { ...event, opportunityScore: scores.get(event.leadId) }
                    : event
                )
              );
            });
        }

        if (result.error) {
          setToastMessage(
            "Calendar could not load. Run the latest Supabase migration."
          );
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const [hostProfileImage, setHostProfileImage] =
    useState<string | null>(null);

  const weekDays =
    getWeekDays(selectedDate);

  const dateRange =
    view === "Month"
      ? formatMonthYear(selectedDate)
      : view === "Year"
      ? String(selectedDate.getFullYear())
      : `${formatShortDate(
          weekDays[0].fullDate
        )} – ${formatShortDate(
          weekDays[6].fullDate
        )}, ${selectedDate.getFullYear()}`;

  const selectedEvent =
    calendarEvents.find(
      (event) =>
        event.id ===
        selectedEventId
    ) ?? null;

  // Real locations taken from the events themselves.
  const locationOptions = useMemo(
    () => [
      "All locations",
      ...Array.from(
        new Set(
          calendarEvents
            .map((event) => event.location?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ),
    ],
    [calendarEvents]
  );

  const visibleEvents =
    useMemo(() => {
      return calendarEvents.filter(
        (event) =>
          (activeFilter === "All Events" ||
            event.type === activeFilter) &&
          (location === "All locations" ||
            event.location?.trim() === location)
      );
    }, [
      activeFilter,
      calendarEvents,
      location,
    ]);

  useEffect(() => {
    let mounted = true;

    async function loadHostProfileImage() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) setHostProfileImage(null);
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

        if (ownerError) throw ownerError;

        if (ownedCompany?.id) {
          companyId = String(ownedCompany.id);
        } else {
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

          if (membershipError) throw membershipError;
          companyId = membership?.company_id
            ? String(membership.company_id)
            : null;
        }

        if (!companyId) {
          if (mounted) setHostProfileImage(null);
          return;
        }

        const {
          data: companyProfile,
          error: companyError,
        } = await supabase
          .from("company_profiles")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        if (companyError) throw companyError;

        if (mounted) {
          setHostProfileImage(
            getCompanyProfileImage(
              (companyProfile ?? null) as Record<string, unknown> | null,
            ),
          );
        }
      } catch (error) {
        console.error(
          "Calendar company profile image load error:",
          error,
        );
        if (mounted) setHostProfileImage(null);
      }
    }

    loadHostProfileImage();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer =
      window.setTimeout(
        () =>
          setToastMessage(null),
        3000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [toastMessage]);

  function selectEvent(
    event: CalendarEvent
  ) {
    setSelectedEventId(
      event.id
    );
    setMobileEventOpen(true);
  }

  function moveCalendar(
    direction: number
  ) {
    const next =
      new Date(selectedDate);

    if (view === "Day") {
      next.setDate(
        next.getDate() +
          direction
      );
    } else if (
      view === "Month"
    ) {
      next.setMonth(
        next.getMonth() +
          direction
      );
    } else if (
      view === "Year"
    ) {
      next.setFullYear(
        next.getFullYear() +
          direction
      );
    } else if (
      view === "Focus"
    ) {
      next.setDate(
        next.getDate() +
          direction
      );
    } else {
      next.setDate(
        next.getDate() +
          direction * 7
      );
    }

    setSelectedDate(next);
  }

  function goToday() {
    setSelectedDate(
      new Date()
    );
  }

  function openCreateModal(
    type: EventType = "Meeting"
  ) {
    setEditingEvent(null);
    setEventModalOpen(true);
  }

  function openEditModal(
    event: CalendarEvent
  ) {
    setEditingEvent(event);
    setEventModalOpen(true);
    setMobileEventOpen(false);
  }

  // Saves to Supabase (and Google Calendar when connected).
  async function persistEvent(
    event: CalendarEvent
  ): Promise<CalendarEvent | null> {
    const response = await fetch(
      "/api/calendar/events",
      {
        method: event.dbId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventToPayload(event)),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.event) {
      setToastMessage(
        result.error || "The event could not be saved."
      );
      return null;
    }

    return {
      ...rowToEvent(result.event as CalendarEventRow, 0),
      id: event.id,
      leadId: event.leadId ?? null,
      lead: event.lead,
      opportunityScore: event.opportunityScore,
    };
  }

  async function saveEvent(
    event: CalendarEvent
  ) {
    const saved = await persistEvent(event);

    if (!saved) {
      return;
    }

    setCalendarEvents(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.id ===
              saved.id
          );

        if (exists) {
          return current.map(
            (item) =>
              item.id === saved.id
                ? saved
                : item
          );
        }

        return [
          ...current,
          saved,
        ];
      }
    );

    setSelectedEventId(
      saved.id
    );

    setSelectedDate(
      dateFromKey(
        eventDateKey(saved)
      )
    );

    setEventModalOpen(false);
    setEditingEvent(null);

    setToastMessage(
      "Event saved successfully."
    );
  }

  async function deleteEvent(
    event: CalendarEvent
  ) {
    const confirmed =
      window.confirm(
        `Delete "${event.title}"?`
      );

    if (!confirmed) {
      return;
    }

    if (event.dbId) {
      const response = await fetch(
        `/api/calendar/events?id=${encodeURIComponent(event.dbId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        setToastMessage(
          "The event could not be deleted."
        );
        return;
      }
    }

    setCalendarEvents(
      (current) =>
        current.filter(
          (item) =>
            item.id !== event.id
        )
    );

    setSelectedEventId(null);
    setMobileEventOpen(false);

    setToastMessage(
      "Event deleted."
    );
  }

  async function createAutomaticFollowUp(event: CalendarEvent) {
    const baseDate = dateFromKey(eventDateKey(event));
    const followUpDate = new Date(baseDate);
    followUpDate.setDate(followUpDate.getDate() + 3);

    const existingIds = calendarEvents.map((item) => item.id);
    const nextId = Math.max(0, ...existingIds) + 1;
    const draft: CalendarEvent = {
      id: nextId,
      leadId: event.leadId ?? null,
      title: `Follow-up: ${event.lead || event.title}`,
      lead: event.lead,
      type: "Call",
      date: formatShortDate(followUpDate),
      dateKey: toDateKey(followUpDate),
      start: "10:00 AM",
      end: "10:30 AM",
      color: "green",
      icon: "phone",
      category: event.category,
      location: event.location,
      source: "BaseLead",
      notes: `Follow-up created from ${event.title}.`,
      opportunityValue: event.opportunityValue,
      opportunityScore: event.opportunityScore,
    };

    const followUp = await persistEvent(draft);

    if (!followUp) {
      return;
    }

    setCalendarEvents((current) => [...current, followUp]);
    setSelectedEventId(followUp.id);
    setSelectedDate(followUpDate);
    setMobileEventOpen(false);
    setToastMessage(`Follow-up scheduled for ${formatShortDate(followUpDate)} at 10:00 AM.`);
  }

  // Opens the meeting link saved in the event's location.
  function handleJoinCall() {
    const link = selectedEvent?.location?.match(/https?:\/\/\S+/)?.[0];

    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }

    setToastMessage(
      "Add a meeting link (Zoom, Google Meet...) to the event's location to join from here."
    );
  }


  return (
    <main
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor:
          palette.page,
        color:
          palette.foreground,
      }}
    >
      {/* =====================================================
          DESKTOP HEADER
      ===================================================== */}

      <div className="hidden items-center justify-end gap-3 px-6 pt-5 lg:flex">
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setLocationOpen(
                (current) =>
                  !current
              )
            }
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all hover:-translate-y-0.5"
            style={{
              borderColor:
                locationOpen
                  ? hexToRgba(
                      GOLD,
                      0.45
                    )
                  : palette.border,
              backgroundColor:
                palette.panel,
              color:
                palette.secondary,
              boxShadow:
                palette.smallShadow,
            }}
          >
            <MapPin
              size={15}
              style={{
                color: GOLD,
              }}
            />
            {location}
            <ChevronDown
              size={13}
            />
          </button>

          {locationOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border p-2"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.panel,
                boxShadow:
                  palette.hoverShadow,
              }}
            >
              {locationOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setLocation(
                      item
                    );
                    setLocationOpen(
                      false
                    );
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs transition-all hover:-translate-y-0.5"
                  style={{
                    color:
                      item ===
                      location
                        ? GOLD
                        : palette.secondary,
                    backgroundColor:
                      item ===
                      location
                        ? isLightMode
                          ? "#FFF7D6"
                          : "#332A0C"
                        : "transparent",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setDatePickerOpen(
                (current) =>
                  !current
              )
            }
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all hover:-translate-y-0.5"
            style={{
              borderColor:
                datePickerOpen
                  ? hexToRgba(
                      BLUE,
                      0.45
                    )
                  : palette.border,
              backgroundColor:
                palette.panel,
              color:
                palette.secondary,
              boxShadow:
                palette.smallShadow,
            }}
          >
            <CalendarIcon
              size={15}
              style={{
                color: BLUE,
              }}
            />
            {dateRange}
            <ChevronDown
              size={13}
            />
          </button>

          {datePickerOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border p-4"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.panel,
                boxShadow:
                  palette.hoverShadow,
              }}
            >
              <p
                className="text-[10px] font-semibold"
                style={{
                  color:
                    palette.secondary,
                }}
              >
                Jump to date
              </p>

              <input
                type="date"
                value={toDateKey(
                  selectedDate
                )}
                onChange={(e) => {
                  if (
                    e.target.value
                  ) {
                    setSelectedDate(
                      dateFromKey(
                        e.target.value
                      )
                    );
                    setDatePickerOpen(
                      false
                    );
                  }
                }}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-xs outline-none"
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color:
                    palette.foreground,
                }}
              />

              <button
                type="button"
                onClick={() => {
                  goToday();
                  setDatePickerOpen(
                    false
                  );
                }}
                className="mt-2 w-full rounded-lg border py-2 text-[10px]"
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.elevated,
                  color: GOLD,
                }}
              >
                Jump to Today
              </button>
            </div>
          )}
        </div>

      </div>

      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <div className="relative flex items-center justify-between gap-2 px-4 pt-5 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() =>
            setMobileMenuOpen(
              (current) =>
                !current
            )
          }
          className="transition-colors"
          style={{
            color:
              mobileMenuOpen
                ? GOLD
                : palette.muted,
          }}
        >
          <MoreHorizontal
            size={24}
            className="rotate-90"
          />
        </button>

        <div className="flex items-center gap-2">
          <span
            className="text-xl font-semibold"
            style={{
              color:
                palette.foreground,
            }}
          >
            Base
          </span>

          <span
            className="text-xl font-semibold"
            style={{
              color: GOLD,
            }}
          >
            Lead
          </span>

          <span
            className="text-[9px]"
            style={{
              color: GOLD,
            }}
          >
            ✦
          </span>
        </div>


        {mobileMenuOpen && (
          <div
            className="absolute left-4 top-14 z-50 w-48 rounded-xl border p-2"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.panel,
              boxShadow:
                palette.hoverShadow,
            }}
          >
            {[
              "Dashboard",
              "Lead Discovery",
              "Leads",
              "Calendar",
            ].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                className="w-full rounded-lg px-3 py-2.5 text-left text-xs"
                style={{
                  color:
                    item ===
                    "Calendar"
                      ? GOLD
                      : palette.secondary,
                  backgroundColor:
                    item ===
                    "Calendar"
                      ? isLightMode
                        ? "#FFF7D6"
                        : "#332A0C"
                      : "transparent",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* =====================================================
          PAGE CONTENT
      ===================================================== */}

      <div
        className={`px-4 pb-8 pt-5 transition-[padding] duration-300 sm:px-6 lg:px-7 lg:pb-8 ${
          sidebarOpen
            ? "xl:pr-[326px]"
            : "xl:pr-7"
        }`}
      >
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight lg:text-[28px]"
            style={{
              color:
                palette.foreground,
            }}
          >
            Calendar
          </h1>

          <p
            className="mt-1 text-sm"
            style={{
              color:
                palette.muted,
            }}
          >
            Schedule meetings, follow-ups, and important tasks.
          </p>
        </div>

        {/* Mobile location/date */}
        <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setLocationOpen(
                  (current) =>
                    !current
                )
              }
              className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[10px]"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.panel,
                color:
                  palette.secondary,
              }}
            >
              <MapPin
                size={13}
                style={{
                  color: GOLD,
                }}
              />
              {location.replace(
                ", Texas",
                ""
              )}
              <ChevronDown
                size={11}
              />
            </button>

            {locationOpen && (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border p-2"
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.panel,
                  boxShadow:
                    palette.hoverShadow,
                }}
              >
                {locationOptions.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setLocation(
                          item
                        );
                        setLocationOpen(
                          false
                        );
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-[10px]"
                      style={{
                        color:
                          item ===
                          location
                            ? GOLD
                            : palette.secondary,
                      }}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setDatePickerOpen(
                (current) =>
                  !current
              )
            }
            className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[10px]"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.panel,
              color:
                palette.secondary,
            }}
          >
            <CalendarIcon
              size={13}
              style={{
                color: BLUE,
              }}
            />
            {dateRange}
            <ChevronDown
              size={11}
            />
          </button>
        </div>

        {datePickerOpen && (
          <div
            className="mt-3 rounded-xl border p-4 lg:hidden"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.panel,
              boxShadow:
                palette.shadow,
            }}
          >
            <input
              type="date"
              value={toDateKey(
                selectedDate
              )}
              onChange={(e) => {
                if (
                  e.target.value
                ) {
                  setSelectedDate(
                    dateFromKey(
                      e.target.value
                    )
                  );
                  setDatePickerOpen(
                    false
                  );
                }
              }}
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.elevated,
                color:
                  palette.foreground,
              }}
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 lg:mt-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center">
            <div
              className="flex overflow-hidden rounded-xl border"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.panel,
                boxShadow:
                  palette.smallShadow,
              }}
            >
              {(
                [
                  ["Day", Sun, "#F5C518"],
                  ["Week", Rows3, "#60A5FA"],
                  ["Month", CalendarDays, "#A78BFA"],
                  ["Year", CalendarRange, "#22D3EE"],
                  ["Focus", Crosshair, "#F472B6"],
                ] as const
              ).map(([item, Icon, color]) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setView(
                      item as CalendarView
                    )
                  }
                  data-active={view === item}
                  className="bl-tab m-0.5 flex items-center gap-1.5 rounded-lg border border-transparent px-3.5 py-2 text-xs"
                  style={{
                    "--tab": color,
                    color: palette.secondary,
                    fontWeight: view === item ? 600 : 500,
                  } as CSSProperties}
                >
                  <Icon size={14} strokeWidth={2.2} className="bl-tab-emoji" style={{ color }} aria-hidden />
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex">
              <button
                type="button"
                onClick={() =>
                  moveCalendar(-1)
                }
                aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-l-xl border transition-all hover:-translate-y-0.5"
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.panel,
                  color:
                    palette.muted,
                }}
              >
                <ChevronLeft
                  size={15}
                />
              </button>

              <button
                type="button"
                onClick={goToday}
                className="flex h-10 items-center justify-center border-y px-4 text-xs transition-all hover:-translate-y-0.5"
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.panel,
                  color:
                    palette.secondary,
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() =>
                  moveCalendar(1)
                }
                aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-r-xl border transition-all hover:-translate-y-0.5"
                style={{
                  borderColor:
                    palette.border,
                  backgroundColor:
                    palette.panel,
                  color:
                    palette.muted,
                }}
              >
                <ChevronRight
                  size={15}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setFilterOpen(
                  (current) =>
                    !current
                )
              }
              className="flex h-10 items-center gap-2 rounded-xl border px-4 text-xs transition-all hover:-translate-y-0.5"
              style={{
                borderColor:
                  filterOpen
                    ? GOLD
                    : palette.border,
                backgroundColor:
                  filterOpen
                    ? isLightMode
                      ? "#FFF7D6"
                      : "#332A0C"
                    : palette.panel,
                color:
                  filterOpen
                    ? GOLD
                    : palette.secondary,
              }}
            >
              <Filter size={14} />
              Filter
            </button>

            <button
              type="button"
              onClick={() =>
                openCreateModal()
              }
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-black transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor:
                  GOLD,
                boxShadow: `0 7px 20px ${hexToRgba(
                  GOLD,
                  0.12
                )}`,
              }}
            >
              <Plus size={15} />
              New Event
              <ChevronDown
                size={13}
              />
            </button>
          </div>
        </div>

        {/* Filters */}
        {filterOpen && (
          <div
            className="mt-3 flex flex-wrap gap-2 rounded-2xl border p-3"
            style={{
              borderColor:
                palette.border,
              backgroundColor:
                palette.panel,
              boxShadow:
                palette.shadow,
            }}
          >
            {[
              "All Events",
              "Meeting",
              "Call",
              "Email",
              "Task",
            ].map((filter) => {
              const active =
                activeFilter ===
                filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setActiveFilter(
                      filter as EventFilter
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-[10px] font-medium transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor:
                      active
                        ? hexToRgba(
                            GOLD,
                            0.45
                          )
                        : palette.border,
                    backgroundColor:
                      active
                        ? isLightMode
                          ? "#FFF7D6"
                          : "#332A0C"
                        : palette.elevated,
                    color:
                      active
                        ? GOLD
                        : palette.secondary,
                  }}
                >
                  {filter ===
                  "Meeting"
                    ? "Meetings"
                    : filter ===
                      "Call"
                    ? "Calls"
                    : filter ===
                      "Email"
                    ? "Emails"
                    : filter ===
                      "Task"
                    ? "Tasks"
                    : filter}
                </button>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        <div className="mt-4">
          {view === "Week" && (
            <>
              <div className="hidden lg:block">
                <DesktopWeekCalendar
                  days={weekDays}
                  visibleEvents={
                    visibleEvents
                  }
                  onSelectEvent={
                    selectEvent
                  }
                  isLightMode={
                    isLightMode
                  }
                  selectedDate={
                    selectedDate
                  }
                />
              </div>

              <div className="lg:hidden">
                <MobileWeekCalendar
                  days={weekDays}
                  visibleEvents={
                    visibleEvents
                  }
                  onSelectEvent={
                    selectEvent
                  }
                  isLightMode={
                    isLightMode
                  }
                  selectedDate={
                    selectedDate
                  }
                />
              </div>
            </>
          )}

          {view === "Day" && (
            <DayCalendar
              selectedDate={
                selectedDate
              }
              visibleEvents={
                visibleEvents
              }
              onSelectEvent={
                selectEvent
              }
              isLightMode={
                isLightMode
              }
            />
          )}

          {view === "Month" && (
            <MonthCalendar
              selectedDate={
                selectedDate
              }
              visibleEvents={
                visibleEvents
              }
              onSelectEvent={
                selectEvent
              }
              onSelectDate={
                setSelectedDate
              }
              isLightMode={
                isLightMode
              }
            />
          )}

          {view === "Year" && (
            <YearCalendar
              selectedDate={selectedDate}
              visibleEvents={visibleEvents}
              onSelectEvent={selectEvent}
              onSelectDate={setSelectedDate}
              isLightMode={isLightMode}
            />
          )}

          {view === "Focus" && (
            <FocusCalendar
              selectedDate={selectedDate}
              visibleEvents={visibleEvents}
              onSelectEvent={selectEvent}
              onCreateFollowUp={createAutomaticFollowUp}
              isLightMode={isLightMode}
            />
          )}
        </div>

        {/* Legend */}
        <div
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border px-3 py-3"
          style={{
            borderColor:
              palette.border,
            backgroundColor:
              palette.panel,
            boxShadow:
              palette.smallShadow,
          }}
        >
          {[
            ["Meeting", BLUE],
            ["Call", GREEN],
            ["Email", GOLD],
            ["Task", CYAN],
            ["Break", "#777777"],
            ["Review", PURPLE],
          ].map(
            ([label, color]) => (
              <div
                key={label}
                className="flex items-center gap-2"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      color,
                  }}
                />

                <span
                  className="text-[10px]"
                  style={{
                    color:
                      palette.muted,
                  }}
                >
                  {label}
                </span>
              </div>
            )
          )}
        </div>

        {/* Mobile summary */}
        <div className="lg:hidden">
          <MobileDaySummary
            selectedDate={
              selectedDate
            }
            selectedEvent={
              selectedEvent
            }
            visibleEvents={
              visibleEvents
            }
            onSelectEvent={(event) => {
              setSelectedEventId(
                event.id
              );
              setMobileEventOpen(
                true
              );
            }}
            onCreate={() =>
              openCreateModal()
            }
            isLightMode={
              isLightMode
            }
          />
        </div>
      </div>

      {/* =====================================================
          DESKTOP RIGHT SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed bottom-0 right-0 top-0 z-30 hidden w-[300px] overflow-y-auto p-5 transition-transform duration-300 ease-out xl:block ${
          sidebarOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
        style={{
          backgroundColor:
            palette.page,
          borderLeft: `1px solid ${palette.border}`,
          boxShadow:
            palette.sidebarShadow,
        }}
      >
        <div className="mt-16">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p
                className="text-[10px] font-medium uppercase tracking-[0.14em]"
                style={{
                  color:
                    palette.mutedDark,
                }}
              >
                Calendar
              </p>

              <p
                className="mt-1 text-sm font-semibold"
                style={{
                  color:
                    palette.foreground,
                }}
              >
                Schedule details
              </p>
            </div>

            <button
              type="button"
              aria-label="Close calendar sidebar"
              onClick={() =>
                setSidebarOpen(false)
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.panel,
                color:
                  palette.muted,
              }}
            >
              <ChevronRight
                size={15}
              />
            </button>
          </div>

          <div className="mb-5">
            <MiniCalendar
              selectedDate={
                selectedDate
              }
              onSelectDate={(
                date
              ) => {
                setSelectedDate(
                  date
                );
                setView("Day");
              }}
              isLightMode={
                isLightMode
              }
            />
          </div>

          {selectedEvent && (
            <EventDetail
              event={
                selectedEvent
              }
              isLightMode={
                isLightMode
              }
              onEdit={() =>
                openEditModal(
                  selectedEvent
                )
              }
              onDelete={() =>
                deleteEvent(
                  selectedEvent
                )
              }
              onJoin={
                handleJoinCall
              }
              onCreateFollowUp={() =>
                createAutomaticFollowUp(
                  selectedEvent
                )
              }
              hostProfileImage={
                hostProfileImage
              }
            />
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() =>
                openCreateModal(
                  "Task"
                )
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-[10px] transition-all hover:-translate-y-0.5"
              style={{
                borderColor:
                  palette.border,
                backgroundColor:
                  palette.elevated,
                color:
                  palette.secondary,
              }}
            >
              <Plus size={14} />
              Add Task or Event
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================
          SIDEBAR OPEN / CLOSE TAB
      ===================================================== */}

      <button
        type="button"
        aria-label={
          sidebarOpen
            ? "Close calendar sidebar"
            : "Open calendar sidebar"
        }
        onClick={() =>
          setSidebarOpen(
            (current) =>
              !current
          )
        }
        className="fixed right-0 top-[118px] z-40 hidden h-11 w-8 items-center justify-center rounded-l-xl border transition-all duration-300 hover:-translate-x-1 xl:flex"
        style={{
          right: sidebarOpen
            ? "300px"
            : "0px",
          borderColor:
            palette.borderLight,
          backgroundColor:
            palette.panel,
          color:
            sidebarOpen
              ? palette.muted
              : GOLD,
          boxShadow:
            palette.smallShadow,
        }}
      >
        {sidebarOpen ? (
          <ChevronRight
            size={16}
          />
        ) : (
          <ChevronLeft
            size={16}
          />
        )}
      </button>

      {/* =====================================================
          MOBILE EVENT DETAIL
      ===================================================== */}

      {mobileEventOpen &&
        selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-[3px] xl:hidden">
            <div
              className="max-h-[82vh] w-full overflow-y-auto rounded-t-3xl border p-4"
              style={{
                backgroundColor:
                  palette.page,
                borderColor:
                  palette.border,
                boxShadow:
                  "0 -18px 50px rgba(0,0,0,0.22)",
              }}
            >
              <div className="mb-3 flex justify-center">
                <span
                  className="h-1 w-10 rounded-full"
                  style={{
                    backgroundColor:
                      palette.borderLight,
                  }}
                />
              </div>

              <EventDetail
                event={
                  selectedEvent
                }
                isLightMode={
                  isLightMode
                }
                onClose={() =>
                  setMobileEventOpen(
                    false
                  )
                }
                onEdit={() =>
                  openEditModal(
                    selectedEvent
                  )
                }
                onDelete={() =>
                  deleteEvent(
                    selectedEvent
                  )
                }
                onJoin={
                  handleJoinCall
                }
                onCreateFollowUp={() =>
                  createAutomaticFollowUp(
                    selectedEvent
                  )
                }
                hostProfileImage={
                  hostProfileImage
                }
              />
            </div>
          </div>
        )}

      {/* =====================================================
          EVENT MODAL
      ===================================================== */}

      <EventModal
        open={eventModalOpen}
        event={editingEvent}
        defaultDate={
          selectedDate
        }
        onClose={() => {
          setEventModalOpen(
            false
          );
          setEditingEvent(null);
        }}
        onSave={saveEvent}
        isLightMode={
          isLightMode
        }
      />

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toastMessage && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border px-4 py-3 text-xs font-medium shadow-xl"
          style={{
            borderColor:
              hexToRgba(
                GOLD,
                0.35
              ),
            backgroundColor:
              palette.panel,
            color:
              palette.foreground,
          }}
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}
