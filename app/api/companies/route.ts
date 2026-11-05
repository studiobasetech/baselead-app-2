import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { activeCompanyIdServer } from "@/lib/active-company-server";
import { loadOwnedCompanies } from "./shared";

// GET: the companies this account runs + which one is open.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  if (!hasAdminClient()) {
    return NextResponse.json({ companies: [], activeId: null, allowed: false, limit: 1 });
  }

  const owned = await loadOwnedCompanies(createAdminClient(), user);
  const cookieId = await activeCompanyIdServer();
  const activeId = owned.options.some((option) => option.id === cookieId) ? cookieId : owned.main?.id ?? null;

  return NextResponse.json({
    companies: owned.options,
    activeId,
    allowed: owned.allowed,
    limit: owned.limit,
  });
}

// POST { name }: add a company (Scale plan, up to the plan limit).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter the company name." }, { status: 400 });
  }

  const admin = createAdminClient();
  const owned = await loadOwnedCompanies(admin, user);

  if (!owned.main) {
    return NextResponse.json({ error: "Finish setting up your main company first." }, { status: 400 });
  }
  if (!owned.allowed) {
    return NextResponse.json(
      { success: false, code: "PLAN_REQUIRED", requiredPlan: "Scale", error: "Multiple companies are available on the Scale plan." },
      { status: 403 }
    );
  }
  if (owned.options.length >= owned.limit) {
    return NextResponse.json(
      { error: `Your plan includes up to ${owned.limit} companies.` },
      { status: 403 }
    );
  }

  const { data: company, error } = await admin
    .from("company_profiles")
    .insert({
      company_name: name,
      user_id: null,
      parent_company_id: owned.main.id,
      owner_user_id: user.id,
    })
    .select("id, company_name")
    .single();

  if (error || !company) {
    const missing = /parent_company_id|owner_user_id|null value in column "user_id"/i.test(error?.message ?? "");
    return NextResponse.json(
      { error: missing ? "Run supabase/UPDATE_11_RUN_THIS.sql in Supabase first." : error?.message || "Could not add the company." },
      { status: 500 }
    );
  }

  // The owner reaches the new company as its Admin (works with all team rules).
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { error: memberError } = await admin.from("team_members").insert({
    company_id: company.id,
    user_id: user.id,
    email: user.email ?? "",
    name: String(meta.full_name ?? meta.name ?? user.email ?? ""),
    role: "Admin",
    status: "active",
  });

  if (memberError) {
    await admin.from("company_profiles").delete().eq("id", company.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, company: { id: company.id, name: company.company_name } });
}
