import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/marketing/Landing";

export const metadata: Metadata = {
  title: "BaseLead — Find clients. Follow up. Close.",
  description: "AI sales app that finds local businesses that need what you sell, scores them, writes the emails and follows up for you.",
};

// Signed in → the app. Signed out → the public home page.
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/today");
  return <Landing />;
}
