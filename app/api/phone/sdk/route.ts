import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves the Telnyx in-browser phone library from node_modules
// (install once with: npm install @telnyx/webrtc).
const CANDIDATES = ["lib/bundle.js", "lib/bundle.min.js", "dist/bundle.js", "lib/index.umd.js"];

export async function GET() {
  for (const file of CANDIDATES) {
    try {
      const source = await readFile(path.join(process.cwd(), "node_modules", "@telnyx", "webrtc", file), "utf8");
      return new Response(source, {
        headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=86400" },
      });
    } catch {
      // Try the next file name.
    }
  }
  return new Response("// @telnyx/webrtc is not installed. Run: npm install @telnyx/webrtc", {
    status: 404,
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  });
}
