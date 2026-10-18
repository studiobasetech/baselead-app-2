import { createHash, randomBytes } from "node:crypto";

export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const key = `bl_live_${secret}`;

  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
