export const maxDuration = 60;

import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAction, lastTen, telnyx, verifyTelnyxSignature } from "@/lib/phone/telnyx";
import { DEFAULT_PHONE_SETTINGS, isAfterHours, loadPhoneSettings, type PhoneSettings } from "@/lib/phone/access";
import { findLeadByPhone } from "@/lib/phone/leads";
import { summarizeRecording } from "@/lib/phone/summary";
import { effectivePlan, getPlan } from "@/lib/plans";
import { notifyUser } from "@/lib/notify";
import { formatCallerForPush } from "@/lib/phone/format";

/*
 * Telnyx call events → BaseLead call log.
 * Point BOTH the Call Control app and the credential connection webhooks here:
 *   https://YOUR-DOMAIN/api/phone/webhook
 */

type Payload = {
  call_control_id?: string;
  call_session_id?: string;
  connection_id?: string;
  from?: string;
  to?: string;
  direction?: "incoming" | "outgoing";
  client_state?: string | null;
  recording_id?: string;
  recording_urls?: { mp3?: string; wav?: string };
  hangup_cause?: string;
};

type CallRow = {
  id: string;
  company_id: string;
  user_id: string | null;
  direction: string;
  status: string;
  answered_at: string | null;
  recording_status: string | null;
  flags: string[] | null;
};

const ANNOUNCEMENT = "This call may be recorded for quality and training.";

