import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { appUrl, isStripeConfigured, stripeRequest } from "@/lib/stripe";

// Opens Stripe's customer portal (change card, switch plan, cancel, invoices).
export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.isOwner) {
    return NextResponse.json(
      { error: "Only the workspace owner can manage billing." },
      { status: 403 }
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not connected yet." },
      { status: 503 }
    );
  }

  const { data: company } = await supabase
    .from("company_profiles")
    .select("stripe_customer_id")
    .eq("id", access.company.id)
    .maybeSingle();

  if (!company?.stripe_customer_id) {
    return NextResponse.json(
      { error: "You don't have an active subscription yet." },
      { status: 400 }
    );
  }

  try {
    const portal = await stripeRequest<{ url: string }>(
      "POST",
      "billing_portal/sessions",
      {
        customer: company.stripe_customer_id,
        return_url: `${appUrl(request)}/settings?section=billing`,
      }
    );

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal error." },
      { status: 500 }
    );
  }
}
