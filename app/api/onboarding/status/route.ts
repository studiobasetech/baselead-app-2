import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";

/*
 * First-time setup: the 5 steps that get a new user to their first reply.
 * Only true/false per step — used by the Getting Started card on Today.
 */
export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const companyId = access.company.id;
  const userId = access.user.id;

  const [creds, profile, leads, sent, sequences] = await Promise.all([
    supabase.from("integration_credentials").select("provider").eq("user_id", userId),
    supabase
      .from("company_profiles")
      .select("services, target_customer, target_locations")
      .eq("id", companyId)
      .maybeSingle(),
    supabase.from("leads").select("id", { head: true, count: "exact" }).eq("company_id", companyId),
    supabase.from("outreach").select("id", { head: true, count: "exact" }).eq("user_id", userId).not("sent_at", "is", null),
    supabase.from("sequences").select("id", { head: true, count: "exact" }).eq("company_id", companyId),
  ]);

  const filled = (value: unknown) =>
    Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  const p = (profile.data ?? {}) as Record<string, unknown>;

  const steps = [
    {
      id: "profile",
      title: "Tell BaseLead what you sell",
      detail: "Your services and ideal customer make every search and score smarter.",
      href: "/settings",
      done: filled(p.services) && (filled(p.target_customer) || filled(p.target_locations)),
    },
    {
      id: "gmail",
      title: "Connect Gmail",
      detail: "Send from your own inbox and catch replies automatically.",
      href: "/integrations",
      done: (creds.data ?? []).some((row) => row.provider === "gmail"),
    },
    {
      id: "leads",
      title: "Find your first leads",
      detail: "Search real businesses near you in seconds.",
      href: "/search",
      done: (leads.count ?? 0) > 0,
    },
    {
      id: "email",
      title: "Send your first email",
      detail: "Pick a hot lead and let BaseLead draft the message.",
      href: "/outreach",
      done: (sent.count ?? 0) > 0,
    },
    {
      id: "sequence",
      title: "Start a follow-up sequence",
      detail: "Follow-ups go out on their own until the lead replies.",
      href: "/sequences",
      done: (sequences.count ?? 0) > 0,
    },
  ];

  return NextResponse.json({ steps, done: steps.filter((s) => s.done).length, total: steps.length });
}
