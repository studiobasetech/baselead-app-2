import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCredential, credentialToken, isTelnyxConfigured } from "@/lib/phone/telnyx";
import { phoneRoute, planRequired } from "../_shared";

// Login token for the rep's in-app phone (creates their calling login the first time).
export async function POST() {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.allowed) return planRequired();
  if (!isTelnyxConfigured()) {
    return NextResponse.json({ code: "NOT_CONFIGURED", error: "Calling isn't connected yet." }, { status: 503 });
  }

  const admin = createAdminClient();
  const [{ data: number }, { data: policy }] = await Promise.all([
    admin.from("phone_numbers").select("phone_number").eq("company_id", phone.companyId).eq("user_id", phone.userId).eq("status", "active").maybeSingle(),
    admin.from("phone_policy_acceptances").select("accepted_at").eq("company_id", phone.companyId).eq("user_id", phone.userId).maybeSingle(),
  ]);

  if (!number) {
    return NextResponse.json({ code: "NO_NUMBER", error: "You don't have a phone number yet. Ask your manager to assign one." }, { status: 400 });
  }
  if (!policy) {
    return NextResponse.json({ code: "POLICY", error: "Accept the call recording policy first." }, { status: 400 });
  }

  try {
    let { data: credential } = await admin
      .from("phone_credentials")
      .select("telnyx_credential_id, sip_username")
      .eq("company_id", phone.companyId)
      .eq("user_id", phone.userId)
      .maybeSingle();

    if (!credential) {
      const created = await createCredential(`bl-${phone.userId.slice(0, 8)}`, `company:${phone.companyId}`);
      credential = { telnyx_credential_id: created.id, sip_username: created.sip_username };
      await admin.from("phone_credentials").insert({
        company_id: phone.companyId,
        user_id: phone.userId,
        telnyx_credential_id: created.id,
        sip_username: created.sip_username,
      });
    }

    const token = await credentialToken(credential.telnyx_credential_id);
    return NextResponse.json({ token, callerNumber: number.phone_number });
  } catch (tokenError) {
    console.error("Phone token error:", tokenError);
    return NextResponse.json({ error: "Could not start the phone. Try again." }, { status: 502 });
  }
}
