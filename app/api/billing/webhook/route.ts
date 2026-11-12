import { NextResponse } from "next/server";
import { applySubscription } from "@/lib/billing";
import { verifyStripeSignature } from "@/lib/stripe";
import { applyPhoneAddon, isPhoneAddonSubscription } from "@/lib/phone/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPeriod } from "@/lib/phone/access";

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
        const metadata = (object.metadata ?? {}) as Record<string, string>;
        if (metadata.kind === "phone_addon" && object.subscription) {
          await applyPhoneAddon(String(object.subscription), metadata.company_id || null);
          break;
        }
        if (metadata.kind === "phone_minutes") {
          // Backup for the confirm page: add the pack once (same row, keyed by the checkout session).
          if (object.payment_status === "paid" && metadata.company_id) {
            await createAdminClient().from("phone_minute_packs").upsert(
              {
                company_id: metadata.company_id,
                minutes: Number(metadata.minutes) || 1000,
                amount: Number(object.amount_total ?? 0) / 100,
                period: currentPeriod(),
                stripe_session_id: String(object.id),
              },
              { onConflict: "stripe_session_id", ignoreDuplicates: true }
            );
          }
          break;
        }
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
        // Phone add-ons are their own subscriptions — never treat them as the plan.
        if (isPhoneAddonSubscription(object)) {
          await applyPhoneAddon(object as unknown as Parameters<typeof applyPhoneAddon>[0]);
          break;
        }
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
