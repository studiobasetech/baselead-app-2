import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured } from "@/lib/stripe";
import { billLastMonthOverage } from "@/lib/phone/billing";

/*
 * Daily (vercel.json cron): bills last month's automatic-overage minutes once per company,
 * as an item on their next Stripe invoice. Safe to run many times.
 * Protected by CRON_SECRET: "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasAdminClient()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 503 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "STRIPE_SECRET_KEY is not configured." }, { status: 503 });

  return NextResponse.json(await billLastMonthOverage());
}
