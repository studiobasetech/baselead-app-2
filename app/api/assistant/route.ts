import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { askAi, isAiConfigured } from "@/lib/ai";
import { contextForAi, loadWorkspaceContext, ruleAnswer } from "@/lib/assistant";

export const maxDuration = 60;

// "Ask BaseLead": answers questions about the user's own leads and deals.
export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { question, history } = (await request.json().catch(() => ({}))) as {
    question?: string;
    history?: { role: "user" | "assistant"; text: string }[];
  };
  const text = (question ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "Ask a question." }, { status: 400 });

  const context = await loadWorkspaceContext(supabase, access);
  const rules = ruleAnswer(text, context);

  if (!isAiConfigured()) {
    return NextResponse.json({ ...rules, ai: false });
  }

  try {
    const recent = (history ?? []).slice(-6).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
    const answer = await askAi(
      `Workspace data (JSON):\n${JSON.stringify(contextForAi(context))}\n\n${recent ? `Conversation so far:\n${recent}\n\n` : ""}Question: ${text}`,
      {
        system:
          "You are BaseLead, a sales assistant inside a B2B lead-finding app. Answer ONLY from the workspace data given. Be brief and practical: short sentences, bullet points when listing, max ~150 words. Refer to leads by company name. Never invent leads, numbers or replies. If asked to write an email, write a short, personal email (no hype). Answer in the same language as the question.",
        maxTokens: 600,
      }
    );
    return NextResponse.json({ answer, links: rules.links, ai: true });
  } catch {
    // AI unavailable: fall back to the free answer.
    return NextResponse.json({ ...rules, ai: false });
  }
}
