"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/components/lib/supabase";

/*
 * Real interactive map (Leaflet + Esri dark tiles, no API key).
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
// Results are cached in memory and in the browser, so each city or
// address is looked up only once, ever.
const CACHE_KEY = "baselead-geocode-v1";
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
let cacheLoaded = false;

function loadCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, { lat: number; lng: number } | null>;
    for (const [key, value] of Object.entries(saved)) geocodeCache.set(key, value);
  } catch {}
}

function saveCache() {
  try {
    const entries = Array.from(geocodeCache.entries()).slice(-800);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

let lastRequest = 0;

async function geocode(query: string) {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  loadCache();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  // Respect the free service's limit of one request per second.
  const waitFor = lastRequest + 1100 - Date.now();
  if (waitFor > 0) await wait(waitFor);
  lastRequest = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return null;
    const json = await response.json();
    const hit = Array.isArray(json) && json[0]
      ? { lat: Number(json[0].lat), lng: Number(json[0].lon) }
      : null;
    geocodeCache.set(key, hit);
    saveCache();
    return hit;
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function areaOf(lead: MapLead) {
  return [lead.city, lead.state, lead.country].filter(Boolean).join(", ") || lead.location || "";
}

const TILES = {
  dark: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  },
  light: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  },
};

function isLightTheme() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("baselead-light");
}

type MarkerHandle = {
  setLatLng: (latlng: [number, number]) => void;
  setIcon: (icon: unknown) => void;
  remove: () => void;
};

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
  const tilesRef = useRef<LeafletLayer[]>([]);
  const markersRef = useRef<Map<string, { marker: MarkerHandle; key: string }>>(new Map());
  const onSelectRef = useRef(onSelectLead);
  const userMovedRef = useRef(false);
  const fittedRef = useRef<string | null>(null);
  const fittedCountRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [geocoded, setGeocoded] = useState<Record<string, Point>>({});
  const [locating, setLocating] = useState(0);
  const [light, setLight] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectLead;
  }, [onSelectLead]);

  // Follow the app theme (light / dark map).
  useEffect(() => {
    const update = () => setLight(isLightTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 1. Create the map once.
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          worldCopyJump: true,
          minZoom: 2,
          // No tile fade: avoids blank/flickering tiles while moving.
          fadeAnimation: false,
        }).setView([25, -40], 2);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        // Stop auto-zooming once the user moves the map themselves.
        const container = containerRef.current;
        const markMoved = () => {
          userMovedRef.current = true;
        };
        container.addEventListener("pointerdown", markMoved);
        container.addEventListener("wheel", markMoved, { passive: true });

        // Keep the map sized correctly when its box changes (tabs, sidebar, rotation).
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(container);

        setReady(true);
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markersRef.current.clear();
      tilesRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // 1b. Tiles that match the theme.
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    for (const layer of tilesRef.current) (layer as unknown as { remove: () => void }).remove();

    const tiles = light ? TILES.light : TILES.dark;
    const base = L.tileLayer(tiles.base, {
      maxZoom: 16,
      attribution:
        'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    }).addTo(map);
    const labels = L.tileLayer(tiles.labels, { maxZoom: 16, pane: "overlayPane" }).addTo(map);
    tilesRef.current = [base, labels];
  }, [ready, light]);

  // 2. Find positions for leads without coordinates. Leads in the same
  //    city share one lookup, so even hundreds of leads take seconds.
  useEffect(() => {
    const missing = leads.filter(
      (lead) => (lead.latitude == null || lead.longitude == null) && !geocoded[lead.id]
    );
    if (!missing.length) return;

    let cancelled = false;

    (async () => {
      setLocating(missing.length);
      const found: Record<string, Point> = {};
      let lastFlush = Date.now();

      const flush = () => {
        if (cancelled || !Object.keys(found).length) return;
        const batch = { ...found };
        for (const key of Object.keys(found)) delete found[key];
        setGeocoded((current) => ({ ...current, ...batch }));
      };

      // a) city / area level for everyone (few unique lookups)
      const byArea = new Map<string, MapLead[]>();
      for (const lead of missing) {
        const area = areaOf(lead);
        if (!area) continue;
        if (!byArea.has(area)) byArea.set(area, []);
        byArea.get(area)!.push(lead);
      }

      let remaining = missing.length;
      for (const [area, group] of byArea) {
        if (cancelled) return;
        const hit = await geocode(area);
        if (hit) {
          for (const lead of group) {
            const offset = jitter(lead.id);
            found[lead.id] = { lat: hit.lat + offset.lat, lng: hit.lng + offset.lng, approximate: true };
          }
        }
        remaining -= group.length;
        setLocating(Math.max(0, remaining));
        if (Date.now() - lastFlush > 1200) {
          flush();
          lastFlush = Date.now();
        }
      }
      flush();
      if (!cancelled) setLocating(0);

      // b) refine to the exact street address in the background (max 25 per visit)
      let refined = 0;
      for (const lead of missing) {
        if (cancelled || refined >= 25) break;
        const exact = lead.address?.trim();
        if (!exact) continue;
        const hit = await geocode(exact);
        if (!hit || cancelled) continue;
        refined++;
        found[lead.id] = { ...hit, approximate: false };
        if (Date.now() - lastFlush > 2500) {
          flush();
          lastFlush = Date.now();
        }
        // Save exact positions so the map loads instantly next time.
        void supabase.from("leads").update({ latitude: hit.lat, longitude: hit.lng }).eq("id", lead.id);
      }
      flush();
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

  // 3. Update markers in place (no flicker, open popups stay open).
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;

    const seen = new Set<string>();

    for (const { lead, point } of points) {
      seen.add(lead.id);
      const tier = scoreTier(lead.score);
      const size = lead.score >= 80 ? 34 : 28;
      const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)},${lead.score},${point.approximate}`;
      const existing = markersRef.current.get(lead.id);

      const icon = L.divIcon({
        className: "baselead-map-pin",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
        html: `<div style="--pin:${tier.color};width:${size}px;height:${size}px" class="baselead-pin ${
          lead.score >= 80 ? "baselead-pin--pulse" : ""
        } ${point.approximate ? "baselead-pin--approx" : ""}"><span>${lead.score}</span></div>`,
      });

      if (existing) {
        if (existing.key !== key) {
          existing.marker.setLatLng([point.lat, point.lng]);
          existing.marker.setIcon(icon);
          existing.key = key;
        }
        continue;
      }

      const marker = L.marker([point.lat, point.lng], {
        icon,
        title: lead.name,
        riseOnHover: true,
        zIndexOffset: lead.score * 10,
      });

      const popup = document.createElement("div");
      popup.className = "baselead-popup";
      popup.innerHTML = `
        <div class="baselead-popup__tier" style="color:${tier.color}">● ${tier.label} opportunity · ${lead.score}/100</div>
        <div class="baselead-popup__name">${escapeHtml(lead.name)}</div>
        ${lead.category ? `<div class="baselead-popup__meta">${escapeHtml(lead.category)}</div>` : ""}
        <div class="baselead-popup__meta">${escapeHtml(lead.address || lead.location || "")}</div>
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
      markersRef.current.set(lead.id, { marker: marker as unknown as MarkerHandle, key });
    }

    for (const [id, entry] of markersRef.current) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [points, ready]);

  // 4. Zoom to the leads: when the location filter changes, or once the
  //    first positions arrive. Never fights the user while they explore.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || points.length === 0) return;

    const focusChanged = fittedRef.current !== focusLocation;
    if (!focusChanged && userMovedRef.current) return;
    if (!focusChanged && fittedRef.current !== null && locating > 0) return;
    // Same leads as last time (only fine-tuned positions): keep the view still.
    if (!focusChanged && fittedCountRef.current === points.length) return;

    const timer = window.setTimeout(() => {
      const bounds = points.map(({ point }) => [point.lat, point.lng] as [number, number]);
      if (bounds.length === 1) map.setView(bounds[0], 13);
      else map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
      fittedRef.current = focusLocation;
      fittedCountRef.current = points.length;
      if (focusChanged) userMovedRef.current = false;
    }, 250);

    return () => window.clearTimeout(timer);
  }, [points, ready, focusLocation, locating]);

  return (
    <div className="absolute inset-0 z-0 isolate">
      <div ref={containerRef} className="baselead-map h-full w-full" />

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
        html.baselead-light .leaflet-container { background: #f2f2f4; }
        html.baselead-light .baselead-pin {
          background: color-mix(in srgb, var(--pin) 28%, #ffffff);
          color: #1d1d1f;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--pin) 18%, transparent), 0 6px 16px rgba(0,0,0,.14);
        }
        html.baselead-light .baselead-leaflet-popup .leaflet-popup-content-wrapper {
          background: #ffffff; color: #1d1d1f; border-color: rgba(0,0,0,.08); box-shadow: 0 18px 40px rgba(0,0,0,.14);
        }
        html.baselead-light .baselead-leaflet-popup .leaflet-popup-tip { background: #ffffff; }
        html.baselead-light .baselead-popup__meta { color: #6e6e73; }
        html.baselead-light .baselead-popup__value { color: #946F00; }
        html.baselead-light .leaflet-control-zoom a {
          background: rgba(255,255,255,.95) !important; color: #1d1d1f !important; border-color: rgba(0,0,0,.08) !important;
        }
        html.baselead-light .leaflet-control-attribution { background: rgba(255,255,255,.75) !important; color: #86868b !important; }
      `}</style>
    </div>
  );
}
