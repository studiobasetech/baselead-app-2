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
  /** Plain text of the About/Team pages, used to find decision makers. */
  peopleText: string;
  /** Online booking / scheduling on the site (Calendly, Vagaro, "Book now"...). */
  has_booking: boolean;
  /** Live chat or chatbot on the site. */
  has_chat: boolean;
  /** The business's own logo/icon from its website. */
  logo_url: string | null;
  /** The site blocked our visit (bot protection), so we know nothing about it. */
  blocked?: boolean;
};

const EMPTY: Enrichment = {
  peopleText: "",
  has_booking: false,
  has_chat: false,
  logo_url: null,
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

const blockedUrls = new Set<string>();

export async function getPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    // Bot protection (Cloudflare etc.): the site works, it just won't show us the page.
    if ([401, 403, 406, 429, 503].includes(response.status)) {
      blockedUrls.add(url);
      return null;
    }
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
/** Visible text of a page (no menus' code, scripts or styles), trimmed. */
export function pageText(html: string, max = 5000) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Best logo the site publishes: JSON-LD logo, Apple icon, big icon, or an og:image named "logo". */
function findLogo(html: string, base: string) {
  const candidates: string[] = [];
  const ld = html.match(/"logo"\s*:\s*(?:\{[^}]*?"url"\s*:\s*)?"([^"]+\.(?:png|jpe?g|svg|webp)[^"]*)"/i);
  if (ld) candidates.push(ld[1]);
  // The logo image in the site's header (class, id, alt or file name says "logo").
  for (const match of html.slice(0, 120000).matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    if (!/logo/i.test(tag)) continue;
    const src =
      tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ||
      tag.match(/data-(?:lazy-)?src=["']([^"']+)["']/i)?.[1] ||
      tag.match(/srcset=["']([^"'\s,]+)/i)?.[1];
    if (src && !src.startsWith("data:") && !/sprite|placeholder|loading/i.test(src)) {
      candidates.push(src);
      break;
    }
  }
  for (const match of html.matchAll(/<link[^>]+>/gi)) {
    const tag = match[0];
    if (!/rel=["'][^"']*(apple-touch-icon|icon)[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const size = Number(tag.match(/sizes=["'](\d+)x/i)?.[1] ?? 0);
    if (/apple-touch-icon/i.test(tag) || size >= 96 || (!size && /\.(png|svg)(\?|$)/i.test(href))) candidates.push(href);
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (og && /logo/i.test(og)) candidates.push(og);
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.replace(/\\\//g, "/"), base);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // skip bad URLs
    }
  }
  return null;
}

export function contactLinks(html: string, base: string, limit = 2) {
  const links = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = match[1];
    if (!/contact|contacto|contactanos|about|nosotros|acerca|location|ubicacion|team|equipo|staff|leadership|doctor|dentist|meet|our-story|founder|owner|quienes/i.test(href)) continue;
    if (/\.(pdf|jpg|png|zip)$/i.test(href) || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const url = new URL(href, base);
      if (url.hostname === new URL(base).hostname) links.add(url.toString());
    } catch {
      // ignore bad links
    }
  }
  // Contact pages first.
  return [...links].slice(0, 12);
}

export async function enrichWebsite(url: string | null): Promise<Enrichment> {
  if (!url) return EMPTY;

  const home = await getPage(url);
  if (!home) {
    // Blocked by bot protection ≠ broken website: don't report it as "not loading".
    if (blockedUrls.has(url)) {
      blockedUrls.delete(url);
      return { ...EMPTY, reachable: true, has_ssl: url.startsWith("https"), blocked: true };
    }
    return { ...EMPTY, has_ssl: url.startsWith("https") };
  }

  const result: Enrichment = {
    ...EMPTY,
    reachable: true,
    has_ssl: home.finalUrl.startsWith("https"),
  };

  const emails = new Set<string>();
  const phones = new Set<string>();
  extract(home.html, emails, phones);
  let combined = home.html;

  // Check one Contact page and one About/Team page (who runs the business).
  const links = contactLinks(home.html, home.finalUrl);
  const contactPage = links.find((link) => /contact|contacto/i.test(link));
  const peoplePage =
    links.find((link) => /team|staff|leadership|doctor|dentist|meet|founder|owner|equipo|quienes/i.test(link)) ||
    links.find((link) => /about|nosotros|acerca|our-story/i.test(link));
  const extra = [...new Set([emails.size === 0 || phones.size === 0 ? contactPage : null, peoplePage].filter(Boolean) as string[])];
  const pages = await Promise.all(extra.map(getPage));
  pages.forEach((page, index) => {
    if (!page) return;
    extract(page.html, emails, phones);
    combined += page.html;
    if (extra[index] === peoplePage) result.peopleText = pageText(page.html);
  });
  // Small sites put the owner on the home page.
  if (!result.peopleText) result.peopleText = pageText(home.html);

  result.logo_url = findLogo(home.html, home.finalUrl);

  const siteHost = new URL(home.finalUrl).hostname.replace(/^www\./, "");
  result.emails = [...emails]
    .filter((e) => e.includes("@") && !IGNORED_EMAIL.test(e) && e.length < 80)
    // Emails on the business's own domain first.
    .sort((a, b) => Number(b.endsWith(siteHost)) - Number(a.endsWith(siteHost)))
    .slice(0, 5);
  result.phones = [...phones].slice(0, 3);

  result.has_booking =
    /calendly\.com|acuityscheduling|vagaro\.com|booksy\.com|squareup\.com\/appointments|schedulicity|mindbodyonline|zocdoc|setmore|simplybook|fresha\.com|glossgenius|book online|book now|book an appointment|schedule (an |your )?appointment|request an appointment|agenda tu cita|agendar cita|reserva(r)? (tu )?cita/i.test(
      combined
    );
  result.has_chat =
    /intercom|tawk\.to|drift\.com|livechatinc|zendesk|crisp\.chat|tidio|hubspot.*(conversations|messages)|podium|birdeye|chatbot|wa\.me\/|whatsapp/i.test(combined);

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
