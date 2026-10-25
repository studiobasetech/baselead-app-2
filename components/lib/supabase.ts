import { createBrowserClient } from "@supabase/ssr";

// Dev-only hook used to record the shareable demo (window.__blDemoFetch). No effect otherwise.
const demoAwareFetch: typeof fetch = (input, init) => {
  const hooked = typeof window !== "undefined" ? (window as unknown as { __blDemoFetch?: typeof fetch }).__blDemoFetch : undefined;
  return (hooked ?? fetch)(input, init);
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey,
  { global: { fetch: demoAwareFetch } }
);