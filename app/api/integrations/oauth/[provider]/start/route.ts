import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPlan,
  isPlanName,
} from "@/lib/plans";
import {
  googleRedirectUri,
  googleScopes,
  isGoogleIntegration,
  randomOAuthState,
  safeReturnPath,
  signOAuthState,
} from "@/lib/integrations/google-oauth";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ provider: string }>;
  }
) {
  const { provider } = await context.params;

  if (provider !== "google") {
    return NextResponse.json(
      { error: "Unsupported OAuth provider." },
      { status: 404 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // Not signed in (e.g. opened from the phone app in the system browser):
    // sign in first, then come straight back here.
    const login = new URL("/login", request.url);
    const here = new URL(request.url);
    login.searchParams.set("next", `${here.pathname}${here.search}`);
    return NextResponse.redirect(login);
  }

  const incoming = new URL(request.url);

  try {
    const returnTo = safeReturnPath(
      incoming.searchParams.get("returnTo")
    );

    const integration =
      new URL(
        returnTo,
        incoming.origin
      ).searchParams.get("connected") ?? "";

    if (!isGoogleIntegration(integration)) {
      return NextResponse.redirect(
        new URL(
          "/integrations?error=Choose+a+Google+integration+first",
          incoming.origin
        )
      );
    }

    const { data: ownedCompany } =
      await supabase
        .from("company_profiles")
        .select("id, plan")
        .eq("user_id", user.id)
        .maybeSingle();

    let company = ownedCompany;

    if (!company) {
      const { data: membership } =
        await supabase
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
        .eq("provider", integration)
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
        return NextResponse.redirect(
          new URL(
            "/integrations?error=Unable+to+verify+your+integration+limit",
            incoming.origin
          )
        );
      }

      if (
        (count ?? 0) >=
        planDefinition.integrationLimit
      ) {
        const destination = new URL(
          "/integrations",
          incoming.origin
        );

        destination.searchParams.set(
          "error",
          `Your ${currentPlan} plan allows ${planDefinition.integrationLimit} connected integrations. Upgrade to connect more.`
        );

        return NextResponse.redirect(
          destination
        );
      }
    }

    const clientId =
      process.env.GOOGLE_CLIENT_ID;

    if (
      !clientId ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_OAUTH_STATE_SECRET ||
      !(process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY || process.env.INTEGRATION_ENCRYPTION_KEY)
    ) {
      throw new Error(
        "Google OAuth is not configured yet. Add the required server environment settings first."
      );
    }

    const payload = Buffer.from(
      JSON.stringify({
        nonce: randomOAuthState(),
        integration,
        returnTo,
        userId: user.id,
      })
    ).toString("base64url");

    const state = signOAuthState(payload);

    const authorizationUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );

    authorizationUrl.search =
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: googleRedirectUri(),
        response_type: "code",
        scope: googleScopes(integration).join(
          " "
        ),
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      }).toString();

    const response =
      NextResponse.redirect(
        authorizationUrl
      );

    response.cookies.set(
      "baselead_google_oauth_state",
      state,
      {
        httpOnly: true,
        secure:
          incoming.protocol === "https:",
        sameSite: "lax",
        path: "/api/integrations/oauth/google/callback",
        maxAge: 600,
      }
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start Google authorization.";

    const destination = new URL(
      "/integrations",
      incoming.origin
    );

    destination.searchParams.set(
      "error",
      message
    );

    return NextResponse.redirect(
      destination
    );
  }
}