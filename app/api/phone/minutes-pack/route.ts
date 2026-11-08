import { NextResponse } from "next/server";
import { appUrl, isStripeConfigured, stripeRequest } from "@/lib/stripe";
import { PHONE_MINUTES_PACK } from "@/lib/plans";
import { phoneRoute, planRequired } from "../_shared";

// Managers buy +1,000 minutes for this month (Stripe Checkout, one-time).
export async function POST(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.allowed) return planRequired();
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can buy minutes." }, { status: 403 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

  const base = appUrl(request);
  const session = await stripeRequest<{ url: string }>("POST", "checkout/sessions", {
    mode: "payment",
    client_reference_id: phone.companyId,
    customer_email: phone.access.user.email,
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PHONE_MINUTES_PACK.price * 100,
          product_data: { name: `BaseLead calling: +${PHONE_MINUTES_PACK.minutes.toLocaleString("en-US")} minutes` },
        },
      },
    },
    metadata: { company_id: phone.companyId, kind: "phone_minutes", minutes: PHONE_MINUTES_PACK.minutes },
    success_url: `${base}/api/phone/minutes-pack/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/calls?tab=setup`,
  });

  return NextResponse.json({ url: session.url });
}
