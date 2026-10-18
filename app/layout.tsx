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
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#050505] text-white antialiased">
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
