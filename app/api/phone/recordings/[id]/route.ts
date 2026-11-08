import { NextResponse } from "next/server";
import { recordingDownloadUrl } from "@/lib/phone/telnyx";
import { phoneRoute } from "../../_shared";

// Plays a call recording. Database rules decide who may see the call.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await phoneRoute();
  if (error) return error;
  const { id } = await context.params;

  const { data: call } = await supabase.from("calls").select("recording_id").eq("id", id).maybeSingle();
  if (!call?.recording_id) return NextResponse.json({ error: "No recording." }, { status: 404 });

  try {
    const url = await recordingDownloadUrl(call.recording_id);
    if (!url) return NextResponse.json({ error: "Recording not ready." }, { status: 404 });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Recording unavailable." }, { status: 502 });
  }
}
