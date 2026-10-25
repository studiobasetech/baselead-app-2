"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, BookOpen, Calendar, CornerDownLeft, FileText, GitBranch, Keyboard, LayoutDashboard,
  Plug, Search, Send, Settings, Sparkles, Sun, Trophy, Users, Workflow, X,
} from "lucide-react";

import CompanyLogo from "@/components/ui/CompanyLogo";

/*
 * ⌘K / Ctrl+K command bar + keyboard shortcuts.
 * Jump to any page, run common actions, or find a lead by name.
 */

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: "Leads" | "Actions" | "Go to";
  icon?: typeof Sun;
  color?: string;
  keys?: string;
  website?: string | null;
  run: () => void;
};

const PAGES = [
  { label: "Today", href: "/today", icon: Sun, color: "#F5C518", keys: "G T" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "#3B82F6", keys: "G D" },
  { label: "Leads", href: "/leads", icon: Users, color: "#2DD4BF", keys: "G L" },
  { label: "Pipeline", href: "/pipeline", icon: GitBranch, color: "#2DD4BF", keys: "G P" },
  { label: "Outreach", href: "/outreach", icon: Send, color: "#F97316", keys: "G O" },
  { label: "Sequences", href: "/sequences", icon: Workflow, color: "#F472B6", keys: "G S" },
  { label: "Sales Toolkit", href: "/resources", icon: BookOpen, color: "#F5C518" },
  { label: "Calendar", href: "/calendar", icon: Calendar, color: "#3B82F6", keys: "G C" },
  { label: "Reports", href: "/reports", icon: BarChart3, color: "#A78BFA", keys: "G R" },
  { label: "Team Performance", href: "/team", icon: Trophy, color: "#F5C518" },
  { label: "Integrations", href: "/integrations", icon: Plug, color: "#84CC16" },
  { label: "Settings", href: "/settings", icon: Settings, color: "#9CA3AF" },
];

const GO_KEYS: Record<string, string> = {
  t: "/today", d: "/dashboard", l: "/leads", p: "/pipeline", o: "/outreach",
  s: "/sequences", c: "/calendar", r: "/reports",
};

