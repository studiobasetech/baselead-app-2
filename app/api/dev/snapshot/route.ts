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
