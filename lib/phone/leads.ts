import { createAdminClient } from "@/lib/supabase/admin";
import { lastTen } from "@/lib/phone/telnyx";

export type PhoneLead = { id: string; name: string | null; company: string | null };

/** Finds the company's lead (or lead contact) with this phone number. */
export async function findLeadByPhone(companyId: string, number: string | null | undefined): Promise<PhoneLead | null> {
  const ten = lastTen(number);
  if (ten.length !== 10) return null;
  const admin = createAdminClient();
  const tail = ten.slice(-4);

  const { data: leads } = await admin
    .from("leads")
    .select("id, name, company, phone")
    .eq("company_id", companyId)
    .ilike("phone", `%${tail}%`)
    .limit(50);

  const lead = (leads ?? []).find((row) => lastTen(row.phone) === ten);
  if (lead) return { id: lead.id, name: lead.name, company: lead.company };

  const { data: contacts } = await admin
    .from("lead_contacts")
    .select("lead_id, phone")
    .eq("company_id", companyId)
    .ilike("phone", `%${tail}%`)
    .limit(50);

  const contact = (contacts ?? []).find((row) => lastTen(row.phone) === ten);
  if (!contact?.lead_id) return null;

  const { data: parent } = await admin.from("leads").select("id, name, company").eq("id", contact.lead_id).maybeSingle();
  return parent ? { id: parent.id, name: parent.name, company: parent.company } : null;
}

export async function leadInCompany(companyId: string, leadId: string | null | undefined): Promise<PhoneLead | null> {
  if (!leadId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("leads").select("id, name, company").eq("id", leadId).eq("company_id", companyId).maybeSingle();
  return data ? { id: data.id, name: data.name, company: data.company } : null;
}
