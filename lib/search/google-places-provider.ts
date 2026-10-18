import type { PotentialLead, SearchCriteria } from "./types";

/*
 * Real business data from the Google Places API (New).
 * Requires GOOGLE_PLACES_API_KEY in .env.local
 * (Google Cloud → enable "Places API (New)" → create an API key).
 */

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
};

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.googleMapsUri",
  "places.location",
  "places.businessStatus",
  "nextPageToken",
].join(",");

export function isPlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

function component(place: Place, type: string, short = false) {
  const match = place.addressComponents?.find((c) => c.types?.includes(type));
  return (short ? match?.shortText : match?.longText) || null;
}

function buildQuery(criteria: SearchCriteria) {
  const what = [criteria.industry, criteria.idealClient]
    .filter(Boolean)
    .join(" ")
    .trim();

  return `${what || "businesses"} in ${criteria.location}`;
}

export async function searchGooglePlaces(
  criteria: SearchCriteria
): Promise<PotentialLead[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not configured.");

  const wanted = Math.min(Math.max(criteria.leads ?? 20, 1), 60);
  const places: Place[] = [];
  let pageToken: string | undefined;

  // Google returns up to 20 per page and 60 per query.
  do {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": FIELDS,
        },
        body: JSON.stringify({
          textQuery: buildQuery(criteria),
          pageSize: 20,
          pageToken,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    const json = await response.json();

    if (!response.ok) {
      throw new Error(
        `Google Places error: ${json?.error?.message || response.status}`
      );
    }

    places.push(...((json.places as Place[]) ?? []));
    pageToken = json.nextPageToken;

    // Google needs a short pause before a page token becomes valid.
    if (pageToken && places.length < wanted) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } while (pageToken && places.length < wanted);

  return places.slice(0, wanted).map((place) => {
    const city =
      component(place, "locality") ||
      component(place, "postal_town") ||
      component(place, "administrative_area_level_2");
    const state = component(place, "administrative_area_level_1");
    const country = component(place, "country");
    const company = place.displayName?.text || "Unknown business";
    const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;

    return {
      name: company,
      company,
      email: null,
      phone,
      phone_numbers: phone ? [phone] : [],
      email_addresses: [],
      website: place.websiteUri || null,
      industry:
        criteria.industry || place.primaryTypeDisplayName?.text || null,
      category: place.primaryTypeDisplayName?.text || null,
      location: [city, state].filter(Boolean).join(", ") || place.formattedAddress || criteria.location,
      address: place.formattedAddress || null,
      city,
      state,
      country,
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      google_maps_url: place.googleMapsUri || null,
      source: "google_places",
      source_id: `google:${place.id}`,
      status: "new",
      notes: null,
      raw_data: {
        provider: "google_places",
        place_id: place.id,
        types: place.types ?? [],
        business_status: place.businessStatus ?? null,
        search_offer: criteria.offer,
        search_ideal_client: criteria.idealClient,
        search_location: criteria.location,
      },
    } satisfies PotentialLead;
  });
}
