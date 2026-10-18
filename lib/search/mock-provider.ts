import type {
  SearchCriteria,
  PotentialLead,
} from "./types";

type MockBusiness = {
  name: string;
  company: string;
  industry: string;
  category: string;
  city: string;
  state: string;
  country: string;
  address: string;
  website: string;
  email: string;
  phones: string[];
  rating: number;
  reviewCount: number;
  companySize: string;
  revenue: string;
  buyingIntent: string;
  socialSlug: string;
};

const MOCK_BUSINESSES: MockBusiness[] = [
  {
    name: "Olivia Carter",
    company: "The Garden Table",
    industry: "Restaurants",
    category: "Restaurant",
    city: "Austin",
    state: "Texas",
    country: "United States",
    address: "2412 South Lamar Blvd, Austin, TX",
    website: "https://example.com/garden-table",
    email: "hello@gardentable.example",
    phones: ["(512) 555-0142", "(512) 555-0181"],
    rating: 4.7,
    reviewCount: 428,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "High",
    socialSlug: "gardentable",
  },
  {
    name: "Daniel Brooks",
    company: "Urban House Coffee",
    industry: "Restaurants",
    category: "Coffee Shop",
    city: "Austin",
    state: "Texas",
    country: "United States",
    address: "1101 East 6th Street, Austin, TX",
    website: "https://example.com/urban-house",
    email: "hello@urbanhouse.example",
    phones: ["(512) 555-0193"],
    rating: 4.5,
    reviewCount: 312,
    companySize: "11-50 employees",
    revenue: "$500K-$1M",
    buyingIntent: "High",
    socialSlug: "urbanhousecoffee",
  },
  {
    name: "Sofia Bennett",
    company: "Luna Wellness Studio",
    industry: "Health & Wellness",
    category: "Wellness Studio",
    city: "Miami",
    state: "Florida",
    country: "United States",
    address: "850 Brickell Avenue, Miami, FL",
    website: "https://example.com/luna-wellness",
    email: "contact@lunawellness.example",
    phones: ["(305) 555-0124", "(305) 555-0168"],
    rating: 4.8,
    reviewCount: 516,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "High",
    socialSlug: "lunawellness",
  },
  {
    name: "Marcus Reed",
    company: "Summit Realty Group",
    industry: "Real Estate",
    category: "Real Estate Agency",
    city: "Houston",
    state: "Texas",
    country: "United States",
    address: "1200 Main Street, Houston, TX",
    website: "https://example.com/summit-realty",
    email: "info@summitrealty.example",
    phones: ["(713) 555-0144", "(713) 555-0177"],
    rating: 4.6,
    reviewCount: 289,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "High",
    socialSlug: "summitrealty",
  },
  {
    name: "Emma Wilson",
    company: "Oak & Stone Interiors",
    industry: "Interior Design",
    category: "Interior Design Studio",
    city: "Charlotte",
    state: "North Carolina",
    country: "United States",
    address: "421 Providence Road, Charlotte, NC",
    website: "https://example.com/oak-stone",
    email: "studio@oakstone.example",
    phones: ["(704) 555-0184"],
    rating: 4.9,
    reviewCount: 174,
    companySize: "1-10 employees",
    revenue: "$250K-$500K",
    buyingIntent: "High",
    socialSlug: "oakandstone",
  },
  {
    name: "James Parker",
    company: "Blue Ridge Dental",
    industry: "Healthcare",
    category: "Dental Practice",
    city: "Charlotte",
    state: "North Carolina",
    country: "United States",
    address: "1800 Queens Road, Charlotte, NC",
    website: "https://example.com/blue-ridge-dental",
    email: "hello@blueridge.example",
    phones: ["(704) 555-0112", "(704) 555-0138"],
    rating: 4.4,
    reviewCount: 391,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "Medium",
    socialSlug: "blueridgedental",
  },
  {
    name: "Ava Mitchell",
    company: "Harbor & Co. Boutique",
    industry: "Retail",
    category: "Boutique",
    city: "Miami",
    state: "Florida",
    country: "United States",
    address: "1425 Collins Avenue, Miami Beach, FL",
    website: "https://example.com/harbor-co",
    email: "hello@harborco.example",
    phones: ["(305) 555-0155"],
    rating: 4.3,
    reviewCount: 218,
    companySize: "1-10 employees",
    revenue: "$250K-$500K",
    buyingIntent: "Medium",
    socialSlug: "harborandco",
  },
  {
    name: "Noah Thompson",
    company: "Modern Edge Barber",
    industry: "Beauty & Personal Care",
    category: "Barbershop",
    city: "Houston",
    state: "Texas",
    country: "United States",
    address: "1812 Westheimer Road, Houston, TX",
    website: "https://example.com/modern-edge",
    email: "bookings@modernedge.example",
    phones: ["(713) 555-0161"],
    rating: 4.6,
    reviewCount: 327,
    companySize: "1-10 employees",
    revenue: "$250K-$500K",
    buyingIntent: "High",
    socialSlug: "modernedgebarber",
  },
  {
    name: "Grace Anderson",
    company: "Cedar Lane Architecture",
    industry: "Architecture",
    category: "Architecture Firm",
    city: "Austin",
    state: "Texas",
    country: "United States",
    address: "300 West 5th Street, Austin, TX",
    website: "https://example.com/cedar-lane",
    email: "studio@cedarlane.example",
    phones: ["(512) 555-0172", "(512) 555-0191"],
    rating: 4.9,
    reviewCount: 143,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "Medium",
    socialSlug: "cedarlanearchitecture",
  },
  {
    name: "Lucas Martin",
    company: "Greenline Fitness",
    industry: "Fitness",
    category: "Gym",
    city: "Dallas",
    state: "Texas",
    country: "United States",
    address: "2200 McKinney Avenue, Dallas, TX",
    website: "https://example.com/greenline-fitness",
    email: "hello@greenline.example",
    phones: ["(214) 555-0148"],
    rating: 4.5,
    reviewCount: 504,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "High",
    socialSlug: "greenlinefitness",
  },
  {
    name: "Mia Robinson",
    company: "Maison Floral Design",
    industry: "Events & Hospitality",
    category: "Floral Design",
    city: "Houston",
    state: "Texas",
    country: "United States",
    address: "915 West Alabama Street, Houston, TX",
    website: "https://example.com/maison-floral",
    email: "hello@maisonfloral.example",
    phones: ["(713) 555-0188"],
    rating: 4.8,
    reviewCount: 196,
    companySize: "1-10 employees",
    revenue: "$250K-$500K",
    buyingIntent: "High",
    socialSlug: "maisonfloral",
  },
  {
    name: "Ethan Walker",
    company: "Northstar Financial",
    industry: "Financial Services",
    category: "Financial Advisory",
    city: "Miami",
    state: "Florida",
    country: "United States",
    address: "100 Biscayne Boulevard, Miami, FL",
    website: "https://example.com/northstar-financial",
    email: "contact@northstar.example",
    phones: ["(305) 555-0109", "(305) 555-0151"],
    rating: 4.7,
    reviewCount: 121,
    companySize: "11-50 employees",
    revenue: "$5M-$10M",
    buyingIntent: "Medium",
    socialSlug: "northstarfinancial",
  },
  {
    name: "Charlotte Davis",
    company: "Rosewood Skin Clinic",
    industry: "Beauty & Personal Care",
    category: "Medical Spa",
    city: "Austin",
    state: "Texas",
    country: "United States",
    address: "1701 West 6th Street, Austin, TX",
    website: "https://example.com/rosewood-skin",
    email: "hello@rosewoodskin.example",
    phones: ["(512) 555-0128", "(512) 555-0164"],
    rating: 4.8,
    reviewCount: 365,
    companySize: "11-50 employees",
    revenue: "$1M-$5M",
    buyingIntent: "High",
    socialSlug: "rosewoodskin",
  },
  {
    name: "Benjamin Harris",
    company: "Westlake Construction",
    industry: "Construction",
    category: "Construction Company",
    city: "Austin",
    state: "Texas",
    country: "United States",
    address: "900 Westlake Drive, Austin, TX",
    website: "https://example.com/westlake-construction",
    email: "office@westlakeconstruction.example",
    phones: ["(512) 555-0118"],
    rating: 4.4,
    reviewCount: 202,
    companySize: "51-200 employees",
    revenue: "$5M-$10M",
    buyingIntent: "Medium",
    socialSlug: "westlakeconstruction",
  },
  {
    name: "Harper Lewis",
    company: "Bright Day Events",
    industry: "Events & Hospitality",
    category: "Event Planner",
    city: "Miami",
    state: "Florida",
    country: "United States",
    address: "2100 Coral Way, Miami, FL",
    website: "https://example.com/bright-day-events",
    email: "hello@brightday.example",
    phones: ["(305) 555-0175"],
    rating: 4.9,
    reviewCount: 247,
    companySize: "1-10 employees",
    revenue: "$250K-$500K",
    buyingIntent: "High",
    socialSlug: "brightdayevents",
  },
];

