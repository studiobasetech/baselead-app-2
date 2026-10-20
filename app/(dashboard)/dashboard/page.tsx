"use client";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Users,
  Flame,
  UserCheck,
  Mail,
  MapPin,
  ChevronDown,
  UserPlus,
  Send,
  MessageSquare,
  FileCheck,
  Trophy,
  ArrowUpRight,
  Calendar as CalendarIcon,
  X,
  Sparkles,
  TrendingUp,
  CircleDollarSign,
  BarChart3,
  Zap,
  Radar,
  CheckCircle2,
  Activity,
  ExternalLink,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/components/lib/supabase";
import { usePreferences } from "@/components/preferences/PreferencesProvider";

/* =========================================================
   BASELEAD BRAND COLORS
========================================================= */

const GOLD = "#F5C518";
const PURPLE = "#A78BFA";
const RED = "#F0475C";
const GREEN = "#84CC16";
const BLUE = "#60A5FA";

/* =========================================================
   DARK SURFACE COLORS
========================================================= */

const PANEL = "#0D0D0D";
const BORDER = "#202020";
const BORDER_LIGHT = "#2A2A2A";
const MUTED = "#777777";

/* =========================================================
   BRAND SURFACE COLORS
========================================================= */

const GOLD_SURFACE = "#332A0C";
const PURPLE_SURFACE = "#241A38";
const RED_SURFACE = "#3A1418";
const GREEN_SURFACE = "#18200B";
const BLUE_SURFACE = "#10243A";

const LIGHT_ICON_SURFACES: Record<string, string> = {
  [GOLD_SURFACE]: "#FFF7D6",
  [PURPLE_SURFACE]: "#F0EAFF",
  [RED_SURFACE]: "#FFEBEE",
  [GREEN_SURFACE]: "#EFFBDC",
  [BLUE_SURFACE]: "#EAF3FF",
};

function getDashboardIconSurface(
  darkSurface: string,
  isLightMode: boolean,
): string {
  return isLightMode
    ? LIGHT_ICON_SURFACES[darkSurface] ?? "#F1F1F4"
    : darkSurface;
}


/* =========================================================
   HELPERS
========================================================= */

function hexToRgba(
  hex: string,
  alpha: number,
): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function useLightMode() {
  const [isLightMode, setIsLightMode] =
    useState(false);

  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      setIsLightMode(
        root.classList.contains("baselead-light"),
      );
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isLightMode;
}

function normalizeStatus(
  status: string | null,
): string {
  return (status || "new").toLowerCase().trim();
}

function getLeadScore(
  lead: DatabaseLead,
): number {
  if (typeof lead.ai_score === "number") {
    return Math.max(
      0,
      Math.min(100, lead.ai_score),
    );
  }

  if (typeof lead.intent_score === "number") {
    return Math.max(
      0,
      Math.min(100, lead.intent_score),
    );
  }

  return 0;
}

