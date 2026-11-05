import { promises as dns } from "node:dns";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationToken } from "@/lib/integrations/google-oauth";
import type { SmtpSettings } from "./smtp";
import type { ImapSettings } from "./imap";

/* Common email providers, so users only type their email + password. */
export const EMAIL_PRESETS = [
  { id: "hostinger", label: "Hostinger", smtp: "smtp.hostinger.com", smtpPort: 465, secure: true, imap: "imap.hostinger.com" },
  { id: "zoho", label: "Zoho Mail", smtp: "smtp.zoho.com", smtpPort: 465, secure: true, imap: "imap.zoho.com" },
  { id: "namecheap", label: "Namecheap Private Email", smtp: "mail.privateemail.com", smtpPort: 465, secure: true, imap: "mail.privateemail.com" },
  { id: "godaddy", label: "GoDaddy Workspace Email", smtp: "smtpout.secureserver.net", smtpPort: 465, secure: true, imap: "imap.secureserver.net" },
  { id: "yahoo", label: "Yahoo Mail (app password)", smtp: "smtp.mail.yahoo.com", smtpPort: 465, secure: true, imap: "imap.mail.yahoo.com" },
  { id: "icloud", label: "iCloud Mail (app password)", smtp: "smtp.mail.me.com", smtpPort: 587, secure: false, imap: "imap.mail.me.com" },
  { id: "gmail-app", label: "Gmail / Google Workspace (app password)", smtp: "smtp.gmail.com", smtpPort: 465, secure: true, imap: "imap.gmail.com" },
  { id: "ionos", label: "IONOS", smtp: "smtp.ionos.com", smtpPort: 465, secure: true, imap: "imap.ionos.com" },
  { id: "custom", label: "Other (cPanel / custom server)", smtp: "", smtpPort: 465, secure: true, imap: "" },
] as const;

export type EmailAccount = {
  id: string;
  user_id: string;
  company_id: string | null;
  email: string;
  display_name: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  imap_host: string | null;
  imap_port: number;
  username: string;
  password: string;
  daily_limit: number;
};

/** The user's default connected email account (password decrypted, server only). */
export async function getEmailAccount(userId: string): Promise<EmailAccount | null> {
  if (!hasAdminClient()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  try {
    return { ...data, password: decryptIntegrationToken(data.password_encrypted) } as EmailAccount;
  } catch {
    return null;
  }
}

export function smtpSettings(account: EmailAccount): SmtpSettings {
  return {
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_secure,
    username: account.username,
    password: account.password,
  };
}

export function imapSettings(account: EmailAccount): ImapSettings | null {
  if (!account.imap_host) return null;
  return { host: account.imap_host, port: account.imap_port || 993, username: account.username, password: account.password };
}

export async function markAccountError(accountId: string, message: string | null) {
  if (!hasAdminClient()) return;
  await createAdminClient()
    .from("email_accounts")
    .update({ last_error: message, last_checked_at: new Date().toISOString() })
    .eq("id", accountId);
}

/* ---------- Address check before sending (free, no service) ---------- */

const domainCache = new Map<string, boolean>();

/** False when the address can't receive email (bad format or the domain has no mail server). */
export async function canReceiveEmail(address: string) {
  const email = address.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return false;
  const domain = email.split("@")[1];
  if (domainCache.has(domain)) return domainCache.get(domain) as boolean;
  let ok = false;
  try {
    const mx = await dns.resolveMx(domain);
    ok = mx.length > 0;
  } catch {
    try {
      // No MX record: some domains receive on their main address.
      ok = (await dns.resolve4(domain)).length > 0;
    } catch {
      ok = false;
    }
  }
  domainCache.set(domain, ok);
  return ok;
}
