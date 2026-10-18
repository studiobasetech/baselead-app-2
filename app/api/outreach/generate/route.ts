import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";
import { askAiJson, isAiConfigured } from "@/lib/ai";

// Writes a personalised outreach email with AI (Pro/Scale).
export async function POST(request: Request) {
  const { leadId, campaign, tone } = (await request.json().catch(() => ({}))) as {
    leadId?: string;
    campaign?: string;
    tone?: string;
  };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.can("ai_recommendations")) {
    return NextResponse.json(planRequiredBody("ai_recommendations"), {
      status: 402,
    });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI writing is not configured. Add ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const [{ data: lead }, { data: company }] = await Promise.all([
    supabase
      .from("leads")
      .select("name, company, category, industry, location, website, rating, review_count, ai_reason, ai_recommendations")
      .eq("id", leadId ?? "")
      .maybeSingle(),
    supabase
      .from("company_profiles")
      .select("*")
      .eq("id", access.company.id)
      .maybeSingle(),
  ]);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const sender = (company as Record<string, unknown> | null) ?? {};

  try {
    const result = await askAiJson<{ subject: string; message: string }>(
      `Write a short, personal cold email (90-140 words) from ${
        sender.company_name || "our company"
      }${sender.services ? `, which offers ${JSON.stringify(sender.services)}` : ""}, to ${
        lead.company || lead.name
      } (${lead.category || lead.industry || "business"} in ${lead.location || "their area"}).
Campaign: ${campaign || "General outreach"}. Tone: ${tone || "friendly and professional"}.
Facts you may use: website ${lead.website ? "yes" : "none"}, rating ${lead.rating ?? "n/a"} with ${lead.review_count ?? 0} reviews. Insight: ${lead.ai_reason || "none"}.
No made-up facts, no placeholders in brackets, end with a simple question and sign with "${sender.company_name || ""}".
Reply with JSON only: {"subject":"","message":""}`,
      { maxTokens: 800 }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI error." },
      { status: 500 }
    );
  }
}
