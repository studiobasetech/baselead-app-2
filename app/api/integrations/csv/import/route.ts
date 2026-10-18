import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { parseCSV } from "@/lib/csv";

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "contact", "contact name", "full name", "nombre"],
  company: ["company", "business", "company name", "business name", "empresa", "negocio"],
  email: ["email", "e-mail", "email address", "correo"],
  phone: ["phone", "phone number", "telephone", "tel", "telefono", "teléfono"],
  website: ["website", "web", "url", "site", "sitio web"],
  industry: ["industry", "industria", "sector"],
  category: ["category", "categoria", "categoría"],
  address: ["address", "direccion", "dirección"],
  city: ["city", "ciudad"],
  state: ["state", "estado", "province", "region"],
  country: ["country", "pais", "país"],
  notes: ["notes", "note", "notas"],
};

// Imports leads from a CSV file (counts toward the plan's lead limit).
export async function POST(request: Request) {
  const { csv } = (await request.json().catch(() => ({}))) as { csv?: string };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ success: false, error: "Please sign in." }, { status: 401 });
  }

  if (!access.active) {
    return NextResponse.json(
      { success: false, error: "Your subscription is not active. Choose a plan to continue." },
      { status: 402 }
    );
  }

  const rows = parseCSV(csv ?? "");

  if (rows.length < 2) {
    return NextResponse.json(
      { success: false, error: "The CSV needs a header row and at least one lead." },
      { status: 400 }
    );
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const index: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const position = headers.findIndex((h) => aliases.includes(h));
    if (position >= 0) index[field] = position;
  }

  if (index.company === undefined && index.name === undefined) {
    return NextResponse.json(
      { success: false, error: 'The CSV must have a "company" or "name" column.' },
      { status: 400 }
    );
  }

  // Lead limit for the current period.
  const periodStart = access.isTrial
    ? access.company.trial_started_at
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  let usedQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.user.id);

  if (periodStart) usedQuery = usedQuery.gte("created_at", periodStart);

  const { count: used } = await usedQuery;
  const remaining = Math.max(0, access.leadLimit - (used ?? 0));

  // Existing emails to skip duplicates.
  const { data: existing } = await supabase
    .from("leads")
    .select("email, company")
    .eq("user_id", access.user.id);

  const seen = new Set(
    (existing ?? []).flatMap((lead) =>
      [lead.email?.toLowerCase(), lead.company?.toLowerCase()].filter(Boolean)
    )
  );

  let skipped = 0;
  let errors = 0;
  const toInsert: Record<string, unknown>[] = [];

  for (const row of rows.slice(1)) {
    const get = (field: string) =>
      index[field] !== undefined ? (row[index[field]] ?? "").trim() : "";

    const company = get("company") || get("name");
    const email = get("email").toLowerCase();

    if (!company) {
      errors++;
      continue;
    }

    if ((email && seen.has(email)) || seen.has(company.toLowerCase())) {
      skipped++;
      continue;
    }

    if (toInsert.length >= remaining) {
      skipped++;
      continue;
    }

    seen.add(company.toLowerCase());
    if (email) seen.add(email);

    const city = get("city");
    const state = get("state");

    toInsert.push({
      user_id: access.user.id,
      company_id: access.company.id,
      name: get("name") || company,
      company,
      email: email || null,
      phone: get("phone") || null,
      website: get("website") || null,
      industry: get("industry") || null,
      category: get("category") || null,
      address: get("address") || null,
      city: city || null,
      state: state || null,
      country: get("country") || null,
      location: [city, state].filter(Boolean).join(", ") || null,
      notes: get("notes") || null,
      status: "new",
      source: "csv",
      raw_data: { provider: "csv" },
    });
  }

  if (toInsert.length) {
    const { error } = await supabase.from("leads").insert(toInsert);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    imported: toInsert.length,
    skipped,
    errors,
    limitReached: toInsert.length >= remaining && rows.length - 1 > toInsert.length,
  });
}
