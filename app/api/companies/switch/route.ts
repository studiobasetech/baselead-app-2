import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/active-company";
import { loadOwnedCompanies } from "../shared";

// POST { companyId }: open another company this account runs.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!hasAdminClient()) return NextResponse.json({ error: "Not available." }, { status: 503 });

  const { companyId } = (await request.json().catch(() => ({}))) as { companyId?: string };
  const owned = await loadOwnedCompanies(createAdminClient(), user);
  const target = owned.options.find((option) => option.id === companyId);

  if (!target) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }
  if (!target.main && !owned.allowed) {
    return NextResponse.json(
      { code: "PLAN_REQUIRED", requiredPlan: "Scale", error: "Multiple companies are available on the Scale plan." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true, activeId: target.id });
  if (target.main) {
    response.cookies.set(ACTIVE_COMPANY_COOKIE, "", { path: "/", maxAge: 0 });
  } else {
    response.cookies.set(ACTIVE_COMPANY_COOKIE, target.id, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
