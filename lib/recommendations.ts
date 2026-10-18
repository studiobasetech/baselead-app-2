/*
 * ai_recommendations can be stored as an object
 * ({ recommended_service, estimated_project_value, reasons, ... }),
 * an array, a JSON string or plain text. These helpers read any form.
 */

type RecommendationObject = {
  recommended_service?: unknown;
  recommended_services?: unknown;
  services?: unknown;
  estimated_project_value?: unknown;
  reasons?: unknown;
};

function normalize(value: unknown): unknown {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return value;
}

function splitText(text: string) {
  return text
    .split(/[,;\n|•]+/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function toStrings(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return splitText(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return [item.trim()];
      if (item && typeof item === "object") {
        const named = (item as { service?: unknown; name?: unknown }).service ??
          (item as { name?: unknown }).name;
        return typeof named === "string" ? [named.trim()] : [];
      }
      return [];
    }).filter(Boolean);
  }

  return [];
}

/** Services to pitch (max 4). */
export function recommendedServices(value: unknown): string[] {
  const data = normalize(value);

  if (!data) return [];
  if (typeof data === "string" || Array.isArray(data)) {
    return toStrings(data).slice(0, 4);
  }

  if (typeof data === "object") {
    const object = data as RecommendationObject;
    return [
      ...toStrings(object.recommended_service),
      ...toStrings(object.recommended_services),
      ...toStrings(object.services),
    ].slice(0, 4);
  }

  return [];
}

/** Evidence-based reasons (max 6). */
export function recommendationReasons(value: unknown): string[] {
  const data = normalize(value);

  if (!data) return [];
  if (typeof data === "string") return splitText(data).slice(0, 6);
  if (Array.isArray(data)) return toStrings(data).slice(0, 6);

  if (typeof data === "object") {
    const reasons = (data as RecommendationObject).reasons;
    return Array.isArray(reasons)
      ? reasons.filter((r): r is string => typeof r === "string").slice(0, 6)
      : [];
  }

  return [];
}

/** e.g. "$5,000 - $15,000" or null. */
export function recommendationValue(value: unknown): string | null {
  const data = normalize(value);

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const estimate = (data as RecommendationObject).estimated_project_value;
    if (typeof estimate === "string" && estimate.trim()) return estimate;
    if (typeof estimate === "number") return `$${estimate.toLocaleString()}`;
  }

  return null;
}