function normalize(value: string | undefined | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ");
}

function locationMatches(
  business: MockBusiness,
  location: string
) {
  const requested = normalize(location);

  if (!requested) {
    return true;
  }

  const businessLocation = normalize(
    `${business.city} ${business.state} ${business.country}`
  );

  const requestedParts = requested
    .split(/\s+/)
    .filter(Boolean);

  return requestedParts.some(
    (part) =>
      part.length > 2 &&
      businessLocation.includes(part)
  );
}

function industryMatches(
  business: MockBusiness,
  industry: string | undefined
) {
  if (!industry) {
    return true;
  }

  const requested = normalize(industry);

  const searchable = normalize(
    `${business.industry} ${business.category} ${business.company}`
  );

  return (
    searchable.includes(requested) ||
    requested.includes(normalize(business.industry)) ||
    requested.includes(normalize(business.category))
  );
}

function idealClientMatches(
  business: MockBusiness,
  idealClient: string
) {
  const requested = normalize(idealClient);

  if (!requested) {
    return true;
  }

  const searchable = normalize(
    `${business.industry} ${business.category} ${business.company}`
  );

  const words = requested
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (words.length === 0) {
    return true;
  }

  return words.some((word) =>
    searchable.includes(word)
  );
}

function companySizeMatches(
  business: MockBusiness,
  companySize: string | undefined
) {
  if (!companySize) {
    return true;
  }

  const requested = normalize(companySize);

  return normalize(business.companySize).includes(
    requested
  );
}

