import type { Metadata } from "next";
import "./globals.css";

import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { PreferencesProvider } from "@/components/preferences/PreferencesProvider";
import { PlanProvider } from "@/components/plans/PlanProvider";

export const metadata: Metadata = {
  title: "BaseLead",
  description: "AI-Powered Client Finder",

  icons: {
    icon: "/baselead-favicon.png",
    shortcut: "/baselead-favicon.png",
    apple: "/baselead-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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