import { redirect } from "next/navigation";

// Proposals now live inside Sales Toolkit.
export default async function ProposalsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ tab: "proposals" });
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && key !== "tab") query.set(key, value);
  }
  redirect(`/resources?${query.toString()}`);
}
