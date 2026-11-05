/*
 * Which company (workspace) the user is working in right now.
 * Stored in the "bl_company" cookie; empty = their main company.
 * Works in the browser and on the server.
 */

export const ACTIVE_COMPANY_COOKIE = "bl_company";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Browser: the selected company id, or null for the main company. */
export function activeCompanyIdClient(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACTIVE_COMPANY_COOKIE}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : "";
  return UUID.test(value) ? value : null;
}

type Filterable<T> = { eq: (column: string, value: string) => T };

/**
 * Narrows a company_profiles query to the active company:
 * the selected one if any, otherwise the user's own (main) company.
 */
export function scopeToActiveCompany<T>(query: Filterable<T>, userId: string, activeId: string | null): T {
  return activeId ? query.eq("id", activeId) : query.eq("user_id", userId);
}

/** Browser: [column, value] for .eq() on company_profiles — the active company. */
export function companyFilterClient(userId: string): [string, string] {
  const active = activeCompanyIdClient();
  return active ? ["id", active] : ["user_id", userId];
}

/** Forget the selected company (log out, or it was removed). */
export function clearActiveCompanyClient() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_COMPANY_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Browser: PostgREST .or() filter that matches companies the user owns —
 * their main company, plus (after switching) the extra companies they created.
 */
export function ownerFilterClient(userId: string): string {
  return activeCompanyIdClient()
    ? `user_id.eq.${userId},owner_user_id.eq.${userId}`
    : `user_id.eq.${userId}`;
}
