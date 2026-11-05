import type { PotentialLead, SearchCriteria } from "./types";

/*
 * Lead source: Geoapify Places (free plan, no card, commercial use allowed).
 * Requires GEOAPIFY_API_KEY in .env.local. Business data comes from
 * OpenStreetMap, served by Geoapify's own (reliable) servers.
 * Attribution shown in the app: "Powered by Geoapify · © OpenStreetMap contributors".
 * Cost: 1 credit per 20 places (free plan = 3,000 credits/day).
 */

export function isGeoapifyConfigured() {
  return Boolean(process.env.GEOAPIFY_API_KEY);
}

// What the user types → Geoapify categories (all checked against the live API).
const CATEGORIES: [RegExp, string[]][] = [
  [/dent|orthodon/i, ["healthcare.dentist"]],
  [/med ?spa|medical spa|aesthetic|esthetic|botox|skin/i, ["service.beauty.spa", "healthcare.clinic_or_praxis.dermatology"]],
  [/^(?!.*(med ?spa|medical spa)).*(\bspas?\b|beauty|nail|lash|wax|massage)/i, ["service.beauty"]],
  [/hair|salon|barber/i, ["service.beauty.hairdresser", "service.beauty"]],
  [/^(?!.*(dent|orthodon|med ?spa|medical spa)).*(clinic|doctor|medical|physician|chiropract|physio|therap|health)/i, ["healthcare.clinic_or_praxis", "healthcare"]],
  [/vet|animal|pet/i, ["pet.veterinary", "pet.shop", "pet.service"]],
  [/restaurant|food|dining|grill|pizza|taco|sushi/i, ["catering.restaurant", "catering.fast_food"]],
  [/caf[eé]|coffee/i, ["catering.cafe"]],
  [/\bbar\b|bars|pub|brewer|wine/i, ["catering.bar", "catering.pub"]],
  [/bakery|pastr/i, ["commercial.food_and_drink.bakery"]],
  [/hotel|motel|lodging|\binn\b|hospitality/i, ["accommodation.hotel", "accommodation.motel", "accommodation.guest_house"]],
  [/gym|fitness|yoga|pilates|crossfit/i, ["sport.fitness"]],
  [/law|attorney|legal|abogad/i, ["office.lawyer"]],
  [/account|cpa|tax|bookkeep|contador/i, ["office.accountant", "office.tax_advisor"]],
  [/real estate|realtor|property|inmobiliari/i, ["office.estate_agent"]],
  [/insur|seguro/i, ["office.insurance"]],
  [/financ|bank|mortgage|loan|wealth/i, ["office.financial", "service.financial"]],
  [/marketing|advertis|agency|design|branding/i, ["office.advertising_agency", "office.company"]],
  [/software|tech|\bit\b|saas|computer/i, ["office.it", "office.company"]],
  [/architect/i, ["office.architect"]],
  [/consult/i, ["office.consulting"]],
  [/non.?profit|charity|ngo/i, ["office.non_profit"]],
  [/electric/i, ["service.electrician"]],
  [/locksmith/i, ["service.locksmith"]],
  [/clean|janitor|maid/i, ["service.cleaning"]],
  [/auto|car |cars|mechanic|tire|garage|vehicle/i, ["service.vehicle", "commercial.vehicle"]],
  [/school|academy|tutor|education|training/i, ["education.school", "education.language_school"]],
  [/daycare|childcare|preschool|guarder/i, ["childcare"]],
  [/pharma|drugstore|farmacia/i, ["healthcare.pharmacy"]],
  [/optic|eye/i, ["commercial.health_and_beauty.optician"]],
  [/church|ministr|iglesia/i, ["religion.place_of_worship"]],
  [/retail|store|shop|boutique|cloth|fashion|tienda/i, ["commercial.clothing", "commercial.gift_and_souvenir"]],
  [/furniture|interior|decor/i, ["commercial.furniture_and_interior"]],
  [/florist|flower/i, ["commercial.florist"]],
  [/landscap|garden|lawn/i, ["commercial.garden"]],
  [/hardware|home improvement/i, ["commercial.houseware_and_hardware"]],
  [/manufactur|factory|industrial/i, ["production.factory", "building.industrial"]],
  [/logistic|shipping|freight|trucking|moving/i, ["office.logistics"]],
  [/travel/i, ["office.travel_agent"]],
  [/staffing|recruit|employment/i, ["office.employment_agency"]],
  [/coworking/i, ["office.coworking"]],
  [/hospital/i, ["healthcare.hospital"]],
];

