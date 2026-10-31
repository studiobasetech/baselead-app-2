import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Saves this phone's push token so BaseLead can send notifications (replies, bookings, reminders).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { token?: string; platform?: string };
  const token = String(body.token ?? "").trim();
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null;
  if (!token || token.length > 4096 || !platform) return NextResponse.json({ error: "Invalid token." }, { status: 400 });

  const { error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: user.id, token, platform, updated_at: new Date().toISOString() }, { onConflict: "token" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  await supabase.from("push_tokens").delete().eq("user_id", user.id).eq("token", String(body.token ?? ""));
  return NextResponse.json({ ok: true });
}
