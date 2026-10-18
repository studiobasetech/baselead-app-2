import type { SupabaseClient } from "@supabase/supabase-js";

export const WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "lead.status_changed",
  "outreach.created",
  "outreach.replied",
  "meeting.created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: unknown): value is WebhookEvent {
  return WEBHOOK_EVENTS.includes(value as WebhookEvent);
}

/**
 * Sends an event to every active webhook the user registered for it.
 * Failures never break the main action.
 */
export async function dispatchWebhooks(
  supabase: SupabaseClient,
  userId: string,
  event: WebhookEvent,
  data: unknown
) {
  const [{ data: settingsHooks }, { data: integration }] = await Promise.all([
    // Settings → API & Webhooks
    supabase
      .from("webhooks")
      .select("id, url")
      .eq("user_id", userId)
      .eq("event", event)
      .eq("active", true),
    // Integrations → Webhooks
    supabase
      .from("connected_integrations")
      .select("metadata, status")
      .eq("user_id", userId)
      .eq("provider", "webhook")
      .maybeSingle(),
  ]);

  const hooks: { url: string }[] = [...(settingsHooks ?? [])];
  const meta = (integration?.metadata ?? {}) as {
    webhookUrl?: string;
    events?: Record<string, boolean>;
  };

  // Integrations page stores checkboxes with these keys.
  const integrationKey: Record<WebhookEvent, string> = {
    "lead.created": "leadCreated",
    "lead.updated": "leadUpdated",
    "lead.status_changed": "leadUpdated",
    "outreach.created": "outreachReply",
    "outreach.replied": "outreachReply",
    "meeting.created": "meetingBooked",
  };

  if (
    integration?.status === "connected" &&
    meta.webhookUrl &&
    meta.events?.[integrationKey[event]] !== false
  ) {
    hooks.push({ url: meta.webhookUrl });
  }

  if (!hooks.length) return { delivered: 0, failed: 0 };

  const body = JSON.stringify({
    event,
    created_at: new Date().toISOString(),
    data,
  });

  const results = await Promise.allSettled(
    hooks.map((hook) =>
      fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BaseLead-Webhooks/1.0",
          "X-BaseLead-Event": event,
        },
        body,
        signal: AbortSignal.timeout(8000),
      }).then((response) => {
        if (!response.ok) throw new Error(String(response.status));
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;

  return { delivered: results.length - failed, failed };
}
