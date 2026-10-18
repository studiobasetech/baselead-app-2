import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "@/lib/integrations/google-oauth";

/* Encrypted per-workspace secrets (server only). */

export async function getWorkspaceSecret(companyId: string, provider: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("workspace_secrets")
    .select("secret_encrypted, label")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();

  if (!data?.secret_encrypted) return null;

  return { secret: decryptIntegrationToken(data.secret_encrypted), label: data.label };
}

export async function setWorkspaceSecret(
  companyId: string,
  provider: string,
  secret: string | null,
  label?: string
) {
  const admin = createAdminClient();

  if (!secret) {
    await admin
      .from("workspace_secrets")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", provider);
    return;
  }

  const { error } = await admin.from("workspace_secrets").upsert(
    {
      company_id: companyId,
      provider,
      secret_encrypted: encryptIntegrationToken(secret),
      label: label ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,provider" }
  );

  if (error) throw new Error(error.message);
}
