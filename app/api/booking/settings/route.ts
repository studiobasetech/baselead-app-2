import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { slugify } from "@/lib/booking";

// The signed-in user's booking page settings.
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data } = await supabase
    .from("booking_pages")
    .select("*")
    .eq("user_id", access.user.id)
    .maybeSingle();

  return NextResponse.json({ page: data });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const name =
    (access.user.user_metadata?.full_name as string | undefined) ||
    access.user.email?.split("@")[0] ||
    "meeting";

  const slug = slugify(String(input.slug || name)) || `meet-${access.user.id.slice(0, 6)}`;

  const row = {
    user_id: access.user.id,
    company_id: access.company.id,
    slug,
    title: String(input.title || "Intro call").slice(0, 80),
    description: input.description ? String(input.description).slice(0, 500) : null,
    duration_minutes: Math.min(240, Math.max(10, Number(input.duration_minutes) || 30)),
    buffer_minutes: Math.min(120, Math.max(0, Number(input.buffer_minutes) || 0)),
    min_notice_hours: Math.min(168, Math.max(0, Number(input.min_notice_hours) || 0)),
    days_ahead: Math.min(90, Math.max(1, Number(input.days_ahead) || 21)),
    timezone: String(input.timezone || "America/Chicago"),
    availability: input.availability ?? undefined,
    active: input.active !== false,
  };

  const { data, error } = await supabase
    .from("booking_pages")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    const taken = error.message.includes("booking_pages_slug_key");
    return NextResponse.json(
      { error: taken ? "That link name is taken. Try another one." : error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ page: data });
}
