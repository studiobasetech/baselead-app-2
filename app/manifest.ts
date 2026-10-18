import type { MetadataRoute } from "next";

// Makes BaseLead installable as an app (Add to Home Screen / desktop install).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BaseLead — AI Client Finder",
    short_name: "BaseLead",
    description:
      "Find, contact and close B2B clients with AI: leads, outreach, follow-ups, bookings and pipeline in one app.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050505",
    theme_color: "#050505",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today" },
      { name: "New search", url: "/search" },
      { name: "Pipeline", url: "/pipeline" },
    ],
  };
}
