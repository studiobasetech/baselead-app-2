import { createBrowserClient } from "@supabase/ssr";

// Dev-only hook used to record the shareable demo (window.__blDemoFetch). No effect otherwise.
const demoAwareFetch: typeof fetch = (input, init) => {
  const hooked = typeof window !== "undefined" ? (window as unknown as { __blDemoFetch?: typeof fetch }).__blDemoFetch : undefined;
  return (hooked ?? fetch)(input, init);
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: demoAwareFetch } }
  );
}