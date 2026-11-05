import type { PotentialLead, SearchCriteria } from "./types";

/*
 * Rule-based opportunity scoring from real public signals.
 * Higher score = more likely to need the user's offer and to buy.
 */
export function scoreLead(lead: PotentialLead, criteria: SearchCriteria) {
  const reasons: string[] = [];
  let score = 60;

  // Free data sources don't include reviews: only score them when we have them.
  const hasReviewData = lead.review_count !== null && lead.review_count !== undefined;
  const reviews = lead.review_count ?? 0;
  const rating = lead.rating ?? 0;
  const hasWebsite = Boolean(lead.website);
  const socials = [
    lead.instagram_url,
    lead.facebook_url,
    lead.linkedin_url,
    lead.x_url,
    lead.tiktok_url,
  ].filter(Boolean).length;

  // Established, active business = can afford services.
  if (!hasReviewData) {
    // No review data from this source: no bonus, no penalty.
  } else if (reviews >= 200) {
    score += 14;
    reasons.push(`Established business with ${reviews} public reviews.`);
  } else if (reviews >= 50) {
    score += 9;
    reasons.push(`Active customer base (${reviews} reviews).`);
  } else if (reviews >= 10) {
    score += 4;
  } else {
    score -= 4;
    reasons.push("Few public reviews — may be new or small.");
  }

  if (rating >= 4.5) {
    score += 6;
    reasons.push(`Strong reputation (${rating}★).`);
  } else if (rating > 0 && rating < 3.8) {
    score += 5;
    reasons.push(`Rating of ${rating}★ suggests room to improve customer experience.`);
  }

  // Digital gaps = opportunity for most B2B offers.
  if (!hasWebsite) {
    score += 12;
    reasons.push("No website listed — clear digital gap.");
  } else if (lead.raw_data && lead.raw_data.website_reachable === false) {
    score += 10;
    reasons.push("Website could not be reached — possible technical issues.");
  } else if (lead.raw_data && lead.raw_data.website_ssl === false) {
    score += 6;
    reasons.push("Website is not secure (no HTTPS).");
  }

  // Missing tools a business normally needs = a reason to talk now.
  if (hasWebsite && lead.raw_data?.website_reachable !== false) {
    if (lead.raw_data?.has_booking === false) {
      score += 6;
      reasons.push("No online booking on the website — customers have to call or email.");
    }
    if (lead.raw_data?.has_chat === false) {
      score += 5;
      reasons.push("No chat or assistant to answer visitors after hours.");
    }
  }

  if (socials === 0) {
    score += 6;
    reasons.push("No social media profiles found.");
  } else if (socials >= 3) {
    score += 3;
    reasons.push("Invests in social media presence.");
  }

  // Easy to reach = more likely to turn into a conversation.
  if (lead.contact_name) {
    score += 6;
    reasons.push(`Decision maker identified: ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ""}.`);
  }
  if (lead.email && lead.phone) {
    score += 6;
  } else if (lead.email || lead.phone) {
    score += 3;
  } else {
    score -= 6;
    reasons.push("No direct contact found yet.");
  }

  if (lead.raw_data?.business_status && lead.raw_data.business_status !== "OPERATIONAL") {
    score -= 30;
    reasons.push("Business may be closed.");
  }

  const finalScore = Math.max(1, Math.min(99, Math.round(score)));

  const opportunity =
    finalScore >= 85
      ? "Excellent Opportunity"
      : finalScore >= 70
        ? "Good Opportunity"
        : "Potential Opportunity";

  const buyingIntent =
    finalScore >= 80 ? "High" : finalScore >= 65 ? "Medium" : "Low";

  const estimatedValue =
    finalScore >= 85
      ? "$5,000 - $15,000"
      : finalScore >= 70
        ? "$2,500 - $8,000"
        : "$1,000 - $4,000";

  return {
    score: finalScore,
    opportunity,
    buyingIntent,
    estimatedValue,
    reasons: reasons.slice(0, 5),
    reason: `${lead.company} looks like ${opportunity.toLowerCase()} for ${
      criteria.offer || "your services"
    }.`,
  };
}
