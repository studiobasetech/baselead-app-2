import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SearchCriteria,
  PotentialLead,
} from "./types";
import {
  isPlacesConfigured,
  searchGooglePlaces,
} from "./google-places-provider";
import { searchOpenStreetMap } from "./osm-provider";
import { isGeoapifyConfigured, searchGeoapify } from "./geoapify-provider";
import { enrichWebsite, mapLimit } from "./enrich";
import { scoreLead } from "./scoring";
import { askAiJson, isAiConfigured } from "@/lib/ai";
import { extractDecisionMakers, type WebsitePerson } from "@/lib/contacts/website-people";

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

  // Google Places when the owner has a key; otherwise the free
  // OpenStreetMap source, so lead discovery always works.
  const providerCriteria = {
    ...criteria,
    // Fetch extra so duplicates can be skipped.
    leads: criteria.excludeExisting
      ? Math.min(60, (criteria.leads ?? 20) * 2)
      : criteria.leads,
  };

  // Order: Google Places (if a key is set) → Geoapify (free, reliable)
  // → public OpenStreetMap servers as a last resort.
  let potentialLeads: PotentialLead[];
  if (isPlacesConfigured()) {
    potentialLeads = await searchGooglePlaces(providerCriteria);
  } else if (isGeoapifyConfigured()) {
    try {
      potentialLeads = await searchGeoapify(providerCriteria);
    } catch (error) {
      console.warn("Geoapify search failed, trying OpenStreetMap:", error);
      potentialLeads = await searchOpenStreetMap(providerCriteria);
    }
  } else {
    potentialLeads = await searchOpenStreetMap(providerCriteria);
  }

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
    const peopleText = new Map<PotentialLead, string>();

    if (criteria.enrichment !== false) {
      await mapLimit(selectedLeads, 6, async (lead) => {
        const found = await enrichWebsite(lead.website);

        // Keep what the listing already had; add what the website shows.
        const emails = [...new Set([...(lead.email_addresses ?? []), ...(lead.email ? [lead.email] : []), ...found.emails])];
        const phones = [...new Set([...(lead.phone_numbers ?? []), ...(lead.phone ? [lead.phone] : []), ...found.phones])];
        lead.email = lead.email ?? emails[0] ?? null;
        lead.email_addresses = emails;
        lead.phone = lead.phone ?? phones[0] ?? null;
        lead.phone_numbers = phones;
        lead.instagram_url = lead.instagram_url ?? found.instagram_url;
        lead.facebook_url = lead.facebook_url ?? found.facebook_url;
        lead.linkedin_url = lead.linkedin_url ?? found.linkedin_url;
        lead.x_url = lead.x_url ?? found.x_url;
        lead.tiktok_url = lead.tiktok_url ?? found.tiktok_url;
        lead.pinterest_url = lead.pinterest_url ?? found.pinterest_url;
        peopleText.set(lead, found.peopleText);
        lead.raw_data = {
          ...(lead.raw_data ?? {}),
          website_reachable: lead.website ? found.reachable : null,
          has_booking: lead.website && found.reachable ? found.has_booking : null,
          has_chat: lead.website && found.reachable ? found.has_chat : null,
          logo_url: found.logo_url,
          website_ssl: lead.website ? found.has_ssl : null,
          enriched: true,
        };
      });
    }

    // Decision makers named on each website (free: website + AI).
    if (peopleText.size && isAiConfigured()) {
      const withText = selectedLeads.filter((lead) => (peopleText.get(lead) ?? "").length > 80);
      const people = await extractDecisionMakers(
        withText.map((lead) => ({ company: lead.company, text: peopleText.get(lead) ?? "" }))
      );
      withText.forEach((lead, index) => {
        const found: WebsitePerson[] = people[index] ?? [];
        if (!found.length) return;
        const best = found[0];
        lead.contact_name = best.name;
        lead.contact_title = best.title;
        // A personal email beats a generic info@ inbox.
        const personal = found.find((person) => person.email)?.email;
        if (personal) {
          lead.email = personal;
          lead.email_addresses = [...new Set([personal, ...(lead.email_addresses ?? [])])];
        }
        lead.raw_data = { ...(lead.raw_data ?? {}), decision_makers: found };
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
Reasons must be specific observations a salesperson can use (e.g. "No online booking on their website", "No chat to answer visitors after hours", "No social media found", "Owner Dr. Smith identified"). Never mention the score, and never list neutral facts like "Has a website".
Reply with JSON only: [{"index":0,"reason":"","service":"","value":"","reasons":[""]}]

${top
  .map(
    (lead, index) =>
      `${index}. ${lead.company} | ${lead.category ?? ""} | ${lead.location} | rating ${lead.rating ?? "n/a"} (${lead.review_count ?? "unknown"} reviews) | website: ${lead.website ? (lead.raw_data?.website_reachable === false ? "does not load" : lead.raw_data?.website_ssl === false ? "yes, not secure" : "yes") : "no"} | online booking: ${lead.raw_data?.has_booking === undefined || lead.raw_data?.has_booking === null ? "unknown" : lead.raw_data?.has_booking ? "yes" : "no"} | chat on site: ${lead.raw_data?.has_chat === undefined || lead.raw_data?.has_chat === null ? "unknown" : lead.raw_data?.has_chat ? "yes" : "no"} | socials: ${[lead.instagram_url, lead.facebook_url, lead.linkedin_url].filter(Boolean).length} | decision maker: ${lead.contact_name ? `${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ""}` : "unknown"} | email: ${lead.email ? "yes" : "no"} | phone: ${lead.phone ? "yes" : "no"}`
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

        assigned_to: userId,

        name:
          lead.name || null,

        company:
          lead.company || null,

        email:
          lead.email || null,

        phone:
          lead.phone || null,

        contact_name:
          lead.contact_name || null,

        contact_title:
          lead.contact_title || null,

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

  let {
    data: insertedLeads,
    error: leadsError,
  } = await supabase
    .from("leads")
    .insert(leadsToInsert)
    .select();

  // Database not migrated yet: retry without the new column.
  if (leadsError?.message?.includes("assigned_to")) {
    const retry = await supabase
      .from("leads")
      .insert(
        leadsToInsert.map(
          ({ assigned_to: _ignored, ...rest }) => rest
        )
      )
      .select();

    insertedLeads = retry.data;
    leadsError = retry.error;
  }

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

  // Save the decision makers as lead contacts (shown on the lead).
  const contactRows = insertedLeads.flatMap((row: { id: string; raw_data?: { decision_makers?: WebsitePerson[] } }) =>
    (row.raw_data?.decision_makers ?? []).map((person, index) => ({
      company_id: options.companyId || null,
      lead_id: row.id,
      full_name: person.name,
      first_name: person.name.replace(/^dr\.?\s+/i, "").split(/\s+/)[0] ?? null,
      last_name: person.name.split(/\s+/).slice(1).join(" ") || null,
      title: person.title,
      email: person.email,
      phone: person.phone,
      source: "website",
      is_primary: index === 0,
    }))
  );
  if (contactRows.length) {
    const { error: contactsError } = await supabase.from("lead_contacts").insert(contactRows);
    if (contactsError) console.warn("Decision makers not saved:", contactsError.message);
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