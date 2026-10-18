import { stripeRequest, isStripeConfigured } from "@/lib/stripe";

/*
 * Discount codes.
 * - "Free plan" codes give any plan for free (no payment, no Stripe).
 *   Set FREE_PLAN_CODES="CODE1,CODE2" in .env.local to change them.
 * - Any other code is looked up as a Stripe promotion code.
 * Codes are only checked on the server, never shipped to the browser.
 */

const DEFAULT_FREE_CODES = ["FREEPLAN1295"];

export function normalizeCode(code: unknown) {
  return String(code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isFreePlanCode(code: string) {
  const list = (process.env.FREE_PLAN_CODES || DEFAULT_FREE_CODES.join(","))
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);

  return list.includes(normalizeCode(code));
}

type StripePromotionCode = {
  id: string;
  code: string;
  active: boolean;
  coupon?: {
    percent_off?: number | null;
    amount_off?: number | null;
    currency?: string | null;
    duration?: string;
    duration_in_months?: number | null;
  };
};

/** Finds an active Stripe promotion code and describes it. */
export async function findStripePromotion(code: string) {
  if (!isStripeConfigured()) return null;

  const result = await stripeRequest<{ data: StripePromotionCode[] }>(
    "GET",
    "promotion_codes",
    { code: normalizeCode(code), active: "true", limit: 1 }
  ).catch(() => ({ data: [] as StripePromotionCode[] }));

  const promo = result.data?.[0];
  if (!promo) return null;

  const coupon = promo.coupon ?? {};
  const amount = coupon.percent_off
    ? `${coupon.percent_off}% off`
    : coupon.amount_off
      ? `$${(coupon.amount_off / 100).toFixed(2)} off`
      : "Discount";

  const duration =
    coupon.duration === "forever"
      ? "forever"
      : coupon.duration === "repeating" && coupon.duration_in_months
        ? `for ${coupon.duration_in_months} months`
        : "first payment";

  return { id: promo.id, label: `${amount} ${duration}` };
}
