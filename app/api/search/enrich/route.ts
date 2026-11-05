import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { enrichAndScore, rowToLead, toLeadRow } from "@/lib/search/process-search";

/*
 * Second step of a search: visits the websites of a few draft leads
 * (contacts, decision maker, logo, gaps) and scores them. The search
 * page calls this in small batches so results appear right away.
 * Body: { leads: DraftLead[] (max 6), offer, idealClient }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    leads?: (Record<string, unknown> & { id?: string })[];
    offer?: string;
    idealClient?: string;
    location?: string;
  };
  const drafts = (body.leads ?? []).filter((lead) => typeof lead?.id === "string").slice(0, 6);
  if (!drafts.length) return NextResponse.json({ leads: [] });

  const leads = drafts.map(rowToLead);
  await enrichAndScore(
    leads,
    {
      offer: String(body.offer ?? ""),
      idealClient: String(body.idealClient ?? ""),
      location: String(body.location ?? ""),
      scoring: true,
      enrichment: true,
    },
    { recommendations: access.can("ai_recommendations") }
  );

  return NextResponse.json({
    leads: leads.map((lead, index) => ({
      ...toLeadRow(lead, access.user.id, access.company.id),
      id: drafts[index].id,
      saved: false,
    })),
  });
}
