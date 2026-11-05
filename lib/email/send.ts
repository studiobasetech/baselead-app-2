import type { SupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccessToken, sendGmail } from "@/lib/integrations/google-api";
import { canReceiveEmail, getEmailAccount, imapSettings, markAccountError, smtpSettings } from "./accounts";
import { sendSmtp } from "./smtp";
import { saveToSent } from "./imap";

/*
 * One way to send outreach: the user's connected email account
 * (IMAP/SMTP) if they have one, otherwise their Gmail.
 * threadId: Gmail thread id, or "smtp:<Message-ID>" for other accounts.
 */

export type SentEmail = { id: string; threadId: string; sentFrom: string };

export async function sendLeadEmail(
  supabase: SupabaseClient,
  userId: string,
  email: { to: string; subject: string; body: string; headers?: string[]; threadId?: string | null }
): Promise<SentEmail> {
  if (!(await canReceiveEmail(email.to))) {
    throw new Error(`"${email.to}" can't receive email (the address or its domain doesn't exist). Not sent, to protect your sender reputation.`);
  }

  const account = await getEmailAccount(userId);

  if (account) {
    // Per-account daily limit protects the mailbox from being flagged.
    const since = new Date(Date.now() - 24 * 3600000).toISOString();
    const { count } = await supabase
      .from("outreach")
      .select("id", { count: "exact", head: true })
      .eq("sent_from", account.email)
      .gte("sent_at", since);
    if ((count ?? 0) >= account.daily_limit) {
      throw new Error(`Daily limit reached for ${account.email} (${account.daily_limit} emails in 24 hours). The rest go out tomorrow.`);
    }

    const replyTo = email.threadId?.startsWith("smtp:") ? email.threadId.slice(5) : null;
    try {
      const { messageId, raw } = await sendSmtp(smtpSettings(account), {
        from: account.email,
        fromName: account.display_name,
        to: email.to,
        subject: email.subject,
        body: email.body,
        headers: email.headers,
        inReplyTo: replyTo,
      });
      await markAccountError(account.id, null);
      // Keep a copy in the user's Sent folder (doesn't block sending).
      const imap = imapSettings(account);
      if (imap) void saveToSent(imap, raw).catch(() => undefined);
      return { id: messageId, threadId: email.threadId || `smtp:${messageId}`, sentFrom: account.email };
    } catch (error) {
      await markAccountError(account.id, error instanceof Error ? error.message : "Send failed");
      throw error;
    }
  }

  const token = await getGoogleAccessToken(supabase, userId, "gmail").catch(() => null);
  if (!token) {
    throw new Error("Connect your email in Integrations (Gmail or any other email account) to send emails.");
  }
  const message = await sendGmail(token, {
    to: email.to,
    subject: email.subject,
    body: email.body,
    threadId: email.threadId && !email.threadId.startsWith("smtp:") ? email.threadId : null,
    headers: email.headers,
  });
  return { id: message.id, threadId: message.threadId, sentFrom: "gmail" };
}
