"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp, nativePlatform, nativePlugin, NATIVE_SCHEME, openInSystemBrowser } from "@/lib/native";

/*
 * Runs only inside the iPhone/Android app:
 * - marks <html> with bl-native / bl-ios / bl-android for app-only styles
 * - hides the splash screen, styles the status bar
 * - handles deep links (sign-in callback, notification taps)
 * - registers for push notifications and sends the device token to the server
 * - opens external sites (and Google consent screens) in the system browser
 */
export default function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    const platform = nativePlatform();
    document.documentElement.classList.add("bl-native", `bl-${platform}`);

    nativePlugin("SplashScreen")?.hide?.().catch?.(() => {});
    const statusBar = nativePlugin("StatusBar");
    statusBar?.setStyle?.({ style: "DARK" }).catch?.(() => {});
    if (platform === "android") statusBar?.setBackgroundColor?.({ color: "#050505" }).catch?.(() => {});

    const cleanups: Array<() => void> = [];

    // Deep links: com.studiobase.baselead://auth/callback?code=…  or  …://open?path=/leads
    const app = nativePlugin("App");
    const onUrl = ({ url }: { url: string }) => {
      try {
        const link = new URL(url);
        nativePlugin("Browser")?.close?.().catch?.(() => {});
        if (link.protocol === `${NATIVE_SCHEME}:` && (link.host === "auth" || link.pathname.includes("callback"))) {
          window.location.assign(`/auth/callback${link.search}`);
          return;
        }
        const path = link.searchParams.get("path") || (link.protocol.startsWith("http") ? link.pathname + link.search : null);
        if (path && path.startsWith("/")) router.push(path);
      } catch {
        // ignore malformed links
      }
    };
    app?.addListener?.("appUrlOpen", onUrl).then?.((h: { remove: () => void }) => cleanups.push(() => h.remove()));
    // Android back button: go back inside the app.
    app?.addListener?.("backButton", ({ canGoBack }: { canGoBack: boolean }) => {
      if (canGoBack) window.history.back();
      else app?.minimizeApp?.();
    }).then?.((h: { remove: () => void }) => cleanups.push(() => h.remove()));

    // Push notifications
    const push = nativePlugin("PushNotifications");
    if (push) {
      push.addListener("registration", async ({ value }: { value: string }) => {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: value, platform }),
        }).catch(() => {});
      }).then?.((h: { remove: () => void }) => cleanups.push(() => h.remove()));
      push.addListener("pushNotificationActionPerformed", ({ notification }: { notification: { data?: { url?: string } } }) => {
        const url = notification?.data?.url;
        if (url && url.startsWith("/")) router.push(url);
      }).then?.((h: { remove: () => void }) => cleanups.push(() => h.remove()));
      push.checkPermissions?.().then(async (status: { receive: string }) => {
        let receive = status.receive;
        if (receive === "prompt" || receive === "prompt-with-rationale") receive = (await push.requestPermissions()).receive;
        if (receive === "granted") await push.register();
      }).catch?.(() => {});
    }

    // External links and Google consent screens open in the system browser.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!/^https?:/i.test(href)) return;
      const target = new URL(href);
      if (target.origin === window.location.origin) return;
      event.preventDefault();
      openInSystemBrowser(target.toString());
    };
    document.addEventListener("click", onClick, true);
    cleanups.push(() => document.removeEventListener("click", onClick, true));

    return () => cleanups.forEach((fn) => fn());
  }, [router]);

  return null;
}
