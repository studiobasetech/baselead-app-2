"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/*
 * Big numbers count up when a page opens (e.g. 0 → 116).
 * Works on the KPI numbers of every page without changing them:
 * it only animates plain numbers like "116", "$452,500", "33%" or "25.4".
 */

const SELECTOR = [
  "p.text-2xl", "p.text-3xl", "p.text-4xl", "p.text-xl",
  "span.text-3xl", "span[class*='text-[26px]']",
  "p[class*='text-[24px]']", "p[class*='text-[26px]']", "p[class*='text-[28px]']", "p[class*='text-[30px]']",
].map((s) => `.baselead-main ${s}`).join(",");

const NUMBER = /^(\$?)([\d,]+(?:\.\d+)?)(%|K|M|k)?$/;
const done = new WeakSet<Element>();

function animate(el: HTMLElement) {
  if (done.has(el)) return;
  if (el.childNodes.length !== 1 || el.firstChild?.nodeType !== Node.TEXT_NODE) return;
  const original = (el.textContent ?? "").trim();
  const match = original.match(NUMBER);
  if (!match) return;
  const target = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(target) || target === 0) return;
  done.add(el);

  const decimals = (match[2].split(".")[1] ?? "").length;
  const commas = match[2].includes(",") || target >= 10000;
  const format = (value: number) => {
    const fixed = value.toFixed(decimals);
    const [whole, frac] = fixed.split(".");
    const withCommas = commas ? Number(whole).toLocaleString("en-US") : whole;
    return `${match[1]}${withCommas}${frac ? `.${frac}` : ""}${match[3] ?? ""}`;
  };

  const duration = 700;
  const start = performance.now();
  let last = format(0);
  el.textContent = last;

  const step = (now: number) => {
    // Someone else (React) changed the number: stop and leave theirs.
    if (el.textContent !== last) return;
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    last = t < 1 ? format(target * eased) : original;
    el.textContent = last;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function NumberMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let observer: MutationObserver | null = null;
    const scan = () => document.querySelectorAll<HTMLElement>(SELECTOR).forEach(animate);
    const first = window.setTimeout(scan, 150);
    // Numbers that appear after data loads.
    observer = new MutationObserver(() => scan());
    const main = document.querySelector(".baselead-main");
    if (main) observer.observe(main, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer?.disconnect(), 6000);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(stop);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
