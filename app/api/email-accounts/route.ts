import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/workspace";
import { encryptIntegrationToken } from "@/lib/integrations/google-oauth";
import { EMAIL_PRESETS } from "@/lib/email/accounts";
import { verifySmtp } from "@/lib/email/smtp";
import { verifyImap } from "@/lib/email/imap";

const SAFE =
  "id, email, display_name, provider, smtp_host, smtp_port, smtp_secure, imap_host, imap_port, username, daily_limit, is_default, status, last_error, last_checked_at, created_at";

// Connected email accounts (never includes the password).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data, error } = await supabase
    .from("email_accounts")
    .select(SAFE)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    accounts: data ?? [],
    presets: EMAIL_PRESETS,
    setupNeeded: error ? "Run supabase/UPDATE_10_RUN_THIS.sql in Supabase to enable email accounts." : null,
  });
}

// Connect (or update) an account: tests SMTP + IMAP, then saves it encrypted.
export async function POST(request: Request) {
  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);
  if (!access) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const preset = EMAIL_PRESETS.find((item) => item.id === body.preset) ?? EMAIL_PRESETS[EMAIL_PRESETS.length - 1];

  const smtpHost = String(body.smtpHost || preset.smtp).trim();
  const smtpPort = Number(body.smtpPort || preset.smtpPort);
  const smtpSecure = body.smtpSecure === undefined ? preset.secure : Boolean(body.smtpSecure);
  const imapHost = String(body.imapHost || preset.imap).trim() || null;
  const imapPort = Number(body.imapPort || 993);
  const username = String(body.username || email).trim();
  const dailyLimit = Math.min(Math.max(Number(body.dailyLimit) || 50, 1), 500);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!password) return NextResponse.json({ error: "Enter the email password (or app password)." }, { status: 400 });
  if (!smtpHost) return NextResponse.json({ error: "Enter the SMTP server (outgoing mail)." }, { status: 400 });

  // 1) Outgoing mail must work.
  try {
    await verifySmtp({ host: smtpHost, port: smtpPort, secure: smtpSecure, username, password });
  } catch (error) {
    return NextResponse.json(
      { error: `Could not send with these settings. ${error instanceof Error ? error.message : ""}`.trim() },
      { status: 400 }
    );
  }

  // 2) Inbox (for replies) is optional but checked when given.
  let imapWarning: string | null = null;
  if (imapHost) {
    try {
      await verifyImap({ host: imapHost, port: imapPort, username, password });
    } catch (error) {
      imapWarning = `Sending works, but reading replies failed: ${error instanceof Error ? error.message : "IMAP error"}`;
    }
  }

  const now = new Date().toISOString();
  // This becomes the default sender.
  await supabase.from("email_accounts").update({ is_default: false }).eq("user_id", access.user.id);

  const { data, error } = await supabase
    .from("email_accounts")
    .upsert(
      {
        user_id: access.user.id,
        company_id: access.company.id,
        email,
        display_name: String(body.displayName ?? "").trim() || null,
        provider: preset.id,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpSecure,
        imap_host: imapWarning ? null : imapHost,
        imap_port: imapPort,
        username,
        password_encrypted: encryptIntegrationToken(password),
        daily_limit: dailyLimit,
        is_default: true,
        status: "connected",
        last_error: imapWarning,
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,email" }
    )
    .select(SAFE)
    .single();

  if (error) {
    return NextResponse.json(
      { error: /email_accounts/.test(error.message) ? "Run supabase/UPDATE_10_RUN_THIS.sql in Supabase first." : error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ account: data, warning: imapWarning });
}

// { id, dailyLimit?, makeDefault? }
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { id?: string; dailyLimit?: number; makeDefault?: boolean };
  if (!body.id) return NextResponse.json({ error: "Missing account." }, { status: 400 });

  if (body.makeDefault) {
    await supabase.from("email_accounts").update({ is_default: false }).eq("user_id", user.id);
  }
  const { data, error } = await supabase
    .from("email_accounts")
    .update({
      ...(body.dailyLimit ? { daily_limit: Math.min(Math.max(Number(body.dailyLimit), 1), 500) } : {}),
      ...(body.makeDefault ? { is_default: true } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select(SAFE)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ account: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing account." }, { status: 400 });

  await supabase.from("email_accounts").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
