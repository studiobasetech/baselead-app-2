import { redirect } from "next/navigation";

// Lead Discovery was merged into the Leads page.
export default async function LeadDiscoveryRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/leads?${qs}` : "/leads");
}
