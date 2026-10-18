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
  const { data: hooks } = await supabase
    .from("webhooks")
    .select("id, url")
    .eq("user_id", userId)
    .eq("event", event)
    .eq("active", true);

  if (!hooks?.length) return { delivered: 0, failed: 0 };

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