export async function POST(request: Request) {
  const raw = await request.text();
  const valid = verifyTelnyxSignature(raw, request.headers.get("telnyx-signature-ed25519"), request.headers.get("telnyx-timestamp"));
  if (!valid) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let event: { data?: { event_type?: string; occurred_at?: string; payload?: Payload } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  const type = event.data?.event_type ?? "";
  const payload = event.data?.payload ?? {};
  const at = event.data?.occurred_at ?? new Date().toISOString();

  try {
    switch (type) {
      case "call.initiated":
        await onInitiated(payload, at);
        break;
      case "call.answered":
        await onAnswered(payload, at);
        break;
      case "call.hangup":
        await onHangup(payload, at);
        break;
      case "call.recording.saved":
        await onRecordingSaved(payload);
        break;
    }
  } catch (handlerError) {
    console.error(`Phone webhook ${type} error:`, handlerError);
  }

  return NextResponse.json({ received: true });
}

/* ---------------- helpers ---------------- */

async function findCall(payload: Payload): Promise<CallRow | null> {
  const admin = createAdminClient();
  const columns = "id, company_id, user_id, direction, status, answered_at, recording_status, flags";

  if (payload.call_session_id) {
    const { data } = await admin.from("calls").select(columns).eq("telnyx_call_session_id", payload.call_session_id).limit(1).maybeSingle<CallRow>();
    if (data) return data;
  }
  if (payload.call_control_id) {
    const { data } = await admin.from("calls").select(columns).eq("telnyx_call_control_id", payload.call_control_id).limit(1).maybeSingle<CallRow>();
    if (data) return data;
  }
  return null;
}

function decodeState(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

async function companyCanCall(companyId: string) {
  const admin = createAdminClient();
  const { data: company } = await admin.from("company_profiles").select("*").eq("id", companyId).maybeSingle();
  if (!company) return false;
  let billing = company;
  if (company.parent_company_id) {
    const { data: parent } = await admin.from("company_profiles").select("*").eq("id", company.parent_company_id).maybeSingle();
    if (parent) billing = parent;
  }
  const status = billing.billing_status;
  if (status !== "active") return false; // no calling during the free trial
  return getPlan(effectivePlan(billing.plan, status)).features.includes("phone_calling");
}

/* ---------------- events ---------------- */

async function onInitiated(payload: Payload, at: string) {
  const admin = createAdminClient();
  const to = payload.to ?? "";
  if (to.startsWith("sip:")) return; // our own leg toward the rep's in-app phone

  // A) Someone calls a rep's number → ring that rep in BaseLead.
  if (payload.direction === "incoming" && payload.connection_id === process.env.TELNYX_CALL_CONTROL_APP_ID) {
    const { data: number } = await admin
      .from("phone_numbers")
      .select("company_id, user_id, phone_number")
      .eq("status", "active")
      .ilike("phone_number", `%${lastTen(to)}`)
      .limit(1)
      .maybeSingle();

    if (!number || !(await companyCanCall(number.company_id))) {
      await callAction(payload.call_control_id!, "hangup").catch(() => undefined);
      return;
    }

    const settings = await loadPhoneSettings(number.company_id).catch(() => DEFAULT_PHONE_SETTINGS);
    const lead = await findLeadByPhone(number.company_id, payload.from);
    const flags = [...(lead ? [] : ["unknown_caller"]), ...(isAfterHours(new Date(at), settings) ? ["after_hours"] : [])];

    await admin.from("calls").insert({
      company_id: number.company_id,
      user_id: number.user_id,
      lead_id: lead?.id ?? null,
      direction: "inbound",
      from_number: payload.from,
      to_number: number.phone_number,
      status: "ringing",
      started_at: at,
      flags,
      telnyx_call_control_id: payload.call_control_id,
      telnyx_call_session_id: payload.call_session_id,
    });

    const { data: credential } = number.user_id
      ? await admin.from("phone_credentials").select("sip_username").eq("company_id", number.company_id).eq("user_id", number.user_id).maybeSingle()
      : { data: null };

    if (!credential) {
      await callAction(payload.call_control_id!, "hangup").catch(() => undefined);
      return;
    }

    await callAction(payload.call_control_id!, "transfer", {
      to: `sip:${credential.sip_username}@sip.telnyx.com`,
      from: payload.from,
      timeout_secs: 30,
    });
    return;
  }

  // B) A rep places a call from the in-app phone (credential connection).
  const state = decodeState(payload.client_state);
  let row: CallRow | null = null;

  if (state.callId) {
    const { data } = await admin.from("calls").select("id, company_id, user_id, direction, status, answered_at, recording_status, flags").eq("id", state.callId).maybeSingle<CallRow>();
    row = data;
  }
  if (!row && payload.from) {
    // Fallback: the most recent pending call from this number in the last 2 minutes.
    const { data } = await admin
      .from("calls")
      .select("id, company_id, user_id, direction, status, answered_at, recording_status, flags")
      .eq("status", "initiated")
      .ilike("from_number", `%${lastTen(payload.from)}`)
      .gte("started_at", new Date(Date.now() - 120000).toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<CallRow>();
    row = data;
  }

  if (!row) {
    // Not started through BaseLead (no checks done): stop it.
    if (payload.call_control_id) await callAction(payload.call_control_id, "hangup").catch(() => undefined);
    return;
  }

  await admin
    .from("calls")
    .update({ status: "ringing", telnyx_call_control_id: payload.call_control_id, telnyx_call_session_id: payload.call_session_id })
    .eq("id", row.id);
}

async function onAnswered(payload: Payload, at: string) {
  const row = await findCall(payload);
  if (!row || row.answered_at) return;
  const admin = createAdminClient();

  await admin.from("calls").update({ status: "answered", answered_at: at, recording_status: "recording" }).eq("id", row.id);

  const settings: PhoneSettings = await loadPhoneSettings(row.company_id).catch(() => DEFAULT_PHONE_SETTINGS);
  const id = payload.call_control_id!;

  // Every call is recorded (both sides, separate channels).
  await callAction(id, "record_start", { format: "mp3", channels: "dual", play_beep: false }).catch((error) =>
    console.error("record_start failed:", error)
  );
  if (settings.announcement) {
    await callAction(id, "speak", { payload: ANNOUNCEMENT, voice: "female", language: "en-US" }).catch(() => undefined);
  }
}

async function onHangup(payload: Payload, at: string) {
  const row = await findCall(payload);
  if (!row || row.status === "completed" || row.status === "missed") return;
  const admin = createAdminClient();

  const answeredAt = row.answered_at ? new Date(row.answered_at).getTime() : null;
  const duration = answeredAt ? Math.max(0, Math.round((new Date(at).getTime() - answeredAt) / 1000)) : 0;
  const settings = await loadPhoneSettings(row.company_id).catch(() => DEFAULT_PHONE_SETTINGS);
  const flags = new Set(row.flags ?? []);
  if (duration >= settings.long_call_minutes * 60) flags.add("long_call");

  await admin
    .from("calls")
    .update({
      status: answeredAt ? "completed" : row.direction === "inbound" ? "missed" : "completed",
      outcome: answeredAt ? undefined : row.direction === "inbound" ? "callback" : "no_answer",
      ended_at: at,
      duration_seconds: duration,
      billable_minutes: Math.ceil(duration / 60),
      recording_status: answeredAt ? row.recording_status : "none",
      flags: Array.from(flags),
    })
    .eq("id", row.id);

  // Missed incoming call → push to the rep's phone.
  if (!answeredAt && row.direction === "inbound" && row.user_id) {
    const { data: call } = await admin.from("calls").select("from_number, lead:leads(name, company)").eq("id", row.id).maybeSingle();
    const lead = (call?.lead ?? null) as { name?: string | null; company?: string | null } | null;
    const who = lead?.company || lead?.name || formatCallerForPush(call?.from_number);
    await notifyUser(admin, row.user_id, "missed_call", {
      subject: "Missed call",
      heading: `Missed call from ${who}`,
      lines: [`Missed call from ${who}. Tap to call back.`],
      ctaPath: "/calls",
    }).catch(() => undefined);
  }
}

async function onRecordingSaved(payload: Payload) {
  const row = await findCall(payload);
  if (!row) return;
  const admin = createAdminClient();

  let recordingId = payload.recording_id ?? null;
  if (!recordingId && payload.call_session_id) {
    const list = await telnyx<{ data: { id: string }[] }>(
      "GET",
      `recordings?filter[call_session_id]=${encodeURIComponent(payload.call_session_id)}`
    ).catch(() => ({ data: [] }));
    recordingId = list.data?.[0]?.id ?? null;
  }

  await admin.from("calls").update({ recording_id: recordingId, recording_status: "saved" }).eq("id", row.id);

  // AI review after we've answered Telnyx (the download link is valid for a few minutes).
  const audioUrl = payload.recording_urls?.mp3;
  if (audioUrl) {
    after(async () => {
      const summary = await summarizeRecording(audioUrl).catch(() => null);
      if (!summary) return;
      const flags = new Set(row.flags ?? []);
      if (summary.summary.startsWith("PERSONAL CALL:")) flags.add("personal");
      await admin.from("calls").update({ ai_summary: summary, flags: Array.from(flags) }).eq("id", row.id);
    });
  }
}
