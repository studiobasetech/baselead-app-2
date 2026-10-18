/*
 * Optional AI via the Anthropic API (Claude).
 * Add ANTHROPIC_API_KEY to .env.local to turn it on.
 * Without a key, BaseLead uses its built-in rules instead.
 */

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askAi(
  prompt: string,
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: options.maxTokens ?? 1024,
      system: options.system,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45000),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || "AI request failed.");
  }

  return (json.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("")
    .trim();
}

/** Asks for JSON and parses it (tolerates ```json fences). */
export async function askAiJson<T>(
  prompt: string,
  options: { system?: string; maxTokens?: number } = {}
): Promise<T> {
  const text = await askAi(prompt, options);
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.search(/[[{]/);

  return JSON.parse(start >= 0 ? cleaned.slice(start) : cleaned) as T;
}
