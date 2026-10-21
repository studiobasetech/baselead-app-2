import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess, planRequiredBody } from "@/lib/workspace";

type StepInput = {
  delay_days?: number;
  type?: string;
  subject?: string;
  body?: string;
};

async function guard() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  }

  return { supabase, access };
}

function cleanSteps(steps: StepInput[] | undefined) {
  return (steps ?? [])
    .filter((step) => (step.body ?? "").trim() || step.type !== "email")
    .slice(0, 10)
    .map((step, index) => ({
      step_order: index + 1,
      delay_days: Math.max(0, Math.min(60, Number(step.delay_days) || 0)),
      type: ["email", "call", "linkedin", "task"].includes(step.type ?? "") ? step.type : "email",
      subject: step.subject?.trim() || null,
      body: step.body?.trim() || null,
    }));
}

// List sequences with their steps, enrollment counts and the people in them.
export async function GET() {
  const result = await guard();
  if ("error" in result) return result.error;

  const { supabase, access } = result;

  const { data: sequences, error } = await supabase
    .from("sequences")
    .select(
      "id, name, active, created_at, sequence_steps(*), sequence_enrollments(id, lead_id, status, current_step, next_run_at, last_error, created_at)"
    )
    .eq("company_id", access.company.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, sequences: [] }, { status: 500 });
  }

  type Enrollment = {
    id: string;
    lead_id: string;
    status: string;
    current_step: number;
    next_run_at: string | null;
    last_error: string | null;
    created_at: string;
  };

  // Names for everyone enrolled (one query for all sequences).
  const leadIds = Array.from(
    new Set(
      (sequences ?? []).flatMap((sequence) =>
        ((sequence.sequence_enrollments ?? []) as Enrollment[]).map((e) => e.lead_id)
      )
    )
  ).slice(0, 1000);

  const leadMap = new Map<string, { name: string | null; company: string | null; email: string | null }>();
  if (leadIds.length) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, company, email")
      .in("id", leadIds);
    for (const lead of leads ?? []) leadMap.set(lead.id, lead);
  }

  return NextResponse.json({
    sequences: (sequences ?? []).map((sequence) => {
      const enrollments = (sequence.sequence_enrollments ?? []) as Enrollment[];
      return {
        id: sequence.id,
        name: sequence.name,
        active: sequence.active,
        created_at: sequence.created_at,
        steps: [...((sequence.sequence_steps ?? []) as { step_order: number }[])].sort(
          (a, b) => a.step_order - b.step_order
        ),
        stats: {
          active: enrollments.filter((e) => e.status === "active").length,
          replied: enrollments.filter((e) => e.status === "replied").length,
          completed: enrollments.filter((e) => e.status === "completed").length,
          total: enrollments.length,
        },
        people: enrollments
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
          .map((e) => {
            const lead = leadMap.get(e.lead_id);
            return {
              id: e.id,
              lead_id: e.lead_id,
              name: lead?.name ?? null,
              company: lead?.company ?? null,
              email: lead?.email ?? null,
              status: e.status,
              current_step: e.current_step,
              next_run_at: e.next_run_at,
              last_error: e.last_error,
            };
          }),
      };
    }),
    allowed: access.can("outreach_automation"),
  });
}

// Create a sequence.
export async function POST(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const { supabase, access } = result;

  if (!access.can("outreach_automation")) {
    return NextResponse.json(planRequiredBody("outreach_automation"), { status: 402 });
  }

  const { name, steps } = (await request.json().catch(() => ({}))) as {
    name?: string;
    steps?: StepInput[];
  };

  const rows = cleanSteps(steps);

  if (!name?.trim() || rows.length === 0) {
    return NextResponse.json({ error: "Add a name and at least one step." }, { status: 400 });
  }

  const { data: sequence, error } = await supabase
    .from("sequences")
    .insert({ name: name.trim(), company_id: access.company.id, user_id: access.user.id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: stepsError } = await supabase
    .from("sequence_steps")
    .insert(rows.map((row) => ({ ...row, sequence_id: sequence.id })));

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  return NextResponse.json({ id: sequence.id });
}

// Update name / active / steps.
export async function PATCH(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const { supabase, access } = result;
  const { id, name, active, steps } = (await request.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    active?: boolean;
    steps?: StepInput[];
  };

  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  if (active && !access.can("outreach_automation")) {
    return NextResponse.json(planRequiredBody("outreach_automation"), { status: 402 });
  }

  const update: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) update.name = name.trim();
  if (typeof active === "boolean") update.active = active;

  if (Object.keys(update).length) {
    await supabase.from("sequences").update(update).eq("id", id);
  }

  if (active === false) {
    await supabase
      .from("sequence_enrollments")
      .update({ status: "stopped", next_run_at: null })
      .eq("sequence_id", id)
      .eq("status", "active");
  }

  if (steps) {
    const rows = cleanSteps(steps);
    await supabase.from("sequence_steps").delete().eq("sequence_id", id);
    if (rows.length) {
      await supabase.from("sequence_steps").insert(rows.map((row) => ({ ...row, sequence_id: id })));
    }
  }

  return NextResponse.json({ success: true });
}

// Delete a sequence (stops everyone in it).
export async function DELETE(request: Request) {
  const result = await guard();
  if ("error" in result) return result.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { error } = await result.supabase.from("sequences").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
