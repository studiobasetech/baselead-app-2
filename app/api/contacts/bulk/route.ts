import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { isContactsConfigured } from "@/lib/contacts/hunter";
import { findDecisionMakers, lookupsUsedThisMonth } from "@/lib/contacts/lookup";

// Find decision makers for several leads at once (max 25).
export async function POST(request: Request) {
  const { leadIds } = (await request.json().catch(() => ({}))) as { leadIds?: string[] };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!access.active) return NextResponse.json({ error: "Your subscription is not active." }, { status: 402 });
  if (!isContactsConfigured()) {
    return NextResponse.json({ error: "Add HUNTER_API_KEY to enable decision-maker search." }, { status: 503 });
  }

  const ids = (leadIds ?? []).slice(0, 25);
  const used = await lookupsUsedThisMonth(supabase, access.company.id);
  const remaining = Math.max(0, access.definition.contactLookupLimit - used);

  let found = 0;
  let searched = 0;
  const errors: string[] = [];

  for (const id of ids.slice(0, remaining)) {
    try {
      const contacts = await findDecisionMakers(supabase, access, id);
      found += contacts.length ? 1 : 0;
      searched++;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "failed");
    }
  }

  return NextResponse.json({
    searched,
    withContacts: found,
    skipped: ids.length - searched,
    errors: [...new Set(errors)].slice(0, 3),
  });
}
