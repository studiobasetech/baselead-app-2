import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { dispatchWebhooks } from "@/lib/webhooks";

const EDITABLE = [
  "status",
  "notes",
  "name",
  "company",
  "email",
  "phone",
  "website",
  "industry",
  "location",
  "assigned_to",
  "deal_value",
  "expected_close_date",
  "contact_name",
  "contact_title",
  "lost_reason",
] as const;

// Update a lead (e.g. move it in the pipeline).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  for (const field of EDITABLE) {
    if (field in body) update[field] = body[field];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { data: before } = await supabase
    .from("leads")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (access.can("integrations_webhooks")) {
    const event =
      "status" in update && before?.status !== data.status
        ? "lead.status_changed"
        : "lead.updated";

    void dispatchWebhooks(supabase, access.user.id, event, data).catch(
      () => undefined
    );
  }

  return NextResponse.json({ success: true, lead: data });
}

// Delete a lead.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
