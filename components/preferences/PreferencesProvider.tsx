"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/components/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

export type BaseLeadPreferences = {
  currency: string;
  default_lead_view: string;
  show_opportunity_score: boolean;
  smart_notifications: boolean;
  dark_mode: boolean;
  compact_layout: boolean;
};

export type CurrencyCode =
  | "USD"
  | "EUR"
  | "MXN"
  | "GBP"
  | "CAD";

/* =========================================================
   DEFAULT PREFERENCES
========================================================= */

const DEFAULT_PREFERENCES: BaseLeadPreferences = {
  currency: "USD ($)",
  default_lead_view: "List View",
  show_opportunity_score: true,
  smart_notifications: true,
  dark_mode: true,
  compact_layout: false,
};

const STORAGE_PREFIX = "baselead-preferences";

/* =========================================================
   CONTEXT
========================================================= */

type PreferencesContextValue = {
  preferences: BaseLeadPreferences;

  loading: boolean;

  saving: boolean;

  refreshPreferences: () => Promise<void>;

  updatePreferences: (
    updates: Partial<BaseLeadPreferences>,
    saveToDatabase?: boolean
  ) => Promise<void>;

  savePreferences: (
    nextPreferences?: BaseLeadPreferences
  ) => Promise<boolean>;

  /*
   * Currency helpers available throughout
   * the application.
   */
  currencyCode: CurrencyCode;

  formatCurrency: (
    value: number,
    options?: Intl.NumberFormatOptions
  ) => string;
};

const PreferencesContext =
  createContext<PreferencesContextValue | null>(null);

/* =========================================================
   NORMALIZE CURRENCY
========================================================= */

function normalizeCurrency(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_PREFERENCES.currency;
  }

  const normalized = value.trim();

  const currencyMap: Record<string, string> = {
    USD: "USD ($)",
    "USD ($)": "USD ($)",

    EUR: "EUR (€)",
    "EUR (€)": "EUR (€)",

    MXN: "MXN ($)",
    "MXN ($)": "MXN ($)",

    GBP: "GBP (£)",
    "GBP (£)": "GBP (£)",

    CAD: "CAD ($)",
    "CAD ($)": "CAD ($)",
  };

  return (
    currencyMap[normalized] ??
    DEFAULT_PREFERENCES.currency
  );
}

/* =========================================================
   CURRENCY CODE
========================================================= */

function getCurrencyCode(
  currency: string
): CurrencyCode {
  switch (currency) {
    case "EUR (€)":
      return "EUR";

    case "MXN ($)":
      return "MXN";

    case "GBP (£)":
      return "GBP";

    case "CAD ($)":
      return "CAD";

    case "USD ($)":
    default:
      return "USD";
  }
}

/* =========================================================
   NORMALIZE LEAD VIEW
========================================================= */

function normalizeLeadView(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_PREFERENCES.default_lead_view;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "list" ||
    normalized === "list view"
  ) {
    return "List View";
  }

  if (
    normalized === "grid" ||
    normalized === "grid view"
  ) {
    return "Grid View";
  }

  if (
    normalized === "kanban" ||
    normalized === "kanban view" ||
    normalized === "board" ||
    normalized === "board view"
  ) {
    return "Kanban View";
  }

  return DEFAULT_PREFERENCES.default_lead_view;
}

/* =========================================================
   NORMALIZE BOOLEAN
========================================================= */

function normalizeBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

/* =========================================================
   NORMALIZE ALL PREFERENCES
========================================================= */

function normalizePreferences(
  data:
    | Partial<BaseLeadPreferences>
    | Record<string, unknown>
    | null
    | undefined
): BaseLeadPreferences {
  return {
    currency: normalizeCurrency(data?.currency),

    default_lead_view: normalizeLeadView(
      data?.default_lead_view
    ),

    show_opportunity_score:
      normalizeBoolean(
        data?.show_opportunity_score,
        DEFAULT_PREFERENCES.show_opportunity_score
      ),

    smart_notifications:
      normalizeBoolean(
        data?.smart_notifications,
        DEFAULT_PREFERENCES.smart_notifications
      ),

    dark_mode:
      normalizeBoolean(
        data?.dark_mode,
        DEFAULT_PREFERENCES.dark_mode
      ),

    compact_layout:
      normalizeBoolean(
        data?.compact_layout,
        DEFAULT_PREFERENCES.compact_layout
      ),
  };
}

/* =========================================================
   USER-SPECIFIC STORAGE KEY
========================================================= */