function revenueMatches(
  business: MockBusiness,
  revenue: string | undefined
) {
  if (!revenue) {
    return true;
  }

  const requested = normalize(revenue);

  return normalize(business.revenue).includes(
    requested
  );
}

function buyingIntentMatches(
  business: MockBusiness,
  buyingIntent: string | undefined
) {
  if (!buyingIntent || buyingIntent === "Any") {
    return true;
  }

  return (
    normalize(business.buyingIntent) ===
    normalize(buyingIntent)
  );
}

function buildSocialUrl(
  platform: string,
  slug: string
) {
  return `https://${platform}.example/${slug}`;
}

function buildPotentialLead(
  business: MockBusiness,
  criteria: SearchCriteria,
  index: number
): PotentialLead {
  const offer =
    criteria.offer || "Digital Services";

  const highIntent =
    business.buyingIntent === "High";

  const score = highIntent
    ? Math.min(96, 82 + (index % 12))
    : Math.min(88, 70 + (index % 12));

  let opportunity = "Good Opportunity";

  if (score >= 90) {
    opportunity = "Excellent Opportunity";
  } else if (score < 75) {
    opportunity = "Potential Opportunity";
  }

  const recommendedService =
    offer.trim() || "Digital Services";

  const estimatedProjectValue =
    score >= 90
      ? "$8,000 - $20,000"
      : score >= 80
        ? "$5,000 - $12,000"
        : "$3,000 - $8,000";

  const reasons = [
    `${business.industry} business matching the selected search criteria.`,
    `${business.reviewCount} public reviews with a ${business.rating} rating.`,
    `${business.buyingIntent} estimated buying intent.`,
  ];

  if (criteria.enrichment) {
    reasons.push(
      "Business profile includes enriched contact and social information."
    );
  }

  return {
    name: business.name,
    company: business.company,
    email: business.email,
    phone: business.phones[0] || null,
    phone_numbers: business.phones,
    email_addresses: [
      business.email,
      `contact@${business.socialSlug}.example`,
    ],

    website: business.website,

    industry: business.industry,
    category: business.category,

    location: `${business.city}, ${business.state}`,
    address: business.address,
    city: business.city,
    state: business.state,
    country: business.country,

    rating: business.rating,
    review_count: business.reviewCount,

    latitude: null,
    longitude: null,

    instagram_url: buildSocialUrl(
      "instagram",
      business.socialSlug
    ),
    facebook_url: buildSocialUrl(
      "facebook",
      business.socialSlug
    ),
    linkedin_url: buildSocialUrl(
      "linkedin",
      business.socialSlug
    ),
    x_url: buildSocialUrl(
      "x",
      business.socialSlug
    ),
    tiktok_url: buildSocialUrl(
      "tiktok",
      business.socialSlug
    ),
    pinterest_url: buildSocialUrl(
      "pinterest",
      business.socialSlug
    ),
    google_maps_url:
      "https://maps.example/search/" +
      encodeURIComponent(
        `${business.company}, ${business.address}`
      ),

    source: "test",
    source_id: `mock-${business.socialSlug}`,

    status: "new",

    notes:
      `Test lead generated for "${offer}". ` +
      `${business.company} appears to be a ${business.category} ` +
      `business in ${business.city}, ${business.state}.`,

    ai_score: criteria.scoring === false
      ? null
      : score,

    ai_opportunity:
      criteria.scoring === false
        ? null
        : opportunity,

    ai_reason:
      criteria.scoring === false
        ? null
        : `This test lead appears to be a ${opportunity.toLowerCase()} for ${recommendedService}.`,

    ai_recommendations:
      criteria.scoring === false
        ? null
        : {
            recommended_service: recommendedService,
            estimated_project_value:
              estimatedProjectValue,
            reasons,
            buying_intent:
              business.buyingIntent,
            company_size:
              business.companySize,
            revenue_range:
              business.revenue,
            tags:
              criteria.tags || [],
          },

    raw_data: {
      provider: "mock",
      test_data: true,
      search_offer: criteria.offer,
      search_ideal_client: criteria.idealClient,
      search_location: criteria.location,
      company_size: business.companySize,
      revenue: business.revenue,
      buying_intent: business.buyingIntent,
    },
  };
}