const SHORTCUTS: [string, string][] = [
  ["⌘ K", "Open command bar"],
  ["N", "New lead search"],
  ["A", "Ask BaseLead"],
  ["G then T / D / L", "Today · Dashboard · Leads"],
  ["G then P / O / S", "Pipeline · Outreach · Sequences"],
  ["G then C / R", "Calendar · Reports"],
  ["?", "Show shortcuts"],
  ["Esc", "Close"],
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

const askAssistant = () => window.dispatchEvent(new CustomEvent("baselead:assistant"));

export default function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<{ id: string; title: string; subtitle: string; website: string | null }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
    setLeads([]);
    setActive(0);
  };

  /* ---------- global keys ---------- */
  useEffect(() => {
    let pendingG = 0;
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setHelp(false);
        setOpen((value) => !value);
        return;
      }
      if (event.key === "Escape") {
        setHelp(false);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector(".bl-cmd-open")) return;

      if (pendingG && Date.now() - pendingG < 1200 && GO_KEYS[key]) {
        event.preventDefault();
        pendingG = 0;
        router.push(GO_KEYS[key]);
        return;
      }
      pendingG = 0;
      if (key === "g") pendingG = Date.now();
      else if (key === "n") router.push("/search");
      else if (key === "a") askAssistant();
      else if (event.key === "?") setHelp((value) => !value);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("baselead:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("baselead:command", onOpen);
    };
  }, [router]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  /* ---------- lead search ---------- */
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setLeads([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/command/leads?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { leads: [] }))
        .then((json) => setLeads(json.leads ?? []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const go = (href: string) => () => {
    close();
    router.push(href);
  };

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (text: string) => !q || text.toLowerCase().includes(q);

    const actions = ([
      { id: "a-search", label: "New lead search", hint: "Find businesses near you", group: "Actions", icon: Search, color: "#3B82F6", keys: "N", run: go("/search") },
      { id: "a-ask", label: "Ask BaseLead", hint: "Questions about your leads and pipeline", group: "Actions", icon: Sparkles, color: "#A78BFA", keys: "A", run: () => { close(); askAssistant(); } },
      { id: "a-seq", label: "New sequence", hint: "Automatic follow-ups", group: "Actions", icon: Workflow, color: "#F472B6", run: go("/sequences") },
      { id: "a-prop", label: "New proposal", hint: "Sales Toolkit → Proposals", group: "Actions", icon: FileText, color: "#84CC16", run: go("/resources?tab=proposals") },
      { id: "a-cal", label: "Schedule a meeting", hint: "Open Calendar", group: "Actions", icon: Calendar, color: "#2DD4BF", run: go("/calendar") },
      { id: "a-keys", label: "Keyboard shortcuts", group: "Actions", icon: Keyboard, color: "#9CA3AF", keys: "?", run: () => { close(); setHelp(true); } },
    ] as Item[]).filter((item) => match(`${item.label} ${item.hint ?? ""}`));

    const pages: Item[] = PAGES.filter((page) => match(page.label)).map((page) => ({
      id: `p-${page.href}`,
      label: page.label,
      group: "Go to",
      icon: page.icon,
      color: page.color,
      keys: page.keys,
      run: go(page.href),
    }));

    const leadItems: Item[] = leads.map((lead) => ({
      id: `l-${lead.id}`,
      label: lead.title,
      hint: lead.subtitle,
      group: "Leads",
      website: lead.website,
      run: go(`/leads?lead=${lead.id}`),
    }));

    return [...leadItems, ...actions, ...pages];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, leads]);

  useEffect(() => setActive(0), [query, leads.length]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onInputKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      items[active]?.run();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  let lastGroup = "";

  return (
    <>
      {/* Desktop search pill (bottom-right, above Ask BaseLead) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bl-cmd-trigger fixed bottom-[86px] right-6 z-[60] hidden items-center gap-2 rounded-full border border-white/10 bg-[#111114] px-3.5 py-2 text-xs font-medium text-[#A1A1AA] shadow-lg transition hover:border-[#3B82F6]/50 hover:text-white lg:flex"
        aria-label="Open command bar"
      >
        <Search className="h-3.5 w-3.5 text-[#3B82F6]" />
        Search
        <kbd className="bl-kbd">⌘K</kbd>
      </button>

      {open && (
        <div className="bl-cmd-open fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]" onMouseDown={close}>
          <div className="bl-cmd-backdrop absolute inset-0" />
          <div
            role="dialog"
            aria-label="Command bar"
            className="bl-cmd relative w-full max-w-[600px] overflow-hidden rounded-2xl border shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="bl-cmd-head flex items-center gap-3 border-b px-4">
              <Search className="h-4 w-4 shrink-0 text-[#3B82F6]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search leads, pages and actions…"
                className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-[#71717A]"
              />
              <kbd className="bl-kbd">Esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[#71717A]">{searching ? "Searching your leads…" : `No results for “${query}”.`}</p>
              )}
              {items.map((item, index) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                const Icon = item.icon;
                return (
                  <div key={item.id}>
                    {header && <p className="bl-cmd-group px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider">{header}</p>}
                    <button
                      type="button"
                      data-idx={index}
                      data-active={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={item.run}
                      className="bl-cmd-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    >
                      {Icon ? (
                        <span className="bl-icon-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ "--tab": item.color } as CSSProperties}>
                          <Icon className="h-4 w-4" style={{ color: item.color }} />
                        </span>
                      ) : (
                        <CompanyLogo name={item.label} website={item.website} size={32} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        {item.hint && <span className="bl-cmd-hint block truncate text-xs">{item.hint}</span>}
                      </span>
                      {item.keys && <kbd className="bl-kbd">{item.keys}</kbd>}
                      {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-[#3B82F6]" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bl-cmd-foot flex items-center gap-4 border-t px-4 py-2.5 text-[11px]">
              <span><kbd className="bl-kbd">↑</kbd> <kbd className="bl-kbd">↓</kbd> move</span>
              <span><kbd className="bl-kbd">↵</kbd> open</span>
              <span className="ml-auto"><kbd className="bl-kbd">?</kbd> shortcuts</span>
            </div>
          </div>
        </div>
      )}

      {help && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4" onMouseDown={() => setHelp(false)}>
          <div className="bl-cmd-backdrop absolute inset-0" />
          <div className="bl-cmd relative w-full max-w-[420px] rounded-2xl border p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <span className="bl-icon-tile flex h-9 w-9 items-center justify-center rounded-lg" style={{ "--tab": "#3B82F6" } as CSSProperties}>
                <Keyboard className="h-4 w-4 text-[#3B82F6]" />
              </span>
              <h2 className="flex-1 text-base font-semibold">Keyboard shortcuts</h2>
              <button type="button" onClick={() => setHelp(false)} className="bl-cmd-hint rounded-lg p-1.5 hover:bg-white/5" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm">
                  <span className="bl-cmd-hint">{label}</span>
                  <kbd className="bl-kbd">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
