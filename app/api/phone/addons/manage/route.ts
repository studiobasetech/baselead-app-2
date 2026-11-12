import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, isStripeConfigured, stripeRequest } from "@/lib/stripe";
import { phoneRoute } from "../../_shared";

// Opens the Stripe billing portal to change quantity or cancel add-ons.
export async function POST(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can manage add-ons." }, { status: 403 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

  const admin = createAdminClient();
  const [{ data: addon }, { data: billing }] = await Promise.all([
    admin.from("phone_addons").select("stripe_customer_id").eq("company_id", phone.companyId).not("stripe_customer_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("company_profiles").select("stripe_customer_id").eq("id", phone.access.billingCompanyId).maybeSingle(),
  ]);
  const customer = addon?.stripe_customer_id || billing?.stripe_customer_id;
  if (!customer) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  try {
    const portal = await stripeRequest<{ url: string }>("POST", "billing_portal/sessions", {
      customer,
      return_url: `${appUrl(request)}/calls?tab=setup`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (portalError) {
    return NextResponse.json({ error: portalError instanceof Error ? portalError.message : "Could not open billing." }, { status: 500 });
  }
}
