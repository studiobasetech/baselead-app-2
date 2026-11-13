import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { understandIdealClient } from "@/lib/search/understand";

// The search page asks this while the person types their ideal client.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { idealClient, offer } = (await request.json().catch(() => ({}))) as { idealClient?: string; offer?: string };
  const text = String(idealClient ?? "").slice(0, 300);
  if (!text.trim()) return NextResponse.json({ intent: null });
  return NextResponse.json({ intent: await understandIdealClient(text, String(offer ?? "").slice(0, 200)) });
}
