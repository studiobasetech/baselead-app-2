import { createAdminClient } from "@/lib/supabase/admin";
import { stripeRequest } from "@/lib/stripe";
import { notifyUser } from "@/lib/notify";
import { PHONE_OVERAGE_PER_MINUTE, PHONE_USAGE_ALERTS, isPhoneAddonKind } from "@/lib/plans";
import { companyPhoneAccess, currentPeriod, loadPhoneSettings, periodStart, phoneUsage, type PhoneUsage } from "@/lib/phone/access";

/*
 * Billing for built-in calling:
 *  - Phone add-ons are monthly Stripe subscriptions (metadata.kind = "phone_addon").
 *  - Minutes over the pool are recorded per call (calls.overage_minutes) only when
 *    the company turned on automatic overage, and billed once a month as an
 *    invoice item on their next Stripe invoice.
 *  - Managers get an alert at 80% and 100% of the pool.
 */

type StripeSubscription = {
  id: string;
  status: string;
  customer: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data?: { quantity?: number; current_period_end?: number }[] };
};

export function isPhoneAddonSubscription(object: { metadata?: unknown } | null | undefined) {
  const metadata = (object?.metadata ?? {}) as Record<string, string>;
  return metadata.kind === "phone_addon";
}

/** Saves a phone add-on subscription (created, changed, canceled). */
export async function applyPhoneAddon(subscriptionOrId: string | StripeSubscription, companyIdHint?: string | null) {
  const subscription =
    typeof subscriptionOrId === "string"
      ? await stripeRequest<StripeSubscription>("GET", `subscriptions/${subscriptionOrId}`)
      : subscriptionOrId;

  const companyId = subscription.metadata?.company_id || companyIdHint;
  const kind = subscription.metadata?.addon;
  if (!companyId || !isPhoneAddonKind(kind)) throw new Error("Phone add-on is missing its company or type.");

  const item = subscription.items?.data?.[0];
  const periodEnd = subscription.current_period_end ?? item?.current_period_end ?? null;

  const { error } = await createAdminClient()
    .from("phone_addons")
    .upsert(
      {
        company_id: companyId,
        kind,
        quantity: Math.max(0, Number(item?.quantity ?? 1)),
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
  if (error) throw new Error(error.message);
  return { companyId, kind };
}

/** After a call ends: record minutes over the pool (if overage is on) and send usage alerts. */
export async function finalizeCallUsage(companyId: string, callId: string, billableMinutes: number) {
  try {
    const admin = createAdminClient();
    const [{ allowance }, settings] = await Promise.all([companyPhoneAccess(companyId), loadPhoneSettings(companyId)]);
    const usage = await phoneUsage(companyId, "", allowance, settings);

    if (settings.overage_enabled && billableMinutes > 0) {
      // Minutes over the pool that no earlier call has been charged for yet.
      const over = Math.max(0, usage.used - usage.allowance - usage.overageMinutes);
      const forThisCall = Math.min(billableMinutes, over);
      if (forThisCall > 0) {
        await admin.from("calls").update({ overage_minutes: forThisCall }).eq("id", callId);
        usage.overageMinutes += forThisCall;
      }
    }

    await sendUsageAlerts(companyId, usage);
  } catch (error) {
    console.error("Call usage update failed:", error);
  }
}

/** Owner + Admins/Managers of a company. */
async function companyManagers(companyId: string) {
  const admin = createAdminClient();
  const [{ data: company }, { data: members }] = await Promise.all([
    admin.from("company_profiles").select("user_id").eq("id", companyId).maybeSingle(),
    admin.from("team_members").select("user_id, role").eq("company_id", companyId).eq("status", "active").in("role", ["Admin", "Manager"]),
  ]);
  const ids = new Set<string>();
  if (company?.user_id) ids.add(company.user_id);
  for (const member of members ?? []) if (member.user_id) ids.add(member.user_id);
  return Array.from(ids);
}

export async function sendUsageAlerts(companyId: string, usage: PhoneUsage) {
  if (usage.allowance <= 0) return;
  const percent = (usage.used / usage.allowance) * 100;
  const admin = createAdminClient();

  for (const threshold of PHONE_USAGE_ALERTS) {
    if (percent < threshold) continue;
    // Insert first: only the first call to cross the line sends the alert.
    const { data: inserted, error } = await admin
      .from("phone_usage_alerts")
      .upsert({ company_id: companyId, period: currentPeriod(), threshold }, { onConflict: "company_id,period,threshold", ignoreDuplicates: true })
      .select("threshold");
    if (error || !inserted?.length) continue;

    const full = threshold >= 100;
    const subject = full ? "Your team used all its calling minutes" : `Your team used ${threshold}% of its calling minutes`;
    const lines = [
      `${usage.used.toLocaleString("en-US")} of ${usage.allowance.toLocaleString("en-US")} minutes used this month.`,
      full
        ? usage.overageEnabled
          ? `Automatic overage is on: extra minutes are $${PHONE_OVERAGE_PER_MINUTE}/min, up to your $${usage.overageCap} cap.`
          : "Calling is paused until next month. Add a minute pack or a line in Phone setup to keep calling."
        : "Add a minute pack or an extra line in Phone setup if your team needs more.",
    ];

    for (const userId of await companyManagers(companyId)) {
      await notifyUser(admin, userId, "phone_usage", {
        subject,
        heading: subject,
        lines,
        ctaLabel: "Open phone setup",
        ctaPath: "/calls?tab=setup",
      }).catch(() => undefined);
    }
  }
}

/** First and last moment of the month before `date`. */
function previousMonth(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return { period: currentPeriod(start), since: start.toISOString(), until: periodStart(date) };
}

/**
 * Bills last month's overage minutes (run daily by the cron; each company is billed once per month).
 * The charge is added to the customer's next Stripe invoice.
 */
export async function billLastMonthOverage(date = new Date()) {
  const admin = createAdminClient();
  const { period, since, until } = previousMonth(date);
  const summary = { period, billed: 0, skipped: 0, errors: [] as string[] };

  const { data: rows, error } = await admin
    .from("calls")
    .select("company_id, overage_minutes")
    .gte("started_at", since)
    .lt("started_at", until)
    .gt("overage_minutes", 0)
    .limit(50000);
  if (error) {
    summary.errors.push(error.message);
    return summary;
  }

  const totals = new Map<string, number>();
  for (const row of rows ?? []) totals.set(row.company_id, (totals.get(row.company_id) ?? 0) + Number(row.overage_minutes || 0));

  for (const [companyId, minutes] of totals) {
    const amount = Math.round(minutes * PHONE_OVERAGE_PER_MINUTE * 100) / 100;
    if (amount < 0.5) {
      summary.skipped++;
      continue; // Stripe can't charge less than $0.50 — small amounts are on us.
    }

    // Claim the month first so a retry never charges twice.
    const { data: claimed } = await admin
      .from("phone_overage_charges")
      .upsert({ company_id: companyId, period, minutes, amount }, { onConflict: "company_id,period", ignoreDuplicates: true })
      .select("company_id");
    const { data: existing } = await admin
      .from("phone_overage_charges")
      .select("stripe_invoice_item_id")
      .eq("company_id", companyId)
      .eq("period", period)
      .maybeSingle();
    if (!claimed?.length && existing?.stripe_invoice_item_id) {
      summary.skipped++;
      continue;
    }

    try {
      const { customerId } = await companyPhoneAccess(companyId);
      if (!customerId) throw new Error(`Company ${companyId} has no Stripe customer.`);
      const item = await stripeRequest<{ id: string }>("POST", "invoiceitems", {
        customer: customerId,
        currency: "usd",
        amount: Math.round(amount * 100),
        description: `BaseLead calling — ${minutes.toLocaleString("en-US")} extra minutes in ${period} ($${PHONE_OVERAGE_PER_MINUTE}/min)`,
        metadata: { company_id: companyId, period, kind: "phone_overage" },
      });
      await admin.from("phone_overage_charges").update({ stripe_invoice_item_id: item.id }).eq("company_id", companyId).eq("period", period);
      summary.billed++;
    } catch (billError) {
      summary.errors.push(billError instanceof Error ? billError.message : String(billError));
    }
  }

  return summary;
}
