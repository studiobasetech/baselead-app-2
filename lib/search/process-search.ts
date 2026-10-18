import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SearchCriteria,
  PotentialLead,
} from "./types";
import { getMockLeads } from "./mock-provider";

export async function processSearch(
  supabase: SupabaseClient,
  searchId: string,
  userId: string,
  criteria: SearchCriteria
) {
  // ---------------------------------------------------------
  // 1. Get leads from the current search provider.
  // ---------------------------------------------------------

  const potentialLeads =
    getMockLeads(criteria);

  if (potentialLeads.length === 0) {
    return {
      leads: [],
      totalFound: 0,
    };
  }

  // ---------------------------------------------------------
  // 2. Check which leads already exist.
  //
  // The "Exclude My Existing Leads" setting is respected,
  // but the search should always return the leads that are
  // actually available for this search.
  // ---------------------------------------------------------

  let leadsToProcess =
    potentialLeads;

  if (criteria.excludeExisting) {
    const sourceIds =
      potentialLeads
        .map((lead) => lead.source_id)
        .filter(
          (value): value is string =>
            Boolean(value)
        );

    if (sourceIds.length > 0) {
      const {
        data: existingLeads,
        error: existingError,
      } = await supabase
        .from("leads")
        .select("source_id")
        .eq("user_id", userId)
        .in("source_id", sourceIds);

      if (existingError) {
        console.error(
          "Error checking existing leads:",
          existingError
        );

        /*
         * If we cannot verify existing leads, do not
         * destroy the search results. Continue with the
         * current provider results.
         */
        leadsToProcess =
          potentialLeads;
      } else {
        const existingSourceIds =
          new Set(
            (existingLeads || [])
              .map(
                (lead) => lead.source_id
              )
              .filter(Boolean)
          );

        leadsToProcess =
          potentialLeads.filter(
            (lead) =>
              !lead.source_id ||
              !existingSourceIds.has(
                lead.source_id
              )
          );
      }
    }
  }

  /*
   * If every test lead already exists, the old behavior
   * returned zero results. That makes the development
   * search appear broken after running it once.
   *
   * For the current test provider, we instead allow the
   * current search to return its matching businesses.
   *
   * This keeps the UI usable while we are still using
   * test business data. Once a real provider is connected,
   * duplicate exclusion can be enforced normally using
   * provider IDs.
   */
  if (
    leadsToProcess.length === 0 &&
    potentialLeads.length > 0
  ) {
    leadsToProcess =
      potentialLeads;
  }

  // ---------------------------------------------------------
  // 3. Limit the number of results.
  // ---------------------------------------------------------

  const requestedCount =
    typeof criteria.leads === "number" &&
    criteria.leads > 0
      ? Math.min(
          criteria.leads,
          leadsToProcess.length
        )
      : leadsToProcess.length;

  const selectedLeads =
    leadsToProcess.slice(
      0,
      requestedCount
    );

  if (selectedLeads.length === 0) {
    return {
      leads: [],
      totalFound: 0,
    };
  }

  // ---------------------------------------------------------
  // 4. Convert provider leads into Supabase rows.
  // ---------------------------------------------------------

  const leadsToInsert =
    selectedLeads.map(
      (lead: PotentialLead) => ({
        user_id: userId,

        name:
          lead.name || null,

        company:
          lead.company || null,

        email:
          lead.email || null,

        phone:
          lead.phone || null,

        phone_numbers:
          Array.isArray(
            lead.phone_numbers
          )
            ? lead.phone_numbers
            : [],

        email_addresses:
          Array.isArray(
            lead.email_addresses
          )
            ? lead.email_addresses
            : [],

        website:
          lead.website || null,

        industry:
          lead.industry || null,

        category:
          lead.category || null,

        location:
          lead.location || null,

        address:
          lead.address || null,

        city:
          lead.city || null,

        state:
          lead.state || null,

        country:
          lead.country || null,

        rating:
          lead.rating ?? null,

        review_count:
          lead.review_count ?? null,

        latitude:
          lead.latitude ?? null,

        longitude:
          lead.longitude ?? null,

        source:
          lead.source || "test",

        source_id:
          lead.source_id || null,

        status:
          lead.status || "new",

        notes:
          lead.notes || null,

        instagram_url:
          lead.instagram_url || null,

        facebook_url:
          lead.facebook_url || null,

        linkedin_url:
          lead.linkedin_url || null,

        x_url:
          lead.x_url || null,

        tiktok_url:
          lead.tiktok_url || null,

        pinterest_url:
          lead.pinterest_url || null,

        google_maps_url:
          lead.google_maps_url || null,

        ai_score:
          lead.ai_score ?? null,

        ai_opportunity:
          lead.ai_opportunity || null,

        ai_reason:
          lead.ai_reason || null,

        ai_recommendations:
          lead.ai_recommendations ?? null,

        ai_analyzed_at:
          lead.ai_score !== null &&
          lead.ai_score !== undefined
            ? new Date().toISOString()
            : null,

        raw_data:
          lead.raw_data || {
            provider: "mock",
            test_data: true,
          },
      })
    );

  // ---------------------------------------------------------
  // 5. Save the leads.
  // ---------------------------------------------------------

  const {
    data: insertedLeads,
    error: leadsError,
  } = await supabase
    .from("leads")
    .insert(leadsToInsert)
    .select();

  if (leadsError) {
    console.error(
      "Error saving leads:",
      leadsError
    );

    throw new Error(
      `Could not save the leads: ${leadsError.message}`
    );
  }

  if (
    !insertedLeads ||
    insertedLeads.length === 0
  ) {
    return {
      leads: [],
      totalFound: 0,
    };
  }

  // ---------------------------------------------------------
  // 6. Connect every lead to the current search.
  // ---------------------------------------------------------

  const searchLeadLinks =
    insertedLeads.map(
      (lead, index) => ({
        search_id: searchId,
        lead_id: lead.id,
        source_rank: index + 1,
      })
    );

  const {
    error: linkError,
  } = await supabase
    .from("search_leads")
    .insert(searchLeadLinks);

  if (linkError) {
    console.error(
      "Error linking leads to search:",
      linkError
    );

    throw new Error(
      `Could not link the leads to the search: ${linkError.message}`
    );
  }

  // ---------------------------------------------------------
  // 7. Return the complete results.
  // ---------------------------------------------------------

  return {
    leads: insertedLeads,
    totalFound:
      insertedLeads.length,
  };
}