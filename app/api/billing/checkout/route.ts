import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { isPlanName } from "@/lib/plans";
import {
  appUrl,
  isStripeConfigured,
  priceIdFor,
  stripeRequest,
  type BillingCycle,
} from "@/lib/stripe";

// Starts a Stripe Checkout for the chosen plan.
export async function POST(request: Request) {
  const { plan, cycle } = (await request.json().catch(() => ({}))) as {
    plan?: string;
    cycle?: BillingCycle;
  };

  if (!isPlanName(plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const billingCycle: BillingCycle = cycle === "yearly" ? "yearly" : "monthly";

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.isOwner) {
    return NextResponse.json(
      { error: "Only the workspace owner can change the subscription." },
      { status: 403 }
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        code: "STRIPE_NOT_CONFIGURED",
        error:
          "Payments are not connected yet. Add your Stripe keys to enable subscriptions.",
      },
      { status: 503 }
    );
  }

  const price = priceIdFor(plan, billingCycle);

  if (!price) {
    return NextResponse.json(
      {
        error: `Stripe price for ${plan} (${billingCycle}) is not configured.`,
      },
      { status: 503 }
    );
  }

  const { data: company } = await supabase
    .from("company_profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", access.company.id)
    .maybeSingle();

  const base = appUrl(request);

  try {
    // Already subscribed: send them to the Stripe portal to switch plans.
    if (company?.stripe_subscription_id && company?.stripe_customer_id) {
      const portal = await stripeRequest<{ url: string }>(
        "POST",
        "billing_portal/sessions",
        {
          customer: company.stripe_customer_id,
          return_url: `${base}/settings?section=billing`,
        }
      );

      return NextResponse.json({ url: portal.url });
    }

    const session = await stripeRequest<{ url: string }>(
      "POST",
      "checkout/sessions",
      {
        mode: "subscription",
        client_reference_id: access.company.id,
        customer: company?.stripe_customer_id || undefined,
        customer_email: company?.stripe_customer_id
          ? undefined
          : access.user.email,
        line_items: { 0: { price, quantity: 1 } },
        allow_promotion_codes: "true",
        metadata: { company_id: access.company.id, plan },
        subscription_data: {
          metadata: { company_id: access.company.id, plan },
        },
        success_url: `${base}/api/billing/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/settings?section=billing&checkout=cancelled`,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not start checkout.",
      },
      { status: 500 }
    );
  }
}
