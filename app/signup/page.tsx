"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { supabase } from "@/components/lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please create a password.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      /*
        Email confirmation is disabled in Supabase for development.
        Therefore, a session should be created immediately.
      */

      if (data.session) {
        setSuccess("Account created successfully. Welcome to BaseLead!");

        window.location.href = "/dashboard";
        return;
      }

      /*
        Safety fallback in case Supabase still requires confirmation.
      */
      setSuccess(
        "Account created. You can now log in with your email and password."
      );

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: googleError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

      if (googleError) {
        setError(googleError.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to continue with Google.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020204] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[25%] top-[-15%] h-[600px] w-[600px] rounded-full bg-purple-600/[0.08] blur-[150px]" />
        <div className="absolute right-[-10%] top-[20%] h-[550px] w-[550px] rounded-full bg-cyan-500/[0.06] blur-[160px]" />
        <div className="absolute left-[15%] top-[5%] h-[300px] w-[300px] rounded-full bg-blue-400/[0.025] blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-5%] h-[500px] w-[600px] rounded-full bg-purple-600/[0.08] blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[500px] w-[600px] rounded-full bg-cyan-500/[0.07] blur-[150px]" />

        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-[38%] top-0 h-[520px] w-px bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />
          <div className="absolute left-[42%] top-10 h-[500px] w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
          <div className="absolute left-[46%] top-[-20px] h-[560px] w-px bg-gradient-to-b from-transparent via-blue-400/30 to-transparent" />

          <div className="absolute left-[25%] top-[15%] h-px w-[400px] rotate-[25deg] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          <div className="absolute left-[30%] top-[28%] h-px w-[420px] rotate-[25deg] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="absolute left-[35%] top-[42%] h-px w-[400px] rotate-[25deg] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="absolute left-[27%] top-[57%] h-px w-[400px] rotate-[-20deg] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

          <div className="absolute left-[39%] top-[16%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_12px_#a855f7]" />
          <div className="absolute left-[45%] top-[25%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
          <div className="absolute left-[35%] top-[39%] h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]" />
          <div className="absolute left-[42%] top-[50%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_12px_#a855f7]" />
          <div className="absolute left-[32%] top-[65%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
        </div>
      </div>

      {/* PAGE */}
      <div className="relative z-10 min-h-screen p-3 sm:p-5 lg:p-6">
        <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1600px] items-center justify-center">
          <div className="w-full max-w-[680px] rounded-2xl bg-gradient-to-br from-purple-500/70 via-cyan-400/20 to-blue-400/60 p-[1.5px]">
            <section className="rounded-2xl bg-[#050506]/95 p-6 sm:p-10 xl:p-14">

              {/* TOP NAV */}
              <div className="mb-8 flex items-center justify-between">
                <a href="/">
                  <img
                    src="/baselead-logo.png"
                    alt="BaseLead"
                    className="w-[150px] object-contain"
                  />
                </a>

                <div className="text-sm text-gray-500">
                  Already have an account?
                  <a
                    href="/login"
                    className="ml-2 font-medium text-blue-400 transition hover:text-blue-300"
                  >
                    Log in
                  </a>
                </div>
              </div>

              {/* HEADER */}
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Create your account
                </h1>

                <p className="mt-4 text-base text-gray-500 sm:text-lg">
                  Start finding better clients with AI
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleSignup} className="mt-10">

                {/* NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-3 block text-sm font-medium text-gray-200"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <User
                      size={23}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500"
                    />

                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-[64px] w-full rounded-xl border border-purple-500/70 bg-black/40 pl-16 pr-5 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="mt-6">
                  <label
                    htmlFor="email"
                    className="mb-3 block text-sm font-medium text-gray-200"
                  >
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      size={23}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-[64px] w-full rounded-xl border border-purple-500/70 bg-black/40 pl-16 pr-5 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="mt-6">
                  <label
                    htmlFor="password"
                    className="mb-3 block text-sm font-medium text-gray-200"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={23}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-[64px] w-full rounded-xl border border-white/20 bg-black/40 pl-16 pr-16 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/20"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={23} />
                      ) : (
                        <Eye size={23} />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="mt-6">
                  <label
                    htmlFor="confirmPassword"
                    className="mb-3 block text-sm font-medium text-gray-200"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={23}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      className="h-[64px] w-full rounded-xl border border-white/20 bg-black/40 pl-16 pr-16 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/20"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) => !current
                        )
                      }
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={23} />
                      ) : (
                        <Eye size={23} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}
                {error && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {/* SUCCESS */}
                {success && (
                  <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">
                    {success}
                  </div>
                )}

                {/* CREATE ACCOUNT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="relative mt-6 flex h-[64px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-lg font-bold text-white shadow-[0_8px_30px_rgba(59,130,246,0.18)] transition hover:scale-[1.01] hover:from-[#5B9BFF] hover:to-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}

                  {!loading && (
                    <ArrowRight
                      size={25}
                      className="absolute right-5 top-1/2 -translate-y-1/2"
                    />
                  )}
                </button>
              </form>

              {/* DIVIDER */}
              <div className="my-7 flex items-center gap-5">
                <div className="h-px flex-1 bg-white/10" />

                <span className="text-sm text-gray-500">
                  or
                </span>

                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* GOOGLE */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="flex h-[62px] w-full items-center justify-center rounded-xl border border-white/20 bg-black/30 text-base font-medium text-white transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className="mr-4 h-5 w-5"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.8l6.6 5.6C41.8 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
                  />
                </svg>

                Continue with Google
              </button>

              {/* SECURITY */}
              <div className="mt-10 flex items-center justify-center gap-3 text-sm text-gray-500">
                <ShieldCheck
                  size={22}
                  className="text-purple-500"
                />

                <span>
                  Your data is secure and encrypted
                </span>
              </div>

                <p className="mt-4 text-center text-xs text-gray-600">
                  By continuing you agree to our{" "}
                  <a href="/terms" className="text-gray-400 underline-offset-2 hover:text-white hover:underline">Terms</a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-gray-400 underline-offset-2 hover:text-white hover:underline">Privacy Policy</a>.
                </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}