function formatDate(
  date: string | null,
): string {
  if (!date) {
    return "Unknown";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRelativeTime(
  date: string | null,
): string {
  if (!date) {
    return "Unknown";
  }

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const diff = Date.now() - timestamp;

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(date);
}

function getSourceName(
  source: string | null,
): string {
  if (!source) {
    return "Other";
  }

  const normalized = source.toLowerCase();

  if (
    normalized.includes("google") ||
    normalized.includes("place") ||
    normalized.includes("maps")
  ) {
    return "Google Places";
  }

  if (
    normalized.includes("website") ||
    normalized.includes("site") ||
    normalized.includes("scan")
  ) {
    return "Website Scan";
  }

  if (
    normalized.includes("directory") ||
    normalized.includes("yelp")
  ) {
    return "Directories";
  }

  if (
    normalized.includes("social") ||
    normalized.includes("instagram") ||
    normalized.includes("facebook") ||
    normalized.includes("linkedin")
  ) {
    return "Social Media";
  }

  if (normalized.includes("referral")) {
    return "Referrals";
  }

  if (normalized === "test") {
    return "Test";
  }

  return source;
}

function getPipelineStage(
  status: string | null,
): string {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "new":
      return "New";

    case "contacted":
      return "Contacted";

    case "responded":
    case "replied":
    case "meeting":
      return "Responded";

    case "qualified":
      return "Qualified";

    case "proposal":
      return "Proposal";

    case "negotiation":
      return "Negotiation";

    case "won":
    case "client":
    case "closed_won":
      return "Won";

    default:
      return "New";
  }
}

/* =========================================================
   REAL VALUE HELPERS
========================================================= */

function parseNumericValue(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getLeadValue(
  lead: DatabaseLead,
): number | null {
  const directLead =
    lead as DatabaseLead & {
      estimated_value?: unknown;
      estimated_project_value?: unknown;
      project_value?: unknown;
      deal_value?: unknown;
      pipeline_value?: unknown;
      value?: unknown;
    };

  const directCandidates = [
    directLead.estimated_value,
    directLead.estimated_project_value,
    directLead.project_value,
    directLead.deal_value,
    directLead.pipeline_value,
    directLead.value,
  ];

  for (const candidate of directCandidates) {
    const parsed =
      parseNumericValue(candidate);

    if (
      parsed !== null &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  if (
    lead.raw_data &&
    typeof lead.raw_data === "object" &&
    !Array.isArray(lead.raw_data)
  ) {
    const raw =
      lead.raw_data as Record<
        string,
        unknown
      >;

    const rawCandidates = [
      raw.estimated_value,
      raw.estimatedValue,
      raw.estimated_project_value,
      raw.estimatedProjectValue,
      raw.project_value,
      raw.projectValue,
      raw.deal_value,
      raw.dealValue,
      raw.pipeline_value,
      raw.pipelineValue,
      raw.value,
      raw.project_price,
      raw.projectPrice,
      raw.price,
    ];

    for (const candidate of rawCandidates) {
      const parsed =
        parseNumericValue(candidate);

      if (
        parsed !== null &&
        parsed > 0
      ) {
        return parsed;
      }
    }
  }

  return null;
}

function getLeadLocation(
  lead: DatabaseLead,
): string {
  return (
    lead.location ||
    [lead.city, lead.state]
      .filter(Boolean)
      .join(", ") ||
    "Unknown"
  );
}

/* =========================================================
   TARGET LOCATION HELPERS
========================================================= */

function cleanLocationValue(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned;
}

function extractTargetLocations(
  profile: unknown,
): string[] {
  if (
    !profile ||
    typeof profile !== "object"
  ) {
    return [];
  }

  const data =
    profile as Record<
      string,
      unknown
    >;

  /*
   * IMPORTANT:
   *
   * Dashboard location filters are based on the places
   * where the company wants to FIND LEADS.
   *
   * Canonical database field:
   * company_profiles.target_locations
   *
   * This is intentionally NOT company_profiles.locations.
   */

  const possibleValue =
    data.target_locations;

  /* -------------------------------------------------------
     ARRAY
  ------------------------------------------------------- */

  if (
    Array.isArray(
      possibleValue,
    )
  ) {
    return Array.from(
      new Set(
        possibleValue
          .flatMap(
            (item) => {
              if (
                typeof item ===
                "string"
              ) {
                return [
                  item,
                ];
              }

              if (
                item &&
                typeof item ===
                  "object"
              ) {
                const locationObject =
                  item as Record<
                    string,
                    unknown
                  >;

                const value =
                  locationObject.name ||
                  locationObject.location ||
                  locationObject.label ||
                  locationObject.address ||
                  locationObject.city;

                return typeof value ===
                  "string"
                  ? [value]
                  : [];
              }

              return [];
            },
          )
          .map(
            cleanLocationValue,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort();
  }

  /* -------------------------------------------------------
     STRING
  ------------------------------------------------------- */

  if (
    typeof possibleValue ===
    "string"
  ) {
    const raw =
      possibleValue.trim();

    if (!raw) {
      return [];
    }

    /*
     * First try JSON.
     * This supports values such as:
     *
     * ["Austin, TX", "Miami, FL"]
     *
     * and arrays of objects.
     */

    try {
      const parsed =
        JSON.parse(raw);

      if (
        Array.isArray(parsed)
      ) {
        return Array.from(
          new Set(
            parsed
              .flatMap(
                (item) => {
                  if (
                    typeof item ===
                    "string"
                  ) {
                    return [
                      item,
                    ];
                  }

                  if (
                    item &&
                    typeof item ===
                      "object"
                  ) {
                    const locationObject =
                      item as Record<
                        string,
                        unknown
                      >;

                    const value =
                      locationObject.name ||
                      locationObject.location ||
                      locationObject.label ||
                      locationObject.address ||
                      locationObject.city;

                    return typeof value ===
                      "string"
                      ? [value]
                      : [];
                  }

                  return [];
                },
              )
              .map(
                cleanLocationValue,
              )
              .filter(
                (
                  value,
                ): value is string =>
                  Boolean(value),
              ),
          ),
        ).sort();
      }

      if (
        parsed &&
        typeof parsed ===
          "object"
      ) {
        const locationObject =
          parsed as Record<
            string,
            unknown
          >;

        const value =
          locationObject.name ||
          locationObject.location ||
          locationObject.label ||
          locationObject.address ||
          locationObject.city;

        const cleaned =
          cleanLocationValue(
            value,
          );

        return cleaned
          ? [cleaned]
          : [];
      }
    } catch {
      /*
       * Not JSON.
       * Continue below and treat it as plain text.
       */
    }

    /*
     * Support comma-separated and newline-separated
     * target locations.
     */

    return Array.from(
      new Set(
        raw
          .split(/[,\n]+/)
          .map(
            cleanLocationValue,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort();
  }

  /* -------------------------------------------------------
     OBJECT
  ------------------------------------------------------- */

  if (
    possibleValue &&
    typeof possibleValue ===
      "object"
  ) {
    const locationObject =
      possibleValue as Record<
        string,
        unknown
      >;

    const value =
      locationObject.name ||
      locationObject.location ||
      locationObject.label ||
      locationObject.address ||
      locationObject.city;

    const cleaned =
      cleanLocationValue(
        value,
      );

    return cleaned
      ? [cleaned]
      : [];
  }

  return [];
}

function normalizeLocation(
  value: string,
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

/* =========================================================
   TYPES
========================================================= */

type ToastType = {
  message: string;
};

type LocationMenuPosition = {
  top: number;
  left: number;
  width: number;
};

type DatabaseLead = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  source: string | null;
  status: string | null;
  intent_score: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  ai_score: number | null;
  ai_opportunity: string | null;
  ai_reason: string | null;
  ai_recommendations: string | null;
  ai_analyzed_at: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  rating: number | null;
  review_count: number | null;
  raw_data: unknown;
};

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const router =
    useRouter();

  const isLightMode =
    useLightMode();

  const {
    preferences,
    formatCurrency,
  } =
    usePreferences();

  const showOpportunityScore =
    preferences.show_opportunity_score;

  const compactLayout =
    preferences.compact_layout;

  const [leads, setLeads] =
    useState<DatabaseLead[]>(
      [],
    );

  const [companyName, setCompanyName] =
    useState("");

  const [
    companyLocations,
    setCompanyLocations,
  ] = useState<string[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(
      null,
    );

  const [location, setLocation] =
    useState(
      "All locations",
    );

  const [
    locationMenuOpen,
    setLocationMenuOpen,
  ] = useState(false);

  const [
    locationMenuPosition,
    setLocationMenuPosition,
  ] =
    useState<LocationMenuPosition | null>(
      null,
    );

  const locationButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [dateRange, setDateRange] =
    useState(
      "All time",
    );

  const [toast, setToast] =
    useState<ToastType | null>(
      null,
    );

  /* =======================================================
     LAYOUT VALUES
  ======================================================= */

  const pagePadding =
    compactLayout
      ? "p-3 sm:p-4 lg:p-5"
      : "p-4 sm:p-5 lg:p-7";

  const cardPadding =
    compactLayout
      ? "p-4"
      : "p-5";

  const sectionGap =
    compactLayout
      ? "mt-3"
      : "mt-4";

  const cardGap =
    compactLayout
      ? "gap-2"
      : "gap-3";

  const analyticsGap =
    compactLayout
      ? "gap-3"
      : "gap-4";

  /* =======================================================
     NAVIGATION HELPERS
  ======================================================= */

  function goToLeads() {
    router.push(
      "/leads",
    );
  }

  function goToPipeline() {
    router.push(
      "/pipeline",
    );
  }

  function goToOutreach() {
    router.push(
      "/outreach",
    );
  }

  function goToDiscovery() {
    router.push(
      "/leads",
    );
  }

  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(
    message: string,
  ) {
    setToast({
      message,
    });

    window.setTimeout(
      () => {
        setToast(null);
      },
      2500,
    );
  }

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setLoadError(null);

      const {
        data: {
          user,
        },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        console.error(
          "Dashboard auth error:",
          userError,
        );

        setLeads([]);
        setCompanyName("");
        setCompanyLocations(
          [],
        );
        setLoadError(
          "You must be logged in to view your dashboard.",
        );
        setLoading(false);
        return;
      }

      /* =====================================================
         LOAD COMPANY PROFILE
      ===================================================== */

      const {
        data: companyProfile,
        error: companyError,
      } =
        await supabase
          .from(
            "company_profiles",
          )
          .select("*")
          .eq(
            "user_id",
            user.id,
          )
          .maybeSingle();

      if (companyError) {
        console.error(
          "Dashboard company profile error:",
          companyError,
        );
      }

      if (
        companyProfile?.company_name
      ) {
        setCompanyName(
          companyProfile.company_name.trim(),
        );
      } else {
        setCompanyName("");
      }

      /*
       * Target locations are configured in:
       * Settings → Company → Target Locations.
       *
       * These are the places where the company wants
       * BaseLead to find potential customers/leads.
       *
       * The canonical database field is:
       * company_profiles.target_locations
       *
       * IMPORTANT:
       * This is NOT the physical business location.
       */

      const configuredTargetLocations =
        extractTargetLocations(
          companyProfile,
        );

      setCompanyLocations(
        configuredTargetLocations,
      );

      /* =====================================================
         LOAD LEADS
      ===================================================== */

      const {
        data,
        error,
      } =
        await supabase
          .from("leads")
          .select("*")
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

      if (error) {
        console.error(
          "Dashboard leads error:",
          error,
        );

        setLeads([]);
        setLoadError(
          "We couldn't load your leads right now.",
        );
        setLoading(false);
        return;
      }

      setLeads(
        (data || []) as DatabaseLead[],
      );

      setLoading(false);
    }

    loadDashboardData();
  }, []);

  /* =======================================================
     TARGET LOCATION OPTIONS
  ======================================================= */

  /*
   * Dashboard location filters are based exclusively on
   * the company's configured Target Locations.
   *
   * We intentionally DO NOT use lead locations as a fallback.
   *
   * If no Target Locations are configured:
   * - "All locations" remains available
   * - no lead-location options are generated
   * - the user is directed to Settings → Company
   */

  const availableLocations =
    useMemo(() => {
      return companyLocations;
    }, [
      companyLocations,
    ]);

  const locationOptions =
    useMemo(() => {
      return [
        "All locations",
        ...availableLocations,
      ];
    }, [
      availableLocations,
    ]);

  /* =======================================================
     KEEP LOCATION VALID
  ======================================================= */

  useEffect(() => {
    if (
      location ===
      "All locations"
    ) {
      return;
    }

    const exists =
      availableLocations.some(
        (availableLocation) =>
          normalizeLocation(
            availableLocation,
          ) ===
          normalizeLocation(
            location,
          ),
      );

    if (!exists) {
      setLocation(
        "All locations",
      );
    }
  }, [
    availableLocations,
    location,
  ]);

  /* =======================================================
     LOCATION DROPDOWN POSITION
  ======================================================= */

  function updateLocationMenuPosition() {
    const button =
      locationButtonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    const menuWidth =
      Math.max(
        rect.width,
        220,
      );

    const viewportPadding =
      12;

    const maxLeft =
      window.innerWidth -
      menuWidth -
      viewportPadding;

    const left =
      Math.min(
        Math.max(
          rect.left,
          viewportPadding,
        ),
        Math.max(
          viewportPadding,
          maxLeft,
        ),
      );

    const estimatedMenuHeight =
      Math.min(
        320,
        Math.max(
          120,
          (locationOptions.length +
            1) *
            42,
        ),
      );

    let top =
      rect.bottom + 8;

    if (
      top +
        estimatedMenuHeight >
      window.innerHeight -
        viewportPadding
    ) {
      top =
        rect.top -
        estimatedMenuHeight -
        8;
    }

    if (
      top <
      viewportPadding
    ) {
      top =
        viewportPadding;
    }

    setLocationMenuPosition({
      top,
      left,
      width: menuWidth,
    });
  }

  function toggleLocationMenu() {
    if (
      locationMenuOpen
    ) {
      setLocationMenuOpen(
        false,
      );

      return;
    }

    updateLocationMenuPosition();

    setLocationMenuOpen(
      true,
    );
  }

  function selectLocation(
    selectedLocation: string,
  ) {
    setLocation(
      selectedLocation,
    );

    setLocationMenuOpen(
      false,
    );

    if (
      selectedLocation ===
      "All locations"
    ) {
      showToast(
        "Showing all target locations.",
      );

      return;
    }

    showToast(
      `Target location changed to ${selectedLocation}.`,
    );
  }

  /* =======================================================
     LOCATION DROPDOWN EVENTS
  ======================================================= */

  useEffect(() => {
    if (
      !locationMenuOpen
    ) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        locationButtonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      const dropdown =
        document.getElementById(
          "dashboard-location-menu",
        );

      if (
        dropdown?.contains(
          target,
        )
      ) {
        return;
      }

      setLocationMenuOpen(
        false,
      );
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setLocationMenuOpen(
          false,
        );
      }
    }

    function handleViewportChange() {
      updateLocationMenuPosition();
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "resize",
      handleViewportChange,
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "resize",
        handleViewportChange,
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true,
      );
    };
  }, [
    locationMenuOpen,
    locationOptions.length,
  ]);

  /* =======================================================
     FILTERED LEADS
  ======================================================= */

  const filteredLeads =
    useMemo(() => {
      let result = [
        ...leads,
      ];

      /*
       * The selected value comes from Target Locations.
       *
       * We then filter the actual leads by their location
       * because those leads are the businesses found inside
       * the selected target market.
       */

      if (
        location !==
        "All locations"
      ) {
        const normalizedSelectedLocation =
          normalizeLocation(
            location,
          );

        result =
          result.filter(
            (lead) => {
              const leadLocation =
                normalizeLocation(
                  getLeadLocation(
                    lead,
                  ),
                );

              return (
                leadLocation.includes(
                  normalizedSelectedLocation,
                ) ||
                normalizedSelectedLocation.includes(
                  leadLocation,
                )
              );
            },
          );
      }

      if (
        dateRange !==
        "All time"
      ) {
        const days =
          dateRange ===
          "Last 30 days"
            ? 30
            : 7;

        const cutoff =
          Date.now() -
          days *
            24 *
            60 *
            60 *
            1000;

        result =
          result.filter(
            (lead) => {
              if (
                !lead.created_at
              ) {
                return false;
              }

              return (
                new Date(
                  lead.created_at,
                ).getTime() >=
                cutoff
              );
            },
          );
      }

      return result;
    }, [
      leads,
      location,
      dateRange,
    ]);

  /* =======================================================
     KPI VALUES
  ======================================================= */

  const totalLeads =
    filteredLeads.length;

  const highIntentLeads =
    filteredLeads.filter(
      (lead) =>
        getLeadScore(
          lead,
        ) >= 70,
    ).length;

  const newLeads =
    filteredLeads.filter(
      (lead) =>
        normalizeStatus(
          lead.status,
        ) === "new",
    ).length;

  const responses =
    filteredLeads.filter(
      (lead) => {
        const status =
          normalizeStatus(
            lead.status,
          );

        return (
          status ===
            "responded" ||
          status ===
            "replied"
        );
      },
    ).length;

  const wonLeads =
    filteredLeads.filter(
      (lead) => {
        const status =
          normalizeStatus(
            lead.status,
          );

        return (
          status === "won" ||
          status === "client" ||
          status ===
            "closed_won"
        );
      },
    ).length;

  /*
   * Pipeline value is calculated only from actual value
   * data already stored on the lead record/raw_data.
   * If no value exists, we intentionally show "—"
   * instead of inventing a dollar amount.
   */

  const pipelineValue =
    useMemo(() => {
      const total =
        filteredLeads.reduce(
          (
            sum,
            lead,
          ) => {
            const value =
              getLeadValue(
                lead,
              );

            return (
              sum +
              (value || 0)
            );
          },
          0,
        );

      return total > 0
        ? total
        : null;
    }, [
      filteredLeads,
    ]);

  const conversionRate =
    totalLeads > 0
      ? (wonLeads /
          totalLeads) *
        100
      : 0;

  const averageScore =
    totalLeads > 0
      ? Math.round(
          filteredLeads.reduce(
            (
              sum,
              lead,
            ) =>
              sum +
              getLeadScore(
                lead,
              ),
            0,
          ) /
            totalLeads,
        )
      : 0;

  const highOpportunityRate =
    totalLeads > 0
      ? Math.round(
          (highIntentLeads /
            totalLeads) *
            100,
        )
      : 0;

  /* =======================================================
     WEEK DELTA
  ======================================================= */

  const weekAgo =
    Date.now() -
    7 *
      24 *
      60 *
      60 *
      1000;

  const leadsThisWeek =
    filteredLeads.filter(
      (lead) => {
        if (
          !lead.created_at
        ) {
          return false;
        }

        return (
          new Date(
            lead.created_at,
          ).getTime() >=
          weekAgo
        );
      },
    ).length;

  const highIntentThisWeek =
    filteredLeads.filter(
      (lead) => {
        if (
          !lead.created_at
        ) {
          return false;
        }

        return (
          new Date(
            lead.created_at,
          ).getTime() >=
            weekAgo &&
          getLeadScore(
            lead,
          ) >= 70
        );
      },
    ).length;

  /* =======================================================
     LEADS OVER TIME
  ======================================================= */

  const leadsOverTime =
    useMemo(() => {
      const days: {
        day: string;
        total: number;
        high: number;
      }[] = [];

      const rangeDays =
        dateRange ===
        "Last 7 days"
          ? 7
          : 30;

      for (
        let index =
          rangeDays - 1;
        index >= 0;
        index--
      ) {
        const date =
          new Date();

        date.setHours(
          0,
          0,
          0,
          0,
        );

        date.setDate(
          date.getDate() -
            index,
        );

        const nextDate =
          new Date(date);

        nextDate.setDate(
          nextDate.getDate() +
            1,
        );

        const dayLeads =
          filteredLeads.filter(
            (lead) => {
              if (
                !lead.created_at
              ) {
                return false;
              }

              const createdAt =
                new Date(
                  lead.created_at,
                );

              return (
                createdAt >=
                  date &&
                createdAt <
                  nextDate
              );
            },
          );

        const highIntent =
          dayLeads.filter(
            (lead) =>
              getLeadScore(
                lead,
              ) >= 70,
          ).length;

        days.push({
          day:
            date.toLocaleDateString(
              "en-US",
              {
                month:
                  "short",
                day: "numeric",
              },
            ),
          total:
            dayLeads.length,
          high:
            highIntent,
        });
      }

      return days;
    }, [
      filteredLeads,
      dateRange,
    ]);

  /* =======================================================
     SOURCES
  ======================================================= */

  const sources =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      filteredLeads.forEach(
        (lead) => {
          const source =
            getSourceName(
              lead.source,
            );

          counts.set(
            source,
            (counts.get(
              source,
            ) || 0) + 1,
          );
        },
      );

      const total =
        filteredLeads.length;

      const sourceColors: Record<
        string,
        string
      > = {
        "Google Places":
          GOLD,
        "Website Scan":
          PURPLE,
        Directories:
          RED,
        "Social Media":
          PURPLE,
        Referrals:
          GREEN,
        Test: "#22D3EE",
        OpenStreetMap: "#60A5FA",
        "Google Maps": GOLD,
        Other: "#F472B6",
      };

      return Array.from(
        counts.entries(),
      )
        .map(
          ([
            name,
            value,
          ]) => ({
            name,
            value,
            percentage:
              total > 0
                ? Math.round(
                    (value /
                      total) *
                      100,
                  )
                : 0,
            color:
              sourceColors[
                name
              ] ||
              ["#2DD4BF", "#F97316", "#F472B6", "#38BDF8", "#C084FC"][name.length % 5],
          }),
        )
        .sort(
          (a, b) =>
            b.value -
            a.value,
        );
    }, [
      filteredLeads,
    ]);

  /* =======================================================
     INDUSTRIES
  ======================================================= */

  const industries =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      filteredLeads.forEach(
        (lead) => {
          const industry =
            lead.industry ||
            lead.category ||
            "Other";

          counts.set(
            industry,
            (counts.get(
              industry,
            ) || 0) + 1,
          );
        },
      );

      const total =
        filteredLeads.length;

      return Array.from(
        counts.entries(),
      )
        .map(
          ([
            name,
            count,
          ]) => ({
            name,
            count,
            pct:
              total > 0
                ? Math.round(
                    (count /
                      total) *
                      100,
                  )
                : 0,
          }),
        )
        .sort(
          (a, b) =>
            b.count -
            a.count,
        )
        .slice(0, 5);
    }, [
      filteredLeads,
    ]);

  /* =======================================================
     STATUS
  ======================================================= */

  const statusSteps =
    useMemo(() => {
      const statuses = [
        {
          icon: UserPlus,
          label: "New",
          value: "new",
          color: GOLD,
          bg: GOLD_SURFACE,
        },
        {
          icon: Send,
          label: "Contacted",
          value:
            "contacted",
          color: PURPLE,
          bg: PURPLE_SURFACE,
        },
        {
          icon: MessageSquare,
          label:
            "Responded",
          value:
            "responded",
          color: RED,
          bg: RED_SURFACE,
        },
        {
          icon: UserCheck,
          label:
            "Qualified",
          value:
            "qualified",
          color: GREEN,
          bg: GREEN_SURFACE,
        },
        {
          icon: FileCheck,
          label:
            "Proposal",
          value:
            "proposal",
          color: BLUE,
          bg: BLUE_SURFACE,
        },
        {
          icon: Trophy,
          label: "Client",
          value: "won",
          color: GREEN,
          bg: GREEN_SURFACE,
        },
      ];

      return statuses.map(
        (status) => {
          const count =
            filteredLeads.filter(
              (lead) => {
                const normalized =
                  normalizeStatus(
                    lead.status,
                  );

                if (
                  status.value ===
                  "responded"
                ) {
                  return (
                    normalized ===
                      "responded" ||
                    normalized ===
                      "replied"
                  );
                }

                if (
                  status.value ===
                  "won"
                ) {
                  return (
                    normalized ===
                      "won" ||
                    normalized ===
                      "client" ||
                    normalized ===
                      "closed_won"
                  );
                }

                return (
                  normalized ===
                  status.value
                );
              },
            ).length;

          return {
            ...status,
            count,
          };
        },
      );
    }, [
      filteredLeads,
    ]);

  /* =======================================================
     PIPELINE
  ======================================================= */

  const pipelineStages =
    useMemo(() => {
      const stages = [
        "New",
        "Contacted",
        "Responded",
        "Qualified",
        "Proposal",
        "Won",
      ];

      return stages.map(
        (stage) => {
          const count =
            filteredLeads.filter(
              (lead) =>
                getPipelineStage(
                  lead.status,
                ) === stage,
            ).length;

          return {
            name: stage,
            count,
          };
        },
      );
    }, [
      filteredLeads,
    ]);

  const maxPipelineCount =
    Math.max(
      ...pipelineStages.map(
        (stage) =>
          stage.count,
      ),
      1,
    );

  /* =======================================================
     RECENT ACTIVITY
  ======================================================= */

  const recentActivity =
    useMemo(() => {
      const sorted =
        [...filteredLeads]
          .sort(
            (a, b) => {
              const aDate =
                a.updated_at
                  ? new Date(
                      a.updated_at,
                    ).getTime()
                  : a.created_at
                    ? new Date(
                        a.created_at,
                      ).getTime()
                    : 0;

              const bDate =
                b.updated_at
                  ? new Date(
                      b.updated_at,
                    ).getTime()
                  : b.created_at
                    ? new Date(
                        b.created_at,
                      ).getTime()
                    : 0;

              return (
                bDate -
                aDate
              );
            },
          )
          .slice(0, 6);

      return sorted.map(
        (lead) => {
          const status =
            normalizeStatus(
              lead.status,
            );

          let icon =
            Users;

          let bg =
            GOLD_SURFACE;

          let fg =
            GOLD;

          let text =
            "Lead updated";

          if (
            status ===
            "contacted"
          ) {
            icon = Send;
            bg =
              PURPLE_SURFACE;
            fg = PURPLE;
            text =
              "Lead contacted";
          } else if (
            status ===
              "responded" ||
            status ===
              "replied"
          ) {
            icon =
              MessageSquare;
            bg =
              RED_SURFACE;
            fg = RED;
            text =
              "Lead responded";
          } else if (
            status ===
            "qualified"
          ) {
            icon =
              UserCheck;
            bg =
              GREEN_SURFACE;
            fg = GREEN;
            text =
              "Lead qualified";
          } else if (
            status ===
            "proposal"
          ) {
            icon =
              FileCheck;
            bg =
              BLUE_SURFACE;
            fg = BLUE;
            text =
              "Proposal stage";
          } else if (
            status ===
              "won" ||
            status ===
              "client" ||
            status ===
              "closed_won"
          ) {
            icon = Trophy;
            bg =
              GREEN_SURFACE;
            fg = GREEN;
            text =
              "New client won";
          } else if (
            getLeadScore(
              lead,
            ) >= 70
          ) {
            icon = Flame;
            bg =
              RED_SURFACE;
            fg = RED;
            text =
              "High-intent lead found";
          }

          return {
            id: lead.id,
            icon,
            bg,
            fg,
            text,
            sub:
              lead.company ||
              lead.name ||
              "Unnamed lead",
            time:
              getRelativeTime(
                lead.updated_at ||
                  lead.created_at,
              ),
          };
        },
      );
    }, [
      filteredLeads,
    ]);

  /* =======================================================
     DATE RANGE
  ======================================================= */

  function changeDateRange() {
    if (
      dateRange ===
      "All time"
    ) {
      setDateRange(
        "Last 7 days",
      );

      showToast(
        "Showing the last 7 days.",
      );

      return;
    }

    if (
      dateRange ===
      "Last 7 days"
    ) {
      setDateRange(
        "Last 30 days",
      );

      showToast(
        "Showing the last 30 days.",
      );

      return;
    }

    setDateRange(
      "All time",
    );

    showToast(
      "Showing all lead data.",
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main
        className={`min-h-screen flex-1 min-w-0 bg-[#050505] text-white ${pagePadding}`}
      >
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-[#F5C518]"
            />

            <p
              className="mt-4 text-sm"
              style={{
                color: MUTED,
              }}
            >
              Loading your dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      className={`min-h-screen flex-1 min-w-0 bg-[#050505] text-white ${pagePadding}`}
    >
      {/* ===================================================
          HERO
      =================================================== */}

      <section
        className={`relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0A0A0A] ${
          compactLayout
            ? "p-4 sm:p-5 lg:p-6"
            : "p-5 sm:p-6 lg:p-7"
        }`}
      >
        {/* GOLD GLOW */}

        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full blur-3xl"
          style={{
            backgroundColor:
              hexToRgba(
                GOLD,
                0.1,
              ),
          }}
        />

        {/* PURPLE GLOW */}

        <div
          className="pointer-events-none absolute right-[18%] bottom-[-120px] h-64 w-64 rounded-full blur-3xl"
          style={{
            backgroundColor:
              hexToRgba(
                PURPLE,
                0.06,
              ),
          }}
        />

        {/* RED GLOW */}

        <div
          className="pointer-events-none absolute left-[42%] top-[-100px] h-52 w-52 rounded-full blur-3xl"
          style={{
            backgroundColor:
              hexToRgba(
                RED,
                0.04,
              ),
          }}
        />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {/* BRAND ICON */}

              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl shadow-[0_0_25px_rgba(245,197,24,0.18)]"
                style={{
                  backgroundColor:
                    GOLD,
                }}
              >
                <Sparkles
                  size={15}
                  className="text-black"
                />
              </div>

              {/* AI BADGE */}

              <span
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  border:
                    `1px solid ${hexToRgba(
                      GOLD,
                      0.2,
                    )}`,
                  backgroundColor:
                    hexToRgba(
                      GOLD,
                      0.06,
                    ),
                  color: GOLD,
                }}
              >
                AI-Powered Intelligence
              </span>

              {/* LIVE */}

              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{
                  border:
                    `1px solid ${hexToRgba(
                      GREEN,
                      0.2,
                    )}`,
                  backgroundColor:
                    hexToRgba(
                      GREEN,
                      0.05,
                    ),
                  color: GREEN,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      GREEN,
                  }}
                />

                Live
              </span>
            </div>

            {/* PAGE TITLE */}

            <h1 className="text-3xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-4xl lg:text-[46px]">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777] sm:text-[15px]">
              Your smartest opportunities,
              pipeline momentum and client
              signals — all in one place.
            </p>

            {/* HERO SIGNALS */}

            <div className="mt-5 flex flex-wrap gap-2">
              {/* MOMENTUM */}

              <button
                type="button"
                onClick={
                  goToLeads
                }
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        GOLD_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <Zap
                    size={12}
                    style={{
                      color: GOLD,
                    }}
                  />
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#555]">
                    Momentum
                  </p>

                  <p className="text-[11px] font-semibold text-white">
                    {leadsThisWeek} new this week
                  </p>
                </div>

                <ArrowUpRight
                  size={12}
                  className="ml-1 text-[#444] transition group-hover:text-white"
                />
              </button>

              {/* HOT LEADS */}

              {showOpportunityScore && (
                <button
                  type="button"
                  onClick={
                    goToLeads
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor:
                        getDashboardIconSurface(
                          RED_SURFACE,
                          isLightMode,
                        ),
                    }}
                  >
                    <Flame
                      size={12}
                      style={{
                        color: RED,
                      }}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-[#555]">
                      Hot Leads
                    </p>

                    <p className="text-[11px] font-semibold text-white">
                      {highOpportunityRate}% of leads
                    </p>
                  </div>

                  <ArrowUpRight
                    size={12}
                    className="ml-1 text-[#444]"
                  />
                </button>
              )}

              {/* AI SIGNAL */}

              {showOpportunityScore && (
                <button
                  type="button"
                  onClick={
                    goToLeads
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor:
                        getDashboardIconSurface(
                          PURPLE_SURFACE,
                          isLightMode,
                        ),
                    }}
                  >
                    <Radar
                      size={12}
                      style={{
                        color:
                          PURPLE,
                      }}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-[#555]">
                      AI Signal
                    </p>

                    <p className="text-[11px] font-semibold text-white">
                      {averageScore}/100
                    </p>
                  </div>

                  <ArrowUpRight
                    size={12}
                    className="ml-1 text-[#444]"
                  />
                </button>
              )}
            </div>
          </div>

          {/* FILTERS */}

          <div className="relative z-20 flex flex-wrap items-center gap-2">
            {/* LOCATION */}

            <button
              ref={
                locationButtonRef
              }
              type="button"
              onClick={
                toggleLocationMenu
              }
              aria-haspopup="listbox"
              aria-expanded={
                locationMenuOpen
              }
              className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition hover:border-white/20 hover:bg-white/[0.04] sm:text-sm"
              style={{
                backgroundColor:
                  PANEL,
                borderColor:
                  locationMenuOpen
                    ? hexToRgba(
                        GOLD,
                        0.35,
                      )
                    : BORDER,
              }}
            >
              <MapPin
                size={14}
                style={{
                  color: GOLD,
                }}
              />

              <span className="max-w-[180px] truncate">
                {location}
              </span>

              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${
                  locationMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
                style={{
                  color: MUTED,
                }}
              />
            </button>

            {/* DATE */}

            <button
              type="button"
              onClick={
                changeDateRange
              }
              className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition hover:border-white/20 hover:bg-white/[0.04] sm:text-sm"
              style={{
                backgroundColor:
                  PANEL,
                borderColor:
                  BORDER,
              }}
            >
              <CalendarIcon
                size={14}
                style={{
                  color: PURPLE,
                }}
              />

              <span>
                {dateRange}
              </span>

              <ChevronDown
                size={13}
                style={{
                  color: MUTED,
                }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================
          TARGET LOCATION DROPDOWN
      =================================================== */}

      {locationMenuOpen &&
        locationMenuPosition && (
          <div
            id="dashboard-location-menu"
            role="listbox"
            aria-label="Target location"
            className="fixed z-[200] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101010] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
            style={{
              top: locationMenuPosition.top,
              left: locationMenuPosition.left,
              width: locationMenuPosition.width,
            }}
          >
            <div className="px-3 pb-2 pt-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#555]">
                Location
              </p>

              {companyLocations.length >
              0 ? (
                <p className="mt-1 text-[10px] text-[#666]">
                  Target locations
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-[#555]">
                  No target locations configured
                </p>
              )}
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              {locationOptions.map(
                (
                  option,
                ) => {
                  const selected =
                    normalizeLocation(
                      location,
                    ) ===
                    normalizeLocation(
                      option,
                    );

                  return (
                    <button
                      key={
                        option
                      }
                      type="button"
                      role="option"
                      aria-selected={
                        selected
                      }
                      onClick={() =>
                        selectLocation(
                          option,
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
                      style={{
                        backgroundColor:
                          selected
                            ? hexToRgba(
                                GOLD,
                                0.07,
                              )
                            : "transparent",
                      }}
                    >
                      <MapPin
                        size={13}
                        style={{
                          color:
                            selected
                              ? GOLD
                              : "#555",
                        }}
                      />

                      <span
                        className="min-w-0 flex-1 truncate text-xs font-medium"
                        style={{
                          color:
                            selected
                              ? "#FFFFFF"
                              : "#999999",
                        }}
                      >
                        {
                          option
                        }
                      </span>

                      {selected && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              GOLD,
                          }}
                        />
                      )}
                    </button>
                  );
                },
              )}

              {availableLocations.length ===
                0 && (
                <div className="px-3 py-4">
                  <p className="text-xs text-[#666]">
                    No target locations available yet.
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#444]">
                    Add your target locations in Settings → Company.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ===================================================
          LOAD ERROR
      =================================================== */}

      {loadError && (
        <section
          className={`${sectionGap} rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-300">
                Dashboard data unavailable
              </p>

              <p className="mt-1 text-[10px] text-red-400/70">
                {loadError}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[10px] font-medium text-red-300 transition hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        </section>
      )}

      {/* ===================================================
          KPI CARDS
      =================================================== */}

      <section
        className={`${sectionGap} grid ${cardGap} sm:grid-cols-2 ${
          showOpportunityScore
            ? "xl:grid-cols-4"
            : "xl:grid-cols-3"
        }`}
      >
        {/* TOTAL LEADS */}

        <button
          type="button"
          onClick={
            goToLeads
          }
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} text-left transition duration-300 hover:-translate-y-1 hover:border-[#F5C518]/30`}
        >
          <div
            className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition"
            style={{
              backgroundColor:
                hexToRgba(
                  GOLD,
                  0.09,
                ),
            }}
          />

          <div className="relative flex items-start justify-between">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  getDashboardIconSurface(
                    GOLD_SURFACE,
                    isLightMode,
                  ),
              }}
            >
              <Users
                size={19}
                style={{
                  color: GOLD,
                }}
              />
            </div>

            <div
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold"
              style={{
                backgroundColor:
                  hexToRgba(
                    GOLD,
                    0.06,
                  ),
                color: GOLD,
              }}
            >
              <TrendingUp
                size={10}
              />
              LIVE
            </div>
          </div>

          <div className="relative mt-5">
            <p className="text-xs font-medium text-[#777]">
              Total Leads
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight">
              {totalLeads.toLocaleString()}
            </p>

            <p
              className="mt-2 text-[11px] font-medium"
              style={{
                color: GOLD,
              }}
            >
              {leadsThisWeek >
              0
                ? `▲ ${leadsThisWeek} this week`
                : "No new leads this week"}
            </p>
          </div>

          <ArrowUpRight
            size={15}
            className="absolute bottom-5 right-5 text-[#333] transition group-hover:text-[#F5C518]"
          />
        </button>

        {/* HIGH INTENT */}

        {showOpportunityScore && (
          <button
            type="button"
            onClick={
              goToLeads
            }
            className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} text-left transition duration-300 hover:-translate-y-1 hover:border-[#F0475C]/30`}
          >
            <div
              className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition"
              style={{
                backgroundColor:
                  hexToRgba(
                    RED,
                    0.09,
                  ),
              }}
            />

            <div className="relative flex items-start justify-between">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    getDashboardIconSurface(
                      RED_SURFACE,
                      isLightMode,
                    ),
                }}
              >
                <Flame
                  size={19}
                  style={{
                    color: RED,
                  }}
                />
              </div>

              <div
                className="rounded-full px-2 py-1 text-[9px] font-semibold"
                style={{
                  backgroundColor:
                    getDashboardIconSurface(
                      RED_SURFACE,
                      isLightMode,
                    ),
                  color: RED,
                }}
              >
                HOT
              </div>
            </div>

            <div className="relative mt-5">
              <p className="text-xs font-medium text-[#777]">
                High-Intent Leads
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight">
                {highIntentLeads.toLocaleString()}
              </p>

              <p
                className="mt-2 text-[11px] font-medium"
                style={{
                  color: RED,
                }}
              >
                {highIntentThisWeek >
                0
                  ? `▲ ${highIntentThisWeek} this week`
                  : "No new high-intent leads"}
              </p>
            </div>

            <ArrowUpRight
              size={15}
              className="absolute bottom-5 right-5 text-[#333] transition group-hover:text-[#F0475C]"
            />
          </button>
        )}

        {/* AI SCORE */}

        {showOpportunityScore && (
          <button
            type="button"
            onClick={
              goToLeads
            }
            className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} text-left transition duration-300 hover:-translate-y-1 hover:border-[#A78BFA]/30`}
          >
            <div
              className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition"
              style={{
                backgroundColor:
                  hexToRgba(
                    PURPLE,
                    0.09,
                  ),
              }}
            />

            <div className="relative flex items-start justify-between">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    getDashboardIconSurface(
                      PURPLE_SURFACE,
                      isLightMode,
                    ),
                }}
              >
                <Radar
                  size={19}
                  style={{
                    color:
                      PURPLE,
                  }}
                />
              </div>

              <div
                className="rounded-full px-2 py-1 text-[9px] font-semibold"
                style={{
                  backgroundColor:
                    getDashboardIconSurface(
                      PURPLE_SURFACE,
                      isLightMode,
                    ),
                  color: PURPLE,
                }}
              >
                AI
              </div>
            </div>

            <div className="relative mt-5">
              <p className="text-xs font-medium text-[#777]">
                Avg. Opportunity Score
              </p>

              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-bold tracking-tight">
                  {averageScore}
                </p>

                <p className="mb-1 text-xs text-[#555]">
                  /100
                </p>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1B1B1B]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      averageScore,
                      100,
                    )}%`,
                    backgroundColor:
                      PURPLE,
                  }}
                />
              </div>
            </div>

            <ArrowUpRight
              size={15}
              className="absolute bottom-5 right-5 text-[#333] transition group-hover:text-[#A78BFA]"
            />
          </button>
        )}

        {/* CONVERSION */}

        <button
          type="button"
          onClick={
            goToPipeline
          }
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} text-left transition duration-300 hover:-translate-y-1 hover:border-[#84CC16]/30`}
        >
          <div
            className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition"
            style={{
              backgroundColor:
                hexToRgba(
                  GREEN,
                  0.08,
                ),
            }}
          />

          <div className="relative flex items-start justify-between">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  getDashboardIconSurface(
                    GREEN_SURFACE,
                    isLightMode,
                  ),
              }}
            >
              <CheckCircle2
                size={19}
                style={{
                  color: GREEN,
                }}
              />
            </div>

            <div
              className="rounded-full px-2 py-1 text-[9px] font-semibold"
              style={{
                backgroundColor:
                  getDashboardIconSurface(
                    GREEN_SURFACE,
                    isLightMode,
                  ),
                color: GREEN,
              }}
            >
              {wonLeads} WON
            </div>
          </div>

          <div className="relative mt-5">
            <p className="text-xs font-medium text-[#777]">
              Conversion Rate
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight">
              {conversionRate.toFixed(
                1,
              )}
              %
            </p>

            <p
              className="mt-2 text-[11px] font-medium"
              style={{
                color: GREEN,
              }}
            >
              {wonLeads} client
              {wonLeads ===
              1
                ? ""
                : "s"}{" "}
              won
            </p>
          </div>

          <ArrowUpRight
            size={15}
            className="absolute bottom-5 right-5 text-[#333] transition group-hover:text-[#84CC16]"
          />
        </button>
      </section>

      {/* ===================================================
          MAIN ANALYTICS
      =================================================== */}

      <section
        className={`${sectionGap} grid ${analyticsGap} xl:grid-cols-3`}
      >
        {/* LEAD MOMENTUM */}

        <div
          className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} xl:col-span-2`}
        >
          <div
            className="absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl"
            style={{
              backgroundColor:
                hexToRgba(
                  GOLD,
                  0.035,
                ),
            }}
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        GOLD_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <BarChart3
                    size={16}
                    style={{
                      color: GOLD,
                    }}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Lead Momentum
                  </h2>

                  <p className="mt-0.5 text-[10px] text-[#666]">
                    Acquisition vs. high-intent activity
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px]"
                style={{
                  border:
                    `1px solid ${hexToRgba(
                      GOLD,
                      0.1,
                    )}`,
                  backgroundColor:
                    hexToRgba(
                      GOLD,
                      0.03,
                    ),
                  color: "#999",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      GOLD,
                  }}
                />

                All leads
              </span>

              {showOpportunityScore && (
                <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[#777]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        RED,
                    }}
                  />

                  High intent
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 h-[260px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={
                  leadsOverTime
                }
                margin={{
                  top: 10,
                  right: 5,
                  left: -25,
                  bottom: 0,
                }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#555",
                    fontSize: 10,
                  }}
                  interval={
                    dateRange ===
                    "Last 7 days"
                      ? 0
                      : 4
                  }
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#555",
                    fontSize: 10,
                  }}
                  allowDecimals={
                    false
                  }
                />

                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 10,
                    background:
                      "#171717",
                    border:
                      `1px solid ${BORDER_LIGHT}`,
                    color:
                      "white",
                  }}
                  labelStyle={{
                    color:
                      "#999",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={GOLD}
                  strokeWidth={
                    3
                  }
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: GOLD,
                    strokeWidth: 0,
                  }}
                />

                {showOpportunityScore && (
                  <Line
                    type="monotone"
                    dataKey="high"
                    stroke={RED}
                    strokeWidth={
                      2
                    }
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: RED,
                      strokeWidth: 0,
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI OPPORTUNITY */}

        {showOpportunityScore && (
          <div
            className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding}`}
          >
            <div
              className="absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl"
              style={{
                backgroundColor:
                  hexToRgba(
                    PURPLE,
                    0.07,
                  ),
              }}
            />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={14}
                      style={{
                        color:
                          PURPLE,
                      }}
                    />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#666]">
                      AI Intelligence
                    </p>
                  </div>

                  <h2 className="mt-1 text-lg font-semibold">
                    Opportunity Radar
                  </h2>
                </div>

                <div
                  className="rounded-xl p-2.5"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        PURPLE_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <Radar
                    size={16}
                    style={{
                      color:
                        PURPLE,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center">
                <div className="relative flex h-44 w-44 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[10px] border-[#1D1D1D]" />

                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        `conic-gradient(${PURPLE} ${
                          averageScore *
                          3.6
                        }deg, transparent 0deg)`,
                      mask:
                        "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
                      WebkitMask:
                        "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
                    }}
                  />

                  <div className="relative text-center">
                    <p className="text-4xl font-bold tracking-tight">
                      {
                        averageScore
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-[#555]">
                      opportunity score
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {/* HOT */}

                <button
                  type="button"
                  onClick={
                    goToLeads
                  }
                  className="rounded-xl p-3 text-left transition hover:brightness-110"
                  style={{
                    border:
                      `1px solid ${hexToRgba(
                        GOLD,
                        0.1,
                      )}`,
                    backgroundColor:
                      hexToRgba(
                        GOLD,
                        0.035,
                      ),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Flame
                      size={12}
                      style={{
                        color:
                          RED,
                      }}
                    />

                    <span className="text-[9px] uppercase tracking-wider text-[#666]">
                      Hot
                    </span>
                  </div>

                  <p className="mt-1 text-lg font-bold">
                    {
                      highIntentLeads
                    }
                  </p>
                </button>

                {/* WON */}

                <button
                  type="button"
                  onClick={
                    goToPipeline
                  }
                  className="rounded-xl p-3 text-left transition hover:brightness-110"
                  style={{
                    border:
                      `1px solid ${hexToRgba(
                        GREEN,
                        0.1,
                      )}`,
                    backgroundColor:
                      hexToRgba(
                        GREEN,
                        0.035,
                      ),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={12}
                      style={{
                        color:
                          GREEN,
                      }}
                    />

                    <span className="text-[9px] uppercase tracking-wider text-[#666]">
                      Won
                    </span>
                  </div>

                  <p className="mt-1 text-lg font-bold">
                    {wonLeads}
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================
          SOURCES / INDUSTRIES
      =================================================== */}

      <section
        className={`${sectionGap} grid ${analyticsGap} lg:grid-cols-5`}
      >
        {/* SOURCES */}

        <div
          className={`rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} lg:col-span-2`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        GOLD_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <Radar
                    size={14}
                    style={{
                      color: GOLD,
                    }}
                  />
                </div>

                <h2 className="text-sm font-semibold">
                  Lead Sources
                </h2>
              </div>

              <p className="mt-2 text-[10px] text-[#666]">
                Where your opportunities originate
              </p>
            </div>

            <button
              type="button"
              onClick={
                goToLeads
              }
              className="rounded-full border border-white/[0.06] px-2.5 py-1 text-[9px] text-[#666] transition hover:border-white/10 hover:text-white"
            >
              View leads
            </button>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <div className="relative h-[150px] w-[150px] shrink-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      sources.length >
                      0
                        ? sources
                        : [
                            {
                              name: "Empty",
                              value: 1,
                              color: "rgba(140, 140, 150, 0.22)",
                            },
                          ]
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius={
                      48
                    }
                    outerRadius={
                      68
                    }
                    startAngle={
                      90
                    }
                    endAngle={
                      -270
                    }
                    paddingAngle={
                      2
                    }
                  >
                    {(sources.length >
                    0
                      ? sources
                      : [
                          {
                            name: "Empty",
                            value: 1,
                            color: "rgba(140, 140, 150, 0.22)",
                          },
                        ]
                    ).map(
                      (
                        source,
                      ) => (
                        <Cell
                          key={
                            source.name
                          }
                          fill={
                            source.color
                          }
                        />
                      ),
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {
                    totalLeads
                  }
                </span>

                <span className="text-[9px] uppercase tracking-wider text-[#555]">
                  Leads
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              {sources.length ===
              0 ? (
                <p className="text-xs text-[#666]">
                  No lead sources yet.
                </p>
              ) : (
                sources
                  .slice(
                    0,
                    5,
                  )
                  .map(
                    (
                      source,
                    ) => (
                      <button
                        type="button"
                        key={
                          source.name
                        }
                        onClick={
                          goToLeads
                        }
                        className="group flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition hover:bg-white/[0.03]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                            style={{
                              backgroundColor:
                                source.color,
                            }}
                          />

                          <span className="truncate text-[11px] text-[#999] transition group-hover:text-white">
                            {
                              source.name
                            }
                          </span>
                        </span>

                        <span
                          className="ml-2 text-[11px] font-semibold"
                          style={{
                            color:
                              source.color,
                          }}
                        >
                          {
                            source.percentage
                          }%
                        </span>
                      </button>
                    ),
                  )
              )}
            </div>
          </div>
        </div>

        {/* INDUSTRIES */}

        <div
          className={`rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} lg:col-span-3`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        PURPLE_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <BarChart3
                    size={14}
                    style={{
                      color:
                        PURPLE,
                    }}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Top Industries
                  </h2>

                  <p className="mt-1 text-[10px] text-[#666]">
                    Where the opportunity is
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                goToLeads
              }
              className="rounded-full border border-white/[0.06] px-2.5 py-1 text-[9px] uppercase tracking-wider text-[#555] transition hover:border-white/10 hover:text-white"
            >
              Top 5
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {industries.length ===
            0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-[#666]">
                No industry data yet.
              </div>
            ) : (
              industries.map(
                (
                  industry,
                  index,
                ) => {
                  const industryColors =
                    [
                      GOLD,
                      PURPLE,
                      RED,
                      GREEN,
                      BLUE,
                    ];

                  const color =
                    industryColors[
                      index %
                        industryColors.length
                    ];

                  return (
                    <button
                      type="button"
                      key={
                        industry.name
                      }
                      onClick={
                        goToLeads
                      }
                      className="group block w-full text-left"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-medium text-[#BDBDBD]">
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold"
                            style={{
                              backgroundColor:
                                hexToRgba(
                                  color,
                                  0.15,
                                ),
                              color,
                            }}
                          >
                            {
                              index +
                              1
                            }
                          </span>

                          {
                            industry.name
                          }
                        </span>

                        <span
                          className="text-[11px] font-semibold"
                          style={{
                            color,
                          }}
                        >
                          {
                            industry.pct
                          }%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#191919]">
                        <div
                          className="h-full rounded-full transition-all duration-700 group-hover:brightness-125"
                          style={{
                            width: `${industry.pct}%`,
                            backgroundColor:
                              color,
                          }}
                        />
                      </div>
                    </button>
                  );
                },
              )
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          PIPELINE / ACTIVITY
      =================================================== */}

      <section
        className={`${sectionGap} grid ${analyticsGap} lg:grid-cols-5`}
      >
        {/* PIPELINE */}

        <div
          className={`rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} lg:col-span-3`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        GOLD_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <Activity
                    size={14}
                    style={{
                      color: GOLD,
                    }}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Sales Pipeline
                  </h2>

                  <p className="mt-1 text-[10px] text-[#666]">
                    Watch opportunities move toward revenue
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                goToPipeline
              }
              className="text-right transition hover:opacity-80"
            >
              <p className="text-[9px] uppercase tracking-wider text-[#555]">
                Pipeline value
              </p>

              <p
                className="mt-1 text-lg font-bold"
                style={{
                  color:
                    pipelineValue !==
                    null
                      ? GREEN
                      : "#777",
                }}
              >
                {pipelineValue !==
                null
                  ? formatCurrency(
                      pipelineValue,
                    )
                  : "—"}
              </p>
            </button>
          </div>

          <div className="mt-7 space-y-4">
            {pipelineStages.map(
              (
                stage,
                index,
              ) => {
                const width =
                  stage.count ===
                  0
                    ? 0
                    : Math.max(
                        (stage.count /
                          maxPipelineCount) *
                          100,
                        7,
                      );

                const stageColors =
                  [
                    GOLD,
                    PURPLE,
                    RED,
                    GREEN,
                    BLUE,
                    GREEN,
                  ];

                const color =
                  stageColors[
                    index
                  ];

                return (
                  <button
                    type="button"
                    key={
                      stage.name
                    }
                    onClick={
                      goToPipeline
                    }
                    className="group flex w-full items-center gap-3 text-left"
                  >
                    <div className="w-[80px] shrink-0">
                      <span
                        className="text-[11px] font-medium transition group-hover:text-white"
                        style={{
                          color:
                            stage.count >
                            0
                              ? color
                              : "#666",
                        }}
                      >
                        {
                          stage.name
                        }
                      </span>
                    </div>

                    <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-[#171717]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700 group-hover:brightness-125"
                        style={{
                          width: `${width}%`,
                          backgroundColor:
                            color,
                        }}
                      />

                      {width >
                        0 && (
                        <span className="absolute inset-y-0 left-3 flex items-center text-[10px] font-bold text-black">
                          {
                            stage.count
                          }
                        </span>
                      )}
                    </div>

                    <div
                      className="w-7 text-right font-mono text-[11px] font-semibold"
                      style={{
                        color:
                          stage.count >
                          0
                            ? color
                            : "#555",
                      }}
                    >
                      {
                        stage.count
                      }
                    </div>
                  </button>
                );
              },
            )}
          </div>

          <button
            type="button"
            onClick={
              goToPipeline
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-[10px] font-medium text-[#777] transition hover:border-[#F5C518]/20 hover:bg-[#F5C518]/[0.03] hover:text-[#F5C518]"
          >
            Open Pipeline
            <ExternalLink
              size={12}
            />
          </button>
        </div>

        {/* RECENT ACTIVITY */}

        <div
          className={`rounded-2xl border border-white/[0.07] bg-[#0D0D0D] ${cardPadding} lg:col-span-2`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      getDashboardIconSurface(
                        RED_SURFACE,
                        isLightMode,
                      ),
                  }}
                >
                  <Activity
                    size={14}
                    style={{
                      color: RED,
                    }}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-semibold">
                    Recent Activity
                  </h2>

                  <p className="mt-1 text-[10px] text-[#666]">
                    Your latest lead signals
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                goToLeads
              }
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-medium transition hover:brightness-110"
              style={{
                border:
                  `1px solid ${hexToRgba(
                    GOLD,
                    0.1,
                  )}`,
                backgroundColor:
                  hexToRgba(
                    GOLD,
                    0.03,
                  ),
                color: GOLD,
              }}
            >
              View all
              <ArrowUpRight
                size={10}
              />
            </button>
          </div>

          <div className="mt-5 space-y-1">
            {recentActivity.length ===
            0 ? (
              <div className="rounded-xl border border-white/[0.06] p-5 text-center text-xs text-[#666]">
                <Activity
                  size={22}
                  className="mx-auto mb-2 opacity-30"
                />

                No lead activity yet.

                <button
                  type="button"
                  onClick={
                    goToDiscovery
                  }
                  className="mt-3 block mx-auto text-[10px] font-medium"
                  style={{
                    color:
                      GOLD,
                  }}
                >
                  Find your first leads →
                </button>
              </div>
            ) : (
              recentActivity.map(
                (
                  activity,
                ) => {
                  const Icon =
                    activity.icon;

                  return (
                    <button
                      type="button"
                      key={
                        activity.id
                      }
                      onClick={
                        goToLeads
                      }
                      className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/[0.03]"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor:
                            getDashboardIconSurface(
                              activity.bg,
                              isLightMode,
                            ),
                        }}
                      >
                        <Icon
                          size={14}
                          style={{
                            color:
                              activity.fg,
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[#D8D8D8]">
                          {
                            activity.text
                          }
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-[#666]">
                          {
                            activity.sub
                          }
                        </p>
                      </div>

                      <span className="shrink-0 text-[9px] text-[#555]">
                        {
                          activity.time
                        }
                      </span>

                      <ArrowUpRight
                        size={12}
                        className="shrink-0 text-[#333] transition group-hover:text-white"
                      />
                    </button>
                  );
                },
              )
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          INSIGHT STRIP
      =================================================== */}

      <section
        className={`${sectionGap} grid ${cardGap} sm:grid-cols-3`}
      >
        {/* NEW OPPORTUNITIES */}

        <button
          type="button"
          onClick={
            goToLeads
          }
          className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4 text-left transition hover:border-[#F5C518]/20 hover:bg-[#0D0D0D]"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                getDashboardIconSurface(
                  GOLD_SURFACE,
                  isLightMode,
                ),
            }}
          >
            <UserPlus
              size={15}
              style={{
                color: GOLD,
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#555]">
              New opportunities
            </p>

            <p className="mt-0.5 text-sm font-semibold">
              {newLeads}
            </p>
          </div>

          <ArrowUpRight
            size={14}
            className="text-gray-600 transition group-hover:text-[#F5C518]"
          />
        </button>

        {/* RESPONSES */}

        <button
          type="button"
          onClick={
            goToOutreach
          }
          className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4 text-left transition hover:border-[#A78BFA]/20 hover:bg-[#0D0D0D]"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                getDashboardIconSurface(
                  PURPLE_SURFACE,
                  isLightMode,
                ),
            }}
          >
            <Mail
              size={15}
              style={{
                color: PURPLE,
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#555]">
              Responses
            </p>

            <p className="mt-0.5 text-sm font-semibold">
              {responses}
            </p>
          </div>

          <ArrowUpRight
            size={14}
            className="text-gray-600 transition group-hover:text-[#A78BFA]"
          />
        </button>

        {/* PIPELINE VALUE */}

        <button
          type="button"
          onClick={
            goToPipeline
          }
          className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4 text-left transition hover:border-[#84CC16]/20 hover:bg-[#0D0D0D]"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                getDashboardIconSurface(
                  GREEN_SURFACE,
                  isLightMode,
                ),
            }}
          >
            <CircleDollarSign
              size={15}
              style={{
                color: GREEN,
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#555]">
              Pipeline value
            </p>

            <p className="mt-0.5 text-sm font-semibold">
              {pipelineValue !==
              null
                ? formatCurrency(
                    pipelineValue,
                  )
                : "—"}
            </p>
          </div>

          <ArrowUpRight
            size={14}
            className="text-gray-600 transition group-hover:text-[#84CC16]"
          />
        </button>
      </section>

      {/* ===================================================
          TOAST
      =================================================== */}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[100] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl border border-white/10 bg-[#111] px-4 py-3 shadow-2xl">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                GOLD,
            }}
          />

          <span className="text-xs text-gray-200">
            {
              toast.message
            }
          </span>

          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
            className="text-gray-600 transition hover:text-white"
            aria-label="Close message"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}