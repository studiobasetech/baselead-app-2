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
  const body = (await request.json()) as { name: string; content: string; copyFrom?: string; tts?: string; voice?: string };
  const { name, content, copyFrom } = body;
  if (body.tts) {
    // DEV ONLY: Deepgram Aura-2 voice-over for the ad (key stays in .env.local).
    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) return NextResponse.json({ error: "DEEPGRAM_API_KEY missing" }, { status: 400 });
    const model = String(body.voice || "aura-2-thalia-en").replace(/[^a-z0-9-]/gi, "");
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${model}&encoding=mp3`, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: body.tts }),
    });
    if (!res.ok) return NextResponse.json({ error: `Deepgram ${res.status}: ${(await res.text()).slice(0, 200)}` }, { status: 502 });
    const dir = path.join(process.cwd(), "_to_delete", "ad-voice");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(dir, String(name).replace(/[^a-z0-9._-]/gi, "_")), buf);
    return NextResponse.json({ ok: true, bytes: buf.length });
  }
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
