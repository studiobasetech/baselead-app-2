import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { applySubscription } from "@/lib/billing";
import { appUrl, stripeRequest } from "@/lib/stripe";

// Stripe sends the customer here after a successful payment.
export async function GET(request: Request) {
  const base = appUrl(request);
  const sessionId = new URL(request.url).searchParams.get("session_id");

  const fail = (reason: string) =>
    NextResponse.redirect(
      `${base}/settings?section=billing&checkout=error&reason=${encodeURIComponent(reason)}`
    );

  if (!sessionId) return fail("missing_session");

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.redirect(`${base}/login`);

  try {
    const session = await stripeRequest<{
      client_reference_id: string | null;
      subscription: string | null;
      status: string;
    }>("GET", `checkout/sessions/${sessionId}`);

    if (session.client_reference_id !== access.company.id) {
      return fail("wrong_workspace");
    }

    if (session.status !== "complete" || !session.subscription) {
      return fail("not_paid");
    }

    await applySubscription(session.subscription, access.company.id);

    return NextResponse.redirect(
      `${base}/settings?section=billing&checkout=success`
    );
  } catch (error) {
    console.error("Checkout confirm error:", error);
    return fail("confirm_failed");
  }
}
