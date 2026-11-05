import { cookies } from "next/headers";
import { ACTIVE_COMPANY_COOKIE, UUID } from "@/lib/active-company";

/** Server: the selected company id from the request cookies (null = main company). */
export async function activeCompanyIdServer(): Promise<string | null> {
  try {
    const value = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value ?? "";
    return UUID.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** Server: [column, value] for .eq() on company_profiles — the active company. */
export async function companyFilterServer(userId: string): Promise<[string, string]> {
  const active = await activeCompanyIdServer();
  return active ? ["id", active] : ["user_id", userId];
}
