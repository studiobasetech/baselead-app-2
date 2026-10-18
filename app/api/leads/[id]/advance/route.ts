import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { advanceLead, type LeadStatus } from "@/lib/automation";

const ALLOWED: LeadStatus[] = [
  "contacted",
  "responded",
  "meeting",
  "qualified",
  "proposal",
  "negotiation",
  "won",
];

// Moves a lead forward only (never backwards). Used by automatic actions.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { to, reason } = (await request.json().catch(() => ({}))) as {
    to?: LeadStatus;
    reason?: string;
  };

  if (!to || !ALLOWED.includes(to)) {
    return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
  }

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const moved = await advanceLead(supabase, id, to, reason || "Updated from BaseLead.", access.user.id);

  return NextResponse.json({ moved });
}