function getStorageKey(
  userId?: string | null
): string {
  if (userId) {
    return `${STORAGE_PREFIX}:${userId}`;
  }

  return `${STORAGE_PREFIX}:guest`;
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

function getStoredPreferences(
  userId?: string | null
): BaseLeadPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const storageKey =
      getStorageKey(userId);

    const stored =
      window.localStorage.getItem(
        storageKey
      );

    if (!stored) {
      return DEFAULT_PREFERENCES;
    }

    const parsed =
      JSON.parse(stored);

    return normalizePreferences(
      parsed
    );
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function saveStoredPreferences(
  preferences: BaseLeadPreferences,
  userId?: string | null
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storageKey =
      getStorageKey(userId);

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(preferences)
    );
  } catch {
    /*
     * localStorage failure must never
     * prevent BaseLead from functioning.
     */
  }
}

/* =========================================================
   APPLY GLOBAL PREFERENCES TO DOCUMENT
========================================================= */

function applyPreferencesToDocument(
  preferences: BaseLeadPreferences
) {
  if (typeof document === "undefined") {
    return;
  }

  const root =
    document.documentElement;

  const isDark =
    preferences.dark_mode;

  /* -------------------------------------------------------
     THEME
  ------------------------------------------------------- */

  root.dataset.baseleadTheme =
    isDark ? "dark" : "light";

  root.dataset.baseleadDarkMode =
    isDark ? "true" : "false";

  root.classList.toggle(
    "baselead-light",
    !isDark
  );

  root.classList.toggle(
    "baselead-dark",
    isDark
  );

  root.style.colorScheme =
    isDark ? "dark" : "light";

  /* -------------------------------------------------------
     COMPACT LAYOUT
  ------------------------------------------------------- */

  root.dataset.baseleadCompact =
    preferences.compact_layout
      ? "true"
      : "false";

  root.classList.toggle(
    "baselead-compact",
    preferences.compact_layout
  );

  /* -------------------------------------------------------
     DEFAULT LEAD VIEW
  ------------------------------------------------------- */

  root.dataset.baseleadLeadView =
    preferences.default_lead_view;

  /* -------------------------------------------------------
     OPPORTUNITY SCORE
  ------------------------------------------------------- */

  root.dataset.baseleadOpportunityScore =
    preferences.show_opportunity_score
      ? "true"
      : "false";

  /* -------------------------------------------------------
     SMART NOTIFICATIONS
  ------------------------------------------------------- */

  root.dataset.baseleadSmartNotifications =
    preferences.smart_notifications
      ? "true"
      : "false";

  /* -------------------------------------------------------
     CURRENCY
  ------------------------------------------------------- */

  root.dataset.baseleadCurrency =
    preferences.currency;

  root.dataset.baseleadCurrencyCode =
    getCurrencyCode(
      preferences.currency
    );

  /* -------------------------------------------------------
     BODY THEME
  ------------------------------------------------------- */

  if (document.body) {
    document.body.classList.toggle(
      "baselead-light",
      !isDark
    );

    document.body.classList.toggle(
      "baselead-dark",
      isDark
    );

    document.body.style.backgroundColor =
      isDark
        ? "#050505"
        : "#F5F5F7";

    document.body.style.color =
      isDark
        ? "#FFFFFF"
        : "#1D1D1F";
  }
}

/* =========================================================
   GET CURRENT USER
========================================================= */

