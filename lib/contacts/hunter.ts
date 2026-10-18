/*
 * Decision-maker contacts via Hunter.io (domain search).
 * Add HUNTER_API_KEY to .env.local (hunter.io → API).
 */

export type FoundContact = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  seniority: string | null;
  department: string | null;
  email: string;
  email_confidence: number | null;
  phone: string | null;
  linkedin_url: string | null;
};

export function isContactsConfigured() {
  return Boolean(process.env.HUNTER_API_KEY);
}

export function domainFromWebsite(website: string | null | undefined) {
  if (!website) return null;

  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    const host = url.hostname.replace(/^www\./, "");
    // Social / directory pages are not the company's domain.
    if (/(facebook|instagram|linktr\.ee|yelp|google|wix|squarespace)\./.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

const DECISION_WORDS =
  /(owner|founder|co-?founder|ceo|chief|president|partner|principal|director|head|vp|vice president|general manager|gm|manager|marketing|operations|propietari|dueñ|fundador|gerente|director)/i;

/** Higher = more likely to be the person who decides. */
export function decisionScore(contact: Pick<FoundContact, "title" | "seniority">) {
  let score = 0;
  if (contact.seniority === "executive") score += 50;
  else if (contact.seniority === "senior") score += 25;

  const title = contact.title ?? "";
  if (/(owner|founder|ceo|president|propietari|dueñ|fundador)/i.test(title)) score += 40;
  else if (/(chief|partner|principal|vp|vice president|director|head)/i.test(title)) score += 30;
  else if (DECISION_WORDS.test(title)) score += 15;

  return score;
}

export async function findContactsForDomain(domain: string): Promise<FoundContact[]> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) throw new Error("HUNTER_API_KEY is not configured.");

  const response = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&type=personal&api_key=${key}`,
    { signal: AbortSignal.timeout(15000) }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.errors?.[0]?.details || "Contact search failed.");
  }

  const emails = (json?.data?.emails ?? []) as {
    value: string;
    confidence?: number;
    first_name?: string | null;
    last_name?: string | null;
    position?: string | null;
    seniority?: string | null;
    department?: string | null;
    linkedin?: string | null;
    phone_number?: string | null;
  }[];

  return emails
    .filter((item) => item.value)
    .map((item) => ({
      full_name: [item.first_name, item.last_name].filter(Boolean).join(" ") || null,
      first_name: item.first_name ?? null,
      last_name: item.last_name ?? null,
      title: item.position ?? null,
      seniority: item.seniority ?? null,
      department: item.department ?? null,
      email: item.value.toLowerCase(),
      email_confidence: item.confidence ?? null,
      phone: item.phone_number ?? null,
      linkedin_url: item.linkedin
        ? item.linkedin.startsWith("http")
          ? item.linkedin
          : `https://www.linkedin.com/in/${item.linkedin}`
        : null,
    }))
    .sort((a, b) => decisionScore(b) - decisionScore(a) || (b.email_confidence ?? 0) - (a.email_confidence ?? 0));
}

/** Generic inboxes we replace with a person when one is found. */
export function isGenericEmail(email: string | null | undefined) {
  if (!email) return true;
  return /^(info|contact|contacto|hello|hola|admin|office|sales|ventas|support|soporte|team|mail|enquiries|inquiries|booking|reservations)@/i.test(email);
}
