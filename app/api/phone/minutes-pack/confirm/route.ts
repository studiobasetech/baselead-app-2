import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { currentPeriod } from "@/lib/phone/access";

// Stripe sends the buyer back here; we confirm payment and add the minutes once.
export async function GET(request: Request) {
  const base = appUrl(request);
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.redirect(`${base}/calls?tab=setup`);

  try {
    const session = await stripeRequest<{
      payment_status: string;
      amount_total: number;
      metadata?: { company_id?: string; kind?: string; minutes?: string };
    }>("GET", `checkout/sessions/${sessionId}`);

    if (session.payment_status === "paid" && session.metadata?.kind === "phone_minutes" && session.metadata.company_id) {
      await createAdminClient().from("phone_minute_packs").upsert(
        {
          company_id: session.metadata.company_id,
          minutes: Number(session.metadata.minutes) || 1000,
          amount: (session.amount_total ?? 0) / 100,
          period: currentPeriod(),
          stripe_session_id: sessionId,
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true }
      );
      return NextResponse.redirect(`${base}/calls?tab=setup&minutes=added`);
    }
  } catch (confirmError) {
    console.error("Minutes pack confirm error:", confirmError);
  }
  return NextResponse.redirect(`${base}/calls?tab=setup&minutes=failed`);
}
