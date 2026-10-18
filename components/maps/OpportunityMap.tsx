"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/components/lib/supabase";

/*
 * Real interactive map (Leaflet + CARTO dark tiles, no API key).
 * Each lead is pinned at its real coordinates. Leads without
 * coordinates are geocoded once (OpenStreetMap) and saved.
 */

export type MapLead = {
  id: string;
  name: string;
  score: number;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  projectValue?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Point = { lat: number; lng: number; approximate: boolean };

// Minimal typing for the Leaflet global loaded from the CDN.
type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: [number, number][], options?: Record<string, unknown>) => void;
  flyTo: (center: [number, number], zoom: number, options?: Record<string, unknown>) => void;
  remove: () => void;
  invalidateSize: () => void;
  getZoom: () => number;
};
type LeafletLayer = { addTo: (map: LeafletMap) => LeafletLayer; clearLayers: () => void; addLayer: (layer: unknown) => void };
type LeafletGlobal = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletLayer;
  layerGroup: () => LeafletLayer;
  marker: (latlng: [number, number], options?: Record<string, unknown>) => {
    bindPopup: (html: string | HTMLElement, options?: Record<string, unknown>) => unknown;
    on: (event: string, handler: () => void) => unknown;
    openPopup: () => void;
  };
  divIcon: (options: Record<string, unknown>) => unknown;
  control: { zoom: (options: Record<string, unknown>) => LeafletLayer };
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

const LEAFLET_VERSION = "1.9.4";
let leafletPromise: Promise<LeafletGlobal> | null = null;

function loadLeaflet(): Promise<LeafletGlobal> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet failed")));
    script.onerror = () => reject(new Error("Map library could not load"));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

export function scoreTier(score: number) {
  if (score >= 80) return { label: "High", color: "#F5C518" };
  if (score >= 60) return { label: "Strong", color: "#84CC16" };
  return { label: "Emerging", color: "#A78BFA" };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  );
}

// Small stable offset so several leads in the same city don't overlap.
function jitter(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return {
    lat: ((hash % 1000) / 1000) * 0.03 - 0.015,
    lng: (((hash >> 10) % 1000) / 1000) * 0.03 - 0.015,
  };
}

