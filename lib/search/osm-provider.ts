import type { PotentialLead, SearchCriteria } from "./types";

/*
 * Free lead source: OpenStreetMap (no API key, no cost).
 * Used automatically when GOOGLE_PLACES_API_KEY is not set.
 *  - Nominatim  → turns "Austin, TX" into coordinates
 *  - Overpass   → finds businesses of that type around the point
 * Data © OpenStreetMap contributors (ODbL) — attribution is shown in the app.
 */

const USER_AGENT = "BaseLead/1.0 (B2B lead discovery; info@studiobase.tech)";
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Industry keywords → OpenStreetMap tags.
const TAGS: [RegExp, string[]][] = [
  [/dent|orthodon/i, ['"amenity"="dentist"', '"healthcare"="dentist"']],
  [/med ?spa|spa|beauty|esthetic|aesthetic|nail|lash|wax/i, ['"shop"="beauty"', '"leisure"="spa"', '"shop"="massage"']],
  [/hair|salon|barber/i, ['"shop"="hairdresser"']],
  [/clinic|doctor|medical|physician|chiropract|physio|therap/i, ['"amenity"="clinic"', '"amenity"="doctors"', '"healthcare"']],
  [/vet|animal|pet/i, ['"amenity"="veterinary"', '"shop"="pet"', '"shop"="pet_grooming"']],
  [/restaurant|food|dining|grill|pizza|taco|sushi/i, ['"amenity"="restaurant"', '"amenity"="fast_food"']],
  [/caf[eé]|coffee/i, ['"amenity"="cafe"']],
  [/bar|pub|brewer|wine/i, ['"amenity"="bar"', '"amenity"="pub"', '"craft"="brewery"']],
  [/bakery|pastr/i, ['"shop"="bakery"', '"shop"="pastry"']],
  [/hotel|motel|lodging|inn|hospitality/i, ['"tourism"="hotel"', '"tourism"="motel"', '"tourism"="guest_house"']],
  [/gym|fitness|yoga|pilates|crossfit/i, ['"leisure"="fitness_centre"', '"sport"="yoga"']],
  [/law|attorney|legal/i, ['"office"="lawyer"']],
  [/account|cpa|tax|bookkeep/i, ['"office"="accountant"', '"office"="tax_advisor"']],
  [/real estate|realtor|property/i, ['"office"="estate_agent"', '"office"="property_management"']],
  [/insur/i, ['"office"="insurance"']],
  [/financ|bank|mortgage|loan|wealth/i, ['"office"="financial"', '"amenity"="bank"', '"office"="financial_advisor"']],
  [/marketing|advertis|agency|design|branding/i, ['"office"="advertising_agency"', '"office"="marketing"', '"craft"="graphic_design"']],
  [/software|tech|it |it$|saas|computer/i, ['"office"="it"', '"office"="software"', '"shop"="computer"']],
  [/plumb/i, ['"craft"="plumber"']],
  [/electric/i, ['"craft"="electrician"']],
  [/roof/i, ['"craft"="roofer"']],
  [/hvac|heating|air condition/i, ['"craft"="hvac"']],
  [/construct|contractor|builder|remodel/i, ['"craft"="builder"', '"office"="construction_company"', '"craft"="carpenter"']],
  [/landscap|garden|lawn/i, ['"craft"="gardener"', '"shop"="garden_centre"']],
  [/clean|janitor|maid/i, ['"craft"="cleaning"', '"shop"="dry_cleaning"']],
  [/auto|car |cars|mechanic|tire|garage/i, ['"shop"="car_repair"', '"shop"="car"', '"shop"="tyres"']],
  [/school|academy|tutor|education|training/i, ['"amenity"="school"', '"amenity"="language_school"', '"office"="educational_institution"']],
  [/daycare|childcare|preschool/i, ['"amenity"="kindergarten"', '"amenity"="childcare"']],
  [/pharma|drugstore/i, ['"amenity"="pharmacy"']],
  [/optic|eye/i, ['"shop"="optician"']],
  [/church|ministr/i, ['"amenity"="place_of_worship"']],
  [/retail|store|shop|boutique|cloth|fashion/i, ['"shop"="clothes"', '"shop"="boutique"', '"shop"="gift"']],
  [/photo/i, ['"craft"="photographer"', '"shop"="photo"']],
  [/event|wedding|venue/i, ['"amenity"="events_venue"', '"office"="event_management"']],
  [/manufactur|factory|industrial/i, ['"man_made"="works"', '"industrial"']],
  [/logistic|shipping|freight|trucking|moving/i, ['"office"="logistics"', '"office"="moving_company"']],
];

