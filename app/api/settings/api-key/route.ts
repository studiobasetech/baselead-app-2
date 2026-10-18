import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";
import { generateApiKey } from "@/lib/api-keys";

// Returns info about the current key (never the key itself).
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { data } = await supabase
    .from("api_keys")
    .select("prefix, created_at, last_used_at, requests_this_month")
    .eq("user_id", access.user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    key: data,
    allowed: access.can("api_access"),
    monthlyLimit: access.definition.apiRequestLimit,
  });
}

// Creates a new key (revoking the previous one). The full key is shown once.
export async function POST() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.can("api_access")) {
    return NextResponse.json(planRequiredBody("api_access"), { status: 402 });
  }

  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", access.user.id)
    .is("revoked_at", null);

  const { key, prefix, hash } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: access.user.id,
    company_id: access.company.id,
    prefix,
    key_hash: hash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ key, prefix });
}

// Revokes the active key.
export async function DELETE() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", access.user.id)
    .is("revoked_at", null);

  return NextResponse.json({ success: true });
}
