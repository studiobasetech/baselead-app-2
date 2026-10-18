import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";

// Sends a sample payload to one webhook so the user can check their endpoint.
export async function POST(request: Request) {
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.can("integrations_webhooks")) {
    return NextResponse.json(planRequiredBody("integrations_webhooks"), {
      status: 402,
    });
  }

  const { data: hook } = await supabase
    .from("webhooks")
    .select("id, url, event")
    .eq("id", id ?? "")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (!hook) {
    return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
  }

  try {
    const response = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BaseLead-Webhooks/1.0",
        "X-BaseLead-Event": hook.event,
      },
      body: JSON.stringify({
        event: hook.event,
        test: true,
        created_at: new Date().toISOString(),
        data: { message: "This is a test event from BaseLead." },
      }),
      signal: AbortSignal.timeout(8000),
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Request failed.",
    });
  }
}