// ---- Geocoding (OpenStreetMap Nominatim, 1 request/second) ----
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(query: string) {
  if (geocodeCache.has(query)) return geocodeCache.get(query)!;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );
    const json = await response.json();
    const hit = Array.isArray(json) && json[0]
      ? { lat: Number(json[0].lat), lng: Number(json[0].lon) }
      : null;
    geocodeCache.set(query, hit);
    return hit;
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function OpportunityMap({
  leads,
  focusLocation,
  onSelectLead,
}: {
  leads: MapLead[];
  /** "All locations" or a location name to zoom into. */
  focusLocation: string;
  onSelectLead: (leadId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LeafletLayer | null>(null);
  const onSelectRef = useRef(onSelectLead);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [geocoded, setGeocoded] = useState<Record<string, Point>>({});
  const [locating, setLocating] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelectLead;
  }, [onSelectLead]);

  // 1. Create the map once.
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          worldCopyJump: true,
          minZoom: 2,
        }).setView([25, -40], 2);

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            subdomains: "abcd",
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          }
        ).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setReady(true);

        // Fix sizing after the container finishes laying out.
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // 2. Geocode leads that have no coordinates (once, then saved).
  useEffect(() => {
    const missing = leads.filter(
      (lead) =>
        (lead.latitude == null || lead.longitude == null) &&
        !geocoded[lead.id]
    );

    if (!missing.length) return;

    let cancelled = false;

    (async () => {
      setLocating(missing.length);

      for (const lead of missing.slice(0, 40)) {
        if (cancelled) return;

        const exact = lead.address?.trim();
        const area = [lead.city, lead.state, lead.country]
          .filter(Boolean)
          .join(", ") || lead.location || "";

        let point: Point | null = null;

        if (exact) {
          const hit = await geocode(exact);
          if (hit) point = { ...hit, approximate: false };
          await wait(1100);
        }

        if (!point && area) {
          const hit = await geocode(area);
          if (hit) {
            const offset = jitter(lead.id);
            point = { lat: hit.lat + offset.lat, lng: hit.lng + offset.lng, approximate: true };
          }
          await wait(1100);
        }

        if (!point || cancelled) continue;

        setGeocoded((current) => ({ ...current, [lead.id]: point! }));
        setLocating((current) => Math.max(0, current - 1));

        // Save exact positions so the map loads instantly next time.
        if (!point.approximate) {
          void supabase
            .from("leads")
            .update({ latitude: point.lat, longitude: point.lng })
            .eq("id", lead.id);
        }
      }

      setLocating(0);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  const points = useMemo(
    () =>
      leads
        .map((lead) => {
          const point: Point | undefined =
            lead.latitude != null && lead.longitude != null
              ? { lat: Number(lead.latitude), lng: Number(lead.longitude), approximate: false }
              : geocoded[lead.id];

          return point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
            ? { lead, point }
            : null;
        })
        .filter((item): item is { lead: MapLead; point: Point } => Boolean(item)),
    [leads, geocoded]
  );

  // 3. Draw markers and fit the view.
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = layerRef.current;

    if (!ready || !L || !map || !layer) return;

    layer.clearLayers();

    const sorted = [...points].sort((a, b) => a.lead.score - b.lead.score);

    for (const { lead, point } of sorted) {
      const tier = scoreTier(lead.score);
      const size = lead.score >= 80 ? 34 : 28;

      const icon = L.divIcon({
        className: "baselead-map-pin",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
        html: `<div style="--pin:${tier.color};width:${size}px;height:${size}px" class="baselead-pin ${
          lead.score >= 80 ? "baselead-pin--pulse" : ""
        } ${point.approximate ? "baselead-pin--approx" : ""}"><span>${lead.score}</span></div>`,
      });

      const marker = L.marker([point.lat, point.lng], {
        icon,
        title: lead.name,
        riseOnHover: true,
      });

      const popup = document.createElement("div");
      popup.className = "baselead-popup";
      popup.innerHTML = `
        <div class="baselead-popup__tier" style="color:${tier.color}">● ${tier.label} opportunity · ${lead.score}/100</div>
        <div class="baselead-popup__name">${escapeHtml(lead.name)}</div>
        ${lead.category ? `<div class="baselead-popup__meta">${escapeHtml(lead.category)}</div>` : ""}
        <div class="baselead-popup__meta">${escapeHtml(lead.address || lead.location || "")}${
          point.approximate ? " · approximate location" : ""
        }</div>
        ${lead.projectValue ? `<div class="baselead-popup__value">${escapeHtml(lead.projectValue)}</div>` : ""}
      `;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "baselead-popup__button";
      button.textContent = "View lead →";
      button.onclick = () => onSelectRef.current(lead.id);
      popup.appendChild(button);

      marker.bindPopup(popup, { closeButton: false, className: "baselead-leaflet-popup", maxWidth: 260 });
      layer.addLayer(marker);
    }

    const bounds = points.map(({ point }) => [point.lat, point.lng] as [number, number]);

    if (bounds.length === 1) {
      map.flyTo(bounds[0], 13, { duration: 0.8 });
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14, animate: true });
    }
  }, [points, ready, focusLocation]);

  return (
    <div className="absolute inset-0 z-0 isolate">
      <div ref={containerRef} className="h-full w-full bg-[#0A0A0A]" />

      {!ready && !failed && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          Loading map…
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-500">
          The map could not load. Check your internet connection and refresh.
        </div>
      )}

      {locating > 0 && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-[500] -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-xs text-gray-300 backdrop-blur">
          Locating {locating} business{locating === 1 ? "" : "es"} on the map…
        </div>
      )}

      <style>{`
        .baselead-map-pin { background: transparent; border: 0; }
        .baselead-pin {
          position: relative; display: flex; align-items: center; justify-content: center;
          border-radius: 9999px; background: color-mix(in srgb, var(--pin) 22%, #0A0A0A);
          border: 2px solid var(--pin); color: #fff; font: 600 11px/1 system-ui, sans-serif;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--pin) 14%, transparent), 0 6px 18px rgba(0,0,0,.55);
          transition: transform .15s ease;
        }
        .baselead-pin:hover { transform: scale(1.15); }
        .baselead-pin--approx { border-style: dashed; }
        .baselead-pin--pulse::after {
          content: ""; position: absolute; inset: -8px; border-radius: 9999px;
          border: 2px solid var(--pin); opacity: .6; animation: baseleadPulse 2s ease-out infinite;
        }
        @keyframes baseleadPulse { from { transform: scale(.7); opacity: .7 } to { transform: scale(1.5); opacity: 0 } }
        .baselead-leaflet-popup .leaflet-popup-content-wrapper {
          background: #0D0D0D; color: #fff; border: 1px solid rgba(255,255,255,.1);
          border-radius: 14px; box-shadow: 0 18px 40px rgba(0,0,0,.6);
        }
        .baselead-leaflet-popup .leaflet-popup-tip { background: #0D0D0D; }
        .baselead-leaflet-popup .leaflet-popup-content { margin: 14px 16px; }
        .baselead-popup__tier { font-size: 11px; font-weight: 600; }
        .baselead-popup__name { margin-top: 6px; font-size: 14px; font-weight: 600; }
        .baselead-popup__meta { margin-top: 3px; font-size: 12px; color: #8C8C8C; }
        .baselead-popup__value { margin-top: 6px; font-size: 12px; color: #F5C518; }
        .baselead-popup__button {
          margin-top: 10px; width: 100%; border-radius: 9px; padding: 7px 10px;
          background: #F5C518; color: #000; font-size: 12px; font-weight: 600; cursor: pointer; border: 0;
        }
        .leaflet-container { background: #0A0A0A; font-family: inherit; }
        .leaflet-control-zoom a {
          background: rgba(0,0,0,.8) !important; color: #ddd !important;
          border-color: rgba(255,255,255,.1) !important;
        }
        .leaflet-control-attribution {
          background: rgba(0,0,0,.6) !important; color: #666 !important; font-size: 9px;
        }
        .leaflet-control-attribution a { color: #888 !important; }
        .leaflet-bottom.leaflet-right { margin-bottom: 64px; }
      `}</style>
    </div>
  );
}
