"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#F22F46]">Something went wrong</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">We couldn’t load this page</h1>
      <p className="mt-2 max-w-md text-gray-400">Try again. If it keeps happening, email support with the code below.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-gray-500">Code: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-[#3B82F6] px-5 py-2.5 font-semibold text-white hover:bg-[#2F74E8]">Try again</button>
        <a href="/support" className="rounded-xl border border-white/15 px-5 py-2.5 font-semibold text-gray-200 hover:border-white/30">Support</a>
      </div>
    </main>
  );
}
