/**
 * Call after an action in the browser (lead moved, outreach sent, meeting
 * created...) so the server can notify the user's webhooks.
 * Never throws and never blocks the UI.
 */
export function emitEvent(event: string, data: unknown) {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}
