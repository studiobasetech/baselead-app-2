"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; links?: { label: string; href: string }[] };

const SUGGESTIONS = [
  "Who should I contact today?",
  "Show my hot leads",
  "Who opened my emails?",
  "How is my pipeline?",
];

/*
 * "Ask BaseLead": a side panel to ask questions about your leads.
 * Opens from the floating button, or from anywhere with
 * window.dispatchEvent(new CustomEvent("baselead:assistant", { detail: "question" })).
 */
export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = messages.map(({ role, text: t }) => ({ role, text: t }));
    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });
      const result = await response.json().catch(() => ({}));
      setMessages((current) => [
        ...current,
        { role: "assistant", text: result.answer || result.error || "Something went wrong. Try again.", links: result.links },
      ]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "I couldn't connect. Check your internet and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  // Open from other parts of the app (e.g. the Today brief).
  useEffect(() => {
    function onOpen(event: Event) {
      setOpen(true);
      const detail = (event as CustomEvent<string | undefined>).detail;
      if (detail) void ask(detail);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("baselead:assistant", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("baselead:assistant", onOpen);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bl-assistant-fab fixed bottom-20 right-4 z-[60] flex items-center gap-2 rounded-full bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(59,130,246,0.7)] transition hover:-translate-y-0.5 hover:bg-[#2F74E8] lg:bottom-6 lg:right-6"
          aria-label="Ask BaseLead"
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">Ask BaseLead</span>
        </button>
      )}

      {/* Panel */}
      <div
        className={`fixed inset-0 z-[95] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`bl-assistant absolute bottom-0 right-0 top-0 flex w-full max-w-[420px] flex-col border-l border-white/10 bg-[#0B0B0D] text-white shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label="Ask BaseLead"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="bl-icon-tile" style={{ "--tab": "#3B82F6" } as React.CSSProperties}>
                <Sparkles size={16} strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-sm font-semibold">Ask BaseLead</p>
                <p className="text-[11px] text-gray-500">Answers from your own leads and emails</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-gray-300">Hi! Ask me anything about your leads, emails and deals.</p>
                <div className="mt-4 grid gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void ask(suggestion)}
                      className="rounded-xl border border-white/10 px-3.5 py-2.5 text-left text-sm text-gray-300 transition hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/[0.06] hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#3B82F6] px-3.5 py-2.5 text-sm text-white">{message.text}</p>
                </div>
              ) : (
                <div key={index} className="max-w-[92%]">
                  <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-gray-200">
                    {message.text}
                  </p>
                  {message.links && message.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.links.map((link) => (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/[0.06] px-2.5 py-1 text-[11px] font-medium text-[#3B82F6] transition hover:bg-[#3B82F6]/15"
                        >
                          {link.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {busy && (
              <div className="flex items-center gap-1.5 px-1 text-gray-500" aria-label="Thinking">
                <span className="bl-dot h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                <span className="bl-dot h-1.5 w-1.5 rounded-full bg-[#3B82F6]" style={{ animationDelay: "150ms" }} />
                <span className="bl-dot h-1.5 w-1.5 rounded-full bg-[#3B82F6]" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>

          <form
            className="border-t border-white/10 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-[#3B82F6]/50">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(input);
                  }
                }}
                rows={1}
                placeholder="Ask about a lead, your pipeline…"
                className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-gray-600"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] text-white transition hover:bg-[#2F74E8] disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </>
  );
}
