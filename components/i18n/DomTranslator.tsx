"use client";

import { useEffect } from "react";

/*
 * Translates every visible English UI string on the page into Spanish
 * (text, placeholders, titles, aria-labels) using components/i18n/es-ui.json
 * plus the hand-written dictionary in LanguageProvider.
 *
 * - Only whole strings that exist in the dictionary are replaced, so user data
 *   (lead names, notes, emails) is never touched.
 * - Dynamic strings work with {0} {1}… placeholders.
 * - Switching back to English restores the original text.
 * - Add data-no-translate to any element that must stay as typed.
 */

type Dictionary = Record<string, string>;
type Pattern = { regex: RegExp; order: number[]; template: string };

const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT", "svg"]);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPatterns(dictionary: Dictionary): Pattern[] {
  const patterns: Pattern[] = [];

  for (const [english, spanish] of Object.entries(dictionary)) {
    if (!/\{\d+\}/.test(english)) continue;

    const order: number[] = [];
    const source = english
      .split(/(\{\d+\})/)
      .map((part) => {
        const match = part.match(/^\{(\d+)\}$/);
        if (match) {
          order.push(Number(match[1]));
          return "(.+?)";
        }
        return escapeRegex(part);
      })
      .join("");

    // A pattern made only of placeholders would match anything.
    if (!english.replace(/\{\d+\}/g, "").trim()) continue;

    patterns.push({ regex: new RegExp(`^${source}$`), order, template: spanish });
  }

  // Longest (most specific) first.
  return patterns.sort((a, b) => b.template.length - a.template.length);
}

export function DomTranslator({
  active,
  extra,
}: {
  active: boolean;
  extra: Dictionary;
}) {
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const textOriginals = new Map<Text, { original: string; translated: string }>();
    const attrOriginals = new Map<Element, Record<string, { original: string; translated: string }>>();

    async function start() {
      const loaded = (await import("./es-ui.json")).default as Dictionary;
      if (cancelled) return;

      const dictionary: Dictionary = { ...loaded, ...extra };
      const patterns = buildPatterns(dictionary);
      const cache = new Map<string, string | null>();

      function translate(text: string): string | null {
        const trimmed = text.replace(/\s+/g, " ").trim();
        if (!trimmed || !/[A-Za-z]/.test(trimmed)) return null;

        if (cache.has(trimmed)) {
          const hit = cache.get(trimmed)!;
          return hit === null ? null : text.replace(text.trim(), hit);
        }

        let result: string | null = dictionary[trimmed] ?? null;

        if (result === null && trimmed.length < 300) {
          for (const pattern of patterns) {
            const match = trimmed.match(pattern.regex);
            if (!match) continue;
            const values: Record<number, string> = {};
            pattern.order.forEach((index, i) => {
              values[index] = match[i + 1];
            });
            result = pattern.template.replace(/\{(\d+)\}/g, (_, n) => values[Number(n)] ?? "");
            break;
          }
        }

        if (cache.size > 5000) cache.clear();
        cache.set(trimmed, result);
        return result === null ? null : text.replace(text.trim(), result);
      }

      function skipped(element: Element | null) {
        for (let node = element; node; node = node.parentElement) {
          if (SKIP.has(node.tagName) || node.tagName === "svg") return true;
          if (node.hasAttribute("data-no-translate") || node.getAttribute("translate") === "no") return true;
          if ((node as HTMLElement).isContentEditable) return true;
        }
        return false;
      }

      function translateText(node: Text) {
        const value = node.nodeValue ?? "";
        const previous = textOriginals.get(node);
        if (previous && previous.translated === value) return;
        if (skipped(node.parentElement)) return;

        const translated = translate(value);
        if (translated && translated !== value) {
          textOriginals.set(node, { original: value, translated });
          node.nodeValue = translated;
        }
      }

      function translateAttributes(element: Element) {
        if (skipped(element)) return;

        for (const attribute of ATTRIBUTES) {
          const value = element.getAttribute(attribute);
          if (!value) continue;

          const stored = attrOriginals.get(element)?.[attribute];
          if (stored && stored.translated === value) continue;

          const translated = translate(value);
          if (translated && translated !== value) {
            const record = attrOriginals.get(element) ?? {};
            record[attribute] = { original: value, translated };
            attrOriginals.set(element, record);
            element.setAttribute(attribute, translated);
          }
        }
      }

      function walk(root: Node) {
        if (root.nodeType === Node.TEXT_NODE) {
          translateText(root as Text);
          return;
        }
        if (!(root instanceof Element)) return;

        translateAttributes(root);
        root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach(translateAttributes);

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let current = walker.nextNode();
        while (current) {
          translateText(current as Text);
          current = walker.nextNode();
        }
      }

      walk(document.body);

      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "characterData") {
            translateText(mutation.target as Text);
          } else if (mutation.type === "attributes") {
            translateAttributes(mutation.target as Element);
          } else {
            mutation.addedNodes.forEach(walk);
          }
        }
      });

      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...ATTRIBUTES],
      });

      document.documentElement.lang = "es";
    }

    void start();

    return () => {
      cancelled = true;
      observer?.disconnect();

      // Back to English: restore everything we changed.
      textOriginals.forEach(({ original, translated }, node) => {
        if (node.isConnected && node.nodeValue === translated) node.nodeValue = original;
      });
      attrOriginals.forEach((record, element) => {
        if (!element.isConnected) return;
        for (const [attribute, { original, translated }] of Object.entries(record)) {
          if (element.getAttribute(attribute) === translated) element.setAttribute(attribute, original);
        }
      });
      document.documentElement.lang = "en";
    };
  }, [active, extra]);

  return null;
}