export function getMockLeads(
  criteria: SearchCriteria
): PotentialLead[] {
  const requestedLocation =
    criteria.location || "Austin, Texas";

  let matches = MOCK_BUSINESSES.filter((business) =>
    locationMatches(
      business,
      requestedLocation
    )
  );

  if (criteria.industry) {
    const industryMatchesResult =
      matches.filter((business) =>
        industryMatches(
          business,
          criteria.industry
        )
      );

    if (industryMatchesResult.length > 0) {
      matches = industryMatchesResult;
    }
  }

  if (criteria.idealClient) {
    const idealClientMatchesResult =
      matches.filter((business) =>
        idealClientMatches(
          business,
          criteria.idealClient
        )
      );

    if (idealClientMatchesResult.length > 0) {
      matches = idealClientMatchesResult;
    }
  }

  if (criteria.companySize) {
    const sizeMatches =
      matches.filter((business) =>
        companySizeMatches(
          business,
          criteria.companySize
        )
      );

    if (sizeMatches.length > 0) {
      matches = sizeMatches;
    }
  }

  if (criteria.revenue) {
    const revenueMatchesResult =
      matches.filter((business) =>
        revenueMatches(
          business,
          criteria.revenue
        )
      );

    if (revenueMatchesResult.length > 0) {
      matches = revenueMatchesResult;
    }
  }

  if (criteria.buyingIntent) {
    const intentMatches =
      matches.filter((business) =>
        buyingIntentMatches(
          business,
          criteria.buyingIntent
        )
      );

    if (intentMatches.length > 0) {
      matches = intentMatches;
    }
  }

  if (matches.length === 0) {
    matches = MOCK_BUSINESSES.filter((business) =>
      locationMatches(
        business,
        requestedLocation
      )
    );
  }

  if (matches.length === 0) {
    matches = [...MOCK_BUSINESSES];
  }

  const requestedCount =
    typeof criteria.leads === "number" &&
    criteria.leads > 0
      ? Math.min(criteria.leads, matches.length)
      : matches.length;

  const selected = matches.slice(
    0,
    requestedCount
  );

  return selected.map((business, index) =>
    buildPotentialLead(
      business,
      criteria,
      index
    )
  );
}