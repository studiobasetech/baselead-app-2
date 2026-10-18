import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";

// Sends a test event to a URL the user typed in Integrations → Webhooks.
export async function POST(request: Request) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ success: false, error: "Please sign in." }, { status: 401 });
  }

  if (!access.can("integrations_webhooks")) {
    return NextResponse.json(planRequiredBody("integrations_webhooks"), { status: 402 });
  }

  let target: URL;

  try {
    target = new URL(url ?? "");
    if (!["https:", "http:"].includes(target.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ success: false, error: "Enter a valid URL." }, { status: 400 });
  }

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BaseLead-Webhooks/1.0",
        "X-BaseLead-Event": "test",
      },
      body: JSON.stringify({
        event: "test",
        created_at: new Date().toISOString(),
        data: { message: "This is a test event from BaseLead." },
      }),
      signal: AbortSignal.timeout(8000),
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      error: response.ok ? undefined : `Your endpoint answered HTTP ${response.status}.`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "The request failed.",
    });
  }
}
