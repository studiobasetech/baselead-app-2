import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";

// Quick lead lookup for the ⌘K command bar.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().replace(/[%,()]/g, " ").slice(0, 60);
  if (q.length < 2) return NextResponse.json({ leads: [] });

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ leads: [] }, { status: 401 });

  const { data } = await supabase
    .from("leads")
    .select("id, name, company, city, website")
    .eq("company_id", access.company.id)
    .or(`company.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(6);

  return NextResponse.json({
    leads: (data ?? []).map((row) => ({
      id: row.id,
      title: row.company || row.name || "Lead",
      subtitle: [row.name !== row.company ? row.name : null, row.city].filter(Boolean).join(" · "),
      website: row.website ?? null,
    })),
  });
}