// Trades have no Geoapify category: search businesses and match the name.
const NAME_ONLY: RegExp[] = [/plumb|roof|hvac|heating|air condition|construct|contractor|builder|remodel|paint|pool|pest|solar|fenc|flooring/i];

type Feature = {
  properties: {
    name?: string;
    formatted?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    state_code?: string;
    country?: string;
    lat?: number;
    lon?: number;
    place_id?: string;
    categories?: string[];
    website?: string;
    contact?: { phone?: string; email?: string };
    datasource?: { raw?: Record<string, string | number> };
  };
};

async function geoapify(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.geoapify.com${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("apiKey", process.env.GEOAPIFY_API_KEY as string);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Lead search error: ${json?.message || response.status}`);
  return json;
}

export async function geocodeGeoapify(location: string) {
  const json = await geoapify("/v1/geocode/search", { text: location, limit: "1", format: "json" });
  const hit = json?.results?.[0];
  if (!hit) throw new Error(`Could not find "${location}". Try "City, State".`);
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: String(hit.formatted ?? location) };
}

function categoriesFor(criteria: SearchCriteria) {
  const text = `${criteria.industry || ""} ${criteria.idealClient || ""}`.trim();
  const matched = CATEGORIES.filter(([pattern]) => pattern.test(text)).flatMap(([, cats]) => cats);
  if (matched.length && !NAME_ONLY.some((pattern) => pattern.test(text))) {
    return { categories: [...new Set(matched)], keyword: null as RegExp | null };
  }

  // Unknown type or a trade: look at all businesses and match words in the name.
  const words = (criteria.idealClient || criteria.industry || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .map((word) => word.replace(/(ies|es|s)$/i, ""))
    .slice(0, 4);
  return {
    categories: [...new Set([...matched, "office", "service", "commercial"])],
    keyword: words.length ? new RegExp(words.join("|"), "i") : null,
  };
}

export async function searchGeoapify(criteria: SearchCriteria): Promise<PotentialLead[]> {
  const wanted = Math.min(Math.max(criteria.leads ?? 20, 1), 60);
  const center = await geocodeGeoapify(criteria.location);
  const miles = Math.min(Math.max(criteria.radius ?? 15, 1), 50);
  const meters = Math.round(miles * 1609);
  const { categories, keyword } = categoriesFor(criteria);

  // Ask for extra so we can keep the ones with the best contact info.
  const limit = keyword ? 300 : Math.min(wanted * 3, 200);
  const json = await geoapify("/v2/places", {
    categories: categories.join(","),
    filter: `circle:${center.lon},${center.lat},${meters}`,
    bias: `proximity:${center.lon},${center.lat}`,
    limit: String(limit),
  });

  const features = ((json?.features ?? []) as Feature[]).filter((feature) => {
    const name = feature.properties.name;
    return Boolean(name) && (!keyword || keyword.test(name as string));
  });

  const leads = features.map((feature) => {
    const p = feature.properties;
    const raw = (p.datasource?.raw ?? {}) as Record<string, string>;
    const name = p.name as string;
    const phone = p.contact?.phone || raw.phone || raw["contact:phone"] || null;
    const email = p.contact?.email || raw.email || raw["contact:email"] || null;
    let website = p.website || raw.website || raw["contact:website"] || null;
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    const city = p.city || null;
    const state = p.state_code || p.state || null;
    const category =
      (raw.amenity || raw.shop || raw.office || raw.craft || raw.healthcare || raw.leisure || raw.tourism || "")
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase()) || null;
    const lat = p.lat ?? null;
    const lon = p.lon ?? null;

    return {
      name,
      company: name,
      email,
      phone,
      phone_numbers: phone ? String(phone).split(/;\s*/) : [],
      email_addresses: email ? [email] : [],
      website,
      industry: criteria.industry || category,
      category,
      location: [city, state].filter(Boolean).join(", ") || criteria.location,
      address: p.address_line2 || p.formatted || null,
      city,
      state,
      country: p.country || null,
      rating: null,
      review_count: null,
      latitude: lat,
      longitude: lon,
      facebook_url: raw["contact:facebook"] || null,
      instagram_url: raw["contact:instagram"] || null,
      linkedin_url: raw["contact:linkedin"] || null,
      google_maps_url:
        lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lon}`)}` : null,
      source: "geoapify",
      source_id: p.place_id ? `geoapify:${p.place_id}` : null,
      status: "new",
      notes: null,
      raw_data: {
        provider: "geoapify",
        categories: p.categories ?? [],
        opening_hours: raw.opening_hours ?? null,
        search_offer: criteria.offer,
        search_ideal_client: criteria.idealClient,
        search_location: criteria.location,
        attribution: "Powered by Geoapify · © OpenStreetMap contributors",
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
