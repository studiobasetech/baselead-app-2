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
      { error: "AI writing is not configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const [{ data: lead }, { data: company }] = await Promise.all([
    supabase
      .from("leads")
      .select("name, company, category, industry, location, website, rating, review_count, ai_reason, ai_recommendations, contact_name, contact_title, instagram_url, facebook_url, linkedin_url, raw_data")
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
    // Real facts about this business = the "why now" for the email.
    const raw = (lead.raw_data ?? {}) as Record<string, unknown>;
    const signals = [
      !lead.website && "they have no website",
      raw.website_reachable === false && "their website did not load when we checked",
      raw.website_ssl === false && raw.website_reachable !== false && "their website is not secure (no HTTPS)",
      raw.has_booking === false && "visitors can't book online on their website",
      raw.has_chat === false && "there is no chat or assistant on their website to answer visitors",
      ![lead.instagram_url, lead.facebook_url, lead.linkedin_url].some(Boolean) && "we found no social media profiles",
      typeof lead.rating === "number" && lead.rating < 4 && `their rating is ${lead.rating} stars`,
    ].filter(Boolean) as string[];
    const recommended = (lead.ai_recommendations as { recommended_service?: string } | null)?.recommended_service;
    const greeting = lead.contact_name
      ? `Address ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ""} by name (use "Dr." if it is part of the name).`
      : "Use a friendly greeting without a name.";

    const result = await askAiJson<{ subject: string; message: string }>(
      `Write a short, personal cold email (80-130 words) from ${
        sender.company_name || "our company"
      }${sender.services ? `, which offers ${JSON.stringify(sender.services)}` : ""}${
        sender.description ? ` (about us: ${String(sender.description).slice(0, 300)})` : ""
      }, to ${lead.company || lead.name} (${lead.category || lead.industry || "business"} in ${lead.location || "their area"}).
${greeting}
Campaign: ${campaign || "General outreach"}. Tone: ${tone || "friendly and professional"}.
${recommended ? `Best service to offer them: ${recommended}.` : "Pick the ONE most relevant service for them."}
What we noticed about them (open with the most relevant ONE as the reason for writing; never sound critical or rude): ${
        signals.length ? signals.join("; ") : "nothing specific — compliment their business and ask a question about their goals"
      }.
Other facts: rating ${lead.rating ?? "n/a"} with ${lead.review_count ?? 0} reviews. Insight: ${lead.ai_reason || "none"}.
Rules: write in the language of their location (Spanish for Mexico, English for the USA); no made-up facts or numbers; no placeholders in brackets; one clear benefit; end with a simple yes/no question (for example a 15-minute call); sign with "${sender.company_name || ""}".
Subject: under 7 words, specific to them, no clickbait.
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
