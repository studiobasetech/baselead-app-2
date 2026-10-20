import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
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
            __html: `(function(){try{var t=localStorage.getItem("baselead-theme");var d=t!=="light";var r=document.documentElement;r.classList.add(d?"baselead-dark":"baselead-light");r.dataset.baseleadTheme=d?"dark":"light";r.dataset.baseleadDarkMode=d?"true":"false";r.style.colorScheme=d?"dark":"light";r.style.backgroundColor=d?"#050505":"#f5f5f7";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[#050505] text-white antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <PreferencesProvider>
            <PlanProvider>
              {children}
            </PlanProvider>
          </PreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
