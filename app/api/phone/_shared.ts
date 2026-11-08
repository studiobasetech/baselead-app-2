import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { getPhoneAccess } from "@/lib/phone/access";

/** Signed-in user with a workspace; 401/503 response otherwise. */
export async function phoneRoute() {
  const supabase = await createClient();
  const phone = await getPhoneAccess(supabase);
  if (!phone) {
    return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }), phone: null, supabase };
  }
  if (!hasAdminClient()) {
    return { error: NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local." }, { status: 503 }), phone: null, supabase };
  }
  return { error: null, phone, supabase };
}

export function planRequired() {
  return NextResponse.json(
    { code: "PLAN_REQUIRED", requiredPlan: "Pro", error: "Built-in calling is available on the Pro and Scale plans." },
    { status: 403 }
  );
}
