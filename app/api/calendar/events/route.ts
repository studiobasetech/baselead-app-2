import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";
import { getGoogleAccessToken } from "@/lib/integrations/google-api";
import { dispatchWebhooks } from "@/lib/webhooks";
import type { SupabaseClient } from "@supabase/supabase-js";

type EventInput = {
  id?: string;
  title?: string;
  type?: string;
  starts_at?: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string | null;
  attendee?: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
  opportunity_value?: number | null;
};

const FIELDS = [
  "title",
  "type",
  "starts_at",
  "ends_at",
  "location",
  "notes",
  "status",
  "attendee",
  "lead_id",
  "lead_name",
  "opportunity_value",
] as const;

function pick(input: EventInput) {
  const row: Record<string, unknown> = {};
  for (const field of FIELDS) {
    if (field in input) row[field] = input[field] ?? null;
  }
  return row;
}

/** Mirrors the event to Google Calendar when it is connected. */
async function syncGoogle(
  supabase: SupabaseClient,
  userId: string,
  event: Record<string, unknown>,
  action: "upsert" | "delete"
) {
  try {
    const token = await getGoogleAccessToken(supabase, userId, "google-calendar");
    if (!token) return null;

    const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const googleId = event.google_event_id as string | null;

    if (action === "delete") {
      if (googleId) {
        await fetch(`${base}/${googleId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      return null;
    }

    const start = String(event.starts_at);
    const end = event.ends_at
      ? String(event.ends_at)
      : new Date(new Date(start).getTime() + 30 * 60000).toISOString();

    const body = JSON.stringify({
      summary: event.title,
      description: event.notes || undefined,
      location: event.location || undefined,
      start: { dateTime: start },
      end: { dateTime: end },
    });

    const response = await fetch(googleId ? `${base}/${googleId}` : base, {
      method: googleId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const json = await response.json();
    return response.ok ? (json.id as string) : null;
  } catch (error) {
    console.error("Google Calendar sync skipped:", error);
    return null;
  }
}

async function guard() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  }

  return { supabase, access };
}

// List events in a date range.
export async function GET(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? new Date(Date.now() - 400 * 86400000).toISOString();
  const to = url.searchParams.get("to") ?? new Date(Date.now() + 400 * 86400000).toISOString();

  const { data, error } = await result.supabase
    .from("calendar_events")
    .select("*")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

// Create an event.
export async function POST(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const { supabase, access } = result;

  if (!access.can("calendar_followups")) {
    return NextResponse.json(planRequiredBody("calendar_followups"), { status: 402 });
  }

  const input = (await request.json().catch(() => ({}))) as EventInput;

  if (!input.title || !input.starts_at) {
    return NextResponse.json({ error: "Title and start time are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      ...pick(input),
      user_id: access.user.id,
      company_id: access.company.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const googleId = await syncGoogle(supabase, access.user.id, data, "upsert");

  if (googleId) {
    await supabase.from("calendar_events").update({ google_event_id: googleId }).eq("id", data.id);
    data.google_event_id = googleId;
  }

  if (access.can("integrations_webhooks")) {
    void dispatchWebhooks(supabase, access.user.id, "meeting.created", data).catch(() => undefined);
  }

  return NextResponse.json({ event: data });
}

// Update an event.
export async function PATCH(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const { supabase, access } = result;
  const input = (await request.json().catch(() => ({}))) as EventInput;

  if (!input.id) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update({ ...pick(input), updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const googleId = await syncGoogle(supabase, access.user.id, data, "upsert");

  if (googleId && googleId !== data.google_event_id) {
    await supabase.from("calendar_events").update({ google_event_id: googleId }).eq("id", data.id);
  }

  return NextResponse.json({ event: data });
}

// Delete an event.
export async function DELETE(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const { supabase, access } = result;
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  const { data } = await supabase
    .from("calendar_events")
    .select("google_event_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.google_event_id) {
    await syncGoogle(supabase, access.user.id, data, "delete");
  }

  return NextResponse.json({ success: true });
}
