import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SearchCriteria,
  PotentialLead,
} from "./types";
import {
  isPlacesConfigured,
  searchGooglePlaces,
} from "./google-places-provider";
import { enrichWebsite, mapLimit } from "./enrich";
import { scoreLead } from "./scoring";
import { askAiJson, isAiConfigured } from "@/lib/ai";

export type ProcessSearchOptions = {
  /** Pro+: AI recommendations (service, value, reasons). */
  recommendations: boolean;
  /** Workspace the leads belong to (shared with the team). */
  companyId?: string | null;
};

export async function processSearch(
  supabase: SupabaseClient,
  searchId: string,
  userId: string,
  criteria: SearchCriteria,
  options: ProcessSearchOptions = { recommendations: false }
) {
  // ---------------------------------------------------------
  // 1. Get leads from the search provider.
  //    Real data: Google Places. Demo data is only used in
  //    development when no Google key is configured.
  // ---------------------------------------------------------

  // Real data only: no sample/demo businesses are ever created.
  const demo = false;

  if (!isPlacesConfigured()) {
    throw new Error(
      "Real lead search is not connected yet. Add your GOOGLE_PLACES_API_KEY to .env.local and restart the app (see SETUP-BASELEAD.md)."
    );
  }

  const potentialLeads = await searchGooglePlaces({
        ...criteria,
        // Fetch extra so duplicates can be skipped.
        leads: criteria.excludeExisting
          ? Math.min(60, (criteria.leads ?? 20) * 2)
          : criteria.leads,
      });

  if (potentialLeads.length === 0) {
    return {
      leads: [],
      totalFound: 0,
      demo,
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

  // Demo data only: if every sample lead already exists,
  // show them again so the demo search keeps working.
  if (
    demo &&
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
      demo,
    };
  }

  // ---------------------------------------------------------
  // 3b. Enrich (emails + social links from the website)
  //     and score with real signals.
  // ---------------------------------------------------------

  if (!demo) {
    if (criteria.enrichment !== false) {
      await mapLimit(selectedLeads, 6, async (lead) => {
        const found = await enrichWebsite(lead.website);

        lead.email = found.emails[0] ?? lead.email;
        lead.email_addresses = found.emails;
        lead.instagram_url = found.instagram_url;
        lead.facebook_url = found.facebook_url;
        lead.linkedin_url = found.linkedin_url;
        lead.x_url = found.x_url;
        lead.tiktok_url = found.tiktok_url;
        lead.pinterest_url = found.pinterest_url;
        lead.raw_data = {
          ...(lead.raw_data ?? {}),
          website_reachable: lead.website ? found.reachable : null,
          website_ssl: lead.website ? found.has_ssl : null,
          enriched: true,
        };
      });
    }

    for (const lead of selectedLeads) {
      if (criteria.scoring === false) continue;

      const result = scoreLead(lead, criteria);

      lead.ai_score = result.score;
      lead.ai_opportunity = result.opportunity;
      lead.ai_reason = result.reason;
      lead.ai_recommendations = options.recommendations
        ? {
            recommended_service: criteria.offer,
            estimated_project_value: result.estimatedValue,
            reasons: result.reasons,
            buying_intent: result.buyingIntent,
            tags: criteria.tags || [],
          }
        : { reasons: result.reasons, buying_intent: result.buyingIntent };
    }

    // Pro+: personalised AI recommendations for the top leads.
    if (options.recommendations && isAiConfigured() && criteria.scoring !== false) {
      const top = [...selectedLeads]
        .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
        .slice(0, 15);

      try {
        const answer = await askAiJson<
          { index: number; reason: string; service: string; value: string; reasons: string[] }[]
        >(
          `You help a business that sells "${criteria.offer}" to "${criteria.idealClient}".
For each prospect below, write a one-sentence reason it is a good fit, the most relevant service to pitch, an estimated project value range in USD, and up to 3 short evidence-based reasons. Only use the facts given.
Reply with JSON only: [{"index":0,"reason":"","service":"","value":"","reasons":[""]}]

${top
  .map(
    (lead, index) =>
      `${index}. ${lead.company} | ${lead.category ?? ""} | ${lead.location} | rating ${lead.rating ?? "n/a"} (${lead.review_count ?? 0} reviews) | website: ${lead.website ? "yes" : "no"} | socials: ${[lead.instagram_url, lead.facebook_url, lead.linkedin_url].filter(Boolean).length} | score ${lead.ai_score}`
  )
  .join("\n")}`,
          { maxTokens: 2500 }
        );

        for (const item of answer) {
          const lead = top[item.index];
          if (!lead) continue;

          lead.ai_reason = item.reason || lead.ai_reason;
          lead.ai_recommendations = {
            ...(lead.ai_recommendations ?? {}),
            recommended_service: item.service || criteria.offer,
            estimated_project_value:
              item.value || lead.ai_recommendations?.estimated_project_value,
            reasons: item.reasons?.length ? item.reasons : lead.ai_recommendations?.reasons,
          };
        }
      } catch (error) {
        console.error("AI recommendations skipped:", error);
      }
    }
  }

  // ---------------------------------------------------------
  // 4. Convert provider leads into Supabase rows.
  // ---------------------------------------------------------

  const leadsToInsert =
    selectedLeads.map(
      (lead: PotentialLead) => ({
        user_id: userId,

        company_id:
          options.companyId || null,

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
          lead.source || (demo ? "demo" : "search"),

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
            provider: demo ? "demo" : "unknown",
            test_data: demo,
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
      demo,
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
    demo,
  };
}