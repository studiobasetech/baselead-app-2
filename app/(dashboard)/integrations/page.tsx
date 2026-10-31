"use client";

import TwilioConnectCard from "@/components/integrations/TwilioConnectCard";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  Calendar,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Grid2X2,
  Info,
  Link2,
  List,
  Mail,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Webhook,
  X,
  Zap,
  MapPinned,
  MessageSquare,
  Store,
  LayoutGrid,
} from "lucide-react";
import PlanGate from "@/components/plans/PlanGate";
import { usePlan } from "@/components/plans/PlanProvider";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { isNativeApp, openInSystemBrowser } from "@/lib/native";

/* =========================================================
   DASHBOARD VISUAL SYSTEM
========================================================= */

const GOLD = "#F5C518";
const PURPLE = "#A78BFA";
const RED = "#F22F46";
const GREEN = "#84CC16";
const BLUE = "#3B82F6";

const PAGE_BG = "#050505";
const HERO_BG = "#0A0A0A";
const PANEL = "#0D0D0D";
const ELEVATED = "#101010";
const INNER = "#171717";
const BORDER = "#202020";
const BORDER_LIGHT = "#2A2A2A";
const MUTED = "#777777";

const GOLD_SURFACE = "#332A0C";
const PURPLE_SURFACE = "#241A38";
const RED_SURFACE = "#3A1418";
const GREEN_SURFACE = "#18200B";
const BLUE_SURFACE = "#10243A";

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(0, 0, 0, ${alpha})`;

  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getCategoryIconStyle(color: string): CSSProperties {
  return {
    backgroundColor: hexToRgba(color, 0.11),
    borderColor: hexToRgba(color, 0.55),
    color,
    "--category-icon-shadow": `0 14px 34px ${hexToRgba(color, 0.22)}`,
  } as CSSProperties;
}

const TWILIO_RED = "#F22F46";

function getCategoryColor(category: Exclude<Category, "All">) {
  switch (category) {
    case "Email":
      return RED;
    case "Calendar":
      return BLUE;
    case "Data":
      return PURPLE;
    case "Phone":
      return "#2DD4BF";
    case "Automation":
      return "#F97316";
  }
}

/* =========================================================
   TYPES
========================================================= */

type Tab = "Store" | "My Apps" | "Webhooks";

type Category =
  | "All"
  | "Email"
  | "Calendar"
  | "Data"
  | "Phone"
  | "Automation";

type ViewMode = "grid" | "list";

type IntegrationId =
  | "gmail"
  | "google-calendar"
  | "google-sheets"
  | "google-maps"
  | "csv"
  | "twilio"
  | "webhook";

type Integration = {
  id: IntegrationId;
  name: string;
  description: string;
  category: Exclude<Category, "All">;
  color: string;
  icon: ReactNode;
  featured?: boolean;
  popular?: boolean;
  builtIn?: boolean;
  externalUrl?: string;
  details: string[];
};

type SavedConnection = {
  id: IntegrationId;
  connectedAt: string;
  accountEmail?: string | null;
  accountName?: string | null;
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
};

type ApiConnection = {
  provider?: unknown;
  connected_at?: unknown;
  account_email?: unknown;
  account_name?: unknown;
  metadata?: unknown;
};

type CategoryCard = {
  name: Category;
  description: string;
  icon: ReactNode;
  color: string;
};

type WebhookEventKey =
  | "leadCreated"
  | "leadUpdated"
  | "outreachReply"
  | "meetingBooked";

type WebhookEventDefinition = [
  WebhookEventKey,
  string
];

/* =========================================================
   CATEGORIES
========================================================= */

const categories: Category[] = [
  "All",
  "Email",
  "Calendar",
  "Data",
  "Phone",
  "Automation",
];

/* =========================================================
   INTEGRATIONS
========================================================= */

const integrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Send personalized outreach and manage email communication with your leads.",
    category: "Email",
    color: "#EA4335",
    icon: <Mail size={21} />,
    featured: true,
    popular: true,
    details: [
      "Send personalized lead outreach",
      "Send emails from your connected Gmail account",
      "Connect email activity to lead records",
      "Use Google's secure OAuth connection",
    ],
    externalUrl: "https://mail.google.com/",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description:
      "Create meetings and follow-up events directly from your BaseLead workflow.",
    category: "Calendar",
    color: "#4285F4",
    icon: <Calendar size={21} />,
    featured: true,
    popular: true,
    details: [
      "Create calendar events",
      "Schedule lead follow-ups",
      "Create meetings from BaseLead",
      "Use Google's secure OAuth connection",
    ],
    externalUrl: "https://calendar.google.com/",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description:
      "Export and work with BaseLead leads and pipeline data in Google Sheets.",
    category: "Data",
    color: "#34A853",
    icon: <FileSpreadsheet size={21} />,
    featured: true,
    popular: true,
    details: [
      "Export BaseLead leads",
      "Create BaseLead spreadsheets",
      "Send lead data to Google Sheets",
      "Use Google's secure OAuth connection",
    ],
    externalUrl: "https://docs.google.com/spreadsheets/",
  },
  {
  id: "google-maps",
  name: "Google Maps",
  builtIn: true,
  description:
    "Find businesses, locations, and nearby companies for your lead searches.",
  category: "Data",
  color: "#4285F4",
  icon: <MapPinned size={21} />,
  featured: true,
  popular: true,
  details: [
    "Search businesses by location",
    "Find nearby companies",
    "Use location data in lead discovery",
    "Connect Google Maps to BaseLead",
  ],
  externalUrl:
    "https://console.cloud.google.com/google/maps-apis",
},
  {
    id: "csv",
    name: "CSV Import & Export",
    description:
      "Import real lead lists into BaseLead or export your actual BaseLead data.",
    category: "Data",
    color: "#84CC16",
    icon: <FileSpreadsheet size={21} />,
    popular: true,
    builtIn: true,
    details: [
      "Import real leads",
      "Export real BaseLead leads",
      "Detect duplicate records",
      "Use a standard CSV format",
    ],
  },
  {
    id: "twilio",
    name: "Twilio — Calls & SMS",
    description:
      "Text and call leads from your own business number. Replies land in BaseLead and move the pipeline.",
    category: "Phone",
    color: TWILIO_RED,
    icon: <MessageSquare size={21} />,
    popular: true,
    details: [
      "Text leads from your business number",
      "Call leads with one tap",
      "Replies are logged on the lead and move the pipeline",
      "Credentials are encrypted on the server",
    ],
    externalUrl: "https://console.twilio.com/",
  },
  {
    id: "webhook",
    name: "Webhooks",
    description:
      "Send selected BaseLead events to an endpoint you control.",
    category: "Automation",
    color: GOLD,
    icon: <Webhook size={21} />,
    popular: true,
    builtIn: true,
    details: [
      "Send lead events",
      "Send outreach events",
      "Send meeting events",
      "Deliver events server-side",
    ],
  },
];

/* =========================================================
   CSV HELPERS
========================================================= */

function downloadFile(
  filename: string,
  content: string,
  mimeType: string
) {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function escapeCSV(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function createCSVFromLeads(
  leads: Array<Record<string, unknown>>
) {
  const headers = [
    "Name",
    "Company",
    "Email",
    "Phone",
    "Industry",
    "Location",
    "Status",
    "Score",
  ];

  const rows = leads.map(
    (lead: Record<string, unknown>) => [
      lead.name,
      lead.company,
      lead.email,
      lead.phone,
      lead.industry,
      lead.location,
      lead.status,
      lead.ai_score ?? lead.intent_score,
    ]
  );

  return [headers, ...rows]
    .map((row) =>
      row.map(escapeCSV).join(",")
    )
    .join("\n");
}

function createCSVTemplate() {
  return [
    [
      "Name",
      "Company",
      "Email",
      "Phone",
      "Industry",
      "Location",
      "Status",
    ],
    [
      "Jane Smith",
      "Example Company",
      "jane@example.com",
      "(512) 555-0100",
      "Dental",
      "Austin, TX",
      "new",
    ],
  ]
    .map((row) =>
      row.map(escapeCSV).join(",")
    )
    .join("\n");
}

/* =========================================================
   CARD
========================================================= */

function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`
        rounded-2xl
        border
        border-[${BORDER}]
        bg-[${PANEL}]
        transition-all
        duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/* =========================================================
   BUTTON
========================================================= */

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "appstore";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary:
      "bg-[#3B82F6] text-white shadow-[0_6px_20px_rgba(59,130,246,0.10)] hover:bg-[#3B82F6] hover:shadow-[0_8px_26px_rgba(59,130,246,0.20)] hover:-translate-y-0.5",
    secondary:
      "border border-[#202020] bg-[#0D0D0D] text-gray-200 shadow-[0_6px_18px_rgba(0,0,0,0.12)] hover:border-[#2A2A2A] hover:bg-[#171717] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.22)]",
    danger:
      "border border-[#F22F46]/30 bg-[#3A1418] text-[#F22F46] hover:border-[#F22F46]/50 hover:bg-[#3A1418] hover:shadow-[0_8px_22px_rgba(242,47,70,0.12)]",
    appstore:
      "min-w-[104px] rounded-full border border-[#202020] bg-[#101010] px-5 py-2.5 text-[14px] font-semibold text-[#3B82F6] shadow-[0_6px_18px_rgba(0,0,0,0.15)] hover:border-[#3B82F6]/40 hover:bg-[#171717] hover:text-[#3B82F6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)] hover:-translate-y-0.5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex
        items-center
        justify-center
        gap-2
        rounded-xl
        px-4
        py-2.5
        text-[11px]
        font-medium
        transition-all
        duration-200
        disabled:cursor-not-allowed
        disabled:opacity-40
        ${styles[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

/* =========================================================
   APP STORE ACTION
========================================================= */

function AppStoreAction({
  children,
  onClick,
  disabled = false,
  primary = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex
        h-10
        min-w-[104px]
        items-center
        justify-center
        rounded-full
        border
        px-5
        text-[14px]
        font-semibold
        shadow-[0_6px_18px_rgba(0,0,0,0.15)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        active:scale-[0.97]
        disabled:cursor-not-allowed
        disabled:opacity-40
        ${primary
          ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-[0_6px_18px_rgba(59,130,246,0.18)] hover:border-[#2F74E8] hover:bg-[#2F74E8] hover:text-white hover:shadow-[0_8px_24px_rgba(59,130,246,0.28)]"
          : "border-[#202020] bg-[#101010] text-[#3B82F6] hover:border-[#3B82F6]/40 hover:bg-[#171717] hover:text-[#3B82F6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)]"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

/* =========================================================
   INTEGRATION LOGO
========================================================= */

function IntegrationLogo({
  integration,
  large = false,
}: {
  integration: Integration;
  large?: boolean;
}) {
  // Pastel tile in the same color as the icon (like every other icon tile).
  return (
    <div
      className={`bl-logo-tile flex shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${large ? "h-14 w-14" : "h-11 w-11"}`}
      style={{
        color: integration.color,
        "--tab": integration.color,
      } as CSSProperties}
    >
      {integration.icon}
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function IntegrationStatus({
  connected,
}: {
  integration: Integration;
  connected: boolean;
}) {
  if (connected) {
    return (
      <span
        className="flex items-center gap-1.5 text-[9px]"
        style={{ color: GREEN }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: GREEN,
            boxShadow: `0 0 8px ${GREEN}55`,
          }}
        />
        Connected
      </span>
    );
  }

  return (
    <span className="rounded-full border border-[#84CC16]/50 bg-transparent px-2 py-1 text-[9px] text-[#84CC16]">
      Available
    </span>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className={`
          max-h-[90vh]
          w-full
          overflow-hidden
          rounded-2xl
          border
          border-[#202020]
          bg-[#0D0D0D]
          shadow-[0_25px_70px_rgba(0,0,0,0.55)]
          ${wide ? "max-w-3xl" : "max-w-lg"}
        `}
      >
        <div className="flex items-center justify-between border-b border-[#202020] bg-[#101010] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-[#777777]
              transition-all
              duration-200
              hover:bg-[#171717]
              hover:text-white
              hover:shadow-[0_5px_15px_rgba(0,0,0,0.25)]
            "
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-65px)] overflow-y-auto bg-[#0D0D0D] p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function IntegrationsPage() {
  const [isLightMode, setIsLightMode] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<Tab>("Store");

  const [twilioConnected, setTwilioConnected] =
    useState(false);

  const [placesReady, setPlacesReady] =
    useState(false);

  useEffect(() => {
    void fetch("/api/integrations/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => setPlacesReady(Boolean(status?.googlePlaces)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetch("/api/settings/twilio", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => setTwilioConnected(Boolean(status?.connected)))
      .catch(() => undefined);
  }, []);

  const [connections, setConnections] =
    useState<SavedConnection[]>([]);

  const { definition } = usePlan();

  const integrationLimit =
    definition.integrationLimit;

  const integrationLimitReached =
    integrationLimit !== null &&
    connections.length >= integrationLimit;

  const [loadingConnections, setLoadingConnections] =
    useState(true);

  const [connectionError, setConnectionError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState<Category>("All");

  const [viewMode, setViewMode] =
    useState<ViewMode>("grid");

  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);

  const [modal, setModal] =
    useState<"csv" | "webhook" | null>(null);

  const [toast, setToast] =
    useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] =
    useState("");

  const [webhookName, setWebhookName] =
    useState("BaseLead Webhook");

  const [webhookEvents, setWebhookEvents] =
    useState<Record<WebhookEventKey, boolean>>({
      leadCreated: true,
      leadUpdated: true,
      outreachReply: false,
      meetingBooked: true,
    });

  const [sendingTest, setSendingTest] =
    useState(false);

  const [savingConnection, setSavingConnection] =
    useState(false);

  const [importingCSV, setImportingCSV] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateTheme = () => {
      setIsLightMode(
        document.documentElement.classList.contains(
          "baselead-light"
        )
      );
    };

    updateTheme();

    const observer = new MutationObserver(
      updateTheme
    );

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["class"],
      }
    );

    return () => observer.disconnect();
  }, []);

    /* =======================================================
     LOAD CONNECTIONS
  ======================================================= */

  async function loadConnections() {
    setLoadingConnections(true);
    setConnectionError(null);

    try {
      const response = await fetch(
        "/api/integrations/connections",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: {
        success?: boolean;
        connections?: ApiConnection[];
        error?: string;
      } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load integrations."
        );
      }

      const apiConnections: ApiConnection[] =
        Array.isArray(data.connections)
          ? data.connections
          : [];

      const mapped: SavedConnection[] =
        apiConnections
          .map(
            (
              item: ApiConnection
            ): SavedConnection => {
              const metadata =
                item.metadata &&
                typeof item.metadata === "object" &&
                !Array.isArray(item.metadata)
                  ? (item.metadata as Record<
                      string,
                      unknown
                    >)
                  : {};

              const provider =
                typeof item.provider === "string"
                  ? item.provider.trim().toLowerCase()
                  : "";

              return {
                id:
                  provider as IntegrationId,
                connectedAt:
                  typeof item.connected_at ===
                  "string"
                    ? item.connected_at
                    : new Date().toISOString(),
                accountEmail:
                  typeof item.account_email ===
                  "string"
                    ? item.account_email
                    : null,
                accountName:
                  typeof item.account_name ===
                  "string"
                    ? item.account_name
                    : null,
                metadata,
                webhookUrl:
                  typeof metadata.webhookUrl ===
                  "string"
                    ? metadata.webhookUrl
                    : undefined,
              };
            }
          )
          .filter(
            (
              item: SavedConnection
            ) =>
              integrations.some(
                (
                  integration: Integration
                ) =>
                  integration.id === item.id
              )
          );

      setConnections(mapped);
    } catch (error) {
      console.error(
        "Integrations load error:",
        error
      );

      setConnectionError(
        error instanceof Error
          ? error.message
          : "Unable to load integrations."
      );
    } finally {
      setLoadingConnections(false);
    }
  }

  useEffect(() => {
    void loadConnections();
  }, []);

  /* =======================================================
     HANDLE OAUTH RETURN
  ======================================================= */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const connected =
      params.get("connected");

    const error =
      params.get("error");

    if (connected) {
      const integration =
        integrations.find(
          (
            item: Integration
          ) => item.id === connected
        );

      if (integration) {
        showToast(
          `${integration.name} connected successfully.`
        );
      }

      void loadConnections();

      window.history.replaceState(
        {},
        "",
        "/integrations"
      );
    }

    if (error) {
      showToast(
        decodeURIComponent(error)
      );

      window.history.replaceState(
        {},
        "",
        "/integrations"
      );
    }
  }, []);

  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(message: string) {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 2800);
  }

  /* =======================================================
     CONNECTION HELPERS
  ======================================================= */

  function isConnected(
    id: IntegrationId
  ) {
    if (id === "twilio") return twilioConnected;
    if (id === "google-maps") return placesReady;

    return connections.some(
      (
        item: SavedConnection
      ) => item.id === id
    );
  }

  async function saveConnection(
    id: IntegrationId,
    options?: {
      accountEmail?: string | null;
      accountName?: string | null;
      metadata?: Record<string, unknown>;
    }
  ) {
    setSavingConnection(true);

    try {
      const response = await fetch(
        "/api/integrations/connections",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            provider: id,
            accountEmail:
              options?.accountEmail ?? null,
            accountName:
              options?.accountName ?? null,
            metadata:
              options?.metadata ?? {},
          }),
        }
      );

      const data: {
        success?: boolean;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to save integration."
        );
      }

      await loadConnections();

      return true;
    } catch (error) {
      console.error(
        "Integration save error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Unable to save integration."
      );

      return false;
    } finally {
      setSavingConnection(false);
    }
  }

  async function disconnect(
    id: IntegrationId
  ) {
    try {
      const response = await fetch(
        `/api/integrations/connections?provider=${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data: {
        success?: boolean;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to disconnect integration."
        );
      }

      await loadConnections();

      setSelectedIntegration(null);

      showToast(
        "Integration disconnected."
      );
    } catch (error) {
      console.error(
        "Integration disconnect error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Unable to disconnect integration."
      );
    }
  }

  /* =======================================================
     FILTERS
  ======================================================= */

  const filteredIntegrations =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return integrations.filter(
        (
          integration: Integration
        ) => {
          const matchesSearch =
            !query ||
            integration.name
              .toLowerCase()
              .includes(query) ||
            integration.description
              .toLowerCase()
              .includes(query);

          const matchesCategory =
            category === "All" ||
            integration.category ===
              category;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [search, category]);

  const featuredIntegrations =
    integrations.filter(
      (
        integration: Integration
      ) => integration.featured
    );

  const connectedIntegrations =
    connections
      .map(
        (
          connection: SavedConnection
        ) => ({
          connection,
          integration:
            integrations.find(
              (
                integration: Integration
              ) =>
                integration.id ===
                connection.id
            ),
        })
      )
      .filter(
        (
          item: {
            connection: SavedConnection;
            integration:
              | Integration
              | undefined;
          }
        ): item is {
          connection: SavedConnection;
          integration: Integration;
        } =>
          Boolean(item.integration)
      );

  /* =======================================================
     OPEN INTEGRATION
  ======================================================= */

  function openIntegration(
    integration: Integration
  ) {
    if (integration.id === "csv") {
      setModal("csv");
      return;
    }

    if (
      integration.id ===
      "webhook"
    ) {
      const existing =
        connections.find(
          (
            connection: SavedConnection
          ) =>
            connection.id ===
            "webhook"
        );

      setWebhookUrl(
        existing?.webhookUrl ?? ""
      );

      setWebhookName(
        existing?.accountName ||
          "BaseLead Webhook"
      );

      if (existing?.metadata) {
        const savedEvents =
          existing.metadata.events;

        if (
          savedEvents &&
          typeof savedEvents ===
            "object" &&
          !Array.isArray(savedEvents)
        ) {
          setWebhookEvents(
            (previous) => ({
              ...previous,
              ...(savedEvents as Partial<
                Record<
                  WebhookEventKey,
                  boolean
                >
              >),
            })
          );
        }
      }

      setModal("webhook");
      return;
    }

    setSelectedIntegration(
      integration
    );
  }

  /* =======================================================
     OAUTH
  ======================================================= */

  function getOAuthProvider(
    id: IntegrationId
  ) {
    switch (id) {
      case "gmail":
      case "google-calendar":
      case "google-sheets":
        return "google";

      default:
        return null;
    }
  }

  function startOAuth(
    integration: Integration
  ) {
    const provider =
      getOAuthProvider(
        integration.id
      );

    if (!provider) {
      return;
    }

    const returnTo =
      `/integrations?connected=${encodeURIComponent(
        integration.id
      )}`;

    const url =
      `/api/integrations/oauth/${provider}/start?returnTo=${encodeURIComponent(
        returnTo
      )}`;

    // In the phone app, Google sign-in screens must open in the system browser.
    if (isNativeApp()) {
      void openInSystemBrowser(url);
      return;
    }

    window.location.assign(url);
  }

  /* =======================================================
     CONNECT
  ======================================================= */

  function handleConnect(
    integration: Integration
  ) {
    if (integration.id === "twilio") {
      setSelectedIntegration(integration);
      return;
    }

      if (
    !isConnected(integration.id) &&
    integrationLimitReached
  ) {
    showToast(
      `Your plan allows ${integrationLimit} connected integrations. Upgrade to connect more.`
    );

    return;
  }
      if (integration.id === "google-maps") {
      // Built into BaseLead (server API key) — nothing for the user to log into.
      setSelectedIntegration(integration);
      return;
    }
    if (integration.id === "csv") {
      setModal("csv");
      return;
    }

    if (
      integration.id ===
      "webhook"
    ) {
      openIntegration(
        integration
      );
      return;
    }

    startOAuth(
      integration
    );
  }

  /* =======================================================
     CSV EXPORT
  ======================================================= */

  async function exportLeads() {
    try {
      const response = await fetch(
        "/api/integrations/csv/export",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: {
        success?: boolean;
        csv?: string;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to export leads."
        );
      }

      downloadFile(
        "baselead-leads.csv",
        data.csv ?? "",
        "text/csv;charset=utf-8"
      );

      await saveConnection("csv", {
        accountName:
          "CSV Import & Export",
        metadata: {
          mode: "built-in",
          lastAction: "export",
          lastActionAt:
            new Date().toISOString(),
        },
      });

      showToast(
        "Your BaseLead leads were exported."
      );
    } catch (error) {
      console.error(
        "CSV export error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Unable to export leads."
      );
    }
  }

  /* =======================================================
     CSV IMPORT
  ======================================================= */

  function handleCSVImport(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setImportingCSV(true);

    const reader =
      new FileReader();

    reader.onload = async () => {
      try {
        const text = String(
          reader.result ?? ""
        );

        if (!text.trim()) {
          throw new Error(
            "The CSV file is empty."
          );
        }

        const response =
          await fetch(
            "/api/integrations/csv/import",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                csv: text,
              }),
            }
          );

        const data: {
          success?: boolean;
          imported?: number;
          skipped?: number;
          errors?: number;
          error?: string;
        } = await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Unable to import CSV."
          );
        }

        await saveConnection("csv", {
          accountName:
            "CSV Import & Export",
          metadata: {
            mode: "built-in",
            lastAction: "import",
            lastActionAt:
              new Date().toISOString(),
            importedRows:
              data.imported ?? 0,
            skippedRows:
              data.skipped ?? 0,
            errorRows:
              data.errors ?? 0,
          },
        });

        setModal(null);

        showToast(
          `${data.imported ?? 0} lead${
            data.imported === 1
              ? ""
              : "s"
          } imported successfully.`
        );
      } catch (error) {
        console.error(
          "CSV import error:",
          error
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Unable to import CSV."
        );
      } finally {
        setImportingCSV(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setImportingCSV(false);

      showToast(
        "Unable to read that CSV file."
      );

      event.target.value = "";
    };

    reader.readAsText(file);
  }

  /* =======================================================
     WEBHOOK
  ======================================================= */

  function validateWebhookUrl(
    value: string
  ) {
    try {
      const parsed =
        new URL(value.trim());

      return (
        parsed.protocol ===
          "https:" ||
        parsed.protocol ===
          "http:"
      );
    } catch {
      return false;
    }
  }

  async function saveWebhook() {
    if (!webhookUrl.trim()) {
      showToast(
        "Enter a webhook URL first."
      );

      return;
    }

    if (
      !validateWebhookUrl(
        webhookUrl
      )
    ) {
      showToast(
        "Enter a valid webhook URL."
      );

      return;
    }

    const saved =
      await saveConnection(
        "webhook",
        {
          accountName:
            webhookName.trim() ||
            "BaseLead Webhook",
          metadata: {
            webhookUrl:
              webhookUrl.trim(),
            events:
              webhookEvents,
            name:
              webhookName.trim() ||
              "BaseLead Webhook",
          },
        }
      );

    if (!saved) {
      return;
    }

    setModal(null);

    showToast(
      "Webhook saved successfully."
    );
  }

  async function sendWebhookTest() {
    if (!webhookUrl.trim()) {
      showToast(
        "Enter a webhook URL first."
      );

      return;
    }

    if (
      !validateWebhookUrl(
        webhookUrl
      )
    ) {
      showToast(
        "Enter a valid webhook URL."
      );

      return;
    }

    setSendingTest(true);

    try {
      const response =
        await fetch(
          "/api/integrations/webhooks/test",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              url: webhookUrl.trim(),
            }),
          }
        );

      const data: {
        success?: boolean;
        error?: string;
      } = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "The webhook test failed."
        );
      }

      showToast(
        "Test webhook sent successfully."
      );
    } catch (error) {
      console.error(
        "Webhook test error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "The webhook test failed."
      );
    } finally {
      setSendingTest(false);
    }
  }

  /* =======================================================
     COPY
  ======================================================= */

  async function copyText(
    text: string
  ) {
    if (!text) {
      showToast(
        "Nothing to copy."
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        text
      );

      showToast(
        "Copied to clipboard."
      );
    } catch {
      showToast(
        "Unable to copy."
      );
    }
  }

  /* =======================================================
     CATEGORY CARDS
  ======================================================= */

  const categoryCards: CategoryCard[] = [
    {
      name: "Email",
      description:
        "Contact leads",
      icon: <Mail size={17} />,
      color: RED,
    },
    {
      name: "Calendar",
      description:
        "Book meetings",
      icon: <Calendar size={17} />,
      color: BLUE,
    },
    {
      name: "Data",
      description:
        "Move your data",
      icon: <FileSpreadsheet size={17} />,
      color: PURPLE,
    },
    {
      name: "Phone",
      description:
        "Call & text leads",
      icon: <MessageSquare size={17} />,
      color: "#2DD4BF",
    },
    {
      name: "Automation",
      description:
        "Automate work",
      icon: <Zap size={17} />,
      color: "#F97316",
    },
    {
      name: "All",
      description:
        "Browse everything",
      icon: <Grid2X2 size={17} />,
      color: BLUE,
    },
  ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="bg-[#050505] px-4 pb-5 pt-5 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight lg:text-[30px]">
                Integrations
              </h1>

              <span
                className="
                  rounded-full
                  border
                  border-[#A78BFA]/30
                  bg-[#241A38]
                  px-2.5
                  py-1
                  text-[9px]
                  font-medium
                  text-[#A78BFA]
                  shadow-[0_0_16px_rgba(167,139,250,0.08)]
                "
              >
                {integrations.length} Apps
              </span>
            </div>

            <p className="mt-1 max-w-2xl text-sm text-[#777777]">
              Connect BaseLead to the tools
              that power your sales workflow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="
                rounded-xl
                border
                border-[#202020]
                bg-[#0D0D0D]
                px-4
                py-2.5
                shadow-[0_8px_22px_rgba(0,0,0,0.16)]
                transition-all
                duration-200
                hover:border-[#2A2A2A]
                hover:bg-[#101010]
                hover:shadow-[0_10px_26px_rgba(0,0,0,0.22)]
              "
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: GREEN,
                    boxShadow: `0 0 8px ${GREEN}55`,
                  }}
                />

                <span className="text-[11px] text-gray-300">
                  {loadingConnections
                    ? "—"
                    : connectedIntegrations.length}
                </span>

                <span className="text-[10px] text-[#555555]">
                  connected
                </span>
              </div>
            </div>
          </div>
        </div>

        {connectionError && (
          <div
            className="
              mt-4
              flex
              items-center
              justify-between
              gap-3
              rounded-xl
              border
              border-[#F22F46]/25
              bg-[#3A1418]
              px-4
              py-3
              shadow-[0_8px_22px_rgba(242,47,70,0.08)]
            "
          >
            <p className="text-[10px] text-[#F22F46]">
              {connectionError}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadConnections()
              }
              className="shrink-0 text-[10px] text-[#3B82F6] transition hover:text-white"
            >
              Retry
            </button>
          </div>
        )}
      </header>



      {/* ===================================================
          TABS
      =================================================== */}

    {/* ===================================================
    TABS
=================================================== */}

<div
  style={{
    borderColor: isLightMode
      ? "#E3E3E8"
      : "#202020",
  }}
  className="overflow-x-auto border-b"
>
  <div className="flex min-w-max items-center gap-1 px-4 sm:px-6 lg:px-7">
    {(
      [
        "Store",
        "My Apps",
        "Webhooks",
      ] as Tab[]
    ).map((tab: Tab) => {
      const active = activeTab === tab;
      const meta = {
        Store: { icon: Store, color: "#3B82F6" },
        "My Apps": { icon: LayoutGrid, color: "#F5C518" },
        Webhooks: { icon: Webhook, color: "#F472B6" },
      }[tab];
      const TabIcon = meta.icon;

      return (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          data-active={active}
          style={{ "--tab": meta.color, color: isLightMode ? "#555555" : "#8C8C8C" } as CSSProperties}
          className="bl-tab my-2 flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-xs font-medium"
        >
          <TabIcon size={14} strokeWidth={2.2} className="bl-tab-emoji" style={{ color: meta.color }} aria-hidden />
          {tab}

          {tab === "My Apps" &&
            connectedIntegrations.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[8px] font-semibold text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                {connectedIntegrations.length}
              </span>
            )}
        </button>
      );
    })}
  </div>
</div>

      {/* ===================================================
          STORE
      =================================================== */}

      {activeTab === "Store" && (
        <div className="space-y-7 bg-[#050505] px-4 pb-24 pt-6 sm:px-6 lg:px-7 lg:pb-8">
          {/* FEATURED */}
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#3B82F6]">
                  BaseLead App Store
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Everything your workflow needs
                </h2>
              </div>

              <span className="hidden text-[10px] text-[#555555] sm:block">
                {integrations.length} integrations
                available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {featuredIntegrations
                .slice(0, 4)
                .map(
                  (
                    integration: Integration
                  ) => (
                    <FeaturedIntegration
                      key={
                        integration.id
                      }
                      integration={
                        integration
                      }
                      connected={isConnected(
                        integration.id
                      )}
                      onOpen={() =>
                        openIntegration(
                          integration
                        )
                      }
                    />
                  )
                )}
            </div>
          </section>

          {/* CATEGORIES */}
          <section>
            <div className="mb-3">
              <h2 className="text-sm font-medium">
                Browse by category
              </h2>

              <p className="mt-1 text-[10px] text-[#555555]">
                Find integrations based on
                where they fit into your
                workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {categoryCards.map(
                (
                  item: CategoryCard
                ) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setCategory(
                        item.name
                      );
                      setSearch("");
                    }}
                    className={`
                      group
                      rounded-2xl
                      border
                      p-4
                      text-left
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      ${
                        category === item.name
                          ? "border-[#3B82F6]/35 bg-[#10243A] shadow-[0_10px_26px_rgba(59,130,246,0.08)]"
                          : "border-[#202020] bg-[#0D0D0D] hover:border-[#2A2A2A] hover:bg-[#101010] hover:shadow-[0_10px_26px_rgba(0,0,0,0.22)]"
                      }
                    `}
                  >
                    <div
                      style={getCategoryIconStyle(item.color)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[var(--category-icon-shadow)]"
                    >
                      {item.icon}
                    </div>

                    <p className="mt-3 text-[11px] font-medium text-white">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-500">
                      {item.description}
                    </p>
                  </button>
                )
              )}
            </div>
          </section>

          {/* ALL INTEGRATIONS */}
          <section>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-medium">
                  All integrations
                </h2>

                <p className="mt-1 text-[10px] text-[#555555]">
                  Connect the tools you already use.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search apps..."
                    className="
                      h-9
                      w-52
                      rounded-xl
                      border
                      border-[#202020]
                      bg-[#0D0D0D]
                      pl-9
                      pr-3
                      text-[11px]
                      text-white
                      outline-none
                      placeholder:text-[#555555]
                      transition-all
                      duration-200
                      focus:border-[#3B82F6]/50
                      focus:bg-[#101010]
                      focus:shadow-[0_0_20px_rgba(59,130,246,0.06)]
                    "
                  />
                </div>

                <div className="flex overflow-hidden rounded-xl border border-[#202020] bg-[#0D0D0D] shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
                  <button
                    type="button"
                    onClick={() =>
                      setViewMode("grid")
                    }
                    className={`
                      px-3
                      transition-all
                      duration-200
                      ${
                        viewMode === "grid"
                          ? "bg-[#3B82F6] text-white shadow-[0_0_14px_rgba(59,130,246,0.16)]"
                          : "text-[#777777] hover:bg-[#171717] hover:text-white"
                      }
                    `}
                  >
                    <Grid2X2 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setViewMode("list")
                    }
                    className={`
                      px-3
                      transition-all
                      duration-200
                      ${
                        viewMode === "list"
                          ? "bg-[#3B82F6] text-white shadow-[0_0_14px_rgba(59,130,246,0.16)]"
                          : "text-[#777777] hover:bg-[#171717] hover:text-white"
                      }
                    `}
                  >
                    <List size={13} />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map(
                  (
                    integration: Integration
                  ) => (
                    <StoreIntegrationCard
                      key={
                        integration.id
                      }
                      integration={
                        integration
                      }
                      connected={isConnected(
                        integration.id
                      )}
                      onOpen={() =>
                        openIntegration(
                          integration
                        )
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
                {filteredIntegrations.map(
                  (
                    integration: Integration
                  ) => (
                    <StoreIntegrationList
                      key={
                        integration.id
                      }
                      integration={
                        integration
                      }
                      connected={isConnected(
                        integration.id
                      )}
                      onOpen={() =>
                        openIntegration(
                          integration
                        )
                      }
                    />
                  )
                )}
              </div>
            )}

            {filteredIntegrations.length ===
              0 && (
              <Card className="p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
                <Search
                  size={26}
                  className="mx-auto text-[#555555]"
                />

                <p className="mt-3 text-sm text-[#777777]">
                  No integrations found.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                  className="mt-2 text-[10px] text-[#3B82F6] transition hover:text-white"
                >
                  Clear filters
                </button>
              </Card>
            )}
          </section>

          {/* BUILT IN */}
          <section>
            <div className="mb-3">
              <h2 className="text-sm font-medium">
                Built into BaseLead
              </h2>

              <p className="mt-1 text-[10px] text-[#555555]">
                These capabilities don't require
                another SaaS account.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {integrations
                .filter(
                  (
                    integration: Integration
                  ) =>
                    integration.builtIn
                )
                .map(
                  (
                    integration: Integration
                  ) => (
                    <BuiltInCard
                      key={
                        integration.id
                      }
                      integration={
                        integration
                      }
                      connected={isConnected(
                        integration.id
                      )}
                      onOpen={() =>
                        openIntegration(
                          integration
                        )
                      }
                    />
                  )
                )}
            </div>
          </section>

          {/* SECURITY */}
          <Card className="p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#18200B] text-[#84CC16] shadow-[0_0_18px_rgba(132,204,22,0.06)]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="text-xs font-medium">
                    Secure server-side connections
                  </h3>

                  <p className="mt-1 max-w-2xl text-[10px] leading-5 text-[#555555]">
                    OAuth credentials and provider
                    tokens are handled by the BaseLead
                    backend. Connected status is only
                    shown after a real connection exists.
                  </p>
                </div>
              </div>

              <span className="shrink-0 text-[10px] text-[#555555]">
                Security first
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================
          MY APPS
      =================================================== */}

      {activeTab === "My Apps" && (
        <div className="space-y-5 bg-[#050505] px-4 pb-24 pt-6 sm:px-6 lg:px-7 lg:pb-8">
          <div>
            <h2 className="text-lg font-semibold">
              My Apps
            </h2>

            <p className="mt-1 text-[11px] text-[#555555]">
              Integrations currently connected
              to your BaseLead workspace.
            </p>
          </div>

          {loadingConnections ? (
            <SkeletonRows rows={3} />
          ) : connectedIntegrations.length ===
            0 ? (
            <Card className="p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171717] text-[#555555]">
                <Link2 size={24} />
              </div>

              <h3 className="mt-4 text-sm font-medium text-gray-300">
                Your app collection is empty
              </h3>

              <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-[#555555]">
                Connect an app from the App Store
                and it will appear here automatically.
              </p>

              <Button
                variant="primary"
                className="mx-auto mt-5"
                onClick={() =>
                  setActiveTab("Store")
                }
              >
                Browse App Store
                <ChevronRight size={13} />
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {connectedIntegrations.map(
                ({
                  connection,
                  integration,
                }: {
                  connection: SavedConnection;
                  integration: Integration;
                }) => (
                  <Card
                    key={integration.id}
                    className="
                      group
                      p-5
                      shadow-[0_8px_24px_rgba(0,0,0,0.16)]
                      hover:border-[#2A2A2A]
                      hover:bg-[#101010]
                      hover:-translate-y-0.5
                      hover:shadow-[0_14px_32px_rgba(0,0,0,0.26)]
                    "
                  >
                    <div className="flex items-center gap-4">
                      <IntegrationLogo
                        integration={
                          integration
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">
                            {
                              integration.name
                            }
                          </h3>

                          <span className="flex items-center gap-1 text-[9px] text-[#84CC16]">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  GREEN,
                                boxShadow: `0 0 8px ${GREEN}55`,
                              }}
                            />
                            Connected
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] text-[#555555]">
                          Connected{" "}
                          {new Date(
                            connection.connectedAt
                          ).toLocaleDateString()}
                        </p>

                        {connection.accountEmail && (
                          <p className="mt-1 truncate text-[9px] text-[#555555]">
                            {
                              connection.accountEmail
                            }
                          </p>
                        )}

                        {connection.accountName && (
                          <p className="mt-1 truncate text-[9px] text-[#555555]">
                            {
                              connection.accountName
                            }
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openIntegration(
                            integration
                          )
                        }
                        className="
                          text-[10px]
                          text-[#3B82F6]
                          transition-all
                          duration-200
                          hover:text-white
                          hover:translate-x-0.5
                        "
                      >
                        Manage →
                      </button>
                    </div>

                    {connection.webhookUrl && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#202020] bg-[#171717] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                        <code className="min-w-0 flex-1 truncate text-[9px] text-[#777777]">
                          {
                            connection.webhookUrl
                          }
                        </code>

                        <button
                          type="button"
                          onClick={() =>
                            void copyText(
                              connection.webhookUrl ??
                                ""
                            )
                          }
                          className="text-[#555555] transition hover:text-white"
                        >
                          <Clipboard size={13} />
                        </button>
                      </div>
                    )}
                  </Card>
                )
              )}
            </div>
          )}

          <Card className="p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex items-start gap-3">
              <Info
                size={15}
                className="mt-0.5 text-[#3B82F6]"
              />

              <div>
                <h3 className="text-xs font-medium">
                  Your connections belong to BaseLead
                </h3>

                <p className="mt-1 text-[10px] leading-5 text-[#555555]">
                  Connections are stored in the
                  BaseLead backend rather than browser
                  localStorage.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================
          WEBHOOKS
      =================================================== */}

      {activeTab === "Webhooks" && (
        <div className="bg-[#050505] px-4 pb-24 pt-6 sm:px-6 lg:px-7 lg:pb-8">
          <PlanGate
  feature="integrations_webhooks"
  title="Webhooks are available on Pro and Scale"
  description="Upgrade your plan to connect BaseLead with Zapier, Make, or your own backend."
>
  <WebhookView
    savedWebhook={connections.find(
      (connection: SavedConnection) =>
        connection.id === "webhook"
    )}
    onAdd={() => setModal("webhook")}
    onManage={() => {
      const existing = connections.find(
        (connection: SavedConnection) =>
          connection.id === "webhook"
      );

      setWebhookUrl(existing?.webhookUrl ?? "");
      setWebhookName(
        existing?.accountName ||
          "BaseLead Webhook"
      );

      setModal("webhook");
    }}
    onDisconnect={() =>
      void disconnect("webhook")
    }
    onCopy={() => {
      const webhook = connections.find(
        (connection: SavedConnection) =>
          connection.id === "webhook"
      );

      if (webhook?.webhookUrl) {
        void copyText(webhook.webhookUrl);
      }
    }}
  />
</PlanGate>
        </div>
      )}

      {/* ===================================================
          DETAIL MODAL
      =================================================== */}

      {selectedIntegration && (
        <Modal
          title={
            selectedIntegration.name
          }
          onClose={() =>
            setSelectedIntegration(
              null
            )
          }
        >
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <IntegrationLogo
                integration={
                  selectedIntegration
                }
                large
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">
                    {
                      selectedIntegration.name
                    }
                  </h3>

                  <IntegrationStatus
                    integration={
                      selectedIntegration
                    }
                    connected={isConnected(
                      selectedIntegration.id
                    )}
                  />
                </div>

                <p className="mt-2 text-[11px] leading-5 text-[#777777]">
                  {
                    selectedIntegration.description
                  }
                </p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-medium text-gray-300">
                What you can do
              </p>

              <div className="space-y-2">
                {selectedIntegration.details.map(
                  (
                    detail: string
                  ) => (
                    <div
                      key={detail}
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-[#202020]
                        bg-[#101010]
                        px-3
                        py-3
                        transition-all
                        duration-200
                        hover:border-[#2A2A2A]
                        hover:bg-[#171717]
                        hover:shadow-[0_8px_20px_rgba(0,0,0,0.18)]
                      "
                    >
                      <Check
                        size={13}
                        className="text-[#84CC16]"
                      />

                      <span className="text-[11px] text-[#777777]">
                        {detail}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>


            {selectedIntegration.id === "google-maps" ? (
              <div className={`rounded-xl border p-4 ${placesReady ? "border-[#84CC16]/20 bg-[#18200B]" : "border-[#3B82F6]/25 bg-[#3B82F6]/[0.05]"}`}>
                <p className={`text-sm font-semibold ${placesReady ? "text-[#84CC16]" : "text-[#3B82F6]"}`}>
                  {placesReady ? "Active — built into BaseLead" : "Using free OpenStreetMap data for now"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  {placesReady
                    ? "There is nothing to log into. Every search in Lead Discovery uses real Google Maps business data automatically, for every user of your workspace."
                    : "Google Maps is not a login. Lead Discovery already finds real businesses using free OpenStreetMap data. When the BaseLead owner adds a Google Places API key on the server, searches switch to Google Maps data (ratings, reviews, more contacts) for every user automatically."}
                </p>
              </div>
            ) : selectedIntegration.id === "twilio" ? (
              <TwilioConnectCard
                embedded
                onStatusChange={setTwilioConnected}
              />
            ) : isConnected(
              selectedIntegration.id
            ) ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#84CC16]/15 bg-[#18200B] p-4 shadow-[0_8px_22px_rgba(132,204,22,0.05)]">
                  <div className="flex items-center gap-2">
                    <Check
                      size={15}
                      className="text-[#84CC16]"
                    />

                    <span className="text-[11px] text-[#84CC16]">
                      Connected
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-[#555555]">
                    This integration is connected
                    to your BaseLead workspace.
                  </p>
                </div>

                {selectedIntegration.id === "gmail" && (
                  <p className="text-[11px] leading-5 text-gray-500">
                    Connected before reply checking was added? Click Reconnect and allow BaseLead to read replies so it can stop follow-ups when a lead answers.
                  </p>
                )}

                <div className="flex gap-2">
                  {getOAuthProvider(selectedIntegration.id) && (
                    <AppStoreAction
                      className="flex-1"
                      onClick={() =>
                        startOAuth(selectedIntegration)
                      }
                    >
                      Reconnect
                    </AppStoreAction>
                  )}

                  <AppStoreAction
                    className="flex-1"
                    onClick={() =>
                      void disconnect(
                        selectedIntegration.id
                      )
                    }
                  >
                    Disconnect
                  </AppStoreAction>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                {selectedIntegration.externalUrl && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      window.open(
                        selectedIntegration.externalUrl,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <ExternalLink size={13} />
                    Visit{" "}
                    {
                      selectedIntegration.name
                    }
                  </Button>
                )}

                <AppStoreAction
                  primary
                  className="flex-1"
                  onClick={() =>
                    handleConnect(
                      selectedIntegration
                    )
                  }
                  disabled={savingConnection}
                >
                  {savingConnection
                    ? "Connecting..."
                    : `Connect ${selectedIntegration.name}`}
                </AppStoreAction>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===================================================
          CSV MODAL
      =================================================== */}

      {modal === "csv" && (
        <Modal
          title="CSV Import & Export"
          onClose={() =>
            setModal(null)
          }
        >
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#18200B] text-[#84CC16] shadow-[0_0_18px_rgba(132,204,22,0.06)]">
                <FileSpreadsheet size={24} />
              </div>

              <div>
                <h3 className="text-sm font-medium">
                  Move your real lead data
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-[#777777]">
                  Import leads directly into your
                  BaseLead workspace or export your
                  existing BaseLead records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={importingCSV}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="
                  group
                  rounded-xl
                  border
                  border-[#202020]
                  bg-[#101010]
                  p-4
                  text-left
                  transition-all
                  duration-200
                  hover:border-[#2A2A2A]
                  hover:bg-[#171717]
                  hover:-translate-y-0.5
                  hover:shadow-[0_10px_25px_rgba(0,0,0,0.24)]
                  disabled:opacity-40
                "
              >
                <Upload
                  size={18}
                  className="text-[#3B82F6]"
                />

                <p className="mt-3 text-xs font-medium">
                  {importingCSV
                    ? "Importing..."
                    : "Import leads"}
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#555555]">
                  Upload a CSV and BaseLead will
                  create real lead records.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  void exportLeads()
                }
                className="
                  group
                  rounded-xl
                  border
                  border-[#202020]
                  bg-[#101010]
                  p-4
                  text-left
                  transition-all
                  duration-200
                  hover:border-[#2A2A2A]
                  hover:bg-[#171717]
                  hover:-translate-y-0.5
                  hover:shadow-[0_10px_25px_rgba(0,0,0,0.24)]
                "
              >
                <Download
                  size={18}
                  className="text-[#3B82F6]"
                />

                <p className="mt-3 text-xs font-medium">
                  Export leads
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#555555]">
                  Download your actual BaseLead
                  lead data as CSV.
                </p>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={
                handleCSVImport
              }
            />

            <div className="rounded-xl border border-[#202020] bg-[#101010] p-4">
              <div className="flex items-start gap-3">
                <Info
                  size={15}
                  className="mt-0.5 text-[#777777]"
                />

                <div>
                  <p className="text-[11px] font-medium text-gray-300">
                    Need a template?
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#555555]">
                    Download a standard BaseLead
                    import template.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      downloadFile(
                        "baselead-import-template.csv",
                        createCSVTemplate(),
                        "text/csv;charset=utf-8"
                      );

                      showToast(
                        "Template downloaded."
                      );
                    }}
                    className="mt-3 text-[10px] text-[#3B82F6] transition hover:text-white"
                  >
                    Download template →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================
          WEBHOOK MODAL
      =================================================== */}

      {modal === "webhook" && (
        <Modal
          title="BaseLead Webhooks"
          onClose={() =>
            setModal(null)
          }
        >
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10243A] text-[#3B82F6] shadow-[0_0_18px_rgba(59,130,246,0.06)]">
                <Webhook size={24} />
              </div>

              <div>
                <h3 className="text-sm font-medium">
                  Connect your infrastructure
                </h3>

                <p className="mt-1 text-[11px] leading-5 text-[#777777]">
                  Send selected BaseLead events to
                  a webhook endpoint you control.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#777777]">
                Webhook name
              </label>

              <input
                value={webhookName}
                onChange={(event) =>
                  setWebhookName(
                    event.target.value
                  )
                }
                className="
                  mt-2
                  h-10
                  w-full
                  rounded-xl
                  border
                  border-[#202020]
                  bg-[#101010]
                  px-3
                  text-xs
                  text-white
                  outline-none
                  transition-all
                  duration-200
                  placeholder:text-[#555555]
                  focus:border-[#3B82F6]/50
                  focus:bg-[#171717]
                  focus:shadow-[0_0_20px_rgba(59,130,246,0.06)]
                "
              />
            </div>

            <div>
              <label className="text-[11px] text-[#777777]">
                Destination URL
              </label>

              <div className="mt-2 flex gap-2">
                <input
                  value={webhookUrl}
                  onChange={(event) =>
                    setWebhookUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://your-server.com/webhooks/baselead"
                  className="
                    h-10
                    min-w-0
                    flex-1
                    rounded-xl
                    border
                    border-[#202020]
                    bg-[#101010]
                    px-3
                    text-xs
                    text-white
                    outline-none
                    placeholder:text-[#555555]
                    transition-all
                    duration-200
                    focus:border-[#3B82F6]/50
                    focus:bg-[#171717]
                    focus:shadow-[0_0_20px_rgba(59,130,246,0.06)]
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      webhookUrl
                    )
                  }
                  className="
                    rounded-xl
                    border
                    border-[#202020]
                    bg-[#101010]
                    px-3
                    text-[#555555]
                    transition-all
                    duration-200
                    hover:border-[#2A2A2A]
                    hover:bg-[#171717]
                    hover:text-white
                  "
                >
                  <Clipboard size={14} />
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-[#777777]">
                Events
              </p>

              <div className="mt-2 space-y-2">
                {(
                  [
                    [
                      "leadCreated",
                      "Lead created",
                    ],
                    [
                      "leadUpdated",
                      "Lead updated",
                    ],
                    [
                      "outreachReply",
                      "Outreach reply",
                    ],
                    [
                      "meetingBooked",
                      "Meeting booked",
                    ],
                  ] as WebhookEventDefinition[]
                ).map(
                  (
                    [key, label]
                  ) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setWebhookEvents(
                          (previous) => ({
                            ...previous,
                            [key]:
                              !previous[key],
                          })
                        )
                      }
                      className="
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-[#202020]
                        bg-[#101010]
                        px-3
                        py-3
                        text-left
                        transition-all
                        duration-200
                        hover:border-[#2A2A2A]
                        hover:bg-[#171717]
                        hover:shadow-[0_8px_20px_rgba(0,0,0,0.18)]
                      "
                    >
                      <span className="text-[11px] text-gray-300">
                        {label}
                      </span>

                      <span
                        className={`
                          flex
                          h-5
                          w-5
                          items-center
                          justify-center
                          rounded-md
                          border
                          transition-all
                          duration-200
                          ${
                            webhookEvents[
                              key
                            ]
                              ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-[0_0_10px_rgba(59,130,246,0.16)]"
                              : "border-[#202020] bg-[#171717] text-transparent"
                          }
                        `}
                      >
                        <Check size={12} />
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#84CC16]/15 bg-[#18200B] p-3 shadow-[0_8px_20px_rgba(132,204,22,0.04)]">
              <div className="flex gap-2">
                <ShieldCheck
                  size={14}
                  className="mt-0.5 shrink-0 text-[#84CC16]"
                />

                <p className="text-[10px] leading-5 text-[#777777]">
                  Test deliveries are sent through
                  the BaseLead server, so the
                  destination does not need to allow
                  browser CORS requests.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() =>
                  void sendWebhookTest()
                }
                disabled={
                  sendingTest ||
                  !webhookUrl.trim()
                }
              >
                <Send size={13} />

                {sendingTest
                  ? "Sending..."
                  : "Send Test"}
              </Button>

              <Button
                variant="primary"
                className="flex-1"
                onClick={() =>
                  void saveWebhook()
                }
                disabled={
                  savingConnection
                }
              >
                <Check size={13} />

                {savingConnection
                  ? "Saving..."
                  : "Save Webhook"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================
          TOAST
      =================================================== */}

      {toast && (
        <div
          className="
            fixed
            bottom-5
            left-1/2
            z-[200]
            -translate-x-1/2
            rounded-xl
            border
            border-[#202020]
            bg-[#171717]
            px-4
            py-3
            shadow-[0_15px_40px_rgba(0,0,0,0.45)]
          "
        >
          <div className="flex items-center gap-2 text-[11px] text-white">
            <Check
              size={14}
              className="text-[#84CC16]"
            />

            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

function getIntegrationCardStyle(integration: Integration) {
  return {
    backgroundImage: `radial-gradient(ellipse at top right, ${integration.color}24 0%, transparent 62%)`,
    boxShadow: `0 8px 24px ${integration.color}18, 0 0 34px ${integration.color}12`,
  };
}

/* =========================================================
   FEATURED INTEGRATION
========================================================= */

function FeaturedIntegration({
  integration,
  connected,
  onOpen,
}: {
  integration: Integration;
  connected: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      style={getIntegrationCardStyle(integration)}
      className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#202020]
        bg-[#0D0D0D]
        p-5
        shadow-[0_8px_24px_rgba(0,0,0,0.16)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-[#2A2A2A]
        hover:bg-[#101010]
        hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)]
      "
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <IntegrationLogo
            integration={integration}
            large
          />

          <IntegrationStatus
            integration={integration}
            connected={connected}
          />
        </div>

        <h3 className="mt-5 text-sm font-semibold">
          {integration.name}
        </h3>

        <p className="mt-1 max-w-md text-[12px] leading-5 text-[#777777]">
          {integration.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span
            style={{
              borderColor: hexToRgba(getCategoryColor(integration.category), 0.55),
              color: getCategoryColor(integration.category),
            }}
            className="rounded-md border bg-transparent px-2 py-1 text-[9px]"
          >
            {integration.category}
          </span>

          <AppStoreAction primary={!connected} onClick={onOpen}>
            {connected ? "Manage" : "Connect"}
          </AppStoreAction>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STORE INTEGRATION CARD
========================================================= */

function StoreIntegrationCard({
  integration,
  connected,
  onOpen,
}: {
  integration: Integration;
  connected: boolean;
  onOpen: () => void;
}) {
  return (
    <Card
      style={getIntegrationCardStyle(integration)}
      className="
        group
        flex
        min-h-[235px]
        flex-col
        bg-[#0D0D0D]
        p-5
        shadow-[0_8px_24px_rgba(0,0,0,0.15)]
        hover:border-[#2A2A2A]
        hover:bg-[#101010]
        hover:-translate-y-0.5
        hover:shadow-[0_14px_32px_rgba(0,0,0,0.26)]
      "
    >
      <div className="flex items-start justify-between gap-3">
        <IntegrationLogo
          integration={integration}
        />

        <IntegrationStatus
          integration={integration}
          connected={connected}
        />
      </div>

      <div className="mt-4 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            {integration.name}
          </h3>

          {integration.popular && (
            <span className="rounded-full border border-[#202020] bg-[#171717] px-2 py-1 text-[8px] text-[#555555]">
              Popular
            </span>
          )}
        </div>

        <p className="mt-2 text-[12px] leading-5 text-[#777777]">
          {integration.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span
          style={{
            borderColor: hexToRgba(getCategoryColor(integration.category), 0.55),
            color: getCategoryColor(integration.category),
          }}
          className="rounded-md border bg-transparent px-2 py-1 text-[9px]"
        >
          {integration.category}
        </span>

        <AppStoreAction primary={!connected} onClick={onOpen}>
          {connected ? "Manage" : "Connect"}
        </AppStoreAction>
      </div>
    </Card>
  );
}

/* =========================================================
   STORE INTEGRATION LIST
========================================================= */

function StoreIntegrationList({
  integration,
  connected,
  onOpen,
}: {
  integration: Integration;
  connected: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      style={getIntegrationCardStyle(integration)}
      className="
        group
        flex
        items-center
        gap-4
        border-b
        border-[#202020]
        bg-[#0D0D0D]
        p-4
        transition-all
        duration-200
        last:border-b-0
        hover:bg-[#101010]
        hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.015),0_8px_20px_rgba(0,0,0,0.15)]
      "
    >
      <IntegrationLogo
        integration={integration}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-medium text-white">
            {integration.name}
          </h3>

          <span
            style={{
              borderColor: hexToRgba(getCategoryColor(integration.category), 0.55),
              color: getCategoryColor(integration.category),
            }}
            className="rounded-md border bg-transparent px-2 py-1 text-[8px]"
          >
            {integration.category}
          </span>

          {integration.popular && (
            <span className="text-[8px] text-[#555555]">
              Popular
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-[11px] text-[#555555]">
          {integration.description}
        </p>
      </div>

      <IntegrationStatus
        integration={integration}
        connected={connected}
      />

      <AppStoreAction primary={!connected} onClick={onOpen}>
        {connected ? "Manage" : "Connect"}
      </AppStoreAction>
    </div>
  );
}

/* =========================================================
   BUILT-IN CARD
========================================================= */

function BuiltInCard({
  integration,
  connected,
  onOpen,
}: {
  integration: Integration;
  connected: boolean;
  onOpen: () => void;
}) {
  return (
    <Card
      style={getIntegrationCardStyle(integration)}
      className="
        group
        bg-[#0D0D0D]
        p-5
        shadow-[0_8px_24px_rgba(0,0,0,0.15)]
        hover:border-[#2A2A2A]
        hover:bg-[#101010]
        hover:-translate-y-0.5
        hover:shadow-[0_14px_32px_rgba(0,0,0,0.26)]
      "
    >
      <div className="flex items-start gap-4">
        <IntegrationLogo
          integration={integration}
          large
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {integration.name}
            </h3>

            <span className="rounded-full border border-[#84CC16]/15 bg-[#18200B] px-2 py-1 text-[8px] text-[#84CC16]">
              Built-in
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[#555555]">
            {integration.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <IntegrationStatus
              integration={integration}
              connected={connected}
            />

            <AppStoreAction
              primary={!connected}
              onClick={onOpen}
            >
              {connected ? "Manage" : "Open"}
            </AppStoreAction>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================
   WEBHOOK VIEW
========================================================= */

function WebhookView({
  savedWebhook,
  onAdd,
  onManage,
  onDisconnect,
  onCopy,
}: {
  savedWebhook?: SavedConnection;
  onAdd: () => void;
  onManage: () => void;
  onDisconnect: () => void;
  onCopy: () => void;
}) {
  /*
   * IMPORTANT:
   * We explicitly narrow savedWebhook here instead of relying
   * on Boolean(savedWebhook). This lets TypeScript understand
   * that everything below this point is a real SavedConnection.
   */

  if (!savedWebhook) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#3B82F6]">
            Developer Tools
          </p>

          <h2 className="mt-1 text-lg font-semibold">
            Webhooks
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-[#555555]">
            Connect BaseLead events to your own
            infrastructure or automation platform.
          </p>
        </div>

        <Card className="bg-[#0D0D0D] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10243A] text-[#3B82F6] shadow-[0_0_22px_rgba(59,130,246,0.08)]">
            <Webhook size={28} />
          </div>

          <div className="mx-auto mt-5 max-w-lg text-center">
            <h3 className="text-sm font-semibold">
              No webhook configured
            </h3>

            <p className="mt-2 text-[11px] leading-5 text-[#555555]">
              Create a webhook destination to receive
              BaseLead events such as new leads,
              lead updates, outreach replies, and
              booked meetings.
            </p>

            <AppStoreAction
              primary
              className="mx-auto mt-5"
              onClick={onAdd}
            >
              <Plus size={14} />
              Create Webhook
            </AppStoreAction>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              title: "Lead Events",
              description:
                "React when leads are created or updated.",
            },
            {
              title: "Sales Activity",
              description:
                "Connect outreach and meeting activity.",
            },
            {
              title: "Automation",
              description:
                "Send selected events to an endpoint you control.",
            },
          ].map(
            ({
              title,
              description,
            }) => (
              <Card
                key={title}
                className="
                  bg-[#0D0D0D]
                  p-4
                  shadow-[0_8px_22px_rgba(0,0,0,0.14)]
                  hover:border-[#2A2A2A]
                  hover:bg-[#101010]
                  hover:-translate-y-0.5
                  hover:shadow-[0_12px_26px_rgba(0,0,0,0.22)]
                "
              >
                <Webhook
                  size={15}
                  className="text-[#777777]"
                />

                <h4 className="mt-3 text-[11px] font-medium">
                  {title}
                </h4>

                <p className="mt-1 text-[9px] leading-5 text-[#555555]">
                  {description}
                </p>
              </Card>
            )
          )}
        </div>
      </div>
    );
  }

  /*
   * From this point forward savedWebhook is guaranteed
   * to be a SavedConnection.
   */

  const webhookEventDefinitions: WebhookEventDefinition[] =
    [
      [
        "leadCreated",
        "Lead created",
      ],
      [
        "leadUpdated",
        "Lead updated",
      ],
      [
        "outreachReply",
        "Outreach reply",
      ],
      [
        "meetingBooked",
        "Meeting booked",
      ],
    ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#3B82F6]">
          Developer Tools
        </p>

        <h2 className="mt-1 text-lg font-semibold">
          Webhooks
        </h2>

        <p className="mt-1 text-[11px] text-[#555555]">
          Your BaseLead events are connected to an
          external destination.
        </p>
      </div>

      <Card className="bg-[#0D0D0D] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#18200B] text-[#84CC16] shadow-[0_0_18px_rgba(132,204,22,0.06)]">
            <Check size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">
                {savedWebhook.accountName ||
                  "BaseLead Webhook"}
              </h3>

              <span className="flex items-center gap-1.5 text-[9px] text-[#84CC16]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: GREEN,
                    boxShadow: `0 0 8px ${GREEN}55`,
                  }}
                />
                Connected
              </span>
            </div>

            <p className="mt-1 text-[10px] text-[#555555]">
              Connected{" "}
              {new Date(
                savedWebhook.connectedAt
              ).toLocaleDateString()}
            </p>
          </div>
        </div>

        {savedWebhook.webhookUrl && (
          <div className="mt-5 rounded-xl border border-[#202020] bg-[#171717] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <p className="text-[9px] uppercase tracking-wider text-[#555555]">
              Destination
            </p>

            <div className="mt-2 flex items-center gap-3">
              <code className="min-w-0 flex-1 truncate text-[10px] text-[#777777]">
                {savedWebhook.webhookUrl}
              </code>

              <button
                type="button"
                onClick={onCopy}
                className="
                  shrink-0
                  text-[#555555]
                  transition-all
                  duration-200
                  hover:text-white
                  hover:scale-105
                "
              >
                <Clipboard size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {webhookEventDefinitions.map(
            ([key, label]) => {
              const events =
                savedWebhook.metadata
                  ?.events;

              const active =
                events &&
                typeof events ===
                  "object" &&
                !Array.isArray(events)
                  ? Boolean(
                      (
                        events as Record<
                          string,
                          unknown
                        >
                      )[key]
                    )
                  : false;

              return (
                <div
                  key={key}
                  className={`
                    rounded-xl
                    border
                    px-3
                    py-3
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    ${
                      active
                        ? "border-[#84CC16]/15 bg-[#18200B] shadow-[0_8px_18px_rgba(132,204,22,0.04)]"
                        : "border-[#202020] bg-[#101010] hover:border-[#2A2A2A] hover:bg-[#171717]"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active
                          ? "bg-[#84CC16] shadow-[0_0_8px_rgba(132,204,22,0.35)]"
                          : "bg-[#555555]"
                      }`}
                    />

                    <span className="text-[9px] text-[#777777]">
                      {label}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <AppStoreAction
            className="flex-1"
            onClick={onManage}
          >
            <Settings2 size={14} />
            Manage Webhook
          </AppStoreAction>

          <Button
            variant="danger"
            className="flex-1"
            onClick={onDisconnect}
          >
            <X size={13} />
            Disconnect
          </Button>
        </div>
      </Card>

      <Card className="mt-4 bg-[#0D0D0D] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={16}
            className="mt-0.5 text-[#84CC16]"
          />

          <div>
            <h3 className="text-xs font-medium">
              Server-side delivery
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-[#555555]">
              BaseLead delivers webhook events from
              the backend rather than directly from
              the browser. This avoids browser CORS
              limitations and keeps your integration
              architecture secure.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}