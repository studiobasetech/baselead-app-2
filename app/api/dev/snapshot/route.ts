import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * DEV ONLY: saves page snapshots for the shareable demo (_demo/snapshots).
 * Disabled in production.
 */
const off = () => process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  if (off()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const { name, content, copyFrom } = (await request.json()) as { name: string; content: string; copyFrom?: string };
  if (copyFrom) {
    // Re-write a file natively (fresh inode) so it can be staged.
    const { readFile } = await import("node:fs/promises");
    const src = path.join(process.cwd(), "_demo", String(copyFrom).replace(/[^a-z0-9._/-]/gi, "_"));
    const dest = path.join(process.cwd(), String(name).replace(/[^a-z0-9._-]/gi, "_"));
    await writeFile(dest, await readFile(src));
    return NextResponse.json({ ok: true });
  }
  const safe = String(name).replace(/[^a-z0-9._-]/gi, "_");
  const dir = path.join(process.cwd(), "_demo", "snapshots");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safe), content, "utf8");
  return NextResponse.json({ ok: true, bytes: content.length });
}

// Turns an image URL into a data: URI (so the demo works offline).
export async function GET(request: Request) {
  if (off()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  if (new URL(request.url).searchParams.get("rlscheck")) {
    // Security check: what can an anonymous visitor read with the public key?
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
    const tables = (new URL(request.url).searchParams.get("rlscheck") ?? "").split(",");
    const out: Record<string, string> = {};
    for (const t of tables) {
      const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      const body = await res.text();
      out[t] = res.status + " " + (res.ok ? (body === "[]" ? "no rows visible" : "ROWS VISIBLE") : body.slice(0, 80));
    }
    return NextResponse.json(out);
  }
  if (new URL(request.url).searchParams.get("enrichtest")) {
    // TEMP: run the enrichment step on 4 real businesses (no saving).
    const { searchGeoapify } = await import("@/lib/search/geoapify-provider");
    const { enrichAndScore, toLeadRow, rowToLead } = await import("@/lib/search/process-search");
    const criteria = { offer: "Website Design & AI Automation", idealClient: "Dentists", location: "Boise, ID", leads: 4, radius: 25, scoring: true, enrichment: true };
    const t0 = Date.now();
    const found = await searchGeoapify(criteria);
    const rows = found.map((lead) => ({ ...toLeadRow(lead, "u", null), id: "draft-x" }));
    const leads = rows.map(rowToLead);
    const t1 = Date.now();
    let error = null;
    try { await enrichAndScore(leads, criteria, { recommendations: true }); } catch (e) { error = e instanceof Error ? e.stack : String(e); }
    return NextResponse.json({ searchMs: t1 - t0, enrichMs: Date.now() - t1, error, leads: leads.map((l) => ({ company: l.company, score: l.ai_score, rec: l.ai_recommendations, contact: l.contact_name, enriched: l.raw_data?.enriched })) });
  }
  if (new URL(request.url).searchParams.get("script")) {
    const { readFile } = await import("node:fs/promises");
    const js = await readFile(path.join(process.cwd(), "_demo", "demo-data.js"), "utf8");
    return new NextResponse(js, { headers: { "content-type": "text/javascript", "cache-control": "no-store" } });
  }
  const url = new URL(request.url).searchParams.get("img") ?? "";
  try {
    const abs = new URL(url, new URL(request.url).origin).toString();
    const res = await fetch(abs);
    if (!res.ok) return NextResponse.json({ data: null });
    const type = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return NextResponse.json({ data: `data:${type};base64,${buf.toString("base64")}` });
  } catch {
    return NextResponse.json({ data: null });
  }
}
