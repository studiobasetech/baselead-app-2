import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, isStripeConfigured, stripeRequest } from "@/lib/stripe";
import { PHONE_ADDONS, isPhoneAddonKind } from "@/lib/plans";
import { phoneRoute } from "../_shared";

// Managers: the company's phone add-ons and the ones it can buy.
export async function GET() {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can manage add-ons." }, { status: 403 });

  const available = Object.values(PHONE_ADDONS).filter((addon) => addon.plans.includes(phone.access.plan));
  return NextResponse.json({
    plan: phone.access.plan,
    paidAndActive: phone.paidAndActive,
    addons: phone.allowance.addons,
    available,
  });
}

// Buy an add-on: a monthly Stripe subscription. Body: { kind, quantity? }
export async function POST(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can buy add-ons." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { kind?: string; quantity?: number };
  if (!isPhoneAddonKind(body.kind)) return NextResponse.json({ error: "Unknown add-on." }, { status: 400 });
  const addon = PHONE_ADDONS[body.kind];
  const quantity = Math.min(20, Math.max(1, Math.round(Number(body.quantity) || 1)));

  if (!phone.paidAndActive) {
    return NextResponse.json({ code: "TRIAL", error: "Calling add-ons are available once your subscription is active (not during the free trial)." }, { status: 403 });
  }
  if (!addon.plans.includes(phone.access.plan)) {
    return NextResponse.json({ error: `${addon.name} is for the ${addon.plans.join(" and ")} plan${addon.plans.length > 1 ? "s" : ""}.` }, { status: 400 });
  }
  if (addon.kind === "starter_phone") {
    if (phone.allowance.addons.some((a) => a.kind === "starter_phone" && a.applies)) {
      return NextResponse.json({ error: "Phone is already on. Upgrade to Pro for more lines and minutes." }, { status: 400 });
    }
  } else if (!phone.allowed) {
    return NextResponse.json({ error: "Calling isn't active on this workspace." }, { status: 403 });
  }
  if (!isStripeConfigured()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

  const { data: billing } = await createAdminClient()
    .from("company_profiles")
    .select("stripe_customer_id")
    .eq("id", phone.access.billingCompanyId)
    .maybeSingle();

  const base = appUrl(request);
  const metadata = { company_id: phone.companyId, kind: "phone_addon", addon: addon.kind };

  try {
    const session = await stripeRequest<{ url: string }>("POST", "checkout/sessions", {
      mode: "subscription",
      client_reference_id: phone.companyId,
      customer: billing?.stripe_customer_id || undefined,
      customer_email: billing?.stripe_customer_id ? undefined : phone.access.user.email,
      line_items: {
        0: {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: addon.price * 100,
            recurring: { interval: "month" },
            product_data: { name: `BaseLead ${addon.name}`, description: addon.description },
          },
        },
      },
      metadata,
      subscription_data: { metadata },
      success_url: `${base}/api/phone/addons/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/calls?tab=setup`,
    });
    return NextResponse.json({ url: session.url });
  } catch (checkoutError) {
    return NextResponse.json({ error: checkoutError instanceof Error ? checkoutError.message : "Could not open checkout." }, { status: 500 });
  }
}
