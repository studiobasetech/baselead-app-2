/*
 * AI for BaseLead. Uses whichever key is in .env.local:
 *   ANTHROPIC_API_KEY  → Claude (best quality, paid per use)
 *   GEMINI_API_KEY     → Google Gemini (free tier, good for testing)
 * If both are set, Claude is used. Without a key, BaseLead uses its built-in rules.
 */

export function aiProvider(): "anthropic" | "gemini" | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function isAiConfigured() {
  return aiProvider() !== null;
}

export async function askAi(
  prompt: string,
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new Error("AI is not configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY.");
  return provider === "anthropic" ? askAnthropic(prompt, options) : askGemini(prompt, options);
}

async function askAnthropic(prompt: string, options: { system?: string; maxTokens?: number }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
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

async function askGemini(prompt: string, options: { system?: string; maxTokens?: number }) {
  // Flash-Lite: fast and on the free tier. If it is busy, retry, then try Flash.
  const main = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const attempts = [main, main, main === "gemini-flash-latest" ? "gemini-flash-lite-latest" : "gemini-flash-latest"];
  let lastError = "AI request failed.";

  for (let i = 0; i < attempts.length; i += 1) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 800 * i));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(attempts[i])}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY as string,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            // Extra room: Gemini counts its thinking toward this limit.
            maxOutputTokens: (options.maxTokens ?? 1024) + 2048,
          },
        }),
        signal: AbortSignal.timeout(20000),
      }
    ).catch(() => null);

    if (!response) {
      lastError = "The AI took too long to answer.";
      continue;
    }

    const json = await response.json().catch(() => ({}));

    if (response.ok) {
      return (json.candidates?.[0]?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim();
    }

    lastError = json?.error?.message || lastError;
    // Only busy/limit errors are worth retrying.
    if (![429, 500, 503].includes(response.status)) break;
  }

  throw new Error(lastError);
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
