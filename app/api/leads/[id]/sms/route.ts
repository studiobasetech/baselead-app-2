import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";
import { getTwilio, normalizePhone, sendSms } from "@/lib/twilio";
import { advanceLead, logActivity } from "@/lib/automation";

// Sends a text message to the lead from the workspace's Twilio number (Pro/Scale).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { to?: string; message?: string };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  if (!access.can("outreach_automation")) {
    return NextResponse.json(planRequiredBody("outreach_automation"), { status: 402 });
  }

  const message = body.message?.trim() ?? "";
  if (!message) return NextResponse.json({ error: "Write a message." }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

  const twilio = await getTwilio(access.company.id);

  if (!twilio) {
    return NextResponse.json(
      { error: "Connect Twilio in Integrations to send texts." },
      { status: 400 }
    );
  }

  const { data: lead } = await supabase.from("leads").select("id, phone").eq("id", id).maybeSingle();
  const to = normalizePhone(body.to || lead?.phone);

  if (!lead || !to) return NextResponse.json({ error: "This lead has no phone number." }, { status: 400 });

  try {
    const sid = await sendSms(twilio, to, message);

    await logActivity(supabase, {
      leadId: id,
      companyId: access.company.id,
      userId: access.user.id,
      type: "sms_sent",
      title: `Text sent to ${to}`,
      body: message,
      metadata: { sid, to },
    });

    await advanceLead(supabase, id, "contacted", "Text message sent.", access.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send." },
      { status: 400 }
    );
  }
}
