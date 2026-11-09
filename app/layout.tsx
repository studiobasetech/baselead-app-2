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

export const metadata: Metadata = {
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
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
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
