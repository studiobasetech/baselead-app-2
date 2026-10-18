import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkspaceAccess } from "@/lib/workspace";

/** Owner, Admin or Manager of the workspace (can see the whole team). */
export async function getManagerAccess(supabase: SupabaseClient) {
  const access = await getWorkspaceAccess(supabase);
  if (!access) return { access: null, isManager: false };

  if (access.isOwner) return { access, isManager: true };

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("company_id", access.company.id)
    .eq("user_id", access.user.id)
    .maybeSingle();

  return { access, isManager: ["Admin", "Manager"].includes(member?.role ?? "") };
}
