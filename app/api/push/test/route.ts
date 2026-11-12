import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured, sendPush } from "@/lib/push";

// Sends a test notification to the signed-in user's phones.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!isPushConfigured() || !hasAdminClient()) {
    return NextResponse.json({ error: "Push notifications are not set up yet." }, { status: 503 });
  }
  const sent = await sendPush(createAdminClient(), user.id, {
    title: "BaseLead",
    body: "Notifications are working. You'll hear about replies, bookings and missed calls here.",
    url: "/today",
  });
  if (!sent) return NextResponse.json({ error: "No phone received it. Open the BaseLead app and allow notifications." }, { status: 404 });
  return NextResponse.json({ ok: true, sent });
}
