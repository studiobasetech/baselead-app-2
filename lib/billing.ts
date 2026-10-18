import { createAdminClient } from "@/lib/supabase/admin";
import { planForPriceId, stripeRequest } from "@/lib/stripe";

type StripeSubscription = {
  id: string;
  status: string;
  customer: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: {
    data?: {
      price?: { id?: string };
      current_period_end?: number;
    }[];
  };
};

/** Maps a Stripe subscription status to BaseLead's billing_status. */
function toBillingStatus(status: string) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  if (status === "unpaid" || status === "incomplete_expired") return "unpaid";
  if (status === "canceled") return "canceled";
  return "past_due";
}

/**
 * Writes a Stripe subscription onto the company's row.
 * This is the ONLY place a paid plan gets applied.
 */
export async function applySubscription(
  subscriptionOrId: string | StripeSubscription,
  companyIdHint?: string | null
) {
  const subscription =
    typeof subscriptionOrId === "string"
      ? await stripeRequest<StripeSubscription>(
          "GET",
          `subscriptions/${subscriptionOrId}`
        )
      : subscriptionOrId;

  const item = subscription.items?.data?.[0];
  const mapped = planForPriceId(item?.price?.id);
  const companyId = subscription.metadata?.company_id || companyIdHint;

  if (!companyId) {
    throw new Error("Subscription is not linked to a BaseLead workspace.");
  }

  const periodEnd =
    subscription.current_period_end ?? item?.current_period_end ?? null;

  const update: Record<string, unknown> = {
    billing_status: toBillingStatus(subscription.status),
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  };

  if (mapped) {
    update.plan = mapped.plan;
    update.billing_cycle = mapped.cycle;
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("company_profiles")
    .update(update)
    .eq("id", companyId);

  if (error) throw new Error(error.message);

  return { companyId, ...update };
}
