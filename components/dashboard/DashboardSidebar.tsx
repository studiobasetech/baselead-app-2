"use client";

import {
  LayoutDashboard,
  Search,
  Users,
  GitBranch,
  Send,
  Calendar as CalendarIcon,
  BarChart3,
  Plug,
  Settings,
  LogOut,
  Bell,
  X,
  Target,
  Mail,
  Clock3,
  CheckCircle2,
  Menu,
  MoreHorizontal,
  Sun,
  Workflow,
  FileSignature,
  Trophy,
  ListChecks,
  BookOpen,
} from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent, type CSSProperties } from "react";

import { supabase } from "@/components/lib/supabase";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const GOLD = "#F5C518";
const GREEN = "#84CC16";
const BORDER = "#262626";
const MUTED = "#8C8C8C";

const NAV = [
  { icon: Sun, label: "Today", href: "/today", color: "#F5C518" },
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", color: "#60A5FA" },
  { icon: Search, label: "Lead Discovery", href: "/lead-discovery", color: "#22D3EE" },
  { icon: Users, label: "Leads", href: "/leads", color: "#A78BFA" },
  { icon: GitBranch, label: "Pipeline", href: "/pipeline", color: "#2DD4BF" },
  { icon: Send, label: "Outreach", href: "/outreach", color: "#F97316" },
  { icon: Workflow, label: "Sequences", href: "/sequences", color: "#F472B6" },
  { icon: FileSignature, label: "Proposals", href: "/proposals", color: "#84CC16" },
  { icon: BookOpen, label: "Sales Toolkit", href: "/resources", color: "#FBBF24" },
  { icon: CalendarIcon, label: "Calendar", href: "/calendar", color: "#38BDF8" },
  { icon: BarChart3, label: "Reports", href: "/reports", color: "#C084FC" },
  { icon: Trophy, label: "Team Performance", href: "/team", color: "#FACC15" },
  { icon: Plug, label: "Integrations", href: "/integrations", color: "#34D399" },
  { icon: Settings, label: "Settings", href: "/settings", color: "#9CA3AF" },
  { icon: ListChecks, label: "Setup", href: "/setup", color: "#F5C518" },
];

// The four most-used pages shown in the mobile bottom bar.
const MOBILE_NAV = ["/today", "/lead-discovery", "/pipeline", "/outreach"].map(
  (href) => NAV.find((item) => item.href === href)!
);

type WorkspaceData = {
  companyName: string;
  companyLogo: string;
  userName: string;
  userEmail: string;
  userId: string;
};

type Notification = {
  id: string;
  type: "lead" | "outreach" | "meeting" | "system";
  title: string;
  message: string;
  createdAt: string;
  href: string;
};

const EMPTY_WORKSPACE: WorkspaceData = {
  companyName: "",
  companyLogo: "",
  userName: "",
  userEmail: "",
  userId: "",
};

const READ_KEY = "baselead_read_notifications";

