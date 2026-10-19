import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { markDoNotContact, verifyUnsubscribeToken } from "@/lib/compliance";
import { logActivity } from "@/lib/automation";

/*
 * One-click unsubscribe (RFC 8058). Gmail/Outlook POST here when the
 * recipient presses their native "Unsubscribe" button; our /u page does too.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const leadId = verifyUnsubscribeToken(token);

  if (!leadId) return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  if (!hasAdminClient()) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const admin = createAdminClient();
  const lead = await markDoNotContact(admin, leadId, "Unsubscribed by link");

  if (lead) {
    const { data: full } = await admin
      .from("leads")
      .select("user_id, assigned_to, company_id")
      .eq("id", leadId)
      .maybeSingle();

    await logActivity(admin, {
      leadId,
      companyId: full?.company_id ?? null,
      userId: full?.assigned_to || full?.user_id || null,
      type: "unsubscribed",
      title: "Unsubscribed from emails — BaseLead won't email them again",
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true });
}
