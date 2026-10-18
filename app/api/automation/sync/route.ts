import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { detectReplies, runSequences } from "@/lib/automation";
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
    errors: [] as string[],
  };

  try {
    const replies = await detectReplies(supabase, access.user.id);
    result.replies = replies.replies;
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

  return NextResponse.json(result);
}
