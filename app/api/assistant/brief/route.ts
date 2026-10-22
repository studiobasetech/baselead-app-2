import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { askAiJson, isAiConfigured } from "@/lib/ai";
import { briefCandidates, loadWorkspaceContext, type BriefAction } from "@/lib/assistant";

export const maxDuration = 60;

// Today's brief: the 3 most useful things to do right now, with a reason.
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const context = await loadWorkspaceContext(supabase, access);
  const candidates = briefCandidates(context);
  let actions: BriefAction[] = candidates.slice(0, 3);
  let ai = false;

  if (isAiConfigured() && candidates.length > 3) {
    try {
      const picked = await askAiJson<{ index: number; reason: string }[]>(
        `Pick the 3 most valuable actions for a salesperson today from this list and rewrite each reason in one short, specific sentence. Reply as JSON: [{"index": number, "reason": string}].\n\n${JSON.stringify(
          candidates.map((c, index) => ({ index, title: c.title, reason: c.reason }))
        )}`,
        { maxTokens: 400 }
      );
      const chosen = picked
        .filter((p) => candidates[p.index])
        .slice(0, 3)
        .map((p) => ({ ...candidates[p.index], reason: p.reason || candidates[p.index].reason }));
      if (chosen.length) {
        actions = chosen;
        ai = true;
      }
    } catch {
      // keep the rule-based picks
    }
  }

  return NextResponse.json({ actions, total: candidates.length, ai });
}
