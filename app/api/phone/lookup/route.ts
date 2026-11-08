import { NextResponse } from "next/server";
import { findLeadByPhone } from "@/lib/phone/leads";
import { phoneRoute } from "../_shared";

// Who is calling? (lead name for the incoming call screen)
export async function GET(request: Request) {
  const { error, phone } = await phoneRoute();
  if (error) return error;
  const number = new URL(request.url).searchParams.get("number");
  const lead = await findLeadByPhone(phone.companyId, number);
  return NextResponse.json({ lead });
}
