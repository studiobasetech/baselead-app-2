import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneRoute } from "../_shared";

// The rep accepts the call recording policy (once per company).
export async function POST() {
  const { error, phone } = await phoneRoute();
  if (error) return error;

  const { error: saveError } = await createAdminClient()
    .from("phone_policy_acceptances")
    .upsert({ company_id: phone.companyId, user_id: phone.userId, accepted_at: new Date().toISOString() });

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
