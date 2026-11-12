import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NativeBridge from "@/components/native/NativeBridge";
import "./globals.css";

import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { PreferencesProvider } from "@/components/preferences/PreferencesProvider";
import { PlanProvider } from "@/components/plans/PlanProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Public web address (set NEXT_PUBLIC_APP_URL once the domain is live) so Google and link previews get full URLs.
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://baselead.ai").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BaseLead",
    template: "%s · BaseLead",
  },
  description: "AI-Powered Client Finder",
  applicationName: "BaseLead",
  appleWebApp: {
    capable: true,
    title: "BaseLead",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  // Square icons only (Google shows the site icon from these; it needs a square, 48px or larger).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Square image for link previews (Google, iMessage, WhatsApp, LinkedIn…).
  openGraph: {
    type: "website",
    siteName: "BaseLead",
    title: "BaseLead — AI-Powered Client Finder",
    description: "Find B2B clients and the person who decides, call and email them from one app, and close more deals.",
    url: "/",
    images: [{ url: "/og-square.jpg", width: 1200, height: 1200, alt: "BaseLead" }],
  },
  twitter: {
    card: "summary",
    title: "BaseLead — AI-Powered Client Finder",
    description: "Find B2B clients and the person who decides, call and email them from one app, and close more deals.",
    images: ["/og-square.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved light/dark theme before the first paint (no flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("baselead-theme");var d=t!=="light";var r=document.documentElement;r.classList.add(d?"baselead-dark":"baselead-light");r.dataset.baseleadTheme=d?"dark":"light";r.dataset.baseleadDarkMode=d?"true":"false";r.style.colorScheme=d?"dark":"light";r.style.backgroundColor=d?"#000000":"#f5f5f7";setTimeout(function(){r.classList.add("bl-ready")},1500);}catch(e){}})();`,
          }}
        />
        {process.env.NODE_ENV !== "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `if(document.cookie.indexOf("bl_demo=1")>-1){window.__blNoAuth=true;window.__blSupabaseRef=${JSON.stringify((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https:\/\//, "").split(".")[0])};window.__blUserId="d0d0d0d0-0000-4000-8000-000000000001";window.__blCompanyId="d0d0d0d0-0000-4000-8000-0000000000c0";window.__blDemoPhone=window.__blDemoPhone||{};document.write('<script src="/api/dev/snapshot?script=1&noauth=1"><\\/script>')}`,
            }}
          />
        )}
      </head>
      <body className="bg-[#050505] text-white antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <PreferencesProvider>
            <PlanProvider>
              {children}
              <NativeBridge />
            </PlanProvider>
          </PreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
