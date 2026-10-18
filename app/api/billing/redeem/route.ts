import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";
import { isPlanName } from "@/lib/plans";
import { findStripePromotion, isFreePlanCode, normalizeCode } from "@/lib/discounts";

/*
 * POST { code }            → checks the code and says what it does.
 * POST { code, plan, apply: true } → with a free-plan code, activates that plan.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    plan?: string;
    cycle?: string;
    apply?: boolean;
  };

  const code = normalizeCode(body.code);

  if (!code) {
    return NextResponse.json({ error: "Enter a discount code." }, { status: 400 });
  }

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.isOwner) {
    return NextResponse.json(
      { error: "Only the workspace owner can apply discount codes." },
      { status: 403 }
    );
  }

  // ---- Free plan code ----
  if (isFreePlanCode(code)) {
    if (!body.apply) {
      return NextResponse.json({
        valid: true,
        type: "free",
        code,
        label: "100% off — any plan free",
      });
    }

    if (!isPlanName(body.plan)) {
      return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
    }

    if (!hasAdminClient()) {
      return NextResponse.json(
        { error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to activate codes." },
        { status: 503 }
      );
    }

    const update: Record<string, unknown> = {
      plan: body.plan,
      billing_status: "active",
      billing_cycle: body.cycle === "yearly" ? "yearly" : "monthly",
      promo_code: code,
      cancel_at_period_end: false,
    };

    const admin = createAdminClient();
    let { error } = await admin
      .from("company_profiles")
      .update(update)
      .eq("id", access.company.id);

    // Older database without promo_code / billing_cycle columns.
    if (error && /promo_code|billing_cycle|cancel_at_period_end/.test(error.message)) {
      ({ error } = await admin
        .from("company_profiles")
        .update({ plan: body.plan, billing_status: "active" })
        .eq("id", access.company.id));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, type: "free", plan: body.plan });
  }

  // ---- Stripe promotion code ----
  const promotion = await findStripePromotion(code);

  if (!promotion) {
    return NextResponse.json(
      { valid: false, error: "This discount code is not valid." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    valid: true,
    type: "stripe",
    code,
    label: promotion.label,
  });
}
