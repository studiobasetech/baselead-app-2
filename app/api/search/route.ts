export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processSearch } from "@/lib/search/process-search";
import {
  getPlan,
  isBillingStatus,
  isPlanName,
  TRIAL_LEAD_LIMIT,
} from "@/lib/plans";
import type { SearchCriteria } from "@/lib/search/types";
import { dispatchWebhooks } from "@/lib/webhooks";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      offer,
      idealClient,
      leads,
      industry,
      companySize,
      revenue,
      location,
      radius,
      buyingIntent,
      tags,
      scoring,
      intent,
      enrichment,
      excludeExisting,
    } = body;

    if (!offer || !idealClient || !location) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide an offer, ideal client, and location.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Supabase auth error:", userError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your account.",
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to create a search.",
        },
        { status: 401 }
      );
    }

    const { data: ownedCompany } = await supabase
      .from("company_profiles")
      .select(
        "id, plan, billing_status, trial_started_at, trial_ends_at, trial_lead_limit"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    let company = ownedCompany ?? null;

    if (!company) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership?.company_id) {
        const { data: memberCompany } = await supabase
          .from("company_profiles")
          .select(
            "id, plan, billing_status, trial_started_at, trial_ends_at, trial_lead_limit"
          )
          .eq("id", membership.company_id)
          .maybeSingle();

        company = memberCompany ?? null;
      }
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: "Your workspace could not be found.",
        },
        { status: 403 }
      );
    }

    const billingStatus = isBillingStatus(
      company.billing_status
    )
      ? company.billing_status
      : "trialing";

    const now = Date.now();

    const trialExpired =
      billingStatus === "trialing" &&
      Boolean(
        company.trial_ends_at &&
          new Date(company.trial_ends_at).getTime() <= now
      );

    if (billingStatus === "inactive") {
      return NextResponse.json(
        {
          success: false,
          code: "TRIAL_NOT_STARTED",
          error:
            "Start your 7-day free trial to search for leads. It's free and needs no credit card.",
        },
        { status: 402 }
      );
    }

    if (
      billingStatus !== "trialing" &&
      billingStatus !== "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "SUBSCRIPTION_REQUIRED",
          error:
            "Your trial or subscription is no longer active. Please choose a plan to continue.",
        },
        { status: 402 }
      );
    }

    if (trialExpired) {
      return NextResponse.json(
        {
          success: false,
          code: "TRIAL_EXPIRED",
          error:
            "Your free trial has ended. Choose a subscription plan to continue searching.",
        },
        { status: 402 }
      );
    }

    const isTrial = billingStatus === "trialing";

    const paidPlan = isPlanName(company.plan)
      ? company.plan
      : "Starter";

    const leadLimit = isTrial
      ? typeof company.trial_lead_limit === "number" &&
        company.trial_lead_limit > 0
        ? company.trial_lead_limit
        : TRIAL_LEAD_LIMIT
      : getPlan(paidPlan).leadLimit;

    const usageStart = isTrial
      ? company.trial_started_at
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString();

    let userLeadQuery = supabase
      .from("leads")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id);

    if (usageStart) {
      userLeadQuery = userLeadQuery.gte(
        "created_at",
        usageStart
      );
    }

    const {
      count: userLeadCount,
    } = await userLeadQuery;

    let workspaceLeadCount = 0;

    if (company.id) {
      let workspaceLeadQuery = supabase
        .from("leads")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("company_id", company.id);

      if (usageStart) {
        workspaceLeadQuery = workspaceLeadQuery.gte(
          "created_at",
          usageStart
        );
      }

      const {
        count,
        error: workspaceLeadError,
      } = await workspaceLeadQuery;

      if (!workspaceLeadError) {
        workspaceLeadCount = count ?? 0;
      }
    }

    const leadsUsed = Math.max(
      userLeadCount ?? 0,
      workspaceLeadCount
    );

    // Google Places returns at most 60 businesses per search.
    const requestedLeads = Math.min(
      60,
      Math.max(1, Number(leads) || 20)
    );

    const remainingLeads = Math.max(
      0,
      leadLimit - leadsUsed
    );

    if (requestedLeads > remainingLeads) {
      return NextResponse.json(
        {
          success: false,
          code: "LEAD_LIMIT_REACHED",
          limit: leadLimit,
          used: leadsUsed,
          remaining: remainingLeads,
          error: isTrial
            ? `Your free trial has ${remainingLeads} leads remaining. Choose a subscription plan to continue.`
            : `Your plan has ${remainingLeads} leads remaining this billing period.`,
        },
        { status: 402 }
      );
    }

    // Plan rules for this search.
    const effective = getPlan(isTrial ? "Starter" : paidPlan);
    const canAdvanced = effective.features.includes(
      "advanced_ai_lead_discovery"
    );
    const canRecommend = effective.features.includes(
      "ai_recommendations"
    );

    const criteria: SearchCriteria = {
      offer,
      idealClient,
      leads: requestedLeads,
      industry,
      // Advanced targeting is a Pro/Scale feature.
      companySize: canAdvanced ? companySize : undefined,
      revenue: canAdvanced ? revenue : undefined,
      location,
      radius,
      buyingIntent: canAdvanced ? buyingIntent : undefined,
      tags,
      scoring,
      intent: canAdvanced ? intent : false,
      enrichment,
      excludeExisting,
    };

    const searchQuery = `${idealClient} - ${offer}`;

    const {
      data: search,
      error: searchError,
    } = await supabase
      .from("searches")
      .insert({
        user_id: user.id,
        query: searchQuery,
        location,
        status: "searching",
      })
      .select()
      .single();

    if (searchError) {
      console.error(
        "Supabase search error:",
        searchError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not create the search.",
          details: searchError.message,
        },
        { status: 500 }
      );
    }

    try {
      const result = await processSearch(
        supabase,
        search.id,
        user.id,
        criteria,
        { recommendations: canRecommend, companyId: company.id }
      );

      // Notify the user's "lead.created" webhooks (Pro/Scale).
      if (
        effective.features.includes("integrations_webhooks") &&
        result.leads.length > 0
      ) {
        void dispatchWebhooks(
          supabase,
          user.id,
          "lead.created",
          result.leads
        ).catch(() => undefined);
      }

      const {
        data: completedSearch,
        error: updateError,
      } = await supabase
        .from("searches")
        .update({
          status: "completed",
          total_found: result.totalFound,
        })
        .eq("id", search.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "Error updating search:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Search completed, but the search status could not be updated.",
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Search completed successfully.",
        search: completedSearch,
        leads: result.leads,
        totalFound: result.totalFound,
        demo: result.demo,
        criteria,
      });
    } catch (processingError) {
      console.error(
        "Search processing error:",
        processingError
      );

      await supabase
        .from("searches")
        .update({
          status: "failed",
        })
        .eq("id", search.id);

      return NextResponse.json(
        {
          success: false,
          error:
            processingError instanceof Error
              ? processingError.message
              : "Could not process the search.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Search API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while creating the search.",
      },
      { status: 500 }
    );
  }
}