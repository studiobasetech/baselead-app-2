import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTelnyxConfigured, toNorthAmerican } from "@/lib/phone/telnyx";
import { isAfterHours, loadPhoneSettings, phoneUsage } from "@/lib/phone/access";
import { findLeadByPhone, leadInCompany } from "@/lib/phone/leads";
import { phoneRoute, planRequired } from "../../_shared";

// Checks a call before it is placed (plan, minutes, USA/Canada, lead rules) and logs it.
export async function POST(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.allowed) return planRequired();
  if (!isTelnyxConfigured()) return NextResponse.json({ code: "NOT_CONFIGURED", error: "Calling isn't connected yet." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { to?: string; leadId?: string };
  const to = toNorthAmerican(body.to);
  if (!to) {
    return NextResponse.json({ error: "Only phone numbers in the USA and Canada can be called." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: number } = await admin
    .from("phone_numbers")
    .select("phone_number")
    .eq("company_id", phone.companyId)
    .eq("user_id", phone.userId)
    .eq("status", "active")
    .maybeSingle();
  if (!number) return NextResponse.json({ code: "NO_NUMBER", error: "You don't have a phone number yet." }, { status: 400 });

  const settings = await loadPhoneSettings(phone.companyId);
  const usage = await phoneUsage(phone.companyId, phone.userId, phone.allowance, settings);
  if (usage.remaining <= 0 && !usage.overageAvailable) {
    return NextResponse.json(
      {
        code: "NO_MINUTES",
        error: usage.overageEnabled
          ? "Your team reached its monthly overage spending cap. A manager can raise it in Phone setup."
          : "Your team has used all its calling minutes this month.",
      },
      { status: 403 }
    );
  }
  if (usage.myLimit !== null && usage.myUsed >= usage.myLimit) {
    return NextResponse.json({ code: "REP_LIMIT", error: "You reached your monthly calling limit." }, { status: 403 });
  }

  const lead = (await leadInCompany(phone.companyId, body.leadId)) ?? (await findLeadByPhone(phone.companyId, to));
  const flags: string[] = [];
  if (!lead) {
    if (settings.non_lead_policy === "block") {
      return NextResponse.json(
        { code: "NOT_A_LEAD", error: "You can only call leads saved in BaseLead. Add this number as a lead first." },
        { status: 403 }
      );
    }
    flags.push("not_a_lead");
  }
  if (isAfterHours(new Date(), settings)) flags.push("after_hours");

  const { data: call, error: insertError } = await admin
    .from("calls")
    .insert({
      company_id: phone.companyId,
      user_id: phone.userId,
      lead_id: lead?.id ?? null,
      direction: "outbound",
      from_number: number.phone_number,
      to_number: to,
      status: "initiated",
      flags,
    })
    .select("id")
    .single();

  if (insertError || !call) return NextResponse.json({ error: insertError?.message || "Could not start the call." }, { status: 500 });

  return NextResponse.json({ callId: call.id, to, callerNumber: number.phone_number, lead });
}
