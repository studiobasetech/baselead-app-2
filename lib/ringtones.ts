/* Ringtones for incoming calls (soft, made for BaseLead). Files: public/sounds/ring-<id>.mp3
 * (in-app, loops) and mobile/sounds/baselead_ring_<id>.wav (phone notification, 25 s). */

export const RINGTONES = [
  { id: "breeze", name: "Breeze", description: "Warm marimba notes rising — friendly and upbeat." },
  { id: "glass", name: "Glass", description: "Two soft glass chimes, like a calm doorbell." },
  { id: "halo", name: "Halo", description: "A slow, airy swell with sparkles — the calmest." },
  { id: "pulse", name: "Pulse", description: "Modern soft double-tap, rhythmic but gentle." },
  { id: "classic", name: "Classic Soft", description: "A softened classic phone trill — instantly recognizable." },
] as const;

export type RingtoneId = (typeof RINGTONES)[number]["id"];
export const DEFAULT_RINGTONE: RingtoneId = "breeze";
export const RINGTONE_STORAGE_KEY = "bl_ringtone";

export function isRingtone(value: unknown): value is RingtoneId {
  return RINGTONES.some((r) => r.id === value);
}

export const ringtoneUrl = (id: RingtoneId) => `/sounds/ring-${id}.mp3`;
/** File name bundled in the phone apps (iOS sound / Android res/raw). */
export const ringtoneNativeFile = (id: RingtoneId) => `baselead_ring_${id}.wav`;
export const ringtoneChannel = (id: RingtoneId) => `calls_${id}`;

/** The ringtone this browser/phone uses (saved locally, synced from Settings). */
export function currentRingtone(): RingtoneId {
  try {
    const saved = localStorage.getItem(RINGTONE_STORAGE_KEY);
    return isRingtone(saved) ? saved : DEFAULT_RINGTONE;
  } catch {
    return DEFAULT_RINGTONE;
  }
}

/* ---------- Ringer (browser) ---------- */

let ringer: HTMLAudioElement | null = null;

/** Starts ringing (loops, soft volume, gentle vibration on phones). */
export function startRinging(id: RingtoneId = currentRingtone(), volume = 0.7) {
  stopRinging();
  try {
    ringer = new Audio(ringtoneUrl(id));
    ringer.loop = true;
    ringer.volume = volume;
    void ringer.play().catch(() => undefined);
    if ("vibrate" in navigator) navigator.vibrate?.([300, 200, 300, 1500, 300, 200, 300]);
  } catch {
    ringer = null;
  }
}

export function stopRinging() {
  if (ringer) {
    ringer.pause();
    ringer.currentTime = 0;
    ringer = null;
  }
  try {
    if ("vibrate" in navigator) navigator.vibrate?.(0);
  } catch {
    // ignore
  }
}

/** Plays a ringtone once (preview in Settings); returns a stop function. */
export function previewRingtone(id: RingtoneId, onEnd?: () => void) {
  const audio = new Audio(ringtoneUrl(id));
  audio.volume = 0.7;
  audio.onended = () => onEnd?.();
  void audio.play().catch(() => onEnd?.());
  return () => {
    audio.pause();
    onEnd?.();
  };
}
