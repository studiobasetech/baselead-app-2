export type SearchCriteria = {
  offer: string;
  idealClient: string;
  leads?: number;
  industry?: string;
  companySize?: string;
  revenue?: string;
  location: string;
  radius?: number;
  buyingIntent?: string;
  tags?: string[];
  scoring?: boolean;
  intent?: boolean;
  enrichment?: boolean;
  excludeExisting?: boolean;
};

export type PotentialLead = {
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  phone_numbers?: string[];
  email_addresses?: string[];
  website: string | null;

  industry: string | null;
  category?: string | null;

  location: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;

  rating?: number | null;
  review_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;

  instagram_url?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  tiktok_url?: string | null;
  pinterest_url?: string | null;
  google_maps_url?: string | null;

  source: string;
  source_id?: string | null;

  status: string;
  notes: string | null;

  ai_score?: number | null;
  ai_opportunity?: string | null;
  ai_reason?: string | null;

  ai_recommendations?: {
    recommended_service?: string;
    estimated_project_value?: string;
    reasons?: string[];
    buying_intent?: string;
    company_size?: string;
    revenue_range?: string;
    tags?: string[];
  } | null;

  raw_data?: Record<string, unknown> | null;
};