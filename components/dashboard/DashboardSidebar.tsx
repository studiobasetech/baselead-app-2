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
} from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/components/lib/supabase";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const GOLD = "#F5C518";
const GREEN = "#84CC16";
const PURPLE = "#A78BFA";
const BORDER = "#262626";
const MUTED = "#8C8C8C";

const NAV = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: Search,
    label: "Lead Discovery",
    href: "/lead-discovery",
  },
  {
    icon: Users,
    label: "Leads",
    href: "/leads",
  },
  {
    icon: GitBranch,
    label: "Pipeline",
    href: "/pipeline",
  },
  {
    icon: Send,
    label: "Outreach",
    href: "/outreach",
  },
  {
    icon: CalendarIcon,
    label: "Calendar",
    href: "/calendar",
  },
  {
    icon: BarChart3,
    label: "Reports",
    href: "/reports",
  },
  {
    icon: Plug,
    label: "Integrations",
    href: "/integrations",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
];

type WorkspaceData = {
  companyName: string;
  companyLogo: string;
  userName: string;
  userEmail: string;
};

type Notification = {
  id: string;
  type: "lead" | "outreach" | "meeting" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const EMPTY_WORKSPACE: WorkspaceData = {
  companyName: "",
  companyLogo: "",
  userName: "",
  userEmail: "",
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "lead",
    title: "New high-opportunity lead",
    message:
      "A new lead matching your target customer profile was discovered.",
    time: "10 min ago",
    read: false,
  },
  {
    id: "2",
    type: "outreach",
    title: "Outreach reply received",
    message:
      "A lead replied to one of your recent outreach messages.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "meeting",
    title: "Upcoming meeting",
    message:
      "You have a meeting scheduled with a lead today.",
    time: "3 hours ago",
    read: false,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { t } = useLanguage();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [workspace, setWorkspace] =
    useState<WorkspaceData>(
      EMPTY_WORKSPACE
    );

  const [loadingWorkspace, setLoadingWorkspace] =
    useState(true);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>(
      INITIAL_NOTIFICATIONS
    );

  /* =====================================================
     LOAD WORKSPACE
  ===================================================== */

  async function loadWorkspace() {
    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Sidebar auth error:",
          userError
        );

        return;
      }

      if (!user) {
        setWorkspace(
          EMPTY_WORKSPACE
        );

        return;
      }

      const metadata =
        user.user_metadata || {};

      const {
        data: company,
        error: companyError,
      } =
        await supabase
          .from("company_profiles")
          .select(
            "company_name, logo_url"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (companyError) {
        console.error(
          "Sidebar company load error:",
          companyError
        );
      }

      setWorkspace({
        companyName:
          company?.company_name?.trim() ||
          "",

        companyLogo:
          company?.logo_url || "",

        userName:
          metadata.full_name?.trim() ||
          metadata.name?.trim() ||
          "",

        userEmail:
          user.email || "",
      });
    } catch (error) {
      console.error(
        "Unexpected sidebar load error:",
        error
      );
    } finally {
      setLoadingWorkspace(false);
    }
  }

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadWorkspace();
  }, []);

  /* =====================================================
     COMPANY PROFILE UPDATE EVENT

     Settings dispatches this event after saving.
  ===================================================== */

  useEffect(() => {
    function handleCompanyUpdate() {
      loadWorkspace();
    }

    window.addEventListener(
      "baselead-company-updated",
      handleCompanyUpdate
    );

    return () => {
      window.removeEventListener(
        "baselead-company-updated",
        handleCompanyUpdate
      );
    };
  }, []);

  /* =====================================================
     AUTH STATE CHANGES
  ===================================================== */

  useEffect(() => {
    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session?.user) {
            setWorkspace(
              EMPTY_WORKSPACE
            );

            return;
          }

          loadWorkspace();
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =====================================================
     ACTIVE NAVIGATION
  ===================================================== */

  function isActive(
    href: string
  ) {
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname === "/"
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  /* =====================================================
     USER INITIALS
  ===================================================== */

  function getInitials() {
    const source =
      workspace.companyName ||
      workspace.userName ||
      "BL";

    const initials =
      source
        .trim()
        .split(/\s+/)
        .map(
          (part) =>
            part.charAt(0)
        )
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return initials || "BL";
  }

  /* =====================================================
     DISPLAY VALUES
  ===================================================== */

  const displayCompanyName =
    workspace.companyName ||
    (loadingWorkspace
      ? t("Loading...")
      : t("Your Company"));

  const displayUserName =
    workspace.userName ||
    t("Account Owner");

  /* =====================================================
     NOTIFICATIONS
  ===================================================== */

  const notificationCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  function openNotifications() {
    setNotificationsOpen(true);
  }

  function closeNotifications() {
    setNotificationsOpen(false);
  }

  function markNotificationAsRead(
    id: string
  ) {
    setNotifications(
      (current) =>
        current.map(
          (notification) =>
            notification.id === id
              ? {
                  ...notification,
                  read: true,
                }
              : notification
        )
    );
  }

  function markAllAsRead() {
    setNotifications(
      (current) =>
        current.map(
          (notification) => ({
            ...notification,
            read: true,
          })
        )
    );
  }

  function getNotificationIcon(
    type: Notification["type"]
  ) {
    if (type === "lead") {
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5C518]/10">
          <Target
            size={17}
            style={{
              color: GOLD,
            }}
          />
        </div>
      );
    }

    if (type === "outreach") {
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
          <Mail
            size={17}
            className="text-blue-400"
          />
        </div>
      );
    }

    if (type === "meeting") {
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
          <CalendarIcon
            size={17}
            className="text-purple-400"
          />
        </div>
      );
    }

    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2
          size={17}
          className="text-green-400"
        />
      </div>
    );
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error
        );

        setLoggingOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Unexpected logout error:",
        error
      );

      setLoggingOut(false);
    }
  }

  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col border-r"
      style={{
        borderColor: BORDER,
        backgroundColor: "#0A0A0A",
      }}
    >
      {/* =================================================
          BASELEAD LOGO
      ================================================= */}

      <div className="px-6 pb-5 pt-7">
        <Link
          href="/dashboard"
          className="block"
        >
          <img
            src="/logo.png"
            alt="BaseLead"
            className="h-auto w-[175px] rounded-xl shadow-sm"
          />
        </Link>
      </div>

      {/* =================================================
          NEW SEARCH
      ================================================= */}

      {!notificationsOpen && (
        <div className="mb-5 px-5">
          <Link
            href="/search"
            className="flex w-full items-center justify-center rounded-xl py-3 text-base font-bold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: GOLD,
              color: "#0A0A0A",
            }}
          >
            + {t("New Search")}
          </Link>
        </div>
      )}

      {/* =================================================
          NAVIGATION / NOTIFICATIONS PANEL
      ================================================= */}

      <div className="flex min-h-0 flex-1 flex-col">
        {!notificationsOpen ? (
          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            {NAV.map(
              ({
                icon: Icon,
                label,
                href,
              }) => {
                const active =
                  isActive(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    data-active={
                      active
                        ? "true"
                        : "false"
                    }
                    className={`baselead-sidebar-nav-item flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-white/[0.04] ${
                      active
                        ? "baselead-sidebar-nav-active"
                        : ""
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor:
                              "#1F1F1F",
                            color:
                              "white",
                          }
                        : {
                            color: MUTED,
                          }
                    }
                  >
                    <Icon
                      size={22}
                      strokeWidth={1.8}
                      style={
                        active
                          ? {
                              color:
                                GOLD,
                            }
                          : undefined
                      }
                    />

                    <span>
                      {t(label)}
                    </span>
                  </Link>
                );
              }
            )}
          </nav>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* =================================================
                NOTIFICATIONS HEADER
            ================================================= */}

            <div
              className="border-b px-5 py-4"
              style={{
                borderColor:
                  BORDER,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative">
                    <Bell
                      size={20}
                      strokeWidth={1.8}
                      style={{
                        color: GOLD,
                      }}
                    />

                    {notificationCount >
                      0 && (
                      <span
                        className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-bold"
                        style={{
                          backgroundColor:
                            GOLD,
                          color:
                            "#0A0A0A",
                        }}
                      >
                        {
                          notificationCount
                        }
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-[-0.01em] text-white">
                      {t(
                        "Notifications"
                      )}
                    </div>

                    <div
                      className="mt-0.5 text-[9px]"
                      style={{
                        color:
                          MUTED,
                      }}
                    >
                      {
                        notificationCount
                      }{" "}
                      {t("unread")}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    closeNotifications
                  }
                  className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
                  style={{
                    color: MUTED,
                  }}
                  aria-label={t(
                    "Close notifications"
                  )}
                >
                  <X
                    size={17}
                    strokeWidth={1.8}
                  />
                </button>
              </div>
            </div>

            {/* =================================================
                NOTIFICATION ACTIONS
            ================================================= */}

            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{
                borderColor:
                  BORDER,
              }}
            >
              <span
                className="text-[9px]"
                style={{
                  color: MUTED,
                }}
              >
                {notifications.length}{" "}
                {t("notifications")}
              </span>

              {notificationCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    markAllAsRead
                  }
                  className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-medium tracking-[-0.01em] transition-all duration-200 hover:bg-[#84CC16]/10 active:scale-[0.98]"
                  style={{
                    color: GREEN,
                  }}
                >
                  <CheckCircle2
                    size={11}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-hover:scale-105"
                  />

                  <span>
                    {t(
                      "Mark all as read"
                    )}
                  </span>
                </button>
              )}
            </div>

            {/* =================================================
                NOTIFICATION LIST
            ================================================= */}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {notifications.length ===
              0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                    <Bell
                      size={21}
                      style={{
                        color:
                          "#555555",
                      }}
                    />
                  </div>

                  <p className="mt-4 text-sm font-medium text-gray-400">
                    {t(
                      "No notifications"
                    )}
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-gray-700">
                    {t(
                      "You're all caught up."
                    )}
                  </p>
                </div>
              ) : (
                notifications.map(
                  (notification) => (
                    <button
                      key={
                        notification.id
                      }
                      type="button"
                      onClick={() =>
                        markNotificationAsRead(
                          notification.id
                        )
                      }
                      className={`flex w-full gap-3 border-b px-4 py-4 text-left transition-colors hover:bg-white/[0.03] ${
                        notification.read
                          ? "opacity-50"
                          : ""
                      }`}
                      style={{
                        borderColor:
                          BORDER,
                      }}
                    >
                      {getNotificationIcon(
                        notification.type
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold leading-4 text-gray-200">
                            {t(
                              notification.title
                            )}
                          </p>

                          {!notification.read && (
                            <span
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  GOLD,
                              }}
                            />
                          )}
                        </div>

                        <p className="mt-1 text-[9px] leading-4 text-gray-600">
                          {t(
                            notification.message
                          )}
                        </p>

                        <div className="mt-2 flex items-center gap-1 text-[8px] text-gray-700">
                          <Clock3
                            size={10}
                          />

                          {
                            notification.time
                          }
                        </div>
                      </div>
                    </button>
                  )
                )
              )}
            </div>

            {/* =================================================
                CLOSE NOTIFICATIONS
            ================================================= */}

            <div
              className="border-t px-3 py-3"
              style={{
                borderColor:
                  BORDER,
              }}
            >
              <button
                type="button"
                onClick={
                  closeNotifications
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-medium transition-all duration-200 hover:bg-white/[0.04] hover:text-white active:scale-[0.99]"
                style={{
                  borderColor:
                    BORDER,
                  color: MUTED,
                }}
              >
                <X
                  size={13}
                  strokeWidth={1.8}
                />

                {t(
                  "Close Notifications"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          BOTTOM SECTION

          Hidden while Notifications is open.
      ================================================= */}

      {!notificationsOpen && (
        <div
          className="border-t"
          style={{
            borderColor: BORDER,
          }}
        >
          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <button
            type="button"
            onClick={
              openNotifications
            }
            className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell
                  size={19}
                  strokeWidth={1.8}
                  style={{
                    color: MUTED,
                  }}
                />

                {notificationCount >
                  0 && (
                  <span
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-bold"
                    style={{
                      backgroundColor:
                        GOLD,
                      color:
                        "#0A0A0A",
                    }}
                  >
                    {
                      notificationCount
                    }
                  </span>
                )}
              </div>

              <span
                className="text-sm font-medium"
                style={{
                  color: MUTED,
                }}
              >
                {t("Notifications")}
              </span>
            </div>
          </button>

          {/* =================================================
              COMPANY / USER
          ================================================= */}

          <div className="flex items-center gap-3 px-5 py-4">
            {/* SAME COMPANY LOGO */}

            {workspace.companyLogo ? (
              <img
                src={
                  workspace.companyLogo
                }
                alt={
                  displayCompanyName
                }
                className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor:
                    GOLD,
                  color:
                    "#0A0A0A",
                }}
              >
                {getInitials()}
              </div>
            )}

            {/* COMPANY + USER */}

            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-white">
                {
                  displayCompanyName
                }
              </div>

              <div
                className="truncate text-xs"
                style={{
                  color: MUTED,
                }}
              >
                {
                  displayUserName
                }
              </div>

              {workspace.userEmail && (
                <div
                  className="mt-0.5 truncate text-[9px]"
                  style={{
                    color:
                      "#5F5F5F",
                  }}
                >
                  {
                    workspace.userEmail
                  }
                </div>
              )}
            </div>
          </div>

          {/* =================================================
              LOG OUT
          ================================================= */}

          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={
                handleLogout
              }
              disabled={
                loggingOut
              }
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-red-500/[0.06] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                color: MUTED,
              }}
            >
              <LogOut
                size={22}
                strokeWidth={1.8}
              />

              <span>
                {loggingOut
                  ? t(
                      "Logging out..."
                    )
                  : t("Log out")}
              </span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}