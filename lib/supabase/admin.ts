import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service-role key.
 * ONLY use on the server, for trusted actions such as applying
 * a paid plan after Stripe confirms the payment.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serverKey();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Accepts the new "secret" key (sb_secret_…) or the legacy service_role key. */
function serverKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
}

export function hasAdminClient() {
  return Boolean(serverKey());
}
