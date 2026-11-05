import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceAccess } from "@/lib/workspace";
import { logActivity } from "@/lib/automation";
import {
  domainFromWebsite,
  findContactsForDomain,
  isGenericEmail,
  isHunterConfigured,
  type FoundContact,
} from "@/lib/contacts/hunter";
import { collectPeopleText, extractDecisionMakers } from "@/lib/contacts/website-people";

/** Free: decision makers named on the business's own website. */
async function findOnWebsite(website: string | null, company: string): Promise<FoundContact[]> {
  const text = await collectPeopleText(website);
  const [people] = await extractDecisionMakers([{ company, text }]);
  return (people ?? []).map((person) => ({
    full_name: person.name,
    first_name: person.name.replace(/^dr\.?\s+/i, "").split(/\s+/)[0] ?? null,
    last_name: person.name.split(/\s+/).slice(1).join(" ") || null,
    title: person.title,
    seniority: null,
    department: null,
    email: person.email as string,
    email_confidence: null,
    phone: person.phone,
    linkedin_url: null,
  }));
}

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

  const found = isHunterConfigured()
    ? await findContactsForDomain(domain)
    : await findOnWebsite(lead.website, lead.company || lead.name || domain);
  const source = isHunterConfigured() ? "hunter" : "website";

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
    source,
    is_primary: index === 0,
  }));

  await supabase.from("lead_contacts").update({ is_primary: false }).eq("lead_id", leadId);

  // Website people may have no email: insert those, upsert the rest.
  const withEmail = rows.filter((row) => row.email);
  const withoutEmail = rows.filter((row) => !row.email);
  const saved: Record<string, unknown>[] = [];
  let error: { message: string } | null = null;
  if (withEmail.length) {
    const result = await supabase
      .from("lead_contacts")
      .upsert(withEmail, { onConflict: "lead_id,email" })
      .select("*");
    error = result.error;
    saved.push(...(result.data ?? []));
  }
  if (withoutEmail.length) {
    await supabase.from("lead_contacts").delete().eq("lead_id", leadId).is("email", null).eq("source", source);
    const result = await supabase.from("lead_contacts").insert(withoutEmail).select("*");
    error = error ?? result.error;
    saved.push(...(result.data ?? []));
  }

  if (error) throw new Error(error.message);

  const best = found[0];

  await supabase
    .from("leads")
    .update({
      contact_name: best.full_name,
      contact_title: best.title,
      linkedin_contact_url: best.linkedin_url,
      // Replace generic inboxes (info@…) with the decision maker.
      ...(best.email && isGenericEmail(lead.email) ? { email: best.email } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  return saved ?? [];
}
