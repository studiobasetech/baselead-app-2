import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { isContactsConfigured } from "@/lib/contacts/hunter";
import { findDecisionMakers, lookupsUsedThisMonth } from "@/lib/contacts/lookup";

type Ctx = { params: Promise<{ id: string }> };

// Contacts saved for a lead + lookup credits.
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const [{ data: contacts }, used] = await Promise.all([
    supabase
      .from("lead_contacts")
      .select("*")
      .eq("lead_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    lookupsUsedThisMonth(supabase, access.company.id),
  ]);

  return NextResponse.json({
    contacts: contacts ?? [],
    configured: isContactsConfigured(),
    used,
    limit: access.definition.contactLookupLimit,
  });
}

// { action: "find" } | { action: "add", ... } | { action: "primary", contactId } | { action: "delete", contactId }
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;

  if (body.action === "find") {
    if (!access.active) {
      return NextResponse.json({ error: "Your subscription is not active." }, { status: 402 });
    }

    if (!isContactsConfigured()) {
      return NextResponse.json(
        { error: "Decision-maker search is not connected. Add HUNTER_API_KEY (see SETUP-BASELEAD.md)." },
        { status: 503 }
      );
    }

    const used = await lookupsUsedThisMonth(supabase, access.company.id);

    if (used >= access.definition.contactLookupLimit) {
      return NextResponse.json(
        {
          code: "LIMIT",
          error: `You used all ${access.definition.contactLookupLimit} contact lookups this month. Upgrade for more.`,
        },
        { status: 402 }
      );
    }

    try {
      const contacts = await findDecisionMakers(supabase, access, id);
      return NextResponse.json({ contacts, found: contacts.length });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Search failed." },
        { status: 400 }
      );
    }
  }

  if (body.action === "add") {
    const email = body.email?.trim().toLowerCase() || null;
    const name = body.full_name?.trim() || null;

    if (!name && !email) {
      return NextResponse.json({ error: "Add a name or email." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("lead_contacts")
      .insert({
        company_id: access.company.id,
        lead_id: id,
        full_name: name,
        title: body.title?.trim() || null,
        email,
        phone: body.phone?.trim() || null,
        linkedin_url: body.linkedin_url?.trim() || null,
        source: "manual",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ contact: data });
  }

  if (body.action === "primary" && body.contactId) {
    const { data: contact } = await supabase
      .from("lead_contacts")
      .select("*")
      .eq("id", body.contactId)
      .maybeSingle();

    if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

    await supabase.from("lead_contacts").update({ is_primary: false }).eq("lead_id", id);
    await supabase.from("lead_contacts").update({ is_primary: true }).eq("id", contact.id);

    await supabase
      .from("leads")
      .update({
        contact_name: contact.full_name,
        contact_title: contact.title,
        linkedin_contact_url: contact.linkedin_url,
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.phone ? { phone: contact.phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true });
  }

  if (body.action === "delete" && body.contactId) {
    await supabase.from("lead_contacts").delete().eq("id", body.contactId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
