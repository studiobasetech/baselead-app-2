import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { computeSlots, type BookingPage } from "@/lib/booking";
import {
  createGoogleMeeting,
  getGoogleAccessToken,
  getGoogleBusy,
} from "@/lib/integrations/google-api";
import { advanceLead, logActivity } from "@/lib/automation";
import { notifyUser } from "@/lib/notify";
import { dispatchWebhooks } from "@/lib/webhooks";

async function loadPage(slug: string) {
  const admin = createAdminClient();

  const { data: page } = await admin
    .from("booking_pages")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<BookingPage>();

  return { admin, page };
}

async function busyBlocks(
  admin: ReturnType<typeof createAdminClient>,
  page: BookingPage
) {
  const from = new Date();
  const to = new Date(Date.now() + (page.days_ahead + 1) * 86400000);

  const { data: events } = await admin
    .from("calendar_events")
    .select("starts_at, ends_at")
    .eq("user_id", page.user_id)
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString());

  const blocks = (events ?? []).map((event) => ({
    start: new Date(event.starts_at).getTime(),
    end: new Date(event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 30 * 60000)).getTime(),
  }));

  // Also respect the owner's Google Calendar, when connected.
  const token = await getGoogleAccessToken(admin, page.user_id, "google-calendar").catch(() => null);

  if (token) {
    const google = await getGoogleBusy(token, from.toISOString(), to.toISOString());
    blocks.push(
      ...google.map((block) => ({
        start: new Date(block.start).getTime(),
        end: new Date(block.end).getTime(),
      }))
    );
  }

  return { blocks, token };
}

// Public: page info + open time slots.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Booking is not configured." }, { status: 503 });
  }

  const { slug } = await params;
  const { admin, page } = await loadPage(slug);

  if (!page) {
    return NextResponse.json({ error: "This booking link is not available." }, { status: 404 });
  }

  const { data: company } = await admin
    .from("company_profiles")
    .select("company_name, logo_url")
    .eq("id", page.company_id ?? "")
    .maybeSingle();

  const { data: owner } = await admin.auth.admin.getUserById(page.user_id);
  const { blocks } = await busyBlocks(admin, page);

  return NextResponse.json({
    title: page.title,
    description: page.description,
    duration: page.duration_minutes,
    timezone: page.timezone,
    host: owner?.user?.user_metadata?.full_name || owner?.user?.user_metadata?.name || "",
    company: company?.company_name || "",
    logo: company?.logo_url || "",
    slots: computeSlots(page, blocks),
  });
}

// Public: book a slot.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Booking is not configured." }, { status: 503 });
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    start?: string;
    name?: string;
    email?: string;
    company?: string;
    phone?: string;
    notes?: string;
  };

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !body.start) {
    return NextResponse.json({ error: "Please add your name, a valid email and a time." }, { status: 400 });
  }

  const { admin, page } = await loadPage(slug);

  if (!page) {
    return NextResponse.json({ error: "This booking link is not available." }, { status: 404 });
  }

  const { blocks, token } = await busyBlocks(admin, page);
  const slot = computeSlots(page, blocks).find((item) => item.start === body.start);

  if (!slot) {
    return NextResponse.json(
      { error: "That time was just taken. Please choose another one." },
      { status: 409 }
    );
  }

  // Find the lead by email (or create it) inside the host's workspace.
  let { data: lead } = await admin
    .from("leads")
    .select("id")
    .eq("company_id", page.company_id ?? "")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (!lead) {
    const { data: created } = await admin
      .from("leads")
      .insert({
        user_id: page.user_id,
        assigned_to: page.user_id,
        company_id: page.company_id,
        name: body.company?.trim() || name,
        company: body.company?.trim() || name,
        contact_name: name,
        email,
        phone: body.phone?.trim() || null,
        status: "new",
        source: "booking_page",
        raw_data: { provider: "booking_page" },
      })
      .select("id")
      .single();

    lead = created;
  }

  if (!lead) {
    return NextResponse.json({ error: "Could not save your booking." }, { status: 500 });
  }

  let meetUrl: string | null = null;
  let googleId: string | null = null;

  if (token) {
    try {
      const meeting = await createGoogleMeeting(token, {
        title: `${page.title}: ${body.company?.trim() || name}`,
        description: body.notes?.trim() || undefined,
        start: slot.start,
        end: slot.end,
        guestEmail: email,
        guestName: name,
      });
      meetUrl = meeting.meetUrl;
      googleId = meeting.id;
    } catch (error) {
      console.error("Google meeting creation failed:", error);
    }
  }

  const { data: event, error } = await admin
    .from("calendar_events")
    .insert({
      user_id: page.user_id,
      company_id: page.company_id,
      lead_id: lead.id,
      lead_name: body.company?.trim() || name,
      title: page.title,
      type: "Meeting",
      starts_at: slot.start,
      ends_at: slot.end,
      location: meetUrl,
      meet_url: meetUrl,
      notes: body.notes?.trim() || null,
      attendee: name,
      booked_by_email: email,
      status: "Upcoming",
      google_event_id: googleId,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save your booking." }, { status: 500 });
  }

  await advanceLead(admin, lead.id, "meeting", "Meeting booked through the booking link.", page.user_id);

  await logActivity(admin, {
    leadId: lead.id,
    companyId: page.company_id,
    userId: page.user_id,
    type: "meeting_booked",
    title: `Meeting booked for ${new Date(slot.start).toUTCString()}`,
    body: body.notes?.trim() || null,
    metadata: { event_id: event.id, meet_url: meetUrl },
  });

  // Stop follow-ups: they already booked.
  await admin
    .from("sequence_enrollments")
    .update({ status: "replied", next_run_at: null })
    .eq("lead_id", lead.id)
    .eq("status", "active");

  await admin.from("tasks").insert({
    company_id: page.company_id,
    user_id: page.user_id,
    lead_id: lead.id,
    title: `Prepare for your call with ${body.company?.trim() || name}`,
    type: "call",
    due_at: new Date(new Date(slot.start).getTime() - 3600000).toISOString(),
    source: "booking",
  });

  await notifyUser(admin, page.user_id, "booking", {
    subject: `New meeting booked: ${body.company?.trim() || name}`,
    heading: "Someone booked a meeting with you",
    lines: [
      `${name} (${email})${body.company?.trim() ? ` from ${body.company.trim()}` : ""}`,
      `When: ${new Date(slot.start).toUTCString()}`,
      ...(meetUrl ? [`Google Meet: ${meetUrl}`] : []),
      ...(body.notes?.trim() ? [`Notes: ${body.notes.trim()}`] : []),
    ],
    ctaLabel: "Open calendar",
    ctaPath: "/calendar",
  });

  void dispatchWebhooks(admin, page.user_id, "meeting.created", event).catch(() => undefined);

  return NextResponse.json({ success: true, start: slot.start, end: slot.end, meetUrl });
}
