import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";
import { runSequences } from "@/lib/automation";

// Add leads to a sequence. The first step goes out right away.
export async function POST(request: Request) {
  const { sequenceId, leadIds } = (await request.json().catch(() => ({}))) as {
    sequenceId?: string;
    leadIds?: string[];
  };

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!access.can("outreach_automation")) {
    return NextResponse.json(planRequiredBody("outreach_automation"), { status: 402 });
  }

  if (!sequenceId || !leadIds?.length) {
    return NextResponse.json({ error: "Choose a sequence and at least one lead." }, { status: 400 });
  }

  const { data: firstStep } = await supabase
    .from("sequence_steps")
    .select("delay_days")
    .eq("sequence_id", sequenceId)
    .eq("step_order", 1)
    .maybeSingle();

  const startAt = new Date(Date.now() + (firstStep?.delay_days ?? 0) * 86400000).toISOString();

  const { data, error } = await supabase
    .from("sequence_enrollments")
    .upsert(
      leadIds.slice(0, 200).map((leadId) => ({
        sequence_id: sequenceId,
        lead_id: leadId,
        company_id: access.company.id,
        user_id: access.user.id,
        status: "active",
        current_step: 0,
        next_run_at: startAt,
      })),
      { onConflict: "sequence_id,lead_id", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send anything due now (e.g. step 1 with 0-day delay).
  const run = await runSequences(supabase, access.user.id);

  return NextResponse.json({ enrolled: data?.length ?? 0, sent: run.sent, errors: run.errors });
}

// Remove a lead from a sequence.
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sequenceId = url.searchParams.get("sequenceId");
  const leadId = url.searchParams.get("leadId");

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  await supabase
    .from("sequence_enrollments")
    .update({ status: "stopped", next_run_at: null })
    .eq("sequence_id", sequenceId ?? "")
    .eq("lead_id", leadId ?? "");

  return NextResponse.json({ success: true });
}
