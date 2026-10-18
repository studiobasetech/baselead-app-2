import { NextResponse } from "next/server";
import { isPlacesConfigured } from "@/lib/search/google-places-provider";
import { isAiConfigured } from "@/lib/ai";
import { isStripeConfigured } from "@/lib/stripe";

// Which server-side services are configured (no secrets returned).
export async function GET() {
  return NextResponse.json({
    googlePlaces: isPlacesConfigured(),
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ai: isAiConfigured(),
    stripe: isStripeConfigured(),
  });
}
