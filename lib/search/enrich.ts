/*
 * Website enrichment: visits the business website and collects
 * public emails and social profile links.
 */

export type Enrichment = {
  emails: string[];
  phones: string[];
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  tiktok_url: string | null;
  pinterest_url: string | null;
  has_ssl: boolean;
  reachable: boolean;
};

const EMPTY: Enrichment = {
  emails: [],
  phones: [],
  instagram_url: null,
  facebook_url: null,
  linkedin_url: null,
  x_url: null,
  tiktok_url: null,
  pinterest_url: null,
  has_ssl: false,
  reachable: false,
};

const SOCIAL_PATTERNS: [keyof Enrichment, RegExp][] = [
  ["instagram_url", /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|reel\/|explore\/)[A-Za-z0-9_.\-]+/i],
  ["facebook_url", /https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)[A-Za-z0-9_.\-/]+/i],
  ["linkedin_url", /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_.\-%]+/i],
  ["x_url", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!share|intent)[A-Za-z0-9_]+/i],
  ["tiktok_url", /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.\-]+/i],
  ["pinterest_url", /https?:\/\/(?:[a-z]{2,3}\.)?pinterest\.[a-z.]+\/(?!pin\/)[A-Za-z0-9_\-]+/i],
];

const IGNORED_EMAIL =
  /(example\.|sentry|wixpress|\.png|\.jpg|\.jpeg|\.webp|\.gif|\.svg|@2x|domain\.com|yourdomain|email\.com|yourname|name@|user@|test@|noreply|no-reply|godaddy|squarespace|wordpress|shopify)/i;

// Looks like a normal browser so fewer sites block the visit.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 BaseLead/1.0",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
};

async function getPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (type && !type.includes("html")) return null;
    return { html: (await response.text()).slice(0, 600000), finalUrl: response.url };
  } catch {
    return null;
  }
}

// Emails hidden by Cloudflare ("[email protected]") are stored encoded.
function decodeCfEmail(hex: string) {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  } catch {
    return "";
  }
}

function cleanPhone(value: string) {
  const trimmed = decodeURIComponent(value).replace(/[^\d+()\-.\s]/g, "").trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? trimmed : null;
}

function extract(html: string, emails: Set<string>, phones: Set<string>) {
  for (const match of html.matchAll(/mailto:([^"'?>\s]+)/gi)) emails.add(decodeURIComponent(match[1]).toLowerCase());
  for (const match of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) emails.add(decodeCfEmail(match[1]).toLowerCase());
  for (const match of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) emails.add(decodeCfEmail(match[1]).toLowerCase());
  // Visible text only (skip scripts/styles) for plain emails.
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  for (const match of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) emails.add(match[0].toLowerCase());

  for (const match of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const phone = cleanPhone(match[1]);
    if (phone) phones.add(phone);
  }
  // Business details many sites publish for Google (JSON-LD).
  for (const match of html.matchAll(/"telephone"\s*:\s*"([^"]+)"/gi)) {
    const phone = cleanPhone(match[1]);
    if (phone) phones.add(phone);
  }
  for (const match of html.matchAll(/"email"\s*:\s*"(?:mailto:)?([^"]+@[^"]+)"/gi)) emails.add(match[1].toLowerCase());
}

// Finds the site's contact/about pages to look for more details.
function contactLinks(html: string, base: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = match[1];
    if (!/contact|contacto|contactanos|about|nosotros|acerca|location|ubicacion|team|equipo/i.test(href)) continue;
    if (/\.(pdf|jpg|png|zip)$/i.test(href) || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const url = new URL(href, base);
      if (url.hostname === new URL(base).hostname) links.add(url.toString());
    } catch {
      // ignore bad links
    }
  }
  // Contact pages first.
  return [...links].sort((a, b) => Number(/contact/i.test(b)) - Number(/contact/i.test(a))).slice(0, 2);
}

export async function enrichWebsite(url: string | null): Promise<Enrichment> {
  if (!url) return EMPTY;

  const home = await getPage(url);
  if (!home) return { ...EMPTY, has_ssl: url.startsWith("https") };

  const result: Enrichment = {
    ...EMPTY,
    reachable: true,
    has_ssl: home.finalUrl.startsWith("https"),
  };

  const emails = new Set<string>();
  const phones = new Set<string>();
  extract(home.html, emails, phones);
  let combined = home.html;

  // Not enough on the home page: check the contact / about pages too.
  if (emails.size === 0 || phones.size === 0) {
    const pages = await Promise.all(contactLinks(home.html, home.finalUrl).map(getPage));
    for (const page of pages) {
      if (!page) continue;
      extract(page.html, emails, phones);
      combined += page.html;
    }
  }

  const siteHost = new URL(home.finalUrl).hostname.replace(/^www\./, "");
  result.emails = [...emails]
    .filter((e) => e.includes("@") && !IGNORED_EMAIL.test(e) && e.length < 80)
    // Emails on the business's own domain first.
    .sort((a, b) => Number(b.endsWith(siteHost)) - Number(a.endsWith(siteHost)))
    .slice(0, 5);
  result.phones = [...phones].slice(0, 3);

  for (const [field, pattern] of SOCIAL_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      (result as Record<string, unknown>)[field] = match[0].replace(/[/"']+$/, "");
    }
  }

  return result;
}

/** Runs async work over items with limited concurrency. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));

  return results;
}
