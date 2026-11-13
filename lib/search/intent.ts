/*
 * Understands what the user typed as their ideal client:
 * "expensive doctors with no websites" →
 *   { businessType: "doctors", website: "none", premium: true }
 * Pure functions (no server imports) so the search page can show
 * the same understanding instantly while the person types.
 */

export type WebsiteFilter = "any" | "none" | "has";

export type ClientIntent = {
  /** Only the kind of business, used to pick map categories. */
  businessType: string;
  website: WebsiteFilter;
  /** High-end / expensive / luxury. */
  premium: boolean;
  /** No national chains or franchises. */
  independentOnly: boolean;
};

const SITE = "(?:web\\s?-?sites?|websit\\w*|wob\\s?sites?|web\\s?pages?|web\\s?page|sites?|online\\s+presence|p[aá]ginas?\\s*(?:web)?|sitios?\\s*(?:web)?|web)";

const NO_WEBSITE = new RegExp(
  `\\b(?:no|without|w/o|lacking|missing|need(?:ing|s)?\\s+an?|(?:that|who|which)\\s+(?:don'?t|do\\s+not|doesn'?t|does\\s+not)\\s+have(?:\\s+an?)?|(?:don'?t|doesn'?t)\\s+have(?:\\s+an?)?|with\\s+no|with\\s+o|sin|que\\s+no\\s+tienen?)\\s+(?:an?\\s+|un\\s+|una\\s+)?${SITE}`,
  "i"
);
const NO_WEBSITE_SHORT = /\b(?:websiteless|no-website|sin\s+web)\b/i;
const HAS_WEBSITE = new RegExp(
  `\\b(?:with|that\\s+have|who\\s+have|having|con|que\\s+tienen?)\\s+(?:an?\\s+|un\\s+|una\\s+)?(?:old|outdated|bad|slow|existing|current|vieja|viejo)?\\s*${SITE}`,
  "i"
);
const PREMIUM =
  /\b(?:expensive|high[\s-]?end|luxury|luxurious|upscale|premium|exclusive|boutique|top[\s-]?tier|elite|wealthy|rich|high[\s-]?ticket|high[\s-]?income|fancy|caros?|caras?|de\s+lujo|lujosos?|exclusivos?|alta\s+gama)\b/i;
const INDEPENDENT =
  /\b(?:independent|independently[\s-]owned|family[\s-]owned|privately[\s-]owned|no\s+chains?|not\s+(?:a\s+)?chains?|non[\s-]?chain|no\s+franchises?|independientes?|familiares?)\b/i;

function cleanType(text: string) {
  return text
    .replace(new RegExp(NO_WEBSITE.source, "gi"), " ")
    .replace(new RegExp(NO_WEBSITE_SHORT.source, "gi"), " ")
    .replace(new RegExp(HAS_WEBSITE.source, "gi"), " ")
    .replace(new RegExp(PREMIUM.source, "gi"), " ")
    .replace(new RegExp(INDEPENDENT.source, "gi"), " ")
    // Leftover joining words at the end ("doctors that", "clinics with").
    .replace(/\b(?:that|who|which|with|and|y|que|con|de|in|en)\s*$/gi, " ")
    .replace(/^\s*(?:and|y|the|los|las|el|la)\s+/i, "")
    .replace(/[,.;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Instant understanding with simple rules (also used before AI refines it). */
export function quickIntent(text: string): ClientIntent {
  const value = (text || "").trim();
  const none = NO_WEBSITE.test(value) || NO_WEBSITE_SHORT.test(value);
  const has = !none && HAS_WEBSITE.test(value);
  const businessType = cleanType(value) || value;
  return {
    businessType,
    website: none ? "none" : has ? "has" : "any",
    premium: PREMIUM.test(value),
    independentOnly: INDEPENDENT.test(value),
  };
}

export function isWebsiteFilter(value: unknown): value is WebsiteFilter {
  return value === "any" || value === "none" || value === "has";
}

/** One line for people: "Doctors · No website listed · High-end first". */
export function describeIntent(intent: ClientIntent) {
  const parts = [intent.businessType ? intent.businessType.replace(/^\w/, (c) => c.toUpperCase()) : "Businesses"];
  if (intent.website === "none") parts.push("No website listed");
  if (intent.website === "has") parts.push("Has a website");
  if (intent.premium) parts.push("High-end first");
  if (intent.independentOnly || intent.premium) parts.push("No chains");
  return parts.join(" · ");
}
