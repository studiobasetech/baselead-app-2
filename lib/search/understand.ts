import { askAiJson, isAiConfigured } from "@/lib/ai";
import { isWebsiteFilter, quickIntent, type ClientIntent } from "./intent";

/**
 * Rules first, then AI (when configured) to fix typos and odd phrasing:
 * "expensive doctores with o wobsites" → doctors, no website, premium.
 */
export async function understandIdealClient(idealClient: string, offer?: string): Promise<ClientIntent> {
  const quick = quickIntent(idealClient);
  if (!isAiConfigured() || !idealClient.trim()) return quick;

  try {
    const ai = await askAiJson<Partial<ClientIntent>>(
      `A salesperson typed who their ideal client is: "${idealClient}"${offer ? `. They sell: "${offer}"` : ""}.
It may have typos or be in Spanish. Return JSON only:
{"businessType": "the kind of business only, in plain English plural, no adjectives about price or website (e.g. \\"doctors\\", \\"dental clinics\\", \\"roofing contractors\\")",
 "website": "none" if they want businesses WITHOUT a website, "has" if they want businesses WITH a website, otherwise "any",
 "premium": true if they want expensive / high-end / luxury businesses,
 "independentOnly": true if they want independent or family-owned businesses (no chains)}`,
      { maxTokens: 200 }
    );
    const businessType = typeof ai?.businessType === "string" && ai.businessType.trim().length > 1 ? ai.businessType.trim().slice(0, 80) : quick.businessType;
    return {
      businessType,
      // Rules win when they found something clear; AI fills the gaps.
      website: quick.website !== "any" ? quick.website : isWebsiteFilter(ai?.website) ? ai.website : "any",
      premium: quick.premium || ai?.premium === true,
      independentOnly: quick.independentOnly || ai?.independentOnly === true,
    };
  } catch {
    return quick;
  }
}
