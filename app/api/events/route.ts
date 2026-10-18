import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { dispatchWebhooks, isWebhookEvent } from "@/lib/webhooks";

// Receives app events from the browser and forwards them to webhooks.
export async function POST(request: Request) {
  const { event, data } = (await request.json().catch(() => ({}))) as {
    event?: string;
    data?: unknown;
  };

  if (!isWebhookEvent(event)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 400 });
  }

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // Webhooks only fire on plans that include them.
  if (!access.can("integrations_webhooks")) {
    return NextResponse.json({ skipped: true });
  }

  const result = await dispatchWebhooks(supabase, access.user.id, event, data);

  return NextResponse.json(result);
}
