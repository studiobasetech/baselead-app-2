import type { SupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccessToken, sendGmail } from "@/lib/integrations/google-api";

/**
 * Sends one outreach row by email through the owner's Gmail
 * and marks it as sent. Returns the updated row.
 */
export async function sendOutreachEmail(
  supabase: SupabaseClient,
  outreachId: string
) {
  const { data: item, error } = await supabase
    .from("outreach")
    .select("id, user_id, lead_id, subject, message, status, sent_at")
    .eq("id", outreachId)
    .maybeSingle();

  if (error || !item) throw new Error("Outreach not found.");
  if (item.sent_at) throw new Error("This email was already sent.");

  const { data: lead } = await supabase
    .from("leads")
    .select("email, company, name")
    .eq("id", item.lead_id)
    .maybeSingle();

  if (!lead?.email) {
    throw new Error("This lead has no email address.");
  }

  const token = await getGoogleAccessToken(supabase, item.user_id, "gmail");

  if (!token) {
    throw new Error("Connect Gmail in Integrations to send emails.");
  }

  try {
    const messageId = await sendGmail(token, {
      to: lead.email,
      subject: item.subject || `Hello ${lead.company || lead.name || ""}`.trim(),
      body: item.message || "",
    });

    const now = new Date().toISOString();

    const { data: updated } = await supabase
      .from("outreach")
      .update({
        status: "sent",
        sent_at: now,
        next_step: "Follow up",
        next_step_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        gmail_message_id: messageId,
        send_error: null,
        updated_at: now,
      })
      .eq("id", item.id)
      .select("*")
      .single();

    await supabase
      .from("leads")
      .update({ status: "contacted", updated_at: now })
      .eq("id", item.lead_id)
      .in("status", ["new", "New"]);

    return updated;
  } catch (sendError) {
    await supabase
      .from("outreach")
      .update({
        send_error:
          sendError instanceof Error ? sendError.message : "Send failed.",
      })
      .eq("id", item.id);

    throw sendError;
  }
}
