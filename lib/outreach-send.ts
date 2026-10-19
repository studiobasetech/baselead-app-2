import type { SupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccessToken, sendGmail } from "@/lib/integrations/google-api";
import { advanceLead, logActivity } from "@/lib/automation";
import { checkCanEmail, unsubscribeHeaders, withComplianceFooter } from "@/lib/compliance";

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
    .select("*")
    .eq("id", item.lead_id)
    .maybeSingle();

  if (!lead?.email) {
    throw new Error("This lead has no email address.");
  }

  const allowed = await checkCanEmail(supabase, item.user_id, lead);
  if (!allowed.ok) throw new Error(allowed.reason);

  const token = await getGoogleAccessToken(supabase, item.user_id, "gmail");

  if (!token) {
    throw new Error("Connect Gmail in Integrations to send emails.");
  }

  try {
    const message = await sendGmail(token, {
      to: lead.email,
      subject: item.subject || `Hello ${lead.company || lead.name || ""}`.trim(),
      body: await withComplianceFooter(supabase, item.message || "", lead.id, lead.company_id),
      headers: unsubscribeHeaders(lead.id),
    });

    const now = new Date().toISOString();

    const { data: updated } = await supabase
      .from("outreach")
      .update({
        status: "sent",
        sent_at: now,
        next_step: "Follow up",
        next_step_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        send_error: null,
        updated_at: now,
      })
      .eq("id", item.id)
      .select("*")
      .single();

    await logActivity(supabase, {
      leadId: item.lead_id,
      userId: item.user_id,
      companyId: (updated as { company_id?: string } | null)?.company_id ?? null,
      type: "email_sent",
      title: `Email sent: ${item.subject || "Outreach"}`,
      body: item.message,
    });

    // Automatic pipeline: first email → Contacted.
    await advanceLead(supabase, item.lead_id, "contacted", "Email sent from BaseLead.", item.user_id);

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
