import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPlan,
  isPlanName,
} from "@/lib/plans";

type ConnectedIntegration = {
  id: string;
  user_id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  account_email: string | null;
  account_name: string | null;
  metadata: Record<string, unknown>;
  connected_at: string;
  updated_at: string;
  last_synced_at: string | null;
  last_error: string | null;
};

async function getCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: ownedCompany } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedCompany?.id) {
    return String(ownedCompany.id);
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return membership?.company_id
    ? String(membership.company_id)
    : null;
}

/* Return the signed-in user's integrations */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("connected_integrations")
      .select(
        `
          id,
          user_id,
          provider,
          status,
          account_email,
          account_name,
          metadata,
          connected_at,
          updated_at,
          last_synced_at,
          last_error
        `
      )
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });

    if (error) {
      console.error("Failed to load integrations:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load integrations.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connections: (data as ConnectedIntegration[]) ?? [],
    });
  } catch (error) {
    console.error("Integrations GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

/* Disconnect an integration */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const body = await request.json().catch(() => null);

    const provider =
      typeof body?.provider === "string"
        ? body.provider.trim()
        : url.searchParams.get("provider")?.trim() ?? "";

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: "Provider is required.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("connected_integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      console.error("Failed to disconnect integration:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to disconnect integration.",
        },
        { status: 500 }
      );
    }

    if (
      ["gmail", "google-calendar", "google-sheets"].includes(
        provider
      )
    ) {
      const { error: credentialError } = await supabase
        .from("integration_credentials")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (credentialError) {
        console.error(
          "Failed to remove integration credentials:",
          credentialError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to remove integration credentials.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      provider,
    });
  } catch (error) {
    console.error("Integrations DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

/* Save built-in integrations such as CSV and webhooks */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    const provider =
      typeof body?.provider === "string"
        ? body.provider.trim()
        : "";

    if (!["csv", "webhook"].includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported integration.",
        },
        { status: 400 }
      );
    }

    const companyId = await getCompanyId(
      supabase,
      user.id
    );

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Your workspace could not be found.",
        },
        { status: 404 }
      );
    }

    const { data: company, error: companyError } =
      await supabase
        .from("company_profiles")
        .select("plan, billing_status")
        .eq("id", companyId)
        .maybeSingle();

    if (companyError || !company) {
      console.error(
        "Failed to load workspace plan:",
        companyError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your workspace plan.",
        },
        { status: 500 }
      );
    }

    const plan = isPlanName(company.plan)
      ? company.plan
      : "Starter";

    const planDefinition = getPlan(plan);

    if (
      provider === "webhook" &&
      !planDefinition.features.includes(
        "integrations_webhooks"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "PLAN_FEATURE_REQUIRED",
          error:
            "Webhooks are available on the Pro and Scale plans.",
        },
        { status: 403 }
      );
    }

    const { data: existing } = await supabase
      .from("connected_integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();

    const integrationLimit =
      planDefinition.integrationLimit;

    if (!existing && integrationLimit !== null) {
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
        console.error(
          "Failed to count integrations:",
          countError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to verify your integration limit.",
          },
          { status: 500 }
        );
      }

      if ((count ?? 0) >= integrationLimit) {
        return NextResponse.json(
          {
            success: false,
            code: "INTEGRATION_LIMIT_REACHED",
            error: `Your ${plan} plan allows ${integrationLimit} connected integrations. Upgrade to connect more.`,
          },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from("connected_integrations")
      .upsert(
        {
          user_id: user.id,
          provider,
          status: "connected",
          account_email:
            typeof body.accountEmail === "string"
              ? body.accountEmail
              : null,
          account_name:
            typeof body.accountName === "string"
              ? body.accountName
              : null,
          metadata:
            body.metadata &&
            typeof body.metadata === "object" &&
            !Array.isArray(body.metadata)
              ? body.metadata
              : {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (error) {
      console.error("Failed to save integration:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to save integration.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider,
    });
  } catch (error) {
    console.error("Integrations POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}