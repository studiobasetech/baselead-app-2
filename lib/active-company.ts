/*
 * Which company (workspace) the user is working in right now.
 * Stored in the "bl_company" cookie; empty = their main company.
 * Works in the browser and on the server.
 */

export const ACTIVE_COMPANY_COOKIE = "bl_company";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Browser: the selected company id, or null for the main company. */
export function activeCompanyIdClient(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACTIVE_COMPANY_COOKIE}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : "";
  return UUID.test(value) ? value : null;
}

/** Server: the selected company id from the request cookies. */
export async function activeCompanyIdServer(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const value = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value ?? "";
    return UUID.test(value) ? value : null;
  } catch {
    return null;
  }
}

type Filterable<T> = { eq: (column: string, value: string) => T };

/**
 * Narrows a company_profiles query to the active company:
 * the selected one if any, otherwise the user's own (main) company.
 */
export function scopeToActiveCompany<T>(query: Filterable<T>, userId: string, activeId: string | null): T {
  return activeId ? query.eq("id", activeId) : query.eq("user_id", userId);
}
