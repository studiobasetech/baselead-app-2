import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/automation";
import {
  domainFromWebsite,
  findContactsForDomain,
  isGenericEmail,
} from "@/lib/contacts/hunter";

export async function lookupsUsedThisMonth(supabase: SupabaseClient, companyId: string) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("lead_activities")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("type", "contact_lookup")
    .gte("created_at", monthStart);

  return count ?? 0;
}

/**
 * Finds decision makers for one lead, saves them and sets the best one
 * as the lead's main contact. Returns the saved contacts.
 */
export async function findDecisionMakers(
  supabase: SupabaseClient,
  access: WorkspaceAccess,
  leadId: string
) {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, website, email, company, name, company_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) throw new Error("Lead not found.");

  const domain = domainFromWebsite(lead.website);
  if (!domain) throw new Error("This lead has no company website to search.");

  const found = await findContactsForDomain(domain);

  // Count the lookup (even with 0 results, it used a credit).
  await logActivity(supabase, {
    leadId,
    companyId: access.company.id,
    userId: access.user.id,
    type: "contact_lookup",
    title: found.length
      ? `Found ${found.length} contact${found.length === 1 ? "" : "s"} at ${domain}`
      : `No people found at ${domain}`,
  });

  if (!found.length) return [];

  const rows = found.map((contact, index) => ({
    ...contact,
    company_id: access.company.id,
    lead_id: leadId,
    source: "hunter",
    is_primary: index === 0,
  }));

  await supabase.from("lead_contacts").update({ is_primary: false }).eq("lead_id", leadId);

  const { data: saved, error } = await supabase
    .from("lead_contacts")
    .upsert(rows, { onConflict: "lead_id,email" })
    .select("*");

  if (error) throw new Error(error.message);

  const best = found[0];

  await supabase
    .from("leads")
    .update({
      contact_name: best.full_name,
      contact_title: best.title,
      linkedin_contact_url: best.linkedin_url,
      // Replace generic inboxes (info@…) with the decision maker.
      ...(isGenericEmail(lead.email) ? { email: best.email } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  return saved ?? [];
}
