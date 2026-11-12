import { NextResponse } from "next/server";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { applyPhoneAddon } from "@/lib/phone/billing";

// Stripe sends the buyer back here; we save the add-on right away (the webhook does it too).
export async function GET(request: Request) {
  const base = appUrl(request);
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.redirect(`${base}/calls?tab=setup`);

  try {
    const session = await stripeRequest<{
      status: string;
      subscription?: string | null;
      metadata?: { company_id?: string; kind?: string };
    }>("GET", `checkout/sessions/${sessionId}`);

    if (session.status === "complete" && session.metadata?.kind === "phone_addon" && session.subscription) {
      await applyPhoneAddon(String(session.subscription), session.metadata.company_id ?? null);
      return NextResponse.redirect(`${base}/calls?tab=setup&addon=added`);
    }
  } catch (confirmError) {
    console.error("Phone add-on confirm error:", confirmError);
  }
  return NextResponse.redirect(`${base}/calls?tab=setup&addon=failed`);
}
