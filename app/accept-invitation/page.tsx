"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/components/lib/supabase";

type InvitationStatus =
  | "loading"
  | "needs-login"
  | "accepting"
  | "success"
  | "error";

export default function AcceptInvitationPage() {
  const [status, setStatus] =
    useState<InvitationStatus>("loading");

  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    async function processInvitation() {
      const params = new URLSearchParams(window.location.search);

      const invitationToken =
        params.get("token")?.trim() || "";

      if (!invitationToken) {
        setStatus("error");
        setMessage(
          "This invitation link is missing its invitation token."
        );
        return;
      }

      setToken(invitationToken);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus("needs-login");
        return;
      }

      await acceptInvitation(invitationToken);
    }

    processInvitation();
  }, []);

  async function acceptInvitation(
    invitationToken: string
  ) {
    setStatus("accepting");
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "accept_team_invitation",
        {
          p_token: invitationToken,
        }
      );

      if (error) {
        console.error(
          "Invitation acceptance error:",
          error
        );

        setStatus("error");
        setMessage(
          error.message ||
            "Unable to accept this invitation."
        );

        return;
      }

      if (!data) {
        setStatus("error");
        setMessage(
          "No response was received from the invitation service."
        );

        return;
      }

      if (!data.success) {
        setStatus("error");
        setMessage(
          data.error ||
            "Unable to complete the invitation."
        );

        return;
      }

      setRole(data.role || "Member");
      setStatus("success");
    } catch (error) {
      console.error(
        "Unexpected invitation error:",
        error
      );

      setStatus("error");
      setMessage(
        "Something went wrong while accepting the invitation."
      );
    }
  }

  function handleLogin() {
    const encodedToken =
      encodeURIComponent(token);

    window.location.href =
      `/login?invite=${encodedToken}`;
  }

  function handleSignup() {
    const encodedToken =
      encodeURIComponent(token);

    window.location.href =
      `/signup?invite=${encodedToken}`;
  }

  function handleDashboard() {
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020204] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[25%] top-[-15%] h-[600px] w-[600px] rounded-full bg-[#A78BFA]/[0.08] blur-[150px]" />

        <div className="absolute right-[-10%] top-[20%] h-[550px] w-[550px] rounded-full bg-[#2DD4BF]/[0.06] blur-[160px]" />

        <div className="absolute left-[15%] top-[5%] h-[300px] w-[300px] rounded-full bg-[#3B82F6]/[0.025] blur-[130px]" />

        <div className="absolute bottom-[-20%] left-[-5%] h-[500px] w-[600px] rounded-full bg-[#A78BFA]/[0.08] blur-[150px]" />

        <div className="absolute bottom-[-15%] right-[-5%] h-[500px] w-[600px] rounded-full bg-[#2DD4BF]/[0.07] blur-[150px]" />

        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-[38%] top-0 h-[520px] w-px bg-gradient-to-b from-transparent via-[#A78BFA]/40 to-transparent" />

          <div className="absolute left-[42%] top-10 h-[500px] w-px bg-gradient-to-b from-transparent via-[#2DD4BF]/30 to-transparent" />

          <div className="absolute left-[46%] top-[-20px] h-[560px] w-px bg-gradient-to-b from-transparent via-[#3B82F6]/30 to-transparent" />

          <div className="absolute left-[25%] top-[15%] h-px w-[400px] rotate-[25deg] bg-gradient-to-r from-transparent via-[#A78BFA]/50 to-transparent" />

          <div className="absolute left-[30%] top-[28%] h-px w-[420px] rotate-[25deg] bg-gradient-to-r from-transparent via-[#2DD4BF]/40 to-transparent" />

          <div className="absolute left-[35%] top-[42%] h-px w-[400px] rotate-[25deg] bg-gradient-to-r from-transparent via-[#A78BFA]/40 to-transparent" />

          <div className="absolute left-[27%] top-[57%] h-px w-[400px] rotate-[-20deg] bg-gradient-to-r from-transparent via-[#2DD4BF]/30 to-transparent" />
        </div>
      </div>

      {/* PAGE */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[620px] rounded-2xl bg-gradient-to-br from-[#A78BFA]/70 via-[#2DD4BF]/20 to-[#3B82F6]/60 p-[1.5px]">
          <section className="rounded-2xl bg-[#050506]/95 p-8 text-center sm:p-12">
            {/* LOGO */}
            <div className="mb-10 flex justify-center">
              <img
                src="/baselead-logo.png"
                alt="BaseLead"
                className="w-[190px] object-contain"
              />
            </div>

            {/* LOADING */}
            {status === "loading" && (
              <div className="flex flex-col items-center">
                <Loader2
                  size={42}
                  className="animate-spin text-[#A78BFA]"
                />

                <h1 className="mt-7 text-3xl font-bold">
                  Checking invitation
                </h1>

                <p className="mt-3 text-gray-500">
                  Please wait while we verify your invitation.
                </p>
              </div>
            )}

            {/* NEEDS LOGIN */}
            {status === "needs-login" && (
              <div>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[#A78BFA]/40 bg-[#A78BFA]/[0.06]">
                  <Users
                    size={38}
                    className="text-[#A78BFA]"
                  />
                </div>

                <h1 className="mt-7 text-3xl font-bold sm:text-4xl">
                  You&apos;ve been invited
                </h1>

                <p className="mx-auto mt-4 max-w-[460px] text-base leading-7 text-gray-500">
                  You have been invited to join a BaseLead
                  workspace. Log in or create an account to
                  accept the invitation.
                </p>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="relative flex h-[62px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] text-lg font-bold text-white shadow-[0_8px_30px_rgba(59,130,246,0.18)] transition hover:scale-[1.01] hover:from-[#5B9BFF] hover:to-[#3B82F6]"
                  >
                    Log in

                    <ArrowRight
                      size={24}
                      className="absolute right-5 top-1/2 -translate-y-1/2"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleSignup}
                    className="flex h-[62px] w-full items-center justify-center rounded-xl border border-white/20 bg-black/30 text-base font-medium text-white transition hover:bg-white/[0.05]"
                  >
                    Create account
                  </button>
                </div>
              </div>
            )}

            {/* ACCEPTING */}
            {status === "accepting" && (
              <div className="flex flex-col items-center">
                <Loader2
                  size={42}
                  className="animate-spin text-[#3B82F6]"
                />

                <h1 className="mt-7 text-3xl font-bold">
                  Joining workspace
                </h1>

                <p className="mt-3 text-gray-500">
                  We&apos;re connecting your account to the
                  workspace.
                </p>
              </div>
            )}

            {/* SUCCESS */}
            {status === "success" && (
              <div>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#84CC16]/30 bg-[#84CC16]/[0.06]">
                  <CheckCircle2
                    size={42}
                    className="text-[#84CC16]"
                  />
                </div>

                <h1 className="mt-7 text-3xl font-bold sm:text-4xl">
                  You&apos;re in!
                </h1>

                <p className="mx-auto mt-4 max-w-[460px] text-base leading-7 text-gray-500">
                  Your account has been added to the
                  workspace successfully.
                </p>

                <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                  <p className="text-sm text-gray-500">
                    Your role
                  </p>

                  <p className="mt-1 text-lg font-semibold text-[#3B82F6]">
                    {role}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDashboard}
                  className="relative mt-8 flex h-[62px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] text-lg font-bold text-white shadow-[0_8px_30px_rgba(59,130,246,0.18)] transition hover:scale-[1.01] hover:from-[#5B9BFF] hover:to-[#3B82F6]"
                >
                  Go to Dashboard

                  <ArrowRight
                    size={24}
                    className="absolute right-5 top-1/2 -translate-y-1/2"
                  />
                </button>
              </div>
            )}

            {/* ERROR */}
            {status === "error" && (
              <div>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#F22F46]/30 bg-[#F22F46]/[0.06]">
                  <XCircle
                    size={42}
                    className="text-[#F22F46]"
                  />
                </div>

                <h1 className="mt-7 text-3xl font-bold">
                  Invitation unavailable
                </h1>

                <p className="mx-auto mt-4 max-w-[480px] text-base leading-7 text-gray-500">
                  {message}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                  className="mt-8 flex h-[60px] w-full items-center justify-center rounded-xl border border-white/20 bg-black/30 text-base font-medium text-white transition hover:bg-white/[0.05]"
                >
                  Go to Login
                </button>
              </div>
            )}

            {/* SECURITY */}
            <div className="mt-10 flex items-center justify-center gap-3 text-sm text-gray-500">
              <ShieldCheck
                size={21}
                className="text-[#A78BFA]"
              />

              <span>
                Your data is secure and encrypted
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}