import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type GoogleIntegrationId =
  | "gmail"
  | "google-calendar"
  | "google-sheets";

const INTEGRATION_SCOPES: Record<GoogleIntegrationId, string[]> = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  "google-calendar": [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  "google-sheets": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function isGoogleIntegration(
  value: string
): value is GoogleIntegrationId {
  return value in INTEGRATION_SCOPES;
}

export function googleScopes(integration: GoogleIntegrationId) {
  return INTEGRATION_SCOPES[integration];
}

export function googleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${requiredEnv("APP_URL").replace(/\/$/, "")}/api/integrations/oauth/google/callback`
  );
}

export function signOAuthState(payload: string) {
  const signature = createHmac(
    "sha256",
    requiredEnv("GOOGLE_OAUTH_STATE_SECRET")
  )
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string) {
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;

  const payload = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(
    createHmac("sha256", requiredEnv("GOOGLE_OAUTH_STATE_SECRET"))
      .update(payload)
      .digest("base64url")
  );

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  return payload;
}

export function randomOAuthState() {
  return randomBytes(32).toString("base64url");
}

function encryptionKey() {
  const raw = requiredEnv("INTEGRATION_TOKEN_ENCRYPTION_KEY");
  const key = /^[a-f\d]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      "INTEGRATION_TOKEN_ENCRYPTION_KEY must encode 32 bytes."
    );
  }

  return key;
}

export function encryptIntegrationToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptIntegrationToken(value: string) {
  const [version, iv, tag, data] = value.split(".");

  if (version !== "v1" || !iv || !tag || !data) {
    throw new Error("Stored integration credentials are invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url")
  );

  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function safeReturnPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/integrations";
}