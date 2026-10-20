"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";

import { supabase } from "@/components/lib/supabase";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Factor = { id: string; status: string; friendly_name?: string };

/*
 * Real two-factor authentication with an authenticator app
 * (Google Authenticator, 1Password, Authy...) using Supabase MFA.
 */
export default function TwoFactorCard({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<Factor | null>(null);
  const [enrolling, setEnrolling] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((item) => item.status === "verified");
    setFactor(verified ?? null);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function startEnroll() {
    setBusy(true);

    // Remove unfinished attempts first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const item of existing?.all ?? []) {
      if (item.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: item.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `BaseLead ${new Date().toLocaleDateString()}`,
    });

    setBusy(false);

    if (error || !data) {
      onToast(error?.message || t("Could not start two-factor setup."));
      return;
    }

    setEnrolling({
      id: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmEnroll() {
    if (!enrolling) return;

    setBusy(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.id,
      code: code.trim(),
    });

    setBusy(false);

    if (error) {
      onToast(t("That code is not valid. Try again."));
      return;
    }

    setEnrolling(null);
    setCode("");
    await load();
    onToast(t("Two-factor authentication is now on."));
  }

  async function disable() {
    if (!factor) return;

    if (!window.confirm(t("Turn off two-factor authentication?"))) return;

    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);

    if (error) {
      onToast(error.message);
      return;
    }

    setFactor(null);
    onToast(t("Two-factor authentication is off."));
  }

  return (
    <div className="mt-6 rounded-lg border border-[#3B82F6]/15 bg-[#3B82F6]/[0.03] p-4">
      <div className="flex gap-3">
        {factor ? (
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#84CC16]" />
        ) : (
          <Lock size={15} className="mt-0.5 shrink-0 text-[#3B82F6]" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-gray-300">
            {t("Two-factor authentication")}
            {factor && (
              <span className="ml-2 rounded-full bg-[#84CC16]/10 px-2 py-0.5 text-[11px] text-[#84CC16]">
                {t("On")}
              </span>
            )}
          </p>

          <p className="mt-1 text-[14px] leading-5 text-gray-600">
            {factor
              ? t("Your account asks for a code from your authenticator app when you sign in.")
              : t("Protect your account with a 6-digit code from an authenticator app.")}
          </p>

          {loading ? null : enrolling ? (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] text-gray-400">
                {t("Scan this QR code with your authenticator app, then enter the 6-digit code.")}
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrolling.qr}
                alt="QR code"
                className="h-40 w-40 rounded-lg bg-white p-2"
              />

              <p className="break-all text-[11px] text-gray-500">
                {t("Or enter this key manually:")} {enrolling.secret}
              </p>

              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  placeholder="123456"
                  className="h-10 w-32 rounded-lg border border-white/10 bg-black px-3 text-sm tracking-widest text-white outline-none focus:border-[#3B82F6]/50"
                />
                <button
                  type="button"
                  disabled={busy || code.length !== 6}
                  onClick={() => void confirmEnroll()}
                  className="rounded-lg bg-[#3B82F6] px-4 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  {t("Verify")}
                </button>
                <button
                  type="button"
                  onClick={() => setEnrolling(null)}
                  className="rounded-lg border border-white/10 px-3 text-[13px] text-gray-400"
                >
                  {t("Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void (factor ? disable() : startEnroll())}
              className={`mt-4 rounded-lg border px-4 py-2 text-[13px] font-medium transition disabled:opacity-50 ${
                factor
                  ? "border-[#F22F46]/30 text-[#F22F46] hover:bg-[#F22F46]/10"
                  : "border-[#3B82F6]/40 text-[#3B82F6] hover:bg-[#3B82F6]/10"
              }`}
            >
              {factor ? t("Turn off") : t("Turn on two-factor")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
