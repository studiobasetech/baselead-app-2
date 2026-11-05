import { askAiJson, isAiConfigured } from "@/lib/ai";
import { contactLinks, getPage, pageText } from "@/lib/search/enrich";

/*
 * Free decision-maker finder: reads the business's own website
 * (About / Team / Contact pages) and uses AI to pick out the owner,
 * founder, manager or lead doctor. Only people whose name actually
 * appears on the site are kept (no guessing).
 */

export type WebsitePerson = {
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
};

const LEADER =
  /owner|founder|co-?founder|ceo|president|principal|partner|director|manager|gerente|dueñ|fundador|director|socio|broker|dds|dmd|md\b|doctor|dr\.|lead|head|vp|chief|administrator|propietari/i;

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9@.+]/g, "");
}

/** Up to 3 pages of website text for one business. */
export async function collectPeopleText(website: string | null) {
  if (!website) return "";
  const home = await getPage(website);
  if (!home) return "";
  const links = contactLinks(home.html, home.finalUrl);
  const wanted = [
    links.find((link) => /team|staff|leadership|doctor|dentist|meet|founder|owner|equipo|quienes/i.test(link)),
    links.find((link) => /about|nosotros|acerca|our-story/i.test(link)),
  ].filter(Boolean) as string[];
  const pages = await Promise.all([...new Set(wanted)].slice(0, 2).map(getPage));
  return [pageText(home.html, 2500), ...pages.map((page) => (page ? pageText(page.html, 3500) : ""))]
    .join("\n")
    .slice(0, 7000);
}

/**
 * Finds decision makers for several businesses in one AI call.
 * Returns one list per input (same order).
 */
export async function extractDecisionMakers(
  items: { company: string; text: string }[]
): Promise<WebsitePerson[][]> {
  const results: WebsitePerson[][] = items.map(() => []);
  if (!isAiConfigured()) return results;

  const usable = items.map((item, index) => ({ ...item, index })).filter((item) => item.text.length > 80);

  // Small batches, run at the same time, keep each AI request fast.
  const batches: (typeof usable)[] = [];
  for (let start = 0; start < usable.length; start += 5) batches.push(usable.slice(start, start + 5));

  await Promise.all(batches.map(async (batch) => {
    try {
      const answer = await askAiJson<{ index: number; people: WebsitePerson[] }[]>(
        `For each business below, list the decision makers named in its website text: owners, founders, partners, CEOs, presidents, directors, managers, or the lead doctor/dentist. Use ONLY names written in the text. Do not invent anyone. Include their email or direct phone only if the text shows it next to that person. Max 3 people per business. If none are named, return an empty list.
Reply with JSON only: [{"index":0,"people":[{"name":"","title":"","email":null,"phone":null}]}]

${batch.map((item) => `### ${item.index}. ${item.company}\n${item.text}`).join("\n\n")}`,
        { maxTokens: 1500, system: "You extract facts from text. Never invent people, emails or phone numbers." }
      );

      for (const entry of answer ?? []) {
        const source = items[entry.index];
        if (!source) continue;
        const text = normalize(source.text);
        results[entry.index] = (entry.people ?? [])
          .filter((person) => person?.name && text.includes(normalize(person.name)))
          .filter((person) => !person.title || LEADER.test(person.title) || /^dr\.?\s/i.test(person.name))
          .map((person) => ({
            name: person.name.trim(),
            title: person.title?.trim() || null,
            email: person.email && text.includes(normalize(person.email)) ? person.email.toLowerCase() : null,
            phone:
              person.phone && text.includes(person.phone.replace(/\D/g, "").slice(-7)) ? person.phone.trim() : null,
          }))
          .slice(0, 3);
      }
    } catch (error) {
      console.warn("Decision-maker extraction skipped:", error);
    }
  }));

  return results;
}
