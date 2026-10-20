import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { canReadInbox, detectReplies, runSequences } from "@/lib/automation";
import { sendOutreachEmail } from "@/lib/outreach-send";

// "Sync now" for the signed-in user (same work as the scheduled heartbeat).
export async function POST() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.active) {
    return NextResponse.json({ error: "Your subscription is not active." }, { status: 402 });
  }

  const result = {
    replies: 0,
    sequenceEmails: 0,
    sequenceTasks: 0,
    scheduled: 0,
    checked: 0,
    gmailConnected: false,
    inboxAccess: false,
    replyAddress: Boolean(process.env.INBOUND_REPLY_DOMAIN),
    nextFollowUpAt: null as string | null,
    errors: [] as string[],
  };

  const { data: gmail } = await supabase
    .from("integration_credentials")
    .select("user_id")
    .eq("user_id", access.user.id)
    .eq("provider", "gmail")
    .maybeSingle();
  result.gmailConnected = Boolean(gmail);
  result.inboxAccess = result.gmailConnected && (await canReadInbox(supabase, access.user.id));

  try {
    const replies = await detectReplies(supabase, access.user.id);
    result.replies = replies.replies;
    result.checked = replies.checked;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Reply check failed.");
  }

  if (access.can("outreach_automation")) {
    const sequences = await runSequences(supabase, access.user.id);
    result.sequenceEmails = sequences.sent;
    result.sequenceTasks = sequences.tasks;
    result.errors.push(...sequences.errors);

    const { data: scheduled } = await supabase
      .from("outreach")
      .select("id")
      .eq("user_id", access.user.id)
      .eq("status", "scheduled")
      .is("sent_at", null)
      .lte("scheduled_at", new Date().toISOString())
      .limit(25);

    for (const item of scheduled ?? []) {
      try {
        await sendOutreachEmail(supabase, item.id);
        result.scheduled++;
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : "Send failed.");
      }
    }
  }

  const { data: next } = await supabase
    .from("sequence_enrollments")
    .select("next_run_at")
    .eq("user_id", access.user.id)
    .eq("status", "active")
    .order("next_run_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  result.nextFollowUpAt = next?.next_run_at ?? null;

  return NextResponse.json(result);
}
