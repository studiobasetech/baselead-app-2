import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { cleanItems, computeTotals } from "@/lib/proposals";

// List proposals for the workspace.
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("company_id", access.company.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, proposals: [] }, { status: 500 });
  }

  return NextResponse.json({ proposals: data ?? [] });
}

// Create a proposal (optionally for a lead).
export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  if (!access.active) {
    return NextResponse.json({ error: "Your subscription is not active." }, { status: 402 });
  }

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const items = cleanItems(input.line_items);
  const discount = Number(input.discount) || 0;
  const taxRate = Number(input.tax_rate) || 0;
  const totals = computeTotals(items, discount, taxRate);

  const { count } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("company_id", access.company.id);

  let clientName = (input.client_name as string) || null;
  let clientEmail = (input.client_email as string) || null;

  if (input.lead_id && (!clientName || !clientEmail)) {
    const { data: lead } = await supabase
      .from("leads")
      .select("company, name, email, contact_name")
      .eq("id", input.lead_id as string)
      .maybeSingle();

    clientName = clientName || lead?.company || lead?.name || null;
    clientEmail = clientEmail || lead?.email || null;
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      company_id: access.company.id,
      user_id: access.user.id,
      lead_id: (input.lead_id as string) || null,
      number: `P-${String((count ?? 0) + 1001)}`,
      title: String(input.title || "Proposal").slice(0, 200),
      intro: (input.intro as string) || null,
      line_items: items,
      currency: String(input.currency || "usd").toLowerCase(),
      discount,
      tax_rate: taxRate,
      subtotal: totals.subtotal,
      total: totals.total,
      terms: (input.terms as string) || null,
      valid_until: (input.valid_until as string) || null,
      payment_mode: ["none", "deposit", "full"].includes(input.payment_mode as string)
        ? input.payment_mode
        : "none",
      deposit_percent: Math.min(100, Math.max(1, Number(input.deposit_percent) || 50)),
      client_name: clientName,
      client_email: clientEmail,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proposal: data });
}
