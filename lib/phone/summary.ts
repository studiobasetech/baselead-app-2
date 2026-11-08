/*
 * AI review of a recorded call (Gemini listens to the audio).
 * Free tier works for testing; switch to a paid key before real customers.
 */

export type CallSummary = {
  summary: string;
  went_well: string[];
  improve: string[];
  suggested_outcome: string;
  next_step: string;
};

const PROMPT = `You are a sales coach. Listen to this sales call recording (a salesperson calling a business, or a business calling back).
Return ONLY JSON with these keys:
"summary": 2-3 sentences of what happened,
"went_well": up to 3 short points the salesperson did well,
"improve": up to 3 short, specific coaching tips,
"suggested_outcome": one of connected, voicemail, no_answer, interested, meeting, not_interested, wrong_number, callback,
"next_step": the best next action in one sentence.
If the call is clearly personal and not about business, say so in "summary" and start it with "PERSONAL CALL:".
Write in the language spoken in the call (English or Spanish).`;

export async function summarizeRecording(audioUrl: string): Promise<CallSummary | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const audio = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
  if (!audio.ok) return null;
  const bytes = Buffer.from(await audio.arrayBuffer());
  if (bytes.length < 2000 || bytes.length > 18 * 1024 * 1024) return null;

  const models = [process.env.GEMINI_MODEL || "gemini-flash-lite-latest", "gemini-flash-latest"];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inline_data: { mime_type: "audio/mpeg", data: bytes.toString("base64") } },
                  { text: PROMPT },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800 },
          }),
          signal: AbortSignal.timeout(60000),
        }
      );
      if (!response.ok) continue;
      const json = await response.json();
      const text: string = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as Partial<CallSummary>;
      return {
        summary: String(parsed.summary ?? "").slice(0, 1200),
        went_well: (parsed.went_well ?? []).map(String).slice(0, 3),
        improve: (parsed.improve ?? []).map(String).slice(0, 3),
        suggested_outcome: String(parsed.suggested_outcome ?? ""),
        next_step: String(parsed.next_step ?? "").slice(0, 300),
      };
    } catch {
      // Try the next model.
    }
  }
  return null;
}
