import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";
import { getWorkspaceSecret, setWorkspaceSecret } from "@/lib/workspace-secrets";
import { stripeRequest } from "@/lib/stripe";

// The workspace's own Stripe account for collecting proposal payments.
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!hasAdminClient()) return NextResponse.json({ connected: false, configured: false });

  const secret = await getWorkspaceSecret(access.company.id, "stripe").catch(() => null);

  return NextResponse.json({
    configured: true,
    connected: Boolean(secret),
    account: secret?.label ?? null,
    isOwner: access.isOwner,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!access.isOwner) {
    return NextResponse.json({ error: "Only the workspace owner can change payments." }, { status: 403 });
  }
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY first." }, { status: 503 });
  }

  const { secretKey } = (await request.json().catch(() => ({}))) as { secretKey?: string };
  const key = secretKey?.trim() ?? "";

  if (!key) {
    await setWorkspaceSecret(access.company.id, "stripe", null);
    return NextResponse.json({ connected: false });
  }

  if (!/^(sk|rk)_(live|test)_/.test(key)) {
    return NextResponse.json(
      { error: "That doesn't look like a Stripe secret key (sk_live_… or rk_live_…)." },
      { status: 400 }
    );
  }

  try {
    const account = await stripeRequest<{
      id: string;
      settings?: { dashboard?: { display_name?: string } };
      business_profile?: { name?: string };
    }>("GET", "account", {}, key);

    const label =
      account.settings?.dashboard?.display_name ||
      account.business_profile?.name ||
      account.id;

    await setWorkspaceSecret(
      access.company.id,
      "stripe",
      key,
      `${label}${key.includes("_test_") ? " (test mode)" : ""}`
    );

    return NextResponse.json({ connected: true, account: label });
  } catch {
    return NextResponse.json({ error: "Stripe rejected that key." }, { status: 400 });
  }
}