export async function geocode(location: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Could not find that location.");
  const [hit] = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  if (!hit) throw new Error(`Could not find "${location}". Try "City, State".`);
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name };
}

function selectorsFor(criteria: SearchCriteria) {
  const text = `${criteria.industry || ""} ${criteria.idealClient || ""}`.trim();
  const matched = TAGS.filter(([pattern]) => pattern.test(text)).flatMap(([, tags]) => tags);
  if (matched.length) return { tags: [...new Set(matched)], keyword: null as string | null };

  // Unknown industry: match the words in the business name.
  const keyword = (criteria.industry || criteria.idealClient || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 3)
    .join("|");
  return { tags: ['"shop"', '"office"', '"craft"', '"amenity"'], keyword: keyword || null };
}

async function overpass(query: string) {
  let lastError: unknown;
  for (const endpoint of OVERPASS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(50000),
      });
      if (!response.ok) throw new Error(`OpenStreetMap is busy (${response.status}).`);
      return ((await response.json()).elements ?? []) as OsmElement[];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("OpenStreetMap search failed.");
}

export async function searchOpenStreetMap(criteria: SearchCriteria): Promise<PotentialLead[]> {
  const wanted = Math.min(Math.max(criteria.leads ?? 20, 1), 60);
  const center = await geocode(criteria.location);
  const miles = Math.min(Math.max(criteria.radius ?? 15, 1), 50);
  const meters = Math.round(miles * 1609);
  const { tags, keyword } = selectorsFor(criteria);
  const nameFilter = keyword ? `["name"~"${keyword}",i]` : "";

  const query = `[out:json][timeout:35];(${tags
    .map((tag) => `nwr[${tag}]["name"]${nameFilter}(around:${meters},${center.lat},${center.lon});`)
    .join("")});out center tags 400;`;

  const elements = await overpass(query);

  const leads = elements
    .filter((element) => element.tags?.name)
    .map((element) => {
      const t = element.tags as Record<string, string>;
      const lat = element.lat ?? element.center?.lat ?? null;
      const lon = element.lon ?? element.center?.lon ?? null;
      const phone = t.phone || t["contact:phone"] || null;
      const email = t.email || t["contact:email"] || null;
      let website = t.website || t["contact:website"] || t.url || null;
      if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
      const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
      const city = t["addr:city"] || null;
      const state = t["addr:state"] || null;
      const address = [street, city, state, t["addr:postcode"]].filter(Boolean).join(", ") || null;
      const category =
        (t.amenity || t.shop || t.office || t.craft || t.healthcare || t.leisure || t.tourism || "")
          .replace(/_/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase()) || null;

      return {
        name: t.name,
        company: t.name,
        email,
        phone,
        phone_numbers: phone ? phone.split(/;\s*/) : [],
        email_addresses: email ? [email] : [],
        website,
        industry: criteria.industry || category,
        category,
        location: [city, state].filter(Boolean).join(", ") || criteria.location,
        address,
        city,
        state,
        country: t["addr:country"] || null,
        rating: null,
        review_count: null,
        latitude: lat,
        longitude: lon,
        facebook_url: t["contact:facebook"] || null,
        instagram_url: t["contact:instagram"] || null,
        linkedin_url: t["contact:linkedin"] || null,
        google_maps_url:
          lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name} ${lat},${lon}`)}` : null,
        source: "openstreetmap",
        source_id: `osm:${element.type}/${element.id}`,
        status: "new",
        notes: null,
        raw_data: {
          provider: "openstreetmap",
          osm_id: `${element.type}/${element.id}`,
          opening_hours: t.opening_hours ?? null,
          search_offer: criteria.offer,
          search_ideal_client: criteria.idealClient,
          search_location: criteria.location,
          attribution: "© OpenStreetMap contributors",
        },
      } satisfies PotentialLead;
    });

  // Best contacts first: website + phone + email.
  const quality = (lead: PotentialLead) =>
    (lead.website ? 2 : 0) + (lead.phone ? 2 : 0) + (lead.email ? 1 : 0) + (lead.address ? 1 : 0);

  const unique = new Map<string, PotentialLead>();
  for (const lead of leads.sort((a, b) => quality(b) - quality(a))) {
    const key = lead.company.toLowerCase();
    if (!unique.has(key)) unique.set(key, lead);
  }

  return [...unique.values()].slice(0, wanted);
}
