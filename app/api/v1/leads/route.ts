import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/api-keys";
import { effectivePlan, getPlan } from "@/lib/plans";

/*
 * BaseLead public API (Scale plan).
 *   GET /api/v1/leads?limit=50&offset=0&status=New
 *   Header: Authorization: Bearer bl_live_...
 */
export async function GET(request: Request) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "API not configured." }, { status: 503 });
  }

  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token?.startsWith("bl_live_")) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: apiKey } = await admin
    .from("api_keys")
    .select("id, user_id, company_id, requests_this_month, usage_month")
    .eq("key_hash", hashApiKey(token))
    .is("revoked_at", null)
    .maybeSingle();

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  const { data: company } = await admin
    .from("company_profiles")
    .select("plan, billing_status")
    .eq("id", apiKey.company_id)
    .maybeSingle();

  const plan = effectivePlan(company?.plan, company?.billing_status);
  const definition = getPlan(plan);

  if (
    company?.billing_status !== "active" ||
    !definition.features.includes("api_access")
  ) {
    return NextResponse.json(
      { error: "API access requires an active Scale plan." },
      { status: 402 }
    );
  }

  const month = new Date().toISOString().slice(0, 7);
  const used = apiKey.usage_month === month ? apiKey.requests_this_month ?? 0 : 0;

  if (definition.apiRequestLimit !== null && used >= definition.apiRequestLimit) {
    return NextResponse.json(
      { error: "Monthly API request limit reached." },
      { status: 429 }
    );
  }

  await admin
    .from("api_keys")
    .update({
      requests_this_month: used + 1,
      usage_month: month,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", apiKey.id);

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const status = url.searchParams.get("status");

  let query = admin
    .from("leads")
    .select(
      "id, name, company, email, phone, website, industry, location, city, state, country, status, ai_score, intent_score, source, created_at, updated_at",
      { count: "exact" }
    )
    .eq("user_id", apiKey.user_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
