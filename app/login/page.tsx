"use client";

import AppleSignInButton from "@/components/auth/AppleSignInButton";
import { authRedirect, isNativeApp, openInSystemBrowser } from "@/lib/native";

import React, { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/components/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [nextPath, setNextPath] = useState("/today");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  /** Returns true when a 2FA code is required. */
  async function startMfaStep() {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel !== "aal2" || aal?.currentLevel === "aal2") {
      return false;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((item) => item.status === "verified");

    if (!totp) return false;

    setMfaFactorId(totp.id);
    return true;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite")?.trim() || "";
    const next = params.get("next")?.trim() || "";

    if (invite) {
      setInviteToken(invite);
    }

    // Only accept internal paths to avoid open redirects.
    if (next.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }

    if (params.get("mfa") === "1") {
      void startMfaStep();
    }

    const authError = params.get("error");

    if (authError === "auth") {
      setError("We couldn't complete the sign-in. Please try again.");
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      // Two-factor enabled: ask for the authenticator code.
      if (await startMfaStep()) {
        setLoading(false);
        return;
      }

      setSuccess("Login successful. Redirecting...");

      if (inviteToken) {
        window.location.href =
          `/accept-invitation?token=${encodeURIComponent(
            inviteToken
          )}`;
      } else {
        window.location.href = nextPath;
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!mfaFactorId) return;

    setLoading(true);
    setError("");

    const { error: verifyError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode.trim(),
      });

    if (verifyError) {
      setError("That code is not valid. Try again.");
      setLoading(false);
      return;
    }

    setSuccess("Verified. Redirecting...");

    window.location.href = inviteToken
      ? `/accept-invitation?token=${encodeURIComponent(inviteToken)}`
      : nextPath;
  }

  async function handleGoogleLogin(provider: "google" | "apple" = "google") {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const redirectTarget = inviteToken
        ? `/accept-invitation?token=${encodeURIComponent(
            inviteToken
          )}`
        : nextPath;

      const { data: oauthData, error: googleError } =
        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: authRedirect(redirectTarget),
            skipBrowserRedirect: isNativeApp(),
          },
        });

      if (!googleError && isNativeApp() && oauthData?.url) {
        await openInSystemBrowser(oauthData.url);
        setLoading(false);
        return;
      }

      if (googleError) {
        setError(googleError.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(provider === "apple" ? "Unable to continue with Apple." : "Unable to continue with Google.");
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError(
        "Enter your email first so we can send you a reset link."
      );
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
          }
        );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(
          "Password reset instructions have been sent to your email."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Unable to send the reset email.");
    }

    setLoading(false);
  }

  const miniFeatures = [
    {
      icon: Target,
      color: "text-purple-400",
      text: "Find high-intent B2B prospects",
    },
    {
      icon: Mail,
      color: "text-emerald-400",
      text: "Personalize with AI",
    },
    {
      icon: TrendingUp,
      color: "text-yellow-400",
      text: "Close more deals",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#020204] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[25%] top-[-15%] h-[600px] w-[600px] rounded-full bg-purple-600/[0.08] blur-[150px]" />

        <div className="absolute right-[-10%] top-[20%] h-[550px] w-[550px] rounded-full bg-cyan-500/[0.06] blur-[160px]" />

        <div className="absolute left-[15%] top-[5%] h-[300px] w-[300px] rounded-full bg-yellow-400/[0.025] blur-[130px]" />

        <div className="absolute bottom-[-20%] left-[-5%] h-[500px] w-[600px] rounded-full bg-purple-600/[0.08] blur-[150px]" />

        <div className="absolute bottom-[-15%] right-[-5%] h-[500px] w-[600px] rounded-full bg-cyan-500/[0.07] blur-[150px]" />

        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-[38%] top-0 h-[520px] w-px bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />

          <div className="absolute left-[42%] top-10 h-[500px] w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />

          <div className="absolute left-[46%] top-[-20px] h-[560px] w-px bg-gradient-to-b from-transparent via-yellow-400/30 to-transparent" />

          <div className="absolute left-[25%] top-[15%] h-px w-[400px] rotate-[25deg] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

          <div className="absolute left-[30%] top-[28%] h-px w-[420px] rotate-[25deg] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="absolute left-[35%] top-[42%] h-px w-[400px] rotate-[25deg] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          <div className="absolute left-[27%] top-[57%] h-px w-[400px] rotate-[-20deg] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

          <div className="absolute left-[39%] top-[16%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_12px_#a855f7]" />

          <div className="absolute left-[45%] top-[25%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />

          <div className="absolute left-[35%] top-[39%] h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15]" />

          <div className="absolute left-[42%] top-[50%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_12px_#a855f7]" />

          <div className="absolute left-[32%] top-[65%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
        </div>
      </div>

      <div className="relative z-10 min-h-screen p-3 sm:p-5 lg:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1600px] lg:grid-cols-2 lg:gap-8">
          <section className="relative hidden p-10 lg:flex lg:flex-col xl:p-16">
            <div>
              <img
                src="/baselead-logo.png"
                alt="BaseLead"
                className="h-auto w-[245px] object-contain"
              />
            </div>

            <div className="mt-12 inline-flex w-fit items-center gap-3 rounded-full border border-purple-500/60 bg-purple-500/[0.03] px-5 py-2.5">
              <Target
                size={20}
                className="text-purple-400"
              />

              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-sm font-medium tracking-wide text-transparent">
                WORLD&apos;S 1ST AI POWERED B2B CLIENT FINDER
              </span>
            </div>

            <div className="mt-10">
              <h1 className="max-w-[620px] text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">
                Find better clients.
                <br />
                Close{" "}
                <span className="text-[#3B82F6]">
                  bigger
                </span>{" "}
                deals.
              </h1>

              <p className="mt-7 max-w-[560px] text-lg leading-8 text-gray-400">
                BaseLead uses AI to find high-intent prospects,
                personalize outreach, and grow your pipeline.
                All in one place.
              </p>
            </div>

            <div className="mt-12 space-y-7">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/[0.04]">
                  <Target
                    size={27}
                    className="text-purple-400"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    AI-Powered Prospecting
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    We find high-intent leads for you.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-400/[0.04]">
                  <Mail
                    size={27}
                    className="text-emerald-400"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    Smart Outreach
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Personalized messages that get replies.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-yellow-400/40 bg-yellow-400/[0.04]">
                  <TrendingUp
                    size={27}
                    className="text-yellow-400"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    Pipeline Growth
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Track, manage and close more deals.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="relative flex items-center justify-center py-8 lg:py-6">
            <div className="w-full max-w-[620px] rounded-2xl bg-gradient-to-br from-blue-500/80 via-blue-500/15 to-[#F5C518]/45 p-[1.5px]">
              <section className="relative rounded-2xl bg-[#050506]/95 p-6 sm:p-10 xl:p-14">
                <div className="absolute right-8 top-8 hidden text-sm text-gray-500 xl:block">
                  Don&apos;t have an account?

                  <a
                    href={
                      inviteToken
                        ? `/signup?invite=${encodeURIComponent(
                            inviteToken
                          )}`
                        : "/signup"
                    }
                    className="ml-2 font-medium text-[#3B82F6] transition hover:text-[#60A5FA]"
                  >
                    Sign up
                  </a>
                </div>

                <div className="mb-8 flex justify-center lg:hidden">
                  <img
                    src="/baselead-logo.png"
                    alt="BaseLead"
                    className="w-[190px] object-contain"
                  />
                </div>

                <div className="mb-8 flex justify-center lg:hidden">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-[#3B82F6]/50 bg-[#3B82F6]/[0.05] px-4 py-2">
                    <Target
                      size={16}
                      className="text-[#3B82F6]"
                    />

                    <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-xs font-medium tracking-wide text-transparent">
                      WORLD&apos;S 1ST AI POWERED B2B CLIENT FINDER
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    Welcome back
                  </h2>

                  <p className="mt-4 text-base text-gray-500 sm:text-lg">
                    Log in to your account
                  </p>
                </div>

                {inviteToken && (
                  <div className="mt-7 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/[0.06] px-4 py-3 text-center text-sm text-[#93C5FD]">
                    You&apos;re signing in to accept a team
                    invitation.
                  </div>
                )}

                {mfaFactorId ? (
                  <form
                    onSubmit={handleMfaSubmit}
                    className="space-y-4"
                  >
                    <p className="text-sm leading-6 text-gray-400">
                      Enter the 6-digit code from your authenticator app.
                    </p>

                    <input
                      value={mfaCode}
                      onChange={(event) =>
                        setMfaCode(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="123456"
                      className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-xl tracking-[0.5em] text-white outline-none focus:border-[#3B82F6]/60"
                    />

                    {error && (
                      <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || mfaCode.length !== 6}
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition hover:bg-[#2F74E8] disabled:opacity-50"
                    >
                      {loading ? "Verifying..." : "Verify and continue"}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setMfaFactorId(null);
                        setMfaCode("");
                      }}
                      className="w-full text-center text-xs text-gray-500 hover:text-white"
                    >
                      Use a different account
                    </button>
                  </form>
                ) : (
                <form
                  onSubmit={handleLogin}
                  className="mt-10"
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-3 block text-sm font-medium text-gray-200"
                    >
                      Email
                    </label>

                    <div className="relative">
                      <Mail
                        size={23}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-[#F5C518]"
                      />

                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        className="h-[64px] w-full rounded-xl border border-[#F5C518]/60 bg-black/40 pl-16 pr-5 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]/25"
                      />
                    </div>
                  </div>

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
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
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

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-sm font-medium text-[#3B82F6] transition hover:text-[#60A5FA] disabled:opacity-50"
                    >
                      Forgot password?

                      <ArrowRight
                        size={15}
                        className="ml-2 inline"
                      />
                    </button>
                  </div>

                  {error && (
                    <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative mt-6 flex h-[64px] w-full items-center justify-center rounded-xl bg-[#3B82F6] text-lg font-bold text-white shadow-[0_8px_30px_rgba(59,130,246,0.28)] transition hover:scale-[1.01] hover:bg-[#2F74E8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Logging in..."
                      : "Log in"}

                    {!loading && (
                      <ArrowRight
                        size={25}
                        className="absolute right-5 top-1/2 -translate-y-1/2"
                      />
                    )}
                  </button>
                </form>
                )}

                <div className="my-7 flex items-center gap-5">
                  <div className="h-px flex-1 bg-white/10" />

                  <span className="text-sm text-gray-500">
                    or
                  </span>

                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleLogin()}
                  disabled={loading}
                  className="flex h-[62px] w-full items-center justify-center rounded-xl border border-white/20 bg-black/30 text-base font-medium text-white transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    className="mr-4 h-5 w-5"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
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

                <AppleSignInButton onClick={() => handleGoogleLogin("apple")} disabled={loading} />

                <div className="mt-6 text-center text-sm text-gray-500 xl:hidden">
                  Don&apos;t have an account?

                  <a
                    href={
                      inviteToken
                        ? `/signup?invite=${encodeURIComponent(
                            inviteToken
                          )}`
                        : "/signup"
                    }
                    className="ml-2 inline-flex items-center font-medium text-[#3B82F6]"
                  >
                    Sign up

                    <ArrowRight
                      size={14}
                      className="ml-1"
                    />
                  </a>
                </div>

                <div className="mt-8 flex items-start justify-center gap-4 lg:hidden">
                  {miniFeatures.map(
                    ({ icon: Icon, color, text }, index) => (
                      <React.Fragment key={text}>
                        <div className="flex max-w-[90px] flex-col items-center gap-1.5 text-center">
                          <Icon
                            size={18}
                            className={color}
                          />

                          <span className="text-[11px] leading-tight text-gray-400">
                            {text}
                          </span>
                        </div>

                        {index <
                          miniFeatures.length - 1 && (
                          <div className="mt-1 h-9 w-px bg-white/10" />
                        )}
                      </React.Fragment>
                    )
                  )}
                </div>

                <div className="mt-10 flex items-center justify-center gap-3 text-sm text-gray-500">
                  <ShieldCheck
                    size={22}
                    className="text-[#3B82F6]"
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
      </div>
    </main>
  );
}