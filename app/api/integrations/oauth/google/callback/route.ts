import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  encryptIntegrationToken,
  googleRedirectUri,
  isGoogleIntegration,
  safeReturnPath,
  verifyOAuthState,
} from "@/lib/integrations/google-oauth";
import {
  getPlan,
  isPlanName,
} from "@/lib/plans";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
};

type GoogleUserInfo = {
  email?: string;
  name?: string;
};

function redirectToIntegrations(
  request: Request,
  path: string,
  error?: string
) {
  const destination = new URL(path, request.url);

  if (error) {
    destination.searchParams.set("error", error);
  }

  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();

  const cookieState = cookieStore.get(
    "baselead_google_oauth_state"
  )?.value;

  const state = url.searchParams.get("state") ?? "";
  const signedPayload = verifyOAuthState(state);

  cookieStore.delete("baselead_google_oauth_state");

  if (
    !cookieState ||
    cookieState !== state ||
    !signedPayload
  ) {
    return redirectToIntegrations(
      request,
      "/integrations",
      "Google authorization expired. Please try again."
    );
  }

  let payload: {
    integration: string;
    returnTo: string;
    userId: string;
  };

  try {
    payload = JSON.parse(
      Buffer.from(
        signedPayload,
        "base64url"
      ).toString("utf8")
    );
  } catch {
    return redirectToIntegrations(
      request,
      "/integrations",
      "Invalid Google authorization response."
    );
  }

  const returnTo = safeReturnPath(
    payload.returnTo
  );

  if (url.searchParams.get("error")) {
    return redirectToIntegrations(
      request,
      returnTo,
      "Google authorization was cancelled."
    );
  }

  const code = url.searchParams.get("code");

  if (
    !code ||
    !isGoogleIntegration(
      payload.integration
    )
  ) {
    return redirectToIntegrations(
      request,
      returnTo,
      "Google did not return an authorization code."
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !user ||
    user.id !== payload.userId
  ) {
    return redirectToIntegrations(
      request,
      "/login",
      "Please sign in again to finish connecting Google."
    );
  }

  const { data: ownedCompany } = await supabase
    .from("company_profiles")
    .select("id, plan")
    .eq("user_id", user.id)
    .maybeSingle();

  let company = ownedCompany;

  if (!company) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membership?.company_id) {
      const { data: memberCompany } =
        await supabase
          .from("company_profiles")
          .select("id, plan")
          .eq(
            "id",
            membership.company_id
          )
          .maybeSingle();

      company = memberCompany;
    }
  }

  const currentPlan = isPlanName(
    company?.plan
  )
    ? company.plan
    : "Starter";

  const planDefinition = getPlan(
    currentPlan
  );

  const { data: existingConnection } =
    await supabase
      .from("connected_integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", payload.integration)
      .maybeSingle();

  if (
    !existingConnection &&
    planDefinition.integrationLimit !== null
  ) {
    const { count, error: countError } =
      await supabase
        .from("connected_integrations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("status", "connected");

    if (countError) {
      return redirectToIntegrations(
        request,
        returnTo,
        "Unable to verify your integration limit."
      );
    }

    if (
      (count ?? 0) >=
      planDefinition.integrationLimit
    ) {
      return redirectToIntegrations(
        request,
        returnTo,
        `Your ${currentPlan} plan allows ${planDefinition.integrationLimit} connected integrations. Upgrade to connect more.`
      );
    }
  }

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id:
            process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret:
            process.env.GOOGLE_CLIENT_SECRET ?? "",
          redirect_uri: googleRedirectUri(),
          grant_type:
            "authorization_code",
        }),
        cache: "no-store",
      }
    );

    const tokens =
      (await tokenResponse.json()) as GoogleTokenResponse;

    if (
      !tokenResponse.ok ||
      !tokens.access_token
    ) {
      throw new Error(
        "Google could not complete authorization. Check your OAuth client settings."
      );
    }

    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      throw new Error(
        "Google connected, but account details could not be loaded."
      );
    }

    const profile =
      (await profileResponse.json()) as GoogleUserInfo;

    let encryptedRefreshToken =
      tokens.refresh_token
        ? encryptIntegrationToken(
            tokens.refresh_token
          )
        : null;

    if (!encryptedRefreshToken) {
      const { data: existing, error } =
        await supabase
          .from("integration_credentials")
          .select(
            "refresh_token_encrypted"
          )
          .eq("user_id", user.id)
          .eq(
            "provider",
            payload.integration
          )
          .maybeSingle();

      if (error) {
        throw new Error(
          "Unable to check the existing Google connection."
        );
      }

      encryptedRefreshToken =
        existing?.refresh_token_encrypted ??
        null;
    }

    if (!encryptedRefreshToken) {
      throw new Error(
        "Google did not provide offline access. Remove BaseLead from your Google account permissions, then connect again."
      );
    }

    const scopes = (
      url.searchParams.get("scope") ?? ""
    )
      .split(" ")
      .filter(Boolean);

    const { error: credentialError } =
      await supabase
        .from("integration_credentials")
        .upsert(
          {
            user_id: user.id,
            provider: payload.integration,
            refresh_token_encrypted:
              encryptedRefreshToken,
            scopes,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id,provider",
          }
        );

    if (credentialError) {
      throw new Error(
        "Unable to securely save Google credentials."
      );
    }

    const { error: connectionError } =
      await supabase
        .from("connected_integrations")
        .upsert(
          {
            user_id: user.id,
            provider: payload.integration,
            status: "connected",
            account_email:
              profile.email ?? null,
            account_name:
              profile.name ?? null,
            metadata: { scopes },
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id,provider",
          }
        );

    if (connectionError) {
      throw new Error(
        "Google authorized successfully, but BaseLead could not save the connection."
      );
    }

    return redirectToIntegrations(
      request,
      returnTo
    );
  } catch (error) {
    console.error(
      "Google OAuth callback failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to finish Google authorization.";

    return redirectToIntegrations(
      request,
      returnTo,
      message
    );
  }
}