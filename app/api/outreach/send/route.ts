import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { sendOutreachEmail } from "@/lib/outreach-send";
import { dispatchWebhooks } from "@/lib/webhooks";

// Sends an outreach email now through the user's connected Gmail.
export async function POST(request: Request) {
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.active) {
    return NextResponse.json(
      { error: "Your subscription is not active. Choose a plan to continue." },
      { status: 402 }
    );
  }

  if (!id) {
    return NextResponse.json({ error: "Missing outreach id." }, { status: 400 });
  }

  try {
    const outreach = await sendOutreachEmail(supabase, id);

    if (access.can("integrations_webhooks")) {
      void dispatchWebhooks(
        supabase,
        access.user.id,
        "outreach.created",
        outreach
      ).catch(() => undefined);
    }

    return NextResponse.json({ success: true, outreach });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send." },
      { status: 400 }
    );
  }
}
