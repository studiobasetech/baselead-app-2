"use client";

import { useState } from "react";

/*
 * "Continue with Apple" — required by the App Store when Google sign-in is offered.
 * Always shown. Until Apple sign-in is configured in Supabase (Auth → Providers → Apple)
 * and NEXT_PUBLIC_APPLE_SIGNIN=true is set, clicking it shows a short "coming soon" note.
 */
export const appleSignInEnabled = process.env.NEXT_PUBLIC_APPLE_SIGNIN === "true";

export default function AppleSignInButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const [soon, setSoon] = useState(false);
  return (
    <>
    <button
      type="button"
      onClick={() => (appleSignInEnabled ? onClick() : setSoon(true))}
      disabled={disabled}
      className="bl-apple-btn mt-3 flex h-[62px] w-full items-center justify-center rounded-xl border border-white/20 bg-black/30 text-base font-medium text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg className="mr-4 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.37 12.4c-.02-2.25 1.84-3.33 1.92-3.38-1.05-1.53-2.68-1.74-3.26-1.76-1.39-.14-2.71.82-3.41.82-.71 0-1.79-.8-2.94-.78-1.51.02-2.91.88-3.69 2.24-1.57 2.73-.4 6.77 1.13 8.98.75 1.08 1.64 2.3 2.81 2.25 1.13-.05 1.55-.73 2.92-.73 1.36 0 1.75.73 2.94.71 1.22-.02 1.99-1.1 2.73-2.19.86-1.25 1.21-2.47 1.23-2.53-.03-.01-2.36-.91-2.38-3.6zM14.13 5.77c.62-.76 1.04-1.8.93-2.85-.9.04-1.99.6-2.63 1.35-.58.66-1.08 1.73-.95 2.75 1 .08 2.03-.51 2.65-1.25z" />
      </svg>
      Continue with Apple
    </button>
    {soon && (
      <p role="status" className="mt-2 text-center text-sm text-gray-400">
        Sign in with Apple is coming soon. For now, use your email or Google.
      </p>
    )}
    </>
  );
}
