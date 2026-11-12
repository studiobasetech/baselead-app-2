import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTelnyxConfigured, orderNumber, releaseNumber, searchNumbers } from "@/lib/phone/telnyx";
import { phoneRoute, planRequired } from "../_shared";

// Managers: team members and their numbers; ?areaCode=713 also lists numbers to buy.
export async function GET(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.allowed) return planRequired();
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can manage numbers." }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: members }, { data: numbers }] = await Promise.all([
    admin.from("team_members").select("user_id, name, email, role").eq("company_id", phone.companyId).eq("status", "active"),
    admin.from("phone_numbers").select("id, user_id, phone_number, created_at").eq("company_id", phone.companyId).eq("status", "active"),
  ]);

  // The owner is not always a team_members row.
  const team = (members ?? []).filter((m) => m.user_id).map((m) => ({ userId: m.user_id as string, name: m.name || m.email || "Rep", role: m.role }));
  if (!team.some((m) => m.userId === phone.userId)) {
    const meta = (phone.access.user.user_metadata ?? {}) as Record<string, string>;
    team.unshift({ userId: phone.userId, name: meta.full_name || meta.name || phone.access.user.email || "Me", role: "Owner" });
  }

  const areaCode = new URL(request.url).searchParams.get("areaCode")?.replace(/\D/g, "").slice(0, 3);
  const country = new URL(request.url).searchParams.get("country") === "CA" ? "CA" : "US";
  let available: Awaited<ReturnType<typeof searchNumbers>> = [];
  let searchError = "";
  if (areaCode !== undefined && isTelnyxConfigured()) {
    try {
      available = await searchNumbers({ areaCode: areaCode || undefined, country });
    } catch (lookupError) {
      searchError = lookupError instanceof Error ? lookupError.message : "Search failed.";
    }
  }

  return NextResponse.json({
    configured: isTelnyxConfigured(),
    team,
    numbers: numbers ?? [],
    available,
    searchError,
    included: phone.allowance.lines,
    planLines: phone.allowance.planLines,
    addonLines: phone.allowance.addonLines,
  });
}

// Buy a number for a rep. Body: { userId, phoneNumber }
export async function POST(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.allowed) return planRequired();
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can manage numbers." }, { status: 403 });
  if (!isTelnyxConfigured()) return NextResponse.json({ code: "NOT_CONFIGURED", error: "Calling isn't connected yet." }, { status: 503 });

  const { userId, phoneNumber } = (await request.json().catch(() => ({}))) as { userId?: string; phoneNumber?: string };
  if (!userId || !phoneNumber) return NextResponse.json({ error: "Choose a rep and a number." }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: member }, { count }, { data: existing }] = await Promise.all([
    userId === phone.userId
      ? Promise.resolve({ data: { user_id: userId } })
      : admin.from("team_members").select("user_id").eq("company_id", phone.companyId).eq("user_id", userId).eq("status", "active").maybeSingle(),
    admin.from("phone_numbers").select("id", { count: "exact", head: true }).eq("company_id", phone.companyId).eq("status", "active"),
    admin.from("phone_numbers").select("id").eq("company_id", phone.companyId).eq("user_id", userId).eq("status", "active").maybeSingle(),
  ]);

  if (!member) return NextResponse.json({ error: "This person is not an active member of your team." }, { status: 400 });
  if (existing) return NextResponse.json({ error: "This rep already has a number." }, { status: 400 });
  if ((count ?? 0) >= phone.allowance.lines) {
    return NextResponse.json(
      { code: "NUMBER_LIMIT", error: `All ${phone.allowance.lines} phone lines are in use. Add an extra line in Phone setup, or release a number you don't use.` },
      { status: 403 }
    );
  }

  try {
    const order = await orderNumber(phoneNumber, `company:${phone.companyId}`);
    const telnyxNumberId = order.phone_numbers?.[0]?.id ?? null;
    const { error: saveError } = await admin.from("phone_numbers").insert({
      company_id: phone.companyId,
      user_id: userId,
      phone_number: phoneNumber,
      telnyx_number_id: telnyxNumberId,
      status: "active",
    });
    if (saveError) throw new Error(saveError.message);
    return NextResponse.json({ success: true });
  } catch (orderError) {
    return NextResponse.json({ error: orderError instanceof Error ? orderError.message : "Could not buy the number." }, { status: 502 });
  }
}

// Reassign or release. Body: { numberId, userId? , release? }
export async function PATCH(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  if (!phone.isManager) return NextResponse.json({ error: "Only managers can manage numbers." }, { status: 403 });

  const { numberId, userId, release } = (await request.json().catch(() => ({}))) as { numberId?: string; userId?: string | null; release?: boolean };
  const admin = createAdminClient();
  const { data: number } = await admin.from("phone_numbers").select("id, company_id, telnyx_number_id").eq("id", numberId ?? "").maybeSingle();
  if (!number || number.company_id !== phone.companyId) return NextResponse.json({ error: "Number not found." }, { status: 404 });

  if (release) {
    if (number.telnyx_number_id && isTelnyxConfigured()) {
      try {
        await releaseNumber(number.telnyx_number_id);
      } catch (releaseError) {
        return NextResponse.json({ error: releaseError instanceof Error ? releaseError.message : "Could not release." }, { status: 502 });
      }
    }
    await admin.from("phone_numbers").update({ status: "released", user_id: null, released_at: new Date().toISOString() }).eq("id", number.id);
    return NextResponse.json({ success: true });
  }

  if (userId) {
    const { data: taken } = await admin.from("phone_numbers").select("id").eq("company_id", phone.companyId).eq("user_id", userId).eq("status", "active").maybeSingle();
    if (taken && taken.id !== number.id) return NextResponse.json({ error: "This rep already has a number." }, { status: 400 });
  }

  const { error: saveError } = await admin.from("phone_numbers").update({ user_id: userId || null }).eq("id", number.id);
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
