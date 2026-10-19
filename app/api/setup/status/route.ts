import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccess } from "@/lib/workspace";
import { getWorkspaceSecret } from "@/lib/workspace-secrets";

/*
 * Launch checklist: tells the user exactly what is configured and what is
 * missing. Never returns secret values — only true/false and error text.
 */

type Check = {
  id: string;
  group: "Required" | "Recommended" | "Optional";
  title: string;
  ok: boolean;
  detail: string;
  action?: { label: string; href: string };
};

const NEW_TABLES = [
  "tasks",
  "lead_activities",
  "calendar_events",
  "sequences",
  "booking_pages",
  "proposals",
  "lead_contacts",
];

const env = (...names: string[]) => names.some((name) => Boolean(process.env[name]?.trim()));

export async function GET() {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const checks: Check[] = [];

  /* ---------- Database ---------- */
  const tableErrors: string[] = [];
  for (const table of NEW_TABLES) {
    const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    if (error) tableErrors.push(`${table}: ${error.message}`);
  }

  const permissionProblem = tableErrors.some((message) => /permission denied/i.test(message));

  checks.push({
    id: "database",
    group: "Required",
    title: "Database tables",
    ok: tableErrors.length === 0,
    detail: tableErrors.length
      ? permissionProblem
        ? "The tables exist but Supabase is blocking the app. Run supabase/FIX_PERMISSIONS.sql in Supabase → SQL Editor."
        : `Run supabase/RUN_THIS_IN_SUPABASE.sql in Supabase → SQL Editor. (${tableErrors[0]})`
      : "Tasks, timeline, sequences, bookings, proposals and contacts are ready.",
  });

  /* ---------- Server key ---------- */
  let adminOk = false;
  let adminError = "";
  if (hasAdminClient()) {
    const { error } = await createAdminClient()
      .from("company_profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    adminOk = !error;
    adminError = error?.message ?? "";
  }

  checks.push({
    id: "service-key",
    group: "Required",
    title: "Supabase server key",
    ok: adminOk,
    detail: adminOk
      ? "Automation, notifications, bookings, proposals and SMS can run on the server."
      : hasAdminClient()
        ? `The key in .env.local was rejected: ${adminError}. Copy the secret key again from Supabase → Project Settings → API Keys.`
        : "Add SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API Keys → secret key) to .env.local and restart npm run dev.",
  });

  /* ---------- Lead source ---------- */
  checks.push({
    id: "google-places",
    group: "Required",
    title: "Google Places API (real leads)",
    ok: env("GOOGLE_PLACES_API_KEY"),
    detail: env("GOOGLE_PLACES_API_KEY")
      ? "Lead Discovery searches real businesses on Google Maps."
      : "Without it, searches can't find leads. Google Cloud Console → enable “Places API (New)” → Credentials → Create API key → add GOOGLE_PLACES_API_KEY to .env.local.",
    action: { label: "Open Google Cloud", href: "https://console.cloud.google.com/apis/library/places.googleapis.com" },
  });

  /* ---------- Google sign-in for Gmail/Calendar ---------- */
  const googleOAuth = env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET");
  checks.push({
    id: "google-oauth",
    group: "Required",
    title: "Google connection (Gmail & Calendar)",
    ok: googleOAuth,
    detail: googleOAuth
      ? "Your team can connect Gmail and Google Calendar."
      : `Google Cloud Console → APIs & Services → enable Gmail API and Google Calendar API → Credentials → OAuth client ID (Web application). Authorized redirect URI: ${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/integrations/oauth/google/callback — then set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.`,
    action: { label: "Open Google Cloud", href: "https://console.cloud.google.com/apis/credentials" },
  });

  /* ---------- This user's connections ---------- */
  const { data: creds } = await supabase
    .from("integration_credentials")
    .select("provider")
    .eq("user_id", access.user.id);
  const providers = new Set((creds ?? []).map((row) => row.provider as string));

  checks.push({
    id: "gmail",
    group: "Required",
    title: "Your Gmail connected",
    ok: providers.has("gmail"),
    detail: providers.has("gmail")
      ? "Emails go out from your Gmail and replies are detected automatically."
      : "Connect Gmail so you can email leads, detect replies and get notifications.",
    action: { label: "Go to Integrations", href: "/integrations" },
  });

  checks.push({
    id: "calendar",
    group: "Recommended",
    title: "Your Google Calendar connected",
    ok: providers.has("google-calendar") || providers.has("google_calendar"),
    detail: "Lets leads book real free slots and creates Google Meet links automatically.",
    action: { label: "Go to Integrations", href: "/integrations" },
  });

  /* ---------- Booking link ---------- */
  const { data: booking } = await supabase
    .from("booking_pages")
    .select("slug")
    .eq("user_id", access.user.id)
    .maybeSingle();

  checks.push({
    id: "booking",
    group: "Recommended",
    title: "Your booking link",
    ok: Boolean(booking?.slug),
    detail: booking?.slug
      ? `Leads can book you at /book/${booking.slug}.`
      : "Create your booking link on the Today page so the {{booking_link}} token works in emails.",
    action: { label: "Open Today", href: "/today" },
  });

  /* ---------- AI ---------- */
  checks.push({
    id: "ai",
    group: "Recommended",
    title: "AI writing & lead analysis (Anthropic)",
    ok: env("ANTHROPIC_API_KEY"),
    detail: env("ANTHROPIC_API_KEY")
      ? "AI writes outreach and analyzes leads."
      : "console.anthropic.com → API Keys → add ANTHROPIC_API_KEY. Without it, emails use templates and scoring uses rules.",
    action: { label: "Open Anthropic Console", href: "https://console.anthropic.com/settings/keys" },
  });

  /* ---------- Billing ---------- */
  const prices = ["STARTER", "PRO", "SCALE"].flatMap((plan) => [
    `STRIPE_PRICE_${plan}_MONTHLY`,
    `STRIPE_PRICE_${plan}_YEARLY`,
  ]);
  const missingPrices = prices.filter((name) => !env(name));
  const stripeOk = env("STRIPE_SECRET_KEY") && env("STRIPE_WEBHOOK_SECRET") && missingPrices.length === 0;

  checks.push({
    id: "stripe",
    group: access.isOwner ? "Recommended" : "Optional",
    title: "Subscriptions (Stripe)",
    ok: stripeOk,
    detail: stripeOk
      ? "Customers can subscribe and pay for BaseLead plans."
      : `Needed to sell BaseLead to other companies. Missing: ${[
          !env("STRIPE_SECRET_KEY") && "STRIPE_SECRET_KEY",
          !env("STRIPE_WEBHOOK_SECRET") && "STRIPE_WEBHOOK_SECRET",
          missingPrices.length && `${missingPrices.length} price IDs`,
        ]
          .filter(Boolean)
          .join(", ")}. See SETUP-BASELEAD.md section 6.`,
    action: { label: "Open Stripe", href: "https://dashboard.stripe.com/apikeys" },
  });

  /* ---------- Optional extras ---------- */
  checks.push({
    id: "hunter",
    group: "Optional",
    title: "Decision-maker emails (Hunter.io)",
    ok: env("HUNTER_API_KEY"),
    detail: "Finds owners' and managers' emails for each lead. Free plan available at hunter.io → API.",
    action: { label: "Open Hunter", href: "https://hunter.io/api-keys" },
  });

  let twilioOk = false;
  if (adminOk) {
    twilioOk = Boolean(await getWorkspaceSecret(access.company.id, "twilio").catch(() => null));
  }
  checks.push({
    id: "twilio",
    group: "Optional",
    title: "Calls & SMS (Twilio)",
    ok: twilioOk,
    detail: "Text and call leads from your business number.",
    action: { label: "Go to Integrations", href: "/integrations" },
  });

  checks.push({
    id: "automation",
    group: "Optional",
    title: "24/7 automation (when the app is online)",
    ok: env("CRON_SECRET") && !/localhost/.test(process.env.APP_URL ?? "localhost"),
    detail:
      "Follow-ups, reply detection and reminders run every 15 minutes once BaseLead is deployed (Vercel). On your computer, use the “Sync now” button on Today.",
  });

  const required = checks.filter((check) => check.group === "Required");

  return NextResponse.json({
    checks,
    requiredDone: required.filter((check) => check.ok).length,
    requiredTotal: required.length,
    done: checks.filter((check) => check.ok).length,
    total: checks.length,
  });
}
