import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getTwilio, normalizePhone, validTwilioSignature } from "@/lib/twilio";
import { advanceLead, logActivity } from "@/lib/automation";
import { appUrl } from "@/lib/stripe";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twiml() {
  return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}

/*
 * Twilio calls this when a lead texts back.
 * Webhook URL (shown in Integrations): /api/twilio/inbound?c=<workspace id>
 */
export async function POST(request: Request) {
  if (!hasAdminClient()) return twiml();

  const url = new URL(request.url);
  const companyId = url.searchParams.get("c") ?? "";
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  const twilio = await getTwilio(companyId);
  if (!twilio) return twiml();

  const publicUrl = `${appUrl(request)}${url.pathname}${url.search}`;

  if (!validTwilioSignature(twilio.authToken, publicUrl, params, request.headers.get("x-twilio-signature"))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const from = normalizePhone(params.From);
  const text = params.Body ?? "";
  const admin = createAdminClient();

  // Match the sender to a lead in this workspace (last 10 digits).
  const tail = (from ?? "").replace(/\D/g, "").slice(-10);
  const { data: leads } = await admin
    .from("leads")
    .select("id, user_id, assigned_to, phone, company, name")
    .eq("company_id", companyId)
    .ilike("phone", `%${tail.slice(-4)}%`)
    .limit(50);

  const lead = (leads ?? []).find((row) => (row.phone ?? "").replace(/\D/g, "").endsWith(tail));
  if (!lead) return twiml();

  const owner = lead.assigned_to || lead.user_id;

  await logActivity(admin, {
    leadId: lead.id,
    companyId,
    userId: owner,
    type: "reply",
    title: `Text reply from ${lead.company || lead.name}`,
    body: text,
    metadata: { channel: "sms", from },
  });

  await advanceLead(admin, lead.id, "responded", "The lead replied by text.", owner);

  await admin
    .from("sequence_enrollments")
    .update({ status: "replied", next_run_at: null })
    .eq("lead_id", lead.id)
    .eq("status", "active");

  await admin.from("tasks").insert({
    company_id: companyId,
    user_id: owner,
    lead_id: lead.id,
    title: `Reply to the text from ${lead.company || lead.name}`,
    type: "follow_up",
    notes: text,
    due_at: new Date().toISOString(),
    source: "automation",
  });

  return twiml();
}
