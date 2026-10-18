/*
 * Website enrichment: visits the business website and collects
 * public emails and social profile links.
 */

export type Enrichment = {
  emails: string[];
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
  ["instagram_url", /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-]+/i],
  ["facebook_url", /https?:\/\/(?:www\.|m\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/i],
  ["linkedin_url", /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_.\-%]+/i],
  ["x_url", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i],
  ["tiktok_url", /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.\-]+/i],
  ["pinterest_url", /https?:\/\/(?:[a-z]{2,3}\.)?pinterest\.[a-z.]+\/[A-Za-z0-9_\-]+/i],
];

const IGNORED_EMAIL = /(example\.|sentry|wixpress|\.png|\.jpg|\.webp|\.gif|@2x|domain\.com|yourdomain|email\.com)/i;

export async function enrichWebsite(url: string | null): Promise<Enrichment> {
  if (!url) return EMPTY;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BaseLeadBot/1.0; +https://baselead.app)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return { ...EMPTY, has_ssl: url.startsWith("https") };

    const html = (await response.text()).slice(0, 400000);
    const result: Enrichment = {
      ...EMPTY,
      reachable: true,
      has_ssl: response.url.startsWith("https"),
    };

    const emails = new Set<string>();

    for (const match of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
      emails.add(decodeURIComponent(match[1]).toLowerCase());
    }

    for (const match of html.matchAll(
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
    )) {
      emails.add(match[0].toLowerCase());
    }

    result.emails = [...emails].filter((e) => !IGNORED_EMAIL.test(e)).slice(0, 5);

    for (const [field, pattern] of SOCIAL_PATTERNS) {
      const match = html.match(pattern);
      if (match) {
        (result as Record<string, unknown>)[field] = match[0].replace(/[/"']+$/, "");
      }
    }

    return result;
  } catch {
    return EMPTY;
  }
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
