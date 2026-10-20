"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";

import { supabase } from "@/components/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your new password must have at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess("Your password was updated. Taking you to your dashboard...");

    window.setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020204] px-4 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[-15%] h-[500px] w-[500px] rounded-full bg-[#A78BFA]/[0.1] blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[10%] h-[450px] w-[450px] rounded-full bg-[#3B82F6]/[0.04] blur-[150px]" />
      </div>

      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0B0B0F]/90 p-7 shadow-[0_25px_100px_rgba(167,139,250,0.18)] backdrop-blur-xl sm:p-9">
        <img
          src="/baselead-logo.png"
          alt="BaseLead"
          className="h-auto w-[170px] object-contain"
        />

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A78BFA]/15 text-[#A78BFA]">
          <LockKeyhole size={22} />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>

        {checking ? (
          <p className="mt-3 text-sm text-gray-400">Checking your link...</p>
        ) : !hasSession ? (
          <div className="mt-4 space-y-5">
            <p className="text-sm leading-6 text-gray-400">
              This reset link is invalid or has expired. Request a new one
              from the login page.
            </p>

            <a
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
            >
              Back to login
              <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-gray-400">New password</span>
              <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 focus-within:border-[#A78BFA]/60">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow((current) => !current)}
                  className="text-gray-500 hover:text-white"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-sm text-gray-400">Confirm password</span>
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm outline-none placeholder:text-gray-600 focus:border-[#A78BFA]/60"
                placeholder="Repeat your new password"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-[#F22F46]/30 bg-[#F22F46]/10 px-4 py-3 text-sm text-[#F22F46]">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-xl border border-[#84CC16]/30 bg-[#84CC16]/10 px-4 py-3 text-sm text-[#84CC16]">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save new password"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
