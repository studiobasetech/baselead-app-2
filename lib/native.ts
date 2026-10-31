/*
 * Helpers for the iPhone/Android app (Capacitor). The app loads the live website
 * inside a native shell; Capacitor injects window.Capacitor with the native plugins.
 * On the normal website everything here is a no-op.
 */

export const NATIVE_SCHEME = "com.studiobase.baselead";

type PluginMap = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web";
  Plugins?: PluginMap;
};

function cap(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor) ?? null;
}

export function isNativeApp() {
  return Boolean(cap()?.isNativePlatform?.());
}

export function nativePlatform(): "ios" | "android" | "web" {
  return cap()?.getPlatform?.() ?? "web";
}

export function nativePlugin<T = any>(name: string): T | null { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (cap()?.Plugins?.[name] as T) ?? null;
}

/** Opens a page in the system browser (Safari / Chrome Custom Tabs). Falls back to a normal navigation. */
export async function openInSystemBrowser(url: string) {
  const absolute = new URL(url, window.location.origin).toString();
  const browser = nativePlugin<{ open: (o: { url: string; presentationStyle?: string }) => Promise<void> }>("Browser");
  if (isNativeApp() && browser) {
    await browser.open({ url: absolute, presentationStyle: "popover" });
    return;
  }
  window.location.assign(absolute);
}

/** Where Google/Apple sign-in should return to. In the app it's a deep link back into the app. */
export function authRedirect(next: string) {
  if (isNativeApp()) return `${NATIVE_SCHEME}://auth/callback?next=${encodeURIComponent(next)}`;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
