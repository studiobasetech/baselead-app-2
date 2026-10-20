"use client";

import { useEffect } from "react";

/*
 * Makes every card's hover glow match the color of the icon or chart
 * inside it. When the pointer enters a card, we read the first colored
 * icon (or icon tile / chart) in it and store that color in
 * --hover-accent; globals.css uses it for the border and glow.
 */

const CARD_SELECTOR = [
  ".bl-card",
  "[class*='rounded-2xl'][class*='border']",
  "[class*='rounded-xl'][class*='border'][class*='p-']",
  "[class*='rounded-xl'][class*='border'][class*='hover:']",
].join(",");

let canvasContext: CanvasRenderingContext2D | null = null;

function toRgb(color: string): [number, number, number] | null {
  if (!color || color === "transparent" || color.includes("var(")) return null;
  if (!canvasContext) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    canvasContext = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!canvasContext) return null;
  canvasContext.clearRect(0, 0, 1, 1);
  canvasContext.fillStyle = "#000";
  canvasContext.fillStyle = color;
  canvasContext.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = canvasContext.getImageData(0, 0, 1, 1).data;
  if (a < 40) return null;
  return [r, g, b];
}

function isColorful(color: string) {
  const rgb = toRgb(color);
  if (!rgb) return false;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  return max - min > 40 && max > 90;
}

function findAccent(card: HTMLElement): string | null {
  // 1. A pastel icon tile or colored tab inside the card.
  const tile = card.querySelector<HTMLElement>(".bl-icon-tile, [style*='--tab'], [style*='--kpi']");
  if (tile) {
    const style = getComputedStyle(tile);
    const value = (style.getPropertyValue("--tab") || style.getPropertyValue("--kpi")).trim();
    if (value && isColorful(value)) return value;
  }

  // 2. The first colored icon.
  for (const icon of Array.from(card.querySelectorAll<SVGElement>("svg.lucide")).slice(0, 6)) {
    const color = getComputedStyle(icon).color;
    if (isColorful(color)) return color;
  }

  // 3. A chart line, bar or ring.
  const chart = card.querySelector<SVGElement>(
    ".recharts-line-curve, .recharts-bar-rectangle path, .recharts-pie-sector path, svg circle[stroke]"
  );
  if (chart) {
    const style = getComputedStyle(chart);
    const color = style.stroke !== "none" ? style.stroke : style.fill;
    if (isColorful(color)) return color;
  }

  return null;
}

export default function HoverAccent() {
  useEffect(() => {
    function onOver(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      const card = target?.closest?.<HTMLElement>(CARD_SELECTOR);
      if (!card || card.dataset.accentReady === "1") return;
      if (!card.closest(".baselead-main")) return;
      card.dataset.accentReady = "1";
      const accent = findAccent(card);
      if (accent) {
        card.style.setProperty("--hover-accent", accent);
        card.dataset.hoverAccent = "1";
      }
    }

    document.addEventListener("pointerover", onOver, { passive: true });
    return () => document.removeEventListener("pointerover", onOver);
  }, []);

  return null;
}