async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } =
      await supabase.auth.getUser();

    if (error) {
      console.warn(
        "BaseLead could not read the current user session.",
        error.message
      );

      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/* =========================================================
   SAVE TO SUPABASE
========================================================= */

async function savePreferencesToDatabase(
  userId: string,
  preferences: BaseLeadPreferences
): Promise<boolean> {
  try {
    const {
      error,
    } =
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: userId,

            currency:
              preferences.currency,

            default_lead_view:
              preferences.default_lead_view,

            show_opportunity_score:
              preferences.show_opportunity_score,

            smart_notifications:
              preferences.smart_notifications,

            dark_mode:
              preferences.dark_mode,

            compact_layout:
              preferences.compact_layout,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (error) {
      console.error(
        "BaseLead could not save preferences:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "BaseLead preference database save failed:",
      error
    );

    return false;
  }
}

/* =========================================================
   PROVIDER
========================================================= */

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    preferences,
    setPreferences,
  ] =
    useState<BaseLeadPreferences>(
      DEFAULT_PREFERENCES
    );

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState<string | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  /* =======================================================
     INITIAL LOCAL PREFERENCES
  ======================================================= */

  useEffect(() => {
    const storedPreferences =
      getStoredPreferences();

    setPreferences(
      storedPreferences
    );

    applyPreferencesToDocument(
      storedPreferences
    );
  }, []);

  /* =======================================================
     APPLY PREFERENCES WHENEVER THEY CHANGE
  ======================================================= */

  useEffect(() => {
    applyPreferencesToDocument(
      preferences
    );

    saveStoredPreferences(
      preferences,
      currentUserId
    );
  }, [
    preferences,
    currentUserId,
  ]);

  /* =======================================================
     SAVE PREFERENCES
  ======================================================= */

  const savePreferences =
    useCallback(
      async (
        nextPreferences?: BaseLeadPreferences
      ): Promise<boolean> => {
        const values =
          normalizePreferences(
            nextPreferences ??
              preferences
          );

        setSaving(true);

        /*
         * Update the interface immediately.
         */

        setPreferences(values);

        saveStoredPreferences(
          values,
          currentUserId
        );

        applyPreferencesToDocument(
          values
        );

        try {
          const user =
            await getCurrentUser();

          /*
           * If there is no authenticated
           * user, keep preferences locally.
           */

          if (!user) {
            return true;
          }

          setCurrentUserId(
            user.id
          );

          /*
           * Save using the authenticated
           * user's database row.
           */

          const saved =
            await savePreferencesToDatabase(
              user.id,
              values
            );

          /*
           * Keep local preferences even if
           * Supabase temporarily fails.
           */

          saveStoredPreferences(
            values,
            user.id
          );

          /*
           * Notify the rest of the app
           * only after the new values have
           * been applied.
           */

          if (
            typeof window !==
            "undefined"
          ) {
            window.dispatchEvent(
              new CustomEvent(
                "baselead-preferences-updated",
                {
                  detail: {
                    preferences:
                      values,
                  },
                }
              )
            );
          }

          return saved;
        } catch (error) {
          console.error(
            "BaseLead preference save failed:",
            error
          );

          return false;
        } finally {
          setSaving(false);
        }
      },
      [
        preferences,
        currentUserId,
      ]
    );

  /* =======================================================
     UPDATE INDIVIDUAL PREFERENCE
  ======================================================= */

  const updatePreferences =
    useCallback(
      async (
        updates: Partial<BaseLeadPreferences>,
        saveToDatabase = true
      ) => {
        const nextPreferences =
          normalizePreferences({
            ...preferences,
            ...updates,
          });

        /*
         * Apply immediately.
         */

        setPreferences(
          nextPreferences
        );

        saveStoredPreferences(
          nextPreferences,
          currentUserId
        );

        applyPreferencesToDocument(
          nextPreferences
        );

        /*
         * Save to Supabase when requested.
         */

        if (saveToDatabase) {
          await savePreferences(
            nextPreferences
          );
        } else if (
          typeof window !==
          "undefined"
        ) {
          /*
           * Even when database saving is
           * disabled, other components in
           * the application should know that
           * the preference changed.
           */

          window.dispatchEvent(
            new CustomEvent(
              "baselead-preferences-updated",
              {
                detail: {
                  preferences:
                    nextPreferences,
                },
              }
            )
          );
        }
      },
      [
        preferences,
        currentUserId,
        savePreferences,
      ]
    );

  /* =======================================================
     LOAD / REFRESH FROM SUPABASE
  ======================================================= */

  const refreshPreferences =
    useCallback(async () => {
      /*
       * Get authenticated user.
       */

      const user =
        await getCurrentUser();

      const userId =
        user?.id ?? null;

      setCurrentUserId(
        userId
      );

      /*
       * First load local preferences.
       * This makes the application feel
       * immediate while Supabase loads.
       */

      const storedPreferences =
        getStoredPreferences(
          userId
        );

      setPreferences(
        storedPreferences
      );

      applyPreferencesToDocument(
        storedPreferences
      );

      /*
       * No authenticated user.
       */

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from("user_settings")
            .select(
              "currency, default_lead_view, show_opportunity_score, smart_notifications, dark_mode, compact_layout"
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        /*
         * If Supabase cannot be reached,
         * local preferences remain active.
         */

        if (error) {
          console.warn(
            "BaseLead preferences could not be loaded from Supabase. Using local preferences instead.",
            error.message
          );

          setLoading(false);
          return;
        }

        /* -----------------------------------------------
           NO DATABASE ROW
        ------------------------------------------------ */

        if (!data) {
          const defaultPreferences =
            normalizePreferences(
              storedPreferences
            );

          const saved =
            await savePreferencesToDatabase(
              user.id,
              defaultPreferences
            );

          if (!saved) {
            console.warn(
              "BaseLead could not create the user's default preferences in Supabase."
            );
          }

          setPreferences(
            defaultPreferences
          );

          saveStoredPreferences(
            defaultPreferences,
            user.id
          );

          applyPreferencesToDocument(
            defaultPreferences
          );

          setLoading(false);
          return;
        }

        /* -----------------------------------------------
           DATABASE IS SOURCE OF TRUTH
        ------------------------------------------------ */

        const normalized =
          normalizePreferences(
            data
          );

        setPreferences(
          normalized
        );

        saveStoredPreferences(
          normalized,
          user.id
        );

        applyPreferencesToDocument(
          normalized
        );
      } catch (error) {
        console.warn(
          "BaseLead preferences service temporarily unavailable. Using local preferences.",
          error
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    refreshPreferences();
  }, [
    refreshPreferences,
  ]);

  /* =======================================================
     AUTHENTICATION CHANGES
  ======================================================= */

  useEffect(() => {
    function handleAuthChange() {
      refreshPreferences();
    }

    window.addEventListener(
      "baselead-auth-updated",
      handleAuthChange
    );

    return () => {
      window.removeEventListener(
        "baselead-auth-updated",
        handleAuthChange
      );
    };
  }, [
    refreshPreferences,
  ]);

  /* =======================================================
     PREFERENCE EVENTS
  ======================================================= */

  useEffect(() => {
    function handlePreferenceChange(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          preferences?: BaseLeadPreferences;
        }>;

      /*
       * If the event contains values,
       * apply them immediately.
       */

      if (
        customEvent.detail
          ?.preferences
      ) {
        const normalized =
          normalizePreferences(
            customEvent.detail
              .preferences
          );

        setPreferences(
          normalized
        );

        saveStoredPreferences(
          normalized,
          currentUserId
        );

        applyPreferencesToDocument(
          normalized
        );

        return;
      }

      /*
       * Otherwise reload from Supabase.
       */

      refreshPreferences();
    }

    window.addEventListener(
      "baselead-preferences-updated",
      handlePreferenceChange
    );

    return () => {
      window.removeEventListener(
        "baselead-preferences-updated",
        handlePreferenceChange
      );
    };
  }, [
    currentUserId,
    refreshPreferences,
  ]);

  /* =======================================================
     CROSS-TAB SYNCHRONIZATION
  ======================================================= */

  useEffect(() => {
    function handleStorage(
      event: StorageEvent
    ) {
      if (
        !event.key ||
        !event.key.startsWith(
          STORAGE_PREFIX
        ) ||
        !event.newValue
      ) {
        return;
      }

      const expectedKey =
        getStorageKey(
          currentUserId
        );

      if (
        event.key !==
        expectedKey
      ) {
        return;
      }

      try {
        const parsed =
          JSON.parse(
            event.newValue
          );

        const normalized =
          normalizePreferences(
            parsed
          );

        setPreferences(
          normalized
        );

        applyPreferencesToDocument(
          normalized
        );
      } catch {
        /*
         * Ignore malformed
         * localStorage values.
         */
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    currentUserId,
  ]);

  /* =======================================================
     CURRENCY
  ======================================================= */

  const currencyCode =
    useMemo(
      () =>
        getCurrencyCode(
          preferences.currency
        ),
      [
        preferences.currency,
      ]
    );

  const formatCurrency =
    useCallback(
      (
        value: number,
        options?: Intl.NumberFormatOptions
      ) => {
        const safeValue =
          Number.isFinite(value)
            ? value
            : 0;

        try {
          return new Intl.NumberFormat(
            "en-US",
            {
              style: "currency",
              currency: currencyCode,
              maximumFractionDigits: 0,
              ...options,
            }
          ).format(
            safeValue
          );
        } catch {
          return `$${Math.round(
            safeValue
          ).toLocaleString()}`;
        }
      },
      [currencyCode]
    );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value =
    useMemo<PreferencesContextValue>(
      () => ({
        preferences,

        loading,

        saving,

        refreshPreferences,

        updatePreferences,

        savePreferences,

        currencyCode,

        formatCurrency,
      }),
      [
        preferences,
        loading,
        saving,
        refreshPreferences,
        updatePreferences,
        savePreferences,
        currencyCode,
        formatCurrency,
      ]
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <PreferencesContext.Provider
      value={value}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function usePreferences() {
  const context =
    useContext(
      PreferencesContext
    );

  if (!context) {
    throw new Error(
      "usePreferences must be used inside PreferencesProvider"
    );
  }

  return context;
}