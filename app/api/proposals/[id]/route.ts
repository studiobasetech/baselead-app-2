import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { cleanItems, computeTotals } from "@/lib/proposals";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE = [
  "title",
  "intro",
  "currency",
  "discount",
  "tax_rate",
  "terms",
  "valid_until",
  "payment_mode",
  "deposit_percent",
  "client_name",
  "client_email",
  "lead_id",
] as const;

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();

  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ proposal: data });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data: current } = await supabase
    .from("proposals")
    .select("status, line_items, discount, tax_rate")
    .eq("id", id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (["signed", "paid"].includes(current.status)) {
    return NextResponse.json(
      { error: "A signed proposal can't be edited. Duplicate it instead." },
      { status: 400 }
    );
  }

  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const field of EDITABLE) {
    if (field in input) update[field] = input[field] === "" ? null : input[field];
  }

  const items = "line_items" in input ? cleanItems(input.line_items) : current.line_items;
  const totals = computeTotals(
    items,
    Number(update.discount ?? current.discount) || 0,
    Number(update.tax_rate ?? current.tax_rate) || 0
  );

  update.line_items = items;
  update.subtotal = totals.subtotal;
  update.total = totals.total;

  const { data, error } = await supabase
    .from("proposals")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proposal: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { error } = await supabase.from("proposals").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
