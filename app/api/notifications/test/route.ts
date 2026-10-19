import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

/** Sends a test notification to the signed-in user so they can check delivery. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable email notifications." },
      { status: 503 }
    );
  }

  const result = await notifyUser(createAdminClient(), user.id, "test", {
    subject: "Test notification",
    heading: "Email notifications are working ✅",
    lines: [
      "You'll get an email here when a lead replies, books a meeting, opens or signs a proposal, or pays.",
      "Meeting reminders arrive 1 hour before each meeting, and the weekly report every Monday.",
    ],
    ctaLabel: "Open BaseLead",
    ctaPath: "/today",
  });

  if (!result.sent) {
    return NextResponse.json({ error: result.reason || "Could not send the test email." }, { status: 400 });
  }

  return NextResponse.json({ success: true, via: result.via, to: user.email });
}
