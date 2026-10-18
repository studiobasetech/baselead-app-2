import { createAdminClient } from "@/lib/supabase/admin";
import type { Proposal } from "@/lib/proposals";

/** Loads a proposal by its public link token (server only). */
export async function loadPublicProposal(token: string) {
  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("proposals")
    .select("*")
    .eq("public_token", token)
    .maybeSingle<Proposal>();

  if (!proposal) return { admin, proposal: null, company: null };

  const { data: company } = await admin
    .from("company_profiles")
    .select("company_name, logo_url, website, phone, email, address")
    .eq("id", proposal.company_id ?? "")
    .maybeSingle();

  return { admin, proposal, company };
}
