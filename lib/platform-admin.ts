/**
 * The BaseLead owner(s) — the people who run the platform (Studio Base).
 * Only they see the Setup / launch checklist; customers never do.
 * Set PLATFORM_ADMIN_EMAILS="you@x.com,partner@y.com" in .env.local.
 */
export function isPlatformAdmin(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
