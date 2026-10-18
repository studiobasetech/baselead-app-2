import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";

/*
 * Permanently deletes ALL leads of the workspace and what hangs off them
 * (search history, outreach, activity, contacts, sequence enrollments,
 * lead tasks, lead meetings). Owner only. Body: { confirm: "DELETE ALL LEADS" }.
 */
export async function POST(request: Request) {
  const { confirm } = (await request.json().catch(() => ({}))) as { confirm?: string };

  if (confirm !== "DELETE ALL LEADS") {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!access.isOwner) {
    return NextResponse.json({ error: "Only the workspace owner can delete all leads." }, { status: 403 });
  }

  // Service role reaches leads created by every team member.
  const db = hasAdminClient() ? createAdminClient() : supabase;
  const companyId = access.company.id;
  const userId = access.user.id;

  const { data: rows, error } = await db
    .from("leads")
    .select("id")
    .or(`company_id.eq.${companyId},user_id.eq.${userId}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rows ?? []).map((row) => row.id as string);

  // Optional tables may not exist yet; ignore those errors.
  const quiet = async (promise: PromiseLike<{ error: unknown }>) => {
    try {
      await promise;
    } catch {
      // ignore
    }
  };

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);

    await quiet(db.from("search_leads").delete().in("lead_id", chunk));
    await quiet(db.from("outreach").delete().in("lead_id", chunk));
    await quiet(db.from("lead_activities").delete().in("lead_id", chunk));
    await quiet(db.from("lead_contacts").delete().in("lead_id", chunk));
    await quiet(db.from("sequence_enrollments").delete().in("lead_id", chunk));
    await quiet(db.from("tasks").delete().in("lead_id", chunk));
    await quiet(db.from("calendar_events").delete().in("lead_id", chunk));
    await quiet(db.from("proposals").update({ lead_id: null }).in("lead_id", chunk));

    const { error: deleteError } = await db.from("leads").delete().in("id", chunk);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  // Old searches (now empty).
  await quiet(db.from("searches").delete().eq("user_id", userId));

  return NextResponse.json({ success: true, deleted: ids.length });
}