function loadReadIds(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(`${READ_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveReadIds(userId: string, ids: string[]) {
  try {
    window.localStorage.setItem(
      `${READ_KEY}:${userId}`,
      JSON.stringify(ids.slice(-200))
    );
  } catch {
    // Storage can be unavailable (private mode); ignore.
  }
}

/* =========================================================
   REAL NOTIFICATIONS
   Built from the user's latest leads and outreach activity.
========================================================= */

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const [leadsResult, repliesResult, upcomingResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, company, ai_score, intent_score, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("outreach")
      .select("id, lead_id, subject, campaign, replied_at")
      .eq("user_id", userId)
      .not("replied_at", "is", null)
      .gte("replied_at", since)
      .order("replied_at", { ascending: false })
      .limit(5),
    supabase
      .from("outreach")
      .select("id, subject, campaign, next_step, next_step_at")
      .eq("user_id", userId)
      .gte("next_step_at", now)
      .lte("next_step_at", inTwoDays)
      .order("next_step_at", { ascending: true })
      .limit(5),
  ]);

  const items: Notification[] = [];

  for (const lead of leadsResult.data ?? []) {
    const score = Number(lead.ai_score ?? lead.intent_score ?? 0);
    const who = lead.company || lead.name || "A new lead";

    items.push({
      id: `lead-${lead.id}`,
      type: "lead",
      title: score >= 70 ? "New high-opportunity lead" : "New lead added",
      message: score >= 70 ? `${who} · ${score}/100` : who,
      createdAt: lead.created_at,
      href: "/leads",
    });
  }

  for (const reply of repliesResult.data ?? []) {
    items.push({
      id: `reply-${reply.id}`,
      type: "outreach",
      title: "Outreach reply received",
      message: reply.subject || reply.campaign || "",
      createdAt: reply.replied_at,
      href: "/outreach",
    });
  }

  for (const step of upcomingResult.data ?? []) {
    items.push({
      id: `step-${step.id}-${step.next_step_at}`,
      type: "meeting",
      title: "Upcoming follow-up",
      message: step.next_step || step.subject || step.campaign || "",
      createdAt: step.next_step_at,
      href: "/outreach",
    });
  }

  return items
    .filter((item) => item.createdAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 12);
}

function timeAgo(value: string, language: string) {
  const diff = new Date(value).getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });

  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");

  return rtf.format(Math.round(hours / 24), "day");
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language } = useLanguage();

  const [loggingOut, setLoggingOut] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceData>(EMPTY_WORKSPACE);
  // The Setup checklist is only for the BaseLead owner, never for customers.
  const [platformAdmin, setPlatformAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/setup/admin")
      .then((response) => (response.ok ? response.json() : { admin: false }))
      .then((result) => setPlatformAdmin(Boolean(result.admin)))
      .catch(() => undefined);
  }, []);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* =====================================================
     LOAD WORKSPACE + NOTIFICATIONS
  ===================================================== */

  const loadWorkspace = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWorkspace(EMPTY_WORKSPACE);
        setNotifications([]);
        return;
      }

      const metadata = user.user_metadata || {};

      const { data: company, error: companyError } = await supabase
        .from("company_profiles")
        .select("company_name, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("Sidebar company load error:", companyError);
      }

      setWorkspace({
        companyName: company?.company_name?.trim() || "",
        companyLogo: company?.logo_url || "",
        userName: metadata.full_name?.trim() || metadata.name?.trim() || "",
        userEmail: user.email || "",
        userId: user.id,
      });

      setReadIds(loadReadIds(user.id));

      try {
        setNotifications(await fetchNotifications(user.id));
      } catch (error) {
        console.error("Notifications load error:", error);
      }
    } catch (error) {
      console.error("Unexpected sidebar load error:", error);
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkspace();

    // Settings dispatches this event after saving the company.
    window.addEventListener("baselead-company-updated", loadWorkspace);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setWorkspace(EMPTY_WORKSPACE);
        setNotifications([]);
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        loadWorkspace();
      }
    });

    // Refresh notifications every 2 minutes.
    const interval = window.setInterval(loadWorkspace, 120000);

    return () => {
      window.removeEventListener("baselead-company-updated", loadWorkspace);
      subscription.unsubscribe();
      window.clearInterval(interval);
    };
  }, [loadWorkspace]);

  // Close the mobile drawer with Escape.
  useEffect(() => {
    if (!mobileOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* =====================================================
     HELPERS
  ===================================================== */

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function getInitials() {
    const source = workspace.companyName || workspace.userName || "BL";

    return (
      source
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "BL"
    );
  }

  const displayCompanyName =
    workspace.companyName ||
    (loadingWorkspace ? t("Loading...") : t("Set up your company"));

  const displayUserName =
    workspace.userName || workspace.userEmail || t("Account Owner");

  const unread = notifications.filter((item) => !readIds.includes(item.id));
  const notificationCount = unread.length;

  function markAsRead(ids: string[]) {
    const next = Array.from(new Set([...readIds, ...ids]));
    setReadIds(next);

    if (workspace.userId) saveReadIds(workspace.userId, next);
  }

  function openNotification(item: Notification) {
    markAsRead([item.id]);
    setNotificationsOpen(false);
    setMobileOpen(false);
    router.push(item.href);
  }

  // Close the drawer whenever a link inside it is clicked.
  function closeOnLinkClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) {
      setMobileOpen(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        setLoggingOut(false);
        return;
      }

      window.location.href = "/login";
    } catch (error) {
      console.error("Unexpected logout error:", error);
      setLoggingOut(false);
    }
  }

  function getNotificationIcon(type: Notification["type"]) {
    const map = {
      lead: { bg: "bg-[#F5C518]/10", icon: <Target size={17} style={{ color: GOLD }} /> },
      outreach: { bg: "bg-blue-500/10", icon: <Mail size={17} className="text-blue-400" /> },
      meeting: { bg: "bg-purple-500/10", icon: <CalendarIcon size={17} className="text-purple-400" /> },
      system: { bg: "bg-green-500/10", icon: <CheckCircle2 size={17} className="text-green-400" /> },
    }[type];

    return (
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${map.bg}`}>
        {map.icon}
      </div>
    );
  }

  const badge = notificationCount > 0 && (
    <span
      className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
      style={{ backgroundColor: GOLD, color: "#0A0A0A" }}
    >
      {notificationCount > 9 ? "9+" : notificationCount}
    </span>
  );

  /* =====================================================
     PANEL (shared by desktop sidebar and mobile drawer)
  ===================================================== */

  const panel = (
    <>
      <div className="flex items-center justify-between px-6 pb-5 pt-7">
        <Link href="/dashboard" className="block">
          <img
            src="/logo.png"
            alt="BaseLead"
            className="h-auto w-[175px] rounded-xl shadow-sm"
          />
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label={t("Close menu")}
        >
          <X size={20} />
        </button>
      </div>

      {!notificationsOpen && (
        <div className="mb-5 px-5">
          <Link
            href="/search"
            className="flex w-full items-center justify-center rounded-xl py-3 text-base font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: GOLD, color: "#0A0A0A" }}
          >
            + {t("New Search")}
          </Link>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {!notificationsOpen ? (
          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            {NAV.filter((item) => item.href !== "/setup" || platformAdmin).map(({ icon: Icon, label, href, color }) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  data-active={active ? "true" : "false"}
                  className={`baselead-sidebar-nav-item bl-nav relative flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium ${
                    active ? "baselead-sidebar-nav-active" : ""
                  }`}
                  style={
                    (active
                      ? {
                          "--nav": color,
                          backgroundColor: "rgba(255, 255, 255, 0.07)",
                          color: "white",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px -12px rgba(0,0,0,0.8)",
                        }
                      : { "--nav": color, color: MUTED }) as unknown as CSSProperties
                  }
                >
                  <Icon
                    size={22}
                    strokeWidth={1.8}
                    className="bl-nav-icon"
                    style={active ? { color } : undefined}
                  />
                  <span>{t(label)}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-5 py-4" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative">
                    <Bell size={20} strokeWidth={1.8} style={{ color: GOLD }} />
                    {badge}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {t("Notifications")}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: MUTED }}>
                      {notificationCount} {t("unread")}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.05]"
                  style={{ color: MUTED }}
                  aria-label={t("Close notifications")}
                >
                  <X size={17} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {notificationCount > 0 && (
              <div
                className="flex items-center justify-end border-b px-5 py-2.5"
                style={{ borderColor: BORDER }}
              >
                <button
                  type="button"
                  onClick={() => markAsRead(notifications.map((item) => item.id))}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition hover:bg-white/[0.04]"
                  style={{ color: GREEN }}
                >
                  <CheckCircle2 size={13} strokeWidth={2} />
                  {t("Mark all as read")}
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                    <Bell size={21} style={{ color: "#555555" }} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-400">
                    {t("No notifications")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    {t("New leads, replies and follow-ups will appear here.")}
                  </p>
                </div>
              ) : (
                notifications.map((item) => {
                  const read = readIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openNotification(item)}
                      className={`flex w-full gap-3 border-b px-4 py-4 text-left transition-colors hover:bg-white/[0.03] ${
                        read ? "opacity-50" : ""
                      }`}
                      style={{ borderColor: BORDER }}
                    >
                      {getNotificationIcon(item.type)}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold leading-4 text-gray-200">
                            {t(item.title)}
                          </p>
                          {!read && (
                            <span
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: GOLD }}
                            />
                          )}
                        </div>

                        {item.message && (
                          <p className="mt-1 truncate text-xs leading-4 text-gray-500">
                            {item.message}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-600">
                          <Clock3 size={11} />
                          {timeAgo(item.createdAt, language)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {!notificationsOpen && (
        <div className="border-t" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell size={19} strokeWidth={1.8} style={{ color: MUTED }} />
                {badge}
              </div>
              <span className="text-sm font-medium" style={{ color: MUTED }}>
                {t("Notifications")}
              </span>
            </div>
          </button>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03]"
          >
            {workspace.companyLogo ? (
              <img
                src={workspace.companyLogo}
                alt={displayCompanyName}
                className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: GOLD, color: "#0A0A0A" }}
              >
                {getInitials()}
              </div>
            )}

            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-white">
                {displayCompanyName}
              </div>
              <div className="truncate text-xs" style={{ color: MUTED }}>
                {displayUserName}
              </div>
            </div>
          </Link>

          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-red-500/[0.06] hover:text-red-400 disabled:opacity-60"
              style={{ color: MUTED }}
            >
              <LogOut size={22} strokeWidth={1.8} />
              <span>{loggingOut ? t("Logging out...") : t("Log out")}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className="baselead-sidebar sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col border-r backdrop-blur-2xl lg:flex"
        style={{ borderColor: BORDER, backgroundColor: "rgba(8, 8, 10, 0.62)" }}
      >
        {panel}
      </aside>

      {/* MOBILE TOP BAR */}
      <header
        className="baselead-mobile-topbar fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-black/55 px-4 backdrop-blur-2xl lg:hidden"
        style={{ borderColor: BORDER }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:bg-white/5"
          aria-label={t("Open menu")}
        >
          <Menu size={22} />
        </button>

        <Link href="/dashboard">
          <img src="/logo.png" alt="BaseLead" className="h-8 w-auto rounded-lg" />
        </Link>

        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(true);
            setMobileOpen(true);
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:bg-white/5"
          aria-label={t("Notifications")}
        >
          <span className="relative">
            <Bell size={20} />
            {badge}
          </span>
        </button>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label={t("Close menu")}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside
            onClick={closeOnLinkClick}
            className="baselead-sidebar relative flex h-full w-[86%] max-w-[300px] flex-col border-r shadow-2xl backdrop-blur-2xl"
            style={{ borderColor: BORDER, backgroundColor: "rgba(8, 8, 10, 0.82)" }}
          >
            {panel}
          </aside>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="baselead-mobile-bottombar fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t bg-black/55 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden"
        style={{ borderColor: BORDER }}
      >
        {MOBILE_NAV.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium"
              style={{ color: active ? GOLD : MUTED }}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="max-w-full truncate px-1">{t(label)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(false);
            setMobileOpen(true);
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium"
          style={{ color: MUTED }}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>{t("More")}</span>
        </button>
      </nav>
    </>
  );
}
