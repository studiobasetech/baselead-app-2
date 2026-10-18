import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanName } from "@/lib/plans";

/*
 * Minimal Stripe client using the REST API directly (no extra package).
 *
 * Required in .env.local:
 *   STRIPE_SECRET_KEY=sk_test_...           (or sk_live_...)
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *   STRIPE_PRICE_STARTER_MONTHLY=price_...
 *   STRIPE_PRICE_STARTER_YEARLY=price_...
 *   STRIPE_PRICE_PRO_MONTHLY=price_...
 *   STRIPE_PRICE_PRO_YEARLY=price_...
 *   STRIPE_PRICE_SCALE_MONTHLY=price_...
 *   STRIPE_PRICE_SCALE_YEARLY=price_...
 */

export type BillingCycle = "monthly" | "yearly";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function priceIdFor(plan: PlanName, cycle: BillingCycle) {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[key] || null;
}

/** Reverse lookup: which plan/cycle a Stripe price belongs to. */
export function planForPriceId(
  priceId: string | null | undefined
): { plan: PlanName; cycle: BillingCycle } | null {
  if (!priceId) return null;

  for (const plan of ["Starter", "Pro", "Scale"] as PlanName[]) {
    for (const cycle of ["monthly", "yearly"] as BillingCycle[]) {
      if (priceIdFor(plan, cycle) === priceId) return { plan, cycle };
    }
  }

  return null;
}

function encode(params: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    const name = prefix ? `${prefix}[${key}]` : key;

    if (typeof value === "object") {
      parts.push(...encode(value as Record<string, unknown>, name));
    } else {
      parts.push(
        `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`
      );
    }
  }

  return parts;
}

export async function stripeRequest<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const body = encode(params).join("&");
  const url =
    method === "GET" && body
      ? `https://api.stripe.com/v1/${path}?${body}`
      : `https://api.stripe.com/v1/${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || "Stripe request failed.");
  }

  return json as T;
}

/** Verifies the Stripe-Signature header of a webhook. */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300
) {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [k, ...v] = part.split("=");
      return [k, v.join("=")];
    })
  );

  const timestamp = Number(parts.t);
  const signatures = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return signatures.some((signature) => {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export function appUrl(request: Request) {
  return (
    process.env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin
  );
}
