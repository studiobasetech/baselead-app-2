import { NextResponse } from "next/server";
import { applySubscription } from "@/lib/billing";
import { verifyStripeSignature } from "@/lib/stripe";

// Stripe calls this when subscriptions change (renewal, upgrade, cancel, failed payment).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 503 }
    );
  }

  const payload = await request.text();

  if (
    !verifyStripeSignature(
      payload,
      request.headers.get("stripe-signature"),
      secret
    )
  ) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  try {
    const object = event.data.object;

    switch (event.type) {
      case "checkout.session.completed": {
        if (object.subscription) {
          await applySubscription(
            String(object.subscription),
            (object.client_reference_id as string) || null
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(
          object as unknown as Parameters<typeof applySubscription>[0]
        );
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
