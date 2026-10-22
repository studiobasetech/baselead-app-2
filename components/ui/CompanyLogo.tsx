"use client";

import { useState, type CSSProperties } from "react";

/*
 * Shows the business's real logo (its website icon) and falls back to
 * colored initials when the site has no icon. Uses Google's free
 * favicon service — no API key, no cost.
 */

const PALETTE = ["#3B82F6", "#F5C518", "#A78BFA", "#2DD4BF", "#84CC16", "#F97316", "#F472B6"];
const SKIP = ["example.com", "example.org", "localhost", "google.com", "maps.google", "facebook.com", "instagram.com"];

export function domainFrom(website?: string | null) {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.includes(".") || SKIP.some((skip) => host === skip || host.endsWith(`.${skip}`))) return null;
    return host;
  } catch {
    return null;
  }
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function CompanyLogo({
  name,
  website,
  initials,
  size = 48,
  className = "",
}: {
  name: string;
  website?: string | null;
  initials?: string;
  size?: number;
  className?: string;
}) {
  const domain = domainFrom(website);
  const [failed, setFailed] = useState(false);
  const hash = Array.from(name || "?").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const accent = PALETTE[hash % PALETTE.length];
  const box: CSSProperties = { width: size, height: size };

  if (domain && !failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white ${className}`}
        style={box}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
          alt={name}
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          loading="lazy"
          className="object-contain"
          onLoad={(event) => {
            // Google returns a tiny generic globe when a site has no icon.
            if (event.currentTarget.naturalWidth <= 16) setFailed(true);
          }}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`bl-avatar flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ${className}`}
      style={{ ...box, "--tab": accent, fontSize: Math.max(10, Math.round(size * 0.24)) } as CSSProperties}
    >
      {initials || initialsOf(name)}
    </span>
  );
}
