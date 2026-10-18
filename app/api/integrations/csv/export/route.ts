import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { toCSV } from "@/lib/csv";

// Exports all of the workspace's leads as CSV.
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ success: false, error: "Please sign in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "name, company, email, phone, website, industry, category, address, city, state, country, status, ai_score, ai_opportunity, source, notes, created_at"
    )
    .or(`user_id.eq.${access.user.id},company_id.eq.${access.company.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, csv: toCSV(data ?? []) });
}
