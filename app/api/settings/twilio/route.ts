import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";
import { setWorkspaceSecret, getWorkspaceSecret } from "@/lib/workspace-secrets";
import { normalizePhone, verifyTwilioAccount } from "@/lib/twilio";
import { appUrl } from "@/lib/stripe";

export async function GET(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!hasAdminClient()) return NextResponse.json({ configured: false, connected: false });

  const stored = await getWorkspaceSecret(access.company.id, "twilio").catch(() => null);

  return NextResponse.json({
    configured: true,
    connected: Boolean(stored),
    label: stored?.label ?? null,
    isOwner: access.isOwner,
    webhookUrl: `${appUrl(request)}/api/twilio/inbound?c=${access.company.id}`,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!access.isOwner) return NextResponse.json({ error: "Only the owner can change this." }, { status: 403 });
  if (!hasAdminClient()) return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY first." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    disconnect?: boolean;
  };

  if (body.disconnect) {
    await setWorkspaceSecret(access.company.id, "twilio", null);
    return NextResponse.json({ connected: false });
  }

  const credentials = {
    accountSid: body.accountSid?.trim() ?? "",
    authToken: body.authToken?.trim() ?? "",
    fromNumber: normalizePhone(body.fromNumber) ?? "",
  };

  if (!/^AC[a-f0-9]{32}$/i.test(credentials.accountSid) || !credentials.authToken || !credentials.fromNumber) {
    return NextResponse.json({ error: "Fill in the Account SID, Auth Token and your Twilio number." }, { status: 400 });
  }

  try {
    const name = await verifyTwilioAccount(credentials);
    await setWorkspaceSecret(
      access.company.id,
      "twilio",
      JSON.stringify(credentials),
      `${name} · ${credentials.fromNumber}`
    );
    return NextResponse.json({ connected: true, label: `${name} · ${credentials.fromNumber}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not connect Twilio." },
      { status: 400 }
    );
  }
}
