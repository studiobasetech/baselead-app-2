"use client";

import { getTeamLimit } from "@/lib/plans";
import TwoFactorCard from "@/components/security/TwoFactorCard";
import DeleteAllLeadsCard from "@/components/leads/DeleteAllLeadsCard";
import { usePlan } from "@/components/plans/PlanProvider";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  CreditCard,
  Crown,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Mail,
  Plus,
  Save,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  BriefcaseBusiness,
  DollarSign,
  Target,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaXTwitter,
  FaTiktok,
  FaPinterest,
  FaGoogle,
} from "react-icons/fa6";

import { supabase } from "@/components/lib/supabase";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePreferences } from "@/components/preferences/PreferencesProvider";

/* =========================================================
   TYPES
========================================================= */

type SettingsTab =
  | "My Profile"
  | "Company"
  | "AI & Services"
  | "Preferences"
  | "Team"
  | "Billing & Plan"
  | "Notifications"
  | "Security"
  | "API & Webhooks";

type BillingCycle = "monthly" | "yearly";

type Service = {
  id: string;
  name: string;
  description: string;
  price: string;
};

type CompanySettings = {
  company_name: string;
  website: string;
  industry: string;
  company_description: string;
  target_customer: string;
  target_locations: string;

  locations: string[];

  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;

  logo_url: string;

  services: Service[];

  min_project_value: string;
  max_project_value: string;
  selling_points: string;
  ai_notes: string;

  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  x_url: string;
  tiktok_url: string;
  pinterest_url: string;
  google_maps_url: string;
};

type UserPreferences = {
  currency: string;
  default_lead_view: string;
  show_opportunity_score: boolean;
  smart_notifications: boolean;
  dark_mode: boolean;
  compact_layout: boolean;
};

type NotificationSettings = {
  email_notifications: boolean;
  new_lead_alerts: boolean;
  outreach_replies: boolean;
  meeting_reminders: boolean;
  weekly_report: boolean;
};

type TeamRole = "Admin" | "Manager" | "Member";

type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  status: string;
  user_id: string | null;
};

type TeamInvitation = {
  id: string;
  email: string;
  role: TeamRole;
  status: string;
  expires_at: string | null;
  created_at: string;
  token: string;
};

type Webhook = {
  id: string;
  event: string;
  url: string;
  active: boolean;
};

/* =========================================================
   DEFAULTS
========================================================= */

const DEFAULT_COMPANY: CompanySettings = {
  company_name: "",
  website: "",
  industry: "",
  company_description: "",
  target_customer: "",
  target_locations: "",

  locations: [],

  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "",

  logo_url: "",

  services: [],

  min_project_value: "",
  max_project_value: "",
  selling_points: "",
  ai_notes: "",

  instagram_url: "",
  facebook_url: "",
  linkedin_url: "",
  x_url: "",
  tiktok_url: "",
  pinterest_url: "",
  google_maps_url: "",
};

const DEFAULT_PREFERENCES: UserPreferences = {
  currency: "USD ($)",
  default_lead_view: "List View",
  show_opportunity_score: true,
  smart_notifications: true,
  dark_mode: true,
  compact_layout: false,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email_notifications: true,
  new_lead_alerts: true,
  outreach_replies: true,
  meeting_reminders: true,
  weekly_report: false,
};

/* =========================================================
   PLANS
========================================================= */

const PLANS = [
  {
    name: "Starter",
    monthly: 79,
    yearly: 805.8,
    description:
      "For businesses getting serious about client acquisition.",
    leads: "1,000",
    team: "1-3",
    integrations: "5",
    features: [
      "AI-powered lead discovery",
      "AI lead scoring",
      "Email templates",
      "Pipeline management",
      "Calendar & follow-ups",
      "Performance reports",
    ],
  },
  {
    name: "Pro",
    monthly: 199,
    yearly: 2029.8,
    description:
      "For growing businesses building a predictable sales pipeline.",
    leads: "5,000",
    team: "1-5",
    integrations: "Unlimited",
    popular: true,
    features: [
      "Advanced AI lead discovery",
      "AI scoring & recommendations",
      "Email & outreach automation",
      "Advanced pipeline management",
      "Calendar & follow-ups",
      "Advanced reports & analytics",
      "Integrations & webhooks",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    monthly: 399,
    yearly: 4069.8,
    description:
      "For agencies and teams managing acquisition at scale.",
    leads: "20,000",
    team: "Unlimited",
    integrations: "Unlimited",
    features: [
      "Everything in Pro",
      "Advanced AI recommendations",
      "Unlimited campaigns",
      "Advanced automation",
      "Team permissions",
      "Custom reports & analytics",
      "API access",
      "Priority support",
    ],
  },
];

/* =========================================================
   SOCIAL ICON
========================================================= */

function SocialIcon({
  platform,
  size = 15,
}: {
  platform:
    | "instagram"
    | "facebook"
    | "linkedin"
    | "x"
    | "tiktok"
    | "pinterest"
    | "google";
  size?: number;
}) {
  const common = "shrink-0";

  if (platform === "instagram") {
    return (
      <FaInstagram
        size={size}
        className={`${common} text-[#E4405F]`}
      />
    );
  }

  if (platform === "facebook") {
    return (
      <FaFacebook
        size={size}
        className={`${common} text-[#1877F2]`}
      />
    );
  }

  if (platform === "linkedin") {
    return (
      <FaLinkedin
        size={size}
        className={`${common} text-[#0A66C2]`}
      />
    );
  }

  if (platform === "x") {
    return (
      <FaXTwitter
        size={size}
        className={`${common} text-white`}
      />
    );
  }

  if (platform === "tiktok") {
    return (
      <FaTiktok
        size={size}
        className={`${common} text-white`}
      />
    );
  }

  if (platform === "pinterest") {
    return (
      <FaPinterest
        size={size}
        className={`${common} text-[#E60023]`}
      />
    );
  }

  return (
    <FaGoogle
      size={size}
      className={`${common} text-[#EA4335]`}
    />
  );
}

/* =========================================================
   GLOBAL UI
========================================================= */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group rounded-xl border border-white/10 bg-gradient-to-b from-[#0D0D0D] to-[#101010] shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2A2A2A] hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)] ${className}`}
    >
      {children}
    </div>
  );
}

function YellowButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2.5 text-[14px] font-semibold text-black transition hover:bg-[#FFD92B] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function OutlineButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[14px] text-gray-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-medium text-gray-400">
        {label}
      </span>

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`h-10 w-full rounded-lg border border-white/10 bg-[#070707] ${
            icon ? "pl-9" : "px-3"
          } pr-3 text-[16px] text-white outline-none transition placeholder:text-gray-700 focus:border-[#F5C518]/60`}
        />
      </div>
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-medium text-gray-400">
        {label}
      </span>

      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-lg border border-white/10 bg-[#070707] px-3 py-3 text-[16px] leading-6 text-white outline-none transition placeholder:text-gray-700 focus:border-[#F5C518]/60"
      />
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-medium text-gray-400">
        {label}
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#070707] px-3 pr-8 text-[16px] text-gray-300 outline-none focus:border-[#F5C518]/60"
        >
          {options.map((option) => (
            <option
              key={option}
              value={option}
              className="bg-[#090909]"
            >
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      </div>
    </label>
  );
}
function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-label="Toggle setting"
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
        enabled ? "bg-[#F5C518]" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
          enabled ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function PreferenceRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#101010] px-4 py-3.5 pb-4 shadow-[0_6px_18px_rgba(0,0,0,0.08)] transition hover:border-[#2A2A2A] hover:bg-[#171717] last:border-0 last:pb-4">
      <div>
        <p className="text-[14px] text-gray-300">
          {title}
        </p>

        <p className="mt-1 text-[14px] text-gray-600">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  open,
  title,
  children,
  onClose,
  danger = false,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  danger?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            {danger ? (
              <AlertTriangle
                size={16}
                className="text-red-400"
              />
            ) : (
              <SettingsIcon
                size={16}
                className="text-[#F5C518]"
              />
            )}

            <h2 className="text-sm font-semibold">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MY PROFILE
========================================================= */

function ProfileTab({
  companyLogo,
  onToast,
}: {
  companyLogo: string;
  onToast: (message: string) => void;
}) {
  const { language, setLanguage, t } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState(
    "(GMT-05:00) Central Time (US & Canada)"
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email || "");

      const metadata = user.user_metadata || {};

      setName(
        metadata.full_name ||
          metadata.name ||
          ""
      );

      setPhone(metadata.phone || "");

      if (metadata.timezone) {
        setTimezone(metadata.timezone);
      }
    }

    loadProfile();
  }, []);

  async function save() {
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        onToast(t("You must be logged in."));
        return;
      }

      const currentEmail = user.email || "";

      const { error } =
        await supabase.auth.updateUser({
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            timezone,
            language,
          },
        });

      if (error) {
        onToast(error.message);
        return;
      }

      if (
        email.trim() &&
        email.trim() !== currentEmail
      ) {
        const { error: emailError } =
          await supabase.auth.updateUser({
            email: email.trim(),
          });

        if (emailError) {
          onToast(
            `${t(
              "Profile saved, but email could not be changed:"
            )} ${emailError.message}`
          );
          return;
        }

        onToast(
          t(
            "A confirmation email was sent to your new email address."
          )
        );

        return;
      }

      onToast(t("Profile changes saved."));
    } finally {
      setSaving(false);
    }
  }

  async function handleLanguageChange(
    value: string
  ) {
    const nextLanguage =
      value === "Spanish" ? "es" : "en";

    await setLanguage(nextLanguage);

    onToast(
      nextLanguage === "es"
        ? "Idioma cambiado a español."
        : "Language changed to English."
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-medium">
          {t("Profile Information")}
        </h2>

        <p className="mt-1 text-[14px] text-gray-600">
          {t(
            "Your personal account information."
          )}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        {companyLogo ? (
          <img
            src={companyLogo}
            alt={t("Company logo")}
            className="h-16 w-16 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#F5C518]/40 bg-[#111] text-center text-[9px] font-semibold tracking-wider text-[#F5C518]">
            BASE
            <br />
            LEAD
          </div>
        )}

        <div>
          <p className="text-sm font-semibold">
            {name || t("Your Profile")}
          </p>

          <p className="mt-1 text-[14px] text-gray-600">
            {t("Account owner")}
          </p>

          <p className="mt-1 text-[14px] text-gray-700">
            {t(
              "Your company logo is managed from Company settings."
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Field
          label={t("Full Name")}
          value={name}
          onChange={setName}
        />

        <Field
          label={t("Email")}
          value={email}
          onChange={setEmail}
          type="email"
        />

        <Field
          label={t("Phone")}
          value={phone}
          onChange={setPhone}
          placeholder="+1..."
        />

        <SelectField
          label={t("Time Zone")}
          value={timezone}
          onChange={setTimezone}
          options={[
            "(GMT-05:00) Central Time (US & Canada)",
            "(GMT-05:00) Eastern Time (US & Canada)",
            "(GMT-06:00) Mountain Time (US & Canada)",
            "(GMT-07:00) Pacific Time (US & Canada)",
          ]}
        />

        <SelectField
          label={t("Language")}
          value={
            language === "es"
              ? "Spanish"
              : "English"
          }
          onChange={handleLanguageChange}
          options={[
            "English",
            "Spanish",
          ]}
        />
      </div>

      <div className="mt-5">
        <YellowButton
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          <Save size={13} />
          {saving
            ? t("Saving...")
            : t("Save Changes")}
        </YellowButton>
      </div>
    </Card>
  );
}

/* =========================================================
   COMPANY
========================================================= */

function CompanyTab({
  settings,
  setSettings,
  onToast,
  saveCompanySettings,
  canEditCompany,
}: {
  settings: CompanySettings;
  setSettings: React.Dispatch<
    React.SetStateAction<CompanySettings>
  >;
  onToast: (message: string) => void;
  saveCompanySettings: () => Promise<void>;
  canEditCompany: boolean;
}) {
  const { t } = useLanguage();

  const logoInput =
    useRef<HTMLInputElement | null>(null);

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  function update(
    key: keyof CompanySettings,
    value: string
  ) {
    if (!canEditCompany) return;

    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }
  function addLocation() {
  if (!canEditCompany) return;

  setSettings((current) => ({
    ...current,
    locations: [
      ...current.locations,
      "",
    ],
  }));
}

function updateLocation(
  index: number,
  value: string
) {
  if (!canEditCompany) return;

  setSettings((current) => ({
    ...current,
    locations: current.locations.map(
      (location, locationIndex) =>
        locationIndex === index
          ? value
          : location
    ),
  }));
}

function removeLocation(
  index: number
) {
  if (!canEditCompany) return;

  setSettings((current) => ({
    ...current,
    locations:
      current.locations.filter(
        (_, locationIndex) =>
          locationIndex !== index
      ),
  }));
}


  async function uploadLogo(file: File) {
    if (!canEditCompany) {
      onToast(
        t(
          "Only the workspace owner can change the company logo."
        )
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onToast(t("You must be logged in."));
      return;
    }

    if (!file.type.startsWith("image/")) {
      onToast(t("Please select an image."));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onToast(
        t("The logo must be smaller than 5 MB.")
      );
      return;
    }

    setUploadingLogo(true);

    try {
      const extension =
        file.name.split(".").pop() ||
        "png";

      const path =
        `${user.id}/company-logo-${Date.now()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("company-logos")
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
          });

      if (uploadError) {
        console.error(
          "Company logo upload error:",
          uploadError
        );

        onToast(
          `${t(
            "Could not upload logo:"
          )} ${uploadError.message}`
        );

        return;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from("company-logos")
          .getPublicUrl(path);

      const logoUrl =
        publicData.publicUrl;

      setSettings((current) => ({
        ...current,
        logo_url: logoUrl,
      }));

      const { error: profileError } =
        await supabase
          .from("company_profiles")
          .update({
            logo_url: logoUrl,
            updated_at:
              new Date().toISOString(),
          })
          .eq("user_id", user.id);

      if (profileError) {
        console.error(
          "Logo profile save error:",
          profileError
        );

        onToast(
          `${t(
            "Logo uploaded, but could not save it:"
          )} ${profileError.message}`
        );

        return;
      }

      window.dispatchEvent(
        new Event("baselead-company-updated")
      );

      onToast(
        t("Company logo updated.")
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-medium">
          {t("Company Information")}
        </h2>

        <p className="mt-1 text-[14px] text-gray-600">
          {t(
            "This information powers your BaseLead workspace."
          )}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt={t("Company logo")}
            className="h-20 w-20 rounded-xl border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-black text-center text-[9px] font-semibold tracking-wider text-[#F5C518]">
            BASE
            <br />
            LEAD
          </div>
        )}

        <div>
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              if (file) {
                uploadLogo(file);
              }

              event.target.value = "";
            }}
          />

          <OutlineButton
            disabled={
              uploadingLogo ||
              !canEditCompany
            }
            onClick={() => {
              if (!canEditCompany) {
                onToast(
                  t(
                    "Only the workspace owner can change the company logo."
                  )
                );
                return;
              }

              logoInput.current?.click();
            }}
          >
            <ImageIcon size={13} />

            {uploadingLogo
              ? t("Uploading...")
              : t("Change Logo")}
          </OutlineButton>

          <p className="mt-2 max-w-sm text-[8px] text-gray-600">
            {t(
              "This is the only profile image in BaseLead. It appears in your workspace sidebar and My Profile."
            )}
          </p>

          {!canEditCompany && (
            <p className="mt-1 text-[8px] text-yellow-500/70">
              {t(
                "Only the workspace owner can edit company information."
              )}
            </p>
          )}
        </div>
      </div>

      <div
        className={
          canEditCompany
            ? "mt-6 grid gap-4 md:grid-cols-2"
            : "pointer-events-none mt-6 grid gap-4 opacity-70 md:grid-cols-2"
        }
      >
        <Field
          label={t("Company Name")}
          value={settings.company_name}
          onChange={(value) =>
            update(
              "company_name",
              value
            )
          }
          placeholder={t(
            "Your company name"
          )}
        />

        <Field
          label={t("Website")}
          value={settings.website}
          onChange={(value) =>
            update(
              "website",
              value
            )
          }
          placeholder="https://yourcompany.com"
        />

        <Field
          label={t("Industry")}
          value={settings.industry}
          onChange={(value) =>
            update(
              "industry",
              value
            )
          }
          placeholder={t(
            "e.g. Real Estate, Roofing, Marketing"
          )}
        />

        <Field
          label={t("Target Customer")}
          value={settings.target_customer}
          onChange={(value) =>
            update(
              "target_customer",
              value
            )
          }
          placeholder={t(
            "Who are you trying to sell to?"
          )}
        />

        <Field
          label={t("Target Locations")}
          value={settings.target_locations}
          onChange={(value) =>
            update(
              "target_locations",
              value
            )
          }
          placeholder={t(
            "Cities, states, countries..."
          )}
        />
<div className="md:col-span-2">
  <div className="flex items-end justify-between gap-3">
    <div>
      <span className="mb-1.5 block text-[15px] font-medium text-gray-400">
        {t("Business Locations")}
      </span>

      <p className="text-[14px] leading-5 text-gray-600">
        {t(
          "Add the locations your company operates from. These locations will appear in the Dashboard location filter."
        )}
      </p>
    </div>

    <button
      type="button"
      disabled={!canEditCompany}
      onClick={addLocation}
      className="flex shrink-0 items-center gap-2 rounded-lg border border-[#F5C518]/20 bg-[#F5C518]/[0.04] px-3 py-2 text-[14px] font-medium text-[#F5C518] transition hover:bg-[#F5C518]/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Plus size={13} />
      {t("Add Location")}
    </button>
  </div>

  <div className="mt-3 space-y-2">
    {settings.locations.length === 0 ? (
      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4">
        <p className="text-[14px] text-gray-600">
          {t(
            "No business locations added yet."
          )}
        </p>
      </div>
    ) : (
      settings.locations.map(
        (location, index) => (
          <div
            key={`location-${index}`}
            className="flex items-center gap-2"
          >
            <input
              value={location}
              onChange={(event) =>
                updateLocation(
                  index,
                  event.target.value
                )
              }
              disabled={!canEditCompany}
              placeholder={t(
                "e.g. Miami, FL"
              )}
              className="h-10 flex-1 rounded-lg border border-white/10 bg-[#070707] px-3 text-[16px] text-white outline-none transition placeholder:text-gray-700 focus:border-[#F5C518]/60 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              disabled={!canEditCompany}
              onClick={() =>
                removeLocation(index)
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-600 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t(
                "Remove location"
              )}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      )
    )}
  </div>
</div>
        <Field
          label={t("Business Phone")}
          value={settings.phone}
          onChange={(value) =>
            update(
              "phone",
              value
            )
          }
          placeholder="+1..."
        />

        <Field
          label={t("Business Email")}
          value={settings.email}
          onChange={(value) =>
            update(
              "email",
              value
            )
          }
          type="email"
          placeholder="hello@company.com"
        />

        <Field
          label={t("Address")}
          value={settings.address}
          onChange={(value) =>
            update(
              "address",
              value
            )
          }
          placeholder={t(
            "Business street address"
          )}
        />

        <Field
          label={t("City")}
          value={settings.city}
          onChange={(value) =>
            update(
              "city",
              value
            )
          }
        />

        <Field
          label={t("State / Province")}
          value={settings.state}
          onChange={(value) =>
            update(
              "state",
              value
            )
          }
        />

        <Field
          label={t("Country")}
          value={settings.country}
          onChange={(value) =>
            update(
              "country",
              value
            )
          }
        />

        <div className="md:col-span-2">
          <TextArea
            label={t("Company Description")}
            value={
              settings.company_description
            }
            onChange={(value) =>
              update(
                "company_description",
                value
              )
            }
            placeholder={t(
              "Describe what your company does and who you serve."
            )}
            rows={4}
          />
        </div>

        <div className="md:col-span-2">
          <TextArea
            label={t("Unique Selling Points")}
            value={settings.selling_points}
            onChange={(value) =>
              update(
                "selling_points",
                value
              )
            }
            placeholder={t(
              "What makes your company different?"
            )}
            rows={3}
          />
        </div>
      </div>

      <div className="mt-5">
        <YellowButton
          onClick={() => {
            if (!canEditCompany) {
              onToast(
                t(
                  "Only the workspace owner can edit company information."
                )
              );
              return;
            }

            saveCompanySettings();
          }}
          disabled={!canEditCompany}
          className="w-full sm:w-auto"
        >
          <Save size={13} />
          {t("Save Changes")}
        </YellowButton>
      </div>
    </Card>
  );
}

/* =========================================================
   AI & SERVICES
========================================================= */

function AiServicesTab({
  settings,
  setSettings,
  saveCompanySettings,
  canEditCompany,
}: {
  settings: CompanySettings;
  setSettings: React.Dispatch<
    React.SetStateAction<CompanySettings>
  >;
  saveCompanySettings: () => Promise<void>;
  canEditCompany: boolean;
}) {
  const { t } = useLanguage();

  function update(
    key: keyof CompanySettings,
    value: string
  ) {
    if (!canEditCompany) return;

    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function addService() {
    if (!canEditCompany) return;

    setSettings((current) => ({
      ...current,
      services: [
        ...current.services,
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          price: "",
        },
      ],
    }));
  }

  function updateService(
    id: string,
    key: keyof Service,
    value: string
  ) {
    if (!canEditCompany) return;

    setSettings((current) => ({
      ...current,
      services: current.services.map(
        (service) =>
          service.id === id
            ? {
                ...service,
                [key]: value,
              }
            : service
      ),
    }));
  }

  function removeService(id: string) {
    if (!canEditCompany) return;

    setSettings((current) => ({
      ...current,
      services:
        current.services.filter(
          (service) =>
            service.id !== id
        ),
    }));
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#A78BFA]/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#241A38]">
              <Sparkles
                size={18}
                className="text-[#A78BFA]"
              />
            </div>

            <div>
              <h2 className="text-sm font-medium">
                {t("AI Business Intelligence")}
              </h2>

              <p className="mt-1 max-w-2xl text-[14px] leading-5 text-gray-600">
                {t(
                  "Tell BaseLead exactly what your company sells. This information will be used by AI when scoring leads, generating recommendations, creating outreach and identifying opportunities."
                )}
              </p>
            </div>
          </div>

          <div
            className={
              canEditCompany
                ? "mt-6 grid gap-4 md:grid-cols-2"
                : "pointer-events-none mt-6 grid gap-4 opacity-70 md:grid-cols-2"
            }
          >
            <Field
              label={t(
                "Minimum Project Value"
              )}
              value={
                settings.min_project_value
              }
              onChange={(value) =>
                update(
                  "min_project_value",
                  value
                )
              }
              type="number"
              placeholder="e.g. 1000"
            />

            <Field
              label={t(
                "Maximum Project Value"
              )}
              value={
                settings.max_project_value
              }
              onChange={(value) =>
                update(
                  "max_project_value",
                  value
                )
              }
              type="number"
              placeholder="e.g. 25000"
            />

            <div className="md:col-span-2">
              <TextArea
                label={t("AI Instructions")}
                value={settings.ai_notes}
                onChange={(value) =>
                  update(
                    "ai_notes",
                    value
                  )
                }
                placeholder={t(
                  "Tell the AI what makes a lead valuable to your company."
                )}
                rows={5}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BriefcaseBusiness
                size={16}
                className="text-[#F5C518]"
              />

              <h2 className="text-sm font-medium">
                {t("Products & Services")}
              </h2>
            </div>

            <p className="mt-1 text-[14px] text-gray-600">
              {t(
                "Add what you sell and the price for each service."
              )}
            </p>
          </div>

          <YellowButton
            onClick={addService}
            disabled={!canEditCompany}
          >
            <Plus size={13} />
            {t("Add Service")}
          </YellowButton>
        </div>

        <div className="mt-5 space-y-3">
          {settings.services.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <DollarSign
                size={22}
                className="mx-auto text-[#F5C518]"
              />

              <p className="mt-3 text-[14px] font-medium text-gray-300">
                {t("No services added yet")}
              </p>

              <p className="mt-1 text-[8px] text-gray-600">
                {t(
                  "Add your first service so BaseLead can understand what you sell."
                )}
              </p>

              <button
                type="button"
                onClick={addService}
                disabled={!canEditCompany}
                className="mt-4 text-[14px] text-[#F5C518] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                +{" "}
                {t(
                  "Add your first service"
                )}
              </button>
            </div>
          ) : (
            settings.services.map(
              (service, index) => (
                <div
                  key={service.id}
                  className={`rounded-xl border border-white/10 bg-white/[0.015] p-4 ${
                    !canEditCompany
                      ? "opacity-70"
                      : ""
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[14px] font-semibold uppercase tracking-wider text-gray-600">
                      {t("Service")}{" "}
                      {index + 1}
                    </span>

                    <button
                      type="button"
                      disabled={!canEditCompany}
                      onClick={() =>
                        removeService(
                          service.id
                        )
                      }
                      className="rounded-md p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label={t(
                        "Service Name"
                      )}
                      value={
                        service.name
                      }
                      onChange={(value) =>
                        updateService(
                          service.id,
                          "name",
                          value
                        )
                      }
                      placeholder={t(
                        "e.g. Roof Replacement"
                      )}
                    />

                    <Field
                      label={t("Price")}
                      value={
                        service.price
                      }
                      onChange={(value) =>
                        updateService(
                          service.id,
                          "price",
                          value
                        )
                      }
                      placeholder="e.g. 12000"
                      type="number"
                    />

                    <div className="md:col-span-2">
                      <TextArea
                        label={t(
                          "Service Description"
                        )}
                        value={
                          service.description
                        }
                        onChange={(value) =>
                          updateService(
                            service.id,
                            "description",
                            value
                          )
                        }
                        placeholder={t(
                          "Describe what is included in this service."
                        )}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>

        <div className="mt-5 rounded-xl border border-[#A78BFA]/15 bg-[#A78BFA]/[0.04] p-4">
          <div className="flex gap-3">
            <Target
              size={16}
              className="mt-0.5 shrink-0 text-[#A78BFA]"
            />

            <div>
              <p className="text-[14px] font-medium text-gray-300">
                {t("Why this matters")}
              </p>

              <p className="mt-1 text-[8px] leading-5 text-gray-600">
                {t(
                  "BaseLead will use these services and prices as the company's commercial context so recommendations can match the right service to each lead."
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <YellowButton
            onClick={() => {
              if (!canEditCompany) return;
              saveCompanySettings();
            }}
            disabled={!canEditCompany}
            className="w-full sm:w-auto"
          >
            <Save size={13} />
            {t("Save AI & Services")}
          </YellowButton>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Globe
            size={16}
            className="text-[#60A5FA]"
          />

          <h2 className="text-sm font-medium">
            {t("Business & Social Profiles")}
          </h2>
        </div>

        <p className="mt-1 text-[14px] text-gray-600">
          {t(
            "These profiles describe your company and can be used by outreach and AI context."
          )}
        </p>

        <div
          className={
            canEditCompany
              ? "mt-5 grid gap-4 md:grid-cols-2"
              : "pointer-events-none mt-5 grid gap-4 opacity-70 md:grid-cols-2"
          }
        >
          <Field
            label="Instagram"
            value={
              settings.instagram_url
            }
            onChange={(value) =>
              update(
                "instagram_url",
                value
              )
            }
            placeholder="https://instagram.com/..."
            icon={
              <SocialIcon
                platform="instagram"
              />
            }
          />

          <Field
            label="Facebook"
            value={
              settings.facebook_url
            }
            onChange={(value) =>
              update(
                "facebook_url",
                value
              )
            }
            placeholder="https://facebook.com/..."
            icon={
              <SocialIcon
                platform="facebook"
              />
            }
          />

          <Field
            label="LinkedIn"
            value={
              settings.linkedin_url
            }
            onChange={(value) =>
              update(
                "linkedin_url",
                value
              )
            }
            placeholder="https://linkedin.com/..."
            icon={
              <SocialIcon
                platform="linkedin"
              />
            }
          />

          <Field
            label="X"
            value={settings.x_url}
            onChange={(value) =>
              update(
                "x_url",
                value
              )
            }
            placeholder="https://x.com/..."
            icon={
              <SocialIcon platform="x" />
            }
          />

          <Field
            label="TikTok"
            value={
              settings.tiktok_url
            }
            onChange={(value) =>
              update(
                "tiktok_url",
                value
              )
            }
            placeholder="https://tiktok.com/@..."
            icon={
              <SocialIcon
                platform="tiktok"
              />
            }
          />

          <Field
            label="Pinterest"
            value={
              settings.pinterest_url
            }
            onChange={(value) =>
              update(
                "pinterest_url",
                value
              )
            }
            placeholder="https://pinterest.com/..."
            icon={
              <SocialIcon
                platform="pinterest"
              />
            }
          />

          <Field
            label="Google Maps"
            value={
              settings.google_maps_url
            }
            onChange={(value) =>
              update(
                "google_maps_url",
                value
              )
            }
            placeholder={t(
              "Google Maps company profile"
            )}
            icon={
              <SocialIcon
                platform="google"
              />
            }
          />
        </div>

        <div className="mt-5">
          <YellowButton
            onClick={() => {
              if (!canEditCompany) return;
              saveCompanySettings();
            }}
            disabled={!canEditCompany}
            className="w-full sm:w-auto"
          >
            <Save size={13} />
            {t("Save Business Profiles")}
          </YellowButton>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
   PREFERENCES
========================================================= */

function PreferencesTab({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();

  const {
    preferences,
    loading,
    saving,
    updatePreferences,
    savePreferences,
  } = usePreferences();

  const [localSettings, setLocalSettings] =
    useState<UserPreferences>(
      preferences
    );

  useEffect(() => {
    setLocalSettings(
      preferences
    );
  }, [preferences]);

  async function updateLocalPreference(
    updates: Partial<UserPreferences>
  ) {
    const nextSettings: UserPreferences =
      {
        ...localSettings,
        ...updates,
      };

    setLocalSettings(
      nextSettings
    );

    await updatePreferences(
      updates,
      false
    );
  }

  async function handleSavePreferences() {
    const success =
      await savePreferences(
        localSettings
      );

    if (!success) {
      onToast(
        t(
          "Could not save preferences. Your current changes are still active locally."
        )
      );

      return;
    }

    onToast(
      t("Preferences saved.")
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-medium">
        {t("Preferences")}
      </h2>

      <p className="mt-1 text-[14px] text-gray-600">
        {t(
          "These preferences are saved to your BaseLead account and used across the application."
        )}
      </p>

      {loading ? (
        <div className="py-12 text-center text-[14px] text-gray-600">
          {t("Loading preferences...")}
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-5">
            <SelectField
              label={t("Default Currency")}
              value={
                localSettings.currency
              }
              onChange={(value) =>
                updateLocalPreference({
                  currency:
                    value,
                })
              }
              options={[
                "USD ($)",
                "CAD ($)",
                "MXN ($)",
                "GBP (£)",
                "EUR (€)",
              ]}
            />

            <SelectField
              label={t("Default Lead View")}
              value={
                localSettings.default_lead_view
              }
              onChange={(value) =>
                updateLocalPreference({
                  default_lead_view:
                    value,
                })
              }
              options={[
                "List View",
                "Grid View",
                "Kanban View",
              ]}
            />

            <PreferenceRow
              title={t(
                "Show opportunity score"
              )}
              description={t(
                "Display AI opportunity scores in lead lists."
              )}
            >
              <Toggle
                enabled={
                  localSettings.show_opportunity_score
                }
                onChange={(value) =>
                  updateLocalPreference({
                    show_opportunity_score:
                      value,
                  })
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t(
                "Enable smart notifications"
              )}
              description={t(
                "Receive AI insights and opportunity alerts."
              )}
            >
              <Toggle
                enabled={
                  localSettings.smart_notifications
                }
                onChange={(value) =>
                  updateLocalPreference({
                    smart_notifications:
                      value,
                  })
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t("Dark mode")}
              description={t(
                "Use the dark interface across BaseLead."
              )}
            >
              <Toggle
                enabled={
                  localSettings.dark_mode
                }
                onChange={(value) =>
                  updateLocalPreference({
                    dark_mode:
                      value,
                  })
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t("Compact layout")}
              description={t(
                "Reduce spacing in tables and lists."
              )}
            >
              <Toggle
                enabled={
                  localSettings.compact_layout
                }
                onChange={(value) =>
                  updateLocalPreference({
                    compact_layout:
                      value,
                  })
                }
              />
            </PreferenceRow>
          </div>

          <div className="mt-6">
            <YellowButton
              onClick={
                handleSavePreferences
              }
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <Save size={13} />

              {saving
                ? t("Saving...")
                : t("Save Preferences")}
            </YellowButton>
          </div>
        </>
      )}
    </Card>
  );
}

/* =========================================================
   TEAM
========================================================= */

function TeamTab({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();
  const {
    definition: planDefinition,
    can: canUsePlan,
  } = usePlan();

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [invitations, setInvitations] =
    useState<TeamInvitation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [inviting, setInviting] =
    useState(false);

  const [updatingRole, setUpdatingRole] =
    useState<string | null>(null);

  const [removingMember, setRemovingMember] =
    useState<string | null>(null);

  const [cancellingInvitation, setCancellingInvitation] =
    useState<string | null>(null);

  const [copyingInvitation, setCopyingInvitation] =
    useState<string | null>(null);

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteName, setInviteName] =
    useState("");

  const [inviteRole, setInviteRole] =
    useState<TeamRole>("Member");

  const [companyId, setCompanyId] =
    useState<string | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [isWorkspaceOwner, setIsWorkspaceOwner] =
    useState(false);

  /* =======================================================
     LOAD TEAM
  ======================================================= */

  async function loadTeam() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      /*
       * FIRST:
       * Try to find a company owned by the current user.
       *
       * This keeps the existing owner architecture working.
       */
      const {
        data: ownedCompany,
        error: ownedCompanyError,
      } =
        await supabase
          .from("company_profiles")
          .select("id, company_name, user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (ownedCompanyError) {
        console.error(
          "Owned company lookup error:",
          ownedCompanyError
        );
      }

      let company =
        ownedCompany || null;

      let workspaceOwner =
        Boolean(company);

      /*
       * SECOND:
       * If the user does not own a company, find the
       * company through an ACTIVE team membership.
       */
      if (!company) {
        const {
          data: membership,
          error: membershipError,
        } =
          await supabase
            .from("team_members")
            .select(
              "id, company_id, email, name, role, status, user_id"
            )
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "status",
              "active"
            )
            .limit(1)
            .maybeSingle();

        if (membershipError) {
          console.error(
            "Team membership lookup error:",
            membershipError
          );

          onToast(
            `${t(
              "Could not load workspace membership:"
            )} ${membershipError.message}`
          );

          setLoading(false);
          return;
        }

        if (membership?.company_id) {
          const {
            data: memberCompany,
            error: memberCompanyError,
          } =
            await supabase
              .from("company_profiles")
              .select(
                "id, company_name, user_id"
              )
              .eq(
                "id",
                membership.company_id
              )
              .maybeSingle();

          if (memberCompanyError) {
            console.error(
              "Member company lookup error:",
              memberCompanyError
            );

            onToast(
              `${t(
                "Could not load workspace:"
              )} ${memberCompanyError.message}`
            );

            setLoading(false);
            return;
          }

          company =
            memberCompany || null;

          workspaceOwner =
            company?.user_id ===
            user.id;
        }
      }

      if (!company) {
        setCompanyId(null);
        setIsWorkspaceOwner(false);
        setMembers([]);
        setInvitations([]);
        setLoading(false);
        return;
      }

      setCompanyId(company.id);

      const owner =
        company.user_id === user.id ||
        workspaceOwner;

      setIsWorkspaceOwner(owner);

      /*
       * TEAM MEMBERS
       *
       * Owners need all members.
       * Invited users only need their own membership.
       *
       * This avoids relying on owner-only RLS permissions
       * for invited users.
       */
      let teamQuery =
        supabase
          .from("team_members")
          .select(
            "id, email, name, role, status, user_id"
          )
          .eq(
            "company_id",
            company.id
          )
          .order("created_at", {
            ascending: true,
          });

      if (!owner) {
        teamQuery =
          teamQuery.eq(
            "user_id",
            user.id
          );
      }

      /*
       * INVITATIONS
       *
       * Only the workspace owner loads all pending
       * invitations because invitation administration
       * belongs to the owner.
       */
      const teamResult =
        await teamQuery;

      let invitationData:
        | {
            id: string;
            email: string | null;
            role: string | null;
            status: string | null;
            expires_at: string | null;
            created_at: string | null;
            token: string;
          }[]
        | null = [];

      let invitationError:
        | {
            message: string;
          }
        | null = null;

      if (owner) {
        const invitationResult =
          await supabase
            .from("team_invitations")
            .select(
              "id, email, role, status, expires_at, created_at, token"
            )
            .eq(
              "company_id",
              company.id
            )
            .eq(
              "status",
              "pending"
            )
            .order("created_at", {
              ascending: false,
            });

        invitationData =
          invitationResult.data || [];

        invitationError =
          invitationResult.error;
      }

      if (teamResult.error) {
        console.error(
          "Team load error:",
          teamResult.error
        );

        onToast(
          `${t(
            "Could not load team:"
          )} ${teamResult.error.message}`
        );

        setLoading(false);
        return;
      }

      if (invitationError) {
        console.error(
          "Team invitations load error:",
          invitationError
        );

        onToast(
          `${t(
            "Could not load invitations:"
          )} ${invitationError.message}`
        );
      }

      const loadedMembers: TeamMember[] =
        (teamResult.data || []).map(
          (member) => ({
            id: member.id,
            email: member.email || "",
            name: member.name || "",
            role:
              member.role === "Admin" ||
              member.role === "Manager"
                ? member.role
                : "Member",
            status:
              member.status || "active",
            user_id:
              member.user_id || null,
          })
        );

      /*
       * Add the owner to the visual list if there is
       * not already a team_members row representing them.
       */
      if (owner) {
        const ownerExists =
          loadedMembers.some(
            (member) =>
              member.user_id ===
              user.id
          );

        if (!ownerExists) {
          loadedMembers.unshift({
            id: `owner-${user.id}`,
            email:
              user.email || "",
            name:
              user.user_metadata
                ?.full_name ||
              user.user_metadata
                ?.name ||
              t("Workspace Owner"),
            role: "Admin",
            status: "active",
            user_id: user.id,
          });
        }
      }

      const loadedInvitations: TeamInvitation[] =
        (invitationData || []).map(
          (invitation) => ({
            id: invitation.id,
            email:
              invitation.email || "",
            role:
              invitation.role === "Admin" ||
              invitation.role === "Manager"
                ? invitation.role
                : "Member",
            status:
              invitation.status ||
              "pending",
            expires_at:
              invitation.expires_at ||
              null,
            created_at:
              invitation.created_at ||
              new Date().toISOString(),
            token:
              invitation.token || "",
          })
        );

      setMembers(
        loadedMembers
      );

      setInvitations(
        loadedInvitations
      );
    } catch (error) {
      console.error(
        "Unexpected team load error:",
        error
      );

      onToast(
        t(
          "Could not load team information."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  /* =======================================================
     ROLE HELPERS
  ======================================================= */

  function getRoleDescription(
    role: TeamRole
  ) {
    if (role === "Admin") {
      return t(
        "Full workspace management and team administration."
      );
    }

    if (role === "Manager") {
      return t(
        "Can manage leads, pipeline, outreach and day-to-day operations."
      );
    }

    return t(
      "Standard access to workspace tools and assigned work."
    );
  }

  function getRoleBadgeClass(
    role: TeamRole
  ) {
    if (role === "Admin") {
      return "border-[#F5C518]/20 bg-[#F5C518]/10 text-[#F5C518]";
    }

    if (role === "Manager") {
      return "border-[#A78BFA]/20 bg-[#A78BFA]/10 text-[#A78BFA]";
    }

    return "border-white/10 bg-white/[0.04] text-gray-400";
  }

  function isOwnerMember(
    member: TeamMember
  ) {
    return (
      member.id.startsWith(
        "owner-"
      ) ||
      member.user_id ===
        currentUserId &&
        isWorkspaceOwner
    );
  }

  /* =======================================================
     INVITE MEMBER
  ======================================================= */

  async function inviteMember() {
    if (!companyId) {
      onToast(
        t(
          "Create your company profile before inviting team members."
        )
      );
      return;
    }

    if (!isWorkspaceOwner) {
      onToast(
        t(
          "Only the workspace owner can invite team members."
        )
      );
      return;
    }

    const email =
      inviteEmail.trim().toLowerCase();

    const name =
      inviteName.trim();

    if (!email) {
      onToast(
        t("Enter a team member email.")
      );
      return;
    }

    if (!email.includes("@")) {
      onToast(
        t("Enter a valid email address.")
      );
      return;
    }

    const existingMember =
      members.some(
        (member) =>
          member.email
            .trim()
            .toLowerCase() ===
          email
      );

    if (existingMember) {
      onToast(
        t(
          "This email is already part of the team."
        )
      );
      return;
    }

    const existingInvitation =
      invitations.some(
        (invitation) =>
          invitation.email
            .trim()
            .toLowerCase() ===
          email
      );

    if (existingInvitation) {
      onToast(
        t(
          "There is already a pending invitation for this email."
        )
      );
      return;
    }

    // Plan seat limit: owner + members + pending invitations.
    const seatLimit = planDefinition.teamLimit;
    const pendingInvites = invitations.filter(
      (invitation) => invitation.status === "pending"
    ).length;
    const activeMembers = members.filter(
      (member) => member.status !== "removed"
    ).length;
    const seatsUsed = Math.max(1, activeMembers) + pendingInvites;

    if (seatLimit !== null && seatsUsed >= seatLimit) {
      onToast(
        `${t("Your plan includes")} ${seatLimit} ${t(
          "team seats. Upgrade your plan to invite more people."
        )}`
      );
      return;
    }

    // Manager/Admin roles are a Scale feature (team permissions).
    if (
      inviteRole !== "Member" &&
      !canUsePlan("team_permissions")
    ) {
      onToast(
        t(
          "Custom roles and permissions are available on the Scale plan."
        )
      );
      return;
    }

    setInviting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        onToast(
          t("You must be logged in.")
        );
        return;
      }

      /*
       * Make sure the invitation is being created for
       * the workspace the current owner actually owns.
       */
      const {
        data: ownerCompany,
        error: ownerCompanyError,
      } =
        await supabase
          .from("company_profiles")
          .select("id")
          .eq(
            "id",
            companyId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        ownerCompanyError ||
        !ownerCompany
      ) {
        onToast(
          t(
            "Only the workspace owner can create invitations."
          )
        );
        return;
      }

      const token =
        `${crypto.randomUUID()}-${Date.now().toString(36)}`;

      const { data: invitationData, error: invitationError } =
        await supabase
          .from("team_invitations")
          .insert({
            company_id: companyId,
            invited_by: user.id,
            email,
            role: inviteRole,
            token,
            status: "pending",
          })
          .select(
            "id, email, role, status, expires_at, created_at, token"
          )
          .single();

      if (invitationError) {
        onToast(
          `${t(
            "Could not create invitation:"
          )} ${invitationError.message}`
        );
        return;
      }

      const {
        data: memberData,
        error: memberError,
      } =
        await supabase
          .from("team_members")
          .insert({
            company_id: companyId,
            email,
            name,
            role: inviteRole,
            status: "invited",
            user_id: null,
          })
          .select(
            "id, email, name, role, status, user_id"
          )
          .single();

      if (memberError) {
        console.error(
          "Team member insert error:",
          memberError
        );

        if (invitationData?.id) {
          await supabase
            .from("team_invitations")
            .delete()
            .eq(
              "id",
              invitationData.id
            );
        }

        onToast(
          `${t(
            "Invitation could not be completed:"
          )} ${memberError.message}`
        );

        return;
      }

      if (memberData) {
        setMembers(
          (current) => [
            ...current,
            {
              id: memberData.id,
              email:
                memberData.email ||
                email,
              name:
                memberData.name ||
                name,
              role:
                memberData.role ===
                  "Admin" ||
                memberData.role ===
                  "Manager"
                  ? memberData.role
                  : "Member",
              status:
                memberData.status ||
                "invited",
              user_id:
                memberData.user_id ||
                null,
            },
          ]
        );
      }

      if (invitationData) {
        setInvitations(
          (current) => [
            {
              id:
                invitationData.id,
              email:
                invitationData.email ||
                email,
              role:
                invitationData.role ===
                  "Admin" ||
                invitationData.role ===
                  "Manager"
                  ? invitationData.role
                  : "Member",
              status:
                invitationData.status ||
                "pending",
              expires_at:
                invitationData.expires_at ||
                null,
              created_at:
                invitationData.created_at ||
                new Date().toISOString(),
              token:
                invitationData.token ||
                token,
            },
            ...current,
          ]
        );
      }

      setInviteEmail("");
      setInviteName("");
      setInviteRole("Member");
      setInviteOpen(false);

      onToast(
        t(
          "Team invitation created successfully."
        )
      );
    } finally {
      setInviting(false);
    }
  }

  /* =======================================================
     COPY INVITATION LINK
  ======================================================= */

  async function copyInvitationLink(
    invitation: TeamInvitation
  ) {
    if (!isWorkspaceOwner) {
      onToast(
        t(
          "Only the workspace owner can copy invitation links."
        )
      );
      return;
    }

    if (!invitation.token) {
      onToast(
        t(
          "This invitation does not have a valid token."
        )
      );
      return;
    }

    setCopyingInvitation(
      invitation.id
    );

    try {
      const invitationUrl =
        `${window.location.origin}/accept-invitation?token=${encodeURIComponent(
          invitation.token
        )}`;

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          invitationUrl
        );
      } else {
        const textArea =
          document.createElement(
            "textarea"
          );

        textArea.value =
          invitationUrl;

        textArea.style.position =
          "fixed";
        textArea.style.left =
          "-9999px";

        document.body.appendChild(
          textArea
        );

        textArea.focus();
        textArea.select();

        document.execCommand(
          "copy"
        );

        document.body.removeChild(
          textArea
        );
      }

      onToast(
        t(
          "Invitation link copied."
        )
      );
    } catch (error) {
      console.error(
        "Copy invitation link error:",
        error
      );

      onToast(
        t(
          "Could not copy the invitation link."
        )
      );
    } finally {
      setCopyingInvitation(
        null
      );
    }
  }

  /* =======================================================
     CHANGE ROLE
  ======================================================= */

  async function changeMemberRole(
    member: TeamMember,
    nextRole: TeamRole
  ) {
    if (isOwnerMember(member)) {
      onToast(
        t(
          "The workspace owner always has Admin access."
        )
      );
      return;
    }

    if (!isWorkspaceOwner) {
      onToast(
        t(
          "Only the workspace owner can change team roles."
        )
      );
      return;
    }

    if (
      nextRole !== "Member" &&
      !canUsePlan("team_permissions")
    ) {
      onToast(
        t(
          "Custom roles and permissions are available on the Scale plan."
        )
      );
      return;
    }

    if (member.role === nextRole) {
      return;
    }

    setUpdatingRole(member.id);

    try {
      const { error } =
        await supabase
          .from("team_members")
          .update({
            role: nextRole,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            member.id
          );

      if (error) {
        console.error(
          "Team role update error:",
          error
        );

        onToast(
          `${t(
            "Could not update role:"
          )} ${error.message}`
        );

        return;
      }

      setMembers(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              member.id
                ? {
                    ...item,
                    role: nextRole,
                  }
                : item
          )
      );

      onToast(
        t("Team role updated.")
      );
    } finally {
      setUpdatingRole(null);
    }
  }

  /* =======================================================
     REMOVE MEMBER
  ======================================================= */

  async function removeMember(
    member: TeamMember
  ) {
    if (isOwnerMember(member)) {
      onToast(
        t(
          "The workspace owner cannot be removed."
        )
      );
      return;
    }

    if (!isWorkspaceOwner) {
      onToast(
        t(
          "Only the workspace owner can remove team members."
        )
      );
      return;
    }

    const confirmed =
      window.confirm(
        `${t("Remove")} ${
          member.name ||
          member.email
        } ${t(
          "from the team?"
        )}`
      );

    if (!confirmed) {
      return;
    }

    setRemovingMember(member.id);

    try {
      const { error } =
        await supabase
          .from("team_members")
          .delete()
          .eq(
            "id",
            member.id
          );

      if (error) {
        console.error(
          "Team member remove error:",
          error
        );

        onToast(
          `${t(
            "Could not remove team member:"
          )} ${error.message}`
        );

        return;
      }

      setMembers(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              member.id
          )
      );

      onToast(
        t("Team member removed.")
      );
    } finally {
      setRemovingMember(null);
    }
  }

  /* =======================================================
     CANCEL INVITATION
  ======================================================= */

  async function cancelInvitation(
    invitation: TeamInvitation
  ) {
    if (!isWorkspaceOwner) {
      onToast(
        t(
          "Only the workspace owner can cancel invitations."
        )
      );
      return;
    }

    const confirmed =
      window.confirm(
        `${t(
          "Cancel the invitation for"
        )} ${invitation.email}?`
      );

    if (!confirmed) {
      return;
    }

    setCancellingInvitation(
      invitation.id
    );

    try {
      const { error } =
        await supabase
          .from("team_invitations")
          .update({
            status: "cancelled",
          })
          .eq(
            "id",
            invitation.id
          );

      if (error) {
        console.error(
          "Invitation cancellation error:",
          error
        );

        onToast(
          `${t(
            "Could not cancel invitation:"
          )} ${error.message}`
        );

        return;
      }

      setInvitations(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              invitation.id
          )
      );

      const matchingMember =
        members.find(
          (member) =>
            member.email
              .trim()
              .toLowerCase() ===
            invitation.email
              .trim()
              .toLowerCase() &&
            member.status ===
              "invited"
        );

      if (matchingMember) {
        const { error: memberDeleteError } =
          await supabase
            .from("team_members")
            .delete()
            .eq(
              "id",
              matchingMember.id
            );

        if (!memberDeleteError) {
          setMembers(
            (current) =>
              current.filter(
                (member) =>
                  member.id !==
                  matchingMember.id
              )
          );
        }
      }

      onToast(
        t("Invitation cancelled.")
      );
    } finally {
      setCancellingInvitation(null);
    }
  }

  /* =======================================================
     RENDER TEAM
  ======================================================= */

  return (
    <>
      <div className="space-y-4">
        {/* =================================================
            TEAM HEADER
        ================================================= */}

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users
                  size={16}
                  className="text-[#60A5FA]"
                />

                <h2 className="text-sm font-medium">
                  {t("Team Members")}
                </h2>
              </div>

              <p className="mt-1 text-[14px] text-gray-600">
                {t(
                  "Manage access to your BaseLead workspace."
                )}
              </p>
            </div>

            <YellowButton
              onClick={() =>
                setInviteOpen(true)
              }
              disabled={!isWorkspaceOwner}
            >
              <UserPlus size={13} />
              {t("Invite Member")}
            </YellowButton>
          </div>

          {!isWorkspaceOwner &&
            !loading && (
              <div className="mt-5 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.03] p-4">
                <div className="flex gap-3">
                  <Shield
                    size={15}
                    className="mt-0.5 shrink-0 text-[#F5C518]"
                  />

                  <p className="text-[14px] leading-5 text-gray-600">
                    {t(
                      "Team administration is managed by the workspace owner."
                    )}
                  </p>
                </div>
              </div>
            )}

          {loading ? (
            <div className="py-12 text-center text-[14px] text-gray-600">
              {t("Loading team...")}
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
              {members.length === 0 ? (
                <div className="p-8 text-center text-[14px] text-gray-600">
                  {t("No team members yet.")}
                </div>
              ) : (
                members.map(
                  (member) => {
                    const initials =
                      member.name
                        ? member.name
                            .split(" ")
                            .map(
                              (part) =>
                                part.charAt(
                                  0
                                )
                            )
                            .join("")
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase()
                        : member.email
                            .charAt(0)
                            .toUpperCase();

                    const owner =
                      isOwnerMember(
                        member
                      );

                    const roleUpdating =
                      updatingRole ===
                      member.id;

                    const removing =
                      removingMember ===
                      member.id;

                    return (
                      <div
                        key={
                          member.id
                        }
                        className="flex flex-col gap-4 border-b border-white/[0.06] p-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-gray-300">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[14px] font-medium">
                                {member.name ||
                                  member.email}
                              </p>

                              {owner && (
                                <span className="rounded-full border border-[#F5C518]/20 bg-[#F5C518]/10 px-2 py-0.5 text-[14px] font-medium text-[#F5C518]">
                                  {t("Owner")}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-[14px] text-gray-600">
                              {
                                member.email
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[14px] font-medium ${getRoleBadgeClass(
                                  member.role
                                )}`}
                              >
                                {
                                  member.role
                                }
                              </span>

                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[7px] ${
                                  member.status ===
                                  "active"
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-yellow-500/10 text-yellow-400"
                                }`}
                              >
                                {member.status ===
                                "active"
                                  ? t(
                                      "Active"
                                    )
                                  : t(
                                      "Invitation pending"
                                    )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          {owner ? (
                            <span className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-[8px] text-gray-500 sm:flex-none">
                              {t(
                                "Workspace Owner"
                              )}
                            </span>
                          ) : (
                            <>
                              <div className="relative flex-1 sm:flex-none">
                                <select
                                  value={
                                    member.role
                                  }
                                  disabled={
                                    !isWorkspaceOwner ||
                                    roleUpdating ||
                                    removing
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    changeMemberRole(
                                      member,
                                      event
                                        .target
                                        .value as TeamRole
                                    )
                                  }
                                  className="h-9 w-full appearance-none rounded-lg border border-white/10 bg-[#070707] px-3 pr-8 text-[8px] text-gray-300 outline-none transition focus:border-[#F5C518]/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[110px]"
                                >
                                  <option
                                    value="Member"
                                    className="bg-[#090909]"
                                  >
                                    {t(
                                      "Member"
                                    )}
                                  </option>

                                  <option
                                    value="Manager"
                                    className="bg-[#090909]"
                                  >
                                    {t(
                                      "Manager"
                                    )}
                                  </option>

                                  <option
                                    value="Admin"
                                    className="bg-[#090909]"
                                  >
                                    {t(
                                      "Admin"
                                    )}
                                  </option>
                                </select>

                                <ChevronDown
                                  size={12}
                                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600"
                                />
                              </div>

                              <button
                                type="button"
                                disabled={
                                  !isWorkspaceOwner ||
                                  removing
                                }
                                onClick={() =>
                                  removeMember(
                                    member
                                  )
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={t(
                                  "Remove team member"
                                )}
                              >
                                {removing ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border border-white/10 border-t-red-400" />
                                ) : (
                                  <Trash2
                                    size={13}
                                  />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          )}
        </Card>

        {/* =================================================
            ROLE PERMISSIONS
        ================================================= */}

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Shield
              size={16}
              className="text-green-400"
            />

            <h2 className="text-sm font-medium">
              {t("Team Roles")}
            </h2>
          </div>

          <p className="mt-1 text-[14px] text-gray-600">
            {t(
              "Roles control how much access each team member has inside the workspace."
            )}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(
              [
                "Admin",
                "Manager",
                "Member",
              ] as TeamRole[]
            ).map((role) => (
              <div
                key={role}
                className="rounded-lg border border-white/10 bg-white/[0.015] p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[7px] font-medium ${getRoleBadgeClass(
                      role
                    )}`}
                  >
                    {role}
                  </span>
                </div>

                <p className="mt-3 text-[8px] leading-5 text-gray-600">
                  {getRoleDescription(
                    role
                  )}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* =================================================
            PENDING INVITATIONS
        ================================================= */}

        {isWorkspaceOwner && (
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Mail
                size={16}
                className="text-[#F5C518]"
              />

              <h2 className="text-sm font-medium">
                {t("Pending Invitations")}
              </h2>
            </div>

            <p className="mt-1 text-[14px] text-gray-600">
              {t(
                "Invitations created for people who have not joined the workspace yet."
              )}
            </p>

            {invitations.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-white/10 p-6 text-center">
                <Mail
                  size={20}
                  className="mx-auto text-gray-700"
                />

                <p className="mt-3 text-[14px] text-gray-600">
                  {t(
                    "No pending invitations."
                  )}
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
                {invitations.map(
                  (invitation) => {
                    const createdDate =
                      new Date(
                        invitation.created_at
                      );

                    const createdLabel =
                      Number.isNaN(
                        createdDate.getTime()
                      )
                        ? ""
                        : createdDate.toLocaleDateString();

                    const cancelling =
                      cancellingInvitation ===
                      invitation.id;

                    const copying =
                      copyingInvitation ===
                      invitation.id;

                    return (
                      <div
                        key={
                          invitation.id
                        }
                        className="flex flex-col gap-3 border-b border-white/[0.06] p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[14px] font-medium text-gray-300">
                              {
                                invitation.email
                              }
                            </p>

                            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[7px] font-medium text-yellow-400">
                              {t(
                                "Pending"
                              )}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[7px] font-medium ${getRoleBadgeClass(
                                invitation.role
                              )}`}
                            >
                              {
                                invitation.role
                              }
                            </span>

                            {createdLabel && (
                              <span className="text-[8px] text-gray-700">
                                {t("Created")}{" "}
                                {
                                  createdLabel
                                }
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={
                              copying ||
                              !invitation.token
                            }
                            onClick={() =>
                              copyInvitationLink(
                                invitation
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-lg border border-[#F5C518]/20 bg-[#F5C518]/[0.04] px-3 py-2 text-[8px] text-[#F5C518] transition hover:bg-[#F5C518]/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {copying ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-white/10 border-t-[#F5C518]" />
                            ) : (
                              <Copy
                                size={12}
                              />
                            )}

                            {copying
                              ? t(
                                  "Copying..."
                                )
                              : t(
                                  "Copy Link"
                                )}
                          </button>

                          <button
                            type="button"
                            disabled={
                              cancelling
                            }
                            onClick={() =>
                              cancelInvitation(
                                invitation
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[8px] text-gray-500 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {cancelling ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-white/10 border-t-red-400" />
                            ) : (
                              <X size={12} />
                            )}

                            {t(
                              "Cancel Invitation"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="mt-5 rounded-lg border border-[#60A5FA]/15 bg-[#60A5FA]/[0.03] p-4">
              <div className="flex gap-3">
                <Mail
                  size={15}
                  className="mt-0.5 shrink-0 text-[#60A5FA]"
                />

                <p className="text-[14px] leading-5 text-gray-600">
                  {t(
                    "Copy the invitation link and send it directly to the team member. When they open it, BaseLead will verify the invitation and connect their account to this workspace."
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* =================================================
          INVITE MODAL
      ================================================= */}

      <Modal
        open={inviteOpen}
        title={t("Invite Team Member")}
        onClose={() => {
          if (!inviting) {
            setInviteOpen(false);
          }
        }}
      >
        <div className="space-y-4">
          <Field
            label={t("Name")}
            value={inviteName}
            onChange={setInviteName}
            placeholder={t(
              "Team member name"
            )}
          />

          <Field
            label={t("Email")}
            value={inviteEmail}
            onChange={setInviteEmail}
            type="email"
            placeholder="name@company.com"
          />

          <SelectField
            label={t("Role")}
            value={inviteRole}
            onChange={(value) =>
              setInviteRole(
                value as TeamRole
              )
            }
            options={[
              "Member",
              "Manager",
              "Admin",
            ]}
          />

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <Shield
                size={15}
                className="mt-0.5 shrink-0 text-[#F5C518]"
              />

              <div>
                <p className="text-[14px] font-medium text-gray-300">
                  {inviteRole}
                </p>

                <p className="mt-1 text-[14px] leading-5 text-gray-600">
                  {getRoleDescription(
                    inviteRole
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-[#F5C518]/15 bg-[#F5C518]/[0.03] p-4">
          <p className="text-[14px] leading-5 text-gray-500">
            {t(
              "After creating the invitation, you can copy the secure invitation link and send it to the team member."
            )}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <OutlineButton
            disabled={inviting}
            onClick={() =>
              setInviteOpen(false)
            }
          >
            {t("Cancel")}
          </OutlineButton>

          <YellowButton
            disabled={inviting}
            onClick={inviteMember}
          >
            <UserPlus size={13} />
            {inviting
              ? t("Creating...")
              : t("Create Invitation")}
          </YellowButton>
        </div>
      </Modal>
    </>
  );
}

/* =========================================================
   BILLING
========================================================= */

function BillingPlan({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();
  const {
  plan: currentPlan,
  companyId,
  loading: planLoading,
  refreshPlan,
  isTrial,
  trialExpired,
  trialEndsAt,
  trialLeadsRemaining,
  trialLeadLimit,
} = usePlan();

  const [cycle, setCycle] =
    useState<BillingCycle>("monthly");

  const [savingPlan, setSavingPlan] =
    useState(false);

  const [leadUsage, setLeadUsage] =
    useState(0);

  const [teamUsage, setTeamUsage] =
    useState(1);

  const [usageLoading, setUsageLoading] =
    useState(true);

  useEffect(() => {
    async function loadUsage() {
      setUsageLoading(true);

      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setUsageLoading(false);
          return;
        }

        /*
         * Lead usage = leads created during the
         * current calendar month for this workspace.
         * Try company_id first, then user_id so this
         * remains compatible with either lead ownership
         * pattern already used by the app.
         */
        const monthStart =
          new Date();

        monthStart.setDate(1);
        monthStart.setHours(
          0,
          0,
          0,
          0
        );

        let leadCount = 0;

        if (companyId) {
          const {
            count: companyLeadCount,
            error: companyLeadError,
          } =
            await supabase
              .from("leads")
              .select(
                "id",
                {
                  count: "exact",
                  head: true,
                }
              )
              .eq(
                "company_id",
                companyId
              )
              .gte(
                "created_at",
                monthStart.toISOString()
              );

          if (
            !companyLeadError
          ) {
            leadCount =
              companyLeadCount || 0;
          } else {
            const {
              count: userLeadCount,
            } =
              await supabase
                .from("leads")
                .select(
                  "id",
                  {
                    count: "exact",
                    head: true,
                  }
                )
                .eq(
                  "user_id",
                  user.id
                )
                .gte(
                  "created_at",
                  monthStart.toISOString()
                );

            leadCount =
              userLeadCount || 0;
          }
        } else {
          const {
            count: userLeadCount,
          } =
            await supabase
              .from("leads")
              .select(
                "id",
                {
                  count: "exact",
                  head: true,
                }
              )
              .eq(
                "user_id",
                user.id
              )
              .gte(
                "created_at",
                monthStart.toISOString()
              );

          leadCount =
            userLeadCount || 0;
        }

        /*
         * Team usage counts active workspace seats.
         * The owner is included when they are not already
         * represented in team_members.
         */
        let memberCount = 1;

        if (companyId) {
          const {
            data: teamMembers,
            error: teamError,
          } =
            await supabase
              .from("team_members")
              .select(
                "id, user_id, status"
              )
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "status",
                "active"
              );

          if (!teamError) {
            const rows =
              teamMembers || [];

            const ownerAlreadyListed =
              rows.some(
                (member) =>
                  member.user_id ===
                  user.id
              );

            memberCount =
              rows.length +
              (ownerAlreadyListed
                ? 0
                : 1);
          }
        }

        setLeadUsage(leadCount);
        setTeamUsage(memberCount);
      } catch (error) {
        console.error(
          "Billing usage load error:",
          error
        );
      } finally {
        setUsageLoading(false);
      }
    }

    loadUsage();
  }, [companyId]);

  // Show the result when Stripe sends the customer back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");

    if (!checkout) return;

    if (checkout === "success") {
      onToast(t("Payment confirmed. Your new plan is active."));
      void refreshPlan();
    } else if (checkout === "cancelled") {
      onToast(t("Checkout cancelled. No changes were made."));
    } else if (checkout === "error") {
      onToast(t("We couldn't confirm the payment. Please contact support."));
    }

    params.delete("checkout");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function goToStripe(endpoint: string, body?: unknown) {
    setSavingPlan(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.url) {
        onToast(
          t(result.error || "Your plan could not be updated. Please try again.")
        );
        return;
      }

      window.location.assign(result.url);
    } catch (error) {
      console.error("Billing error:", error);
      onToast(t("Your plan could not be updated. Please try again."));
    } finally {
      setSavingPlan(false);
    }
  }

  // Opens Stripe Checkout for the selected plan and billing cycle.
  // ---- Discount codes ----
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promo, setPromo] = useState<{
    code: string;
    type: "free" | "stripe";
    label: string;
  } | null>(null);

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;

    setPromoChecking(true);
    setPromoError("");

    try {
      const response = await fetch("/api/billing/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.valid) {
        setPromo(null);
        setPromoError(result.error || t("This discount code is not valid."));
        return;
      }

      setPromo({ code: result.code, type: result.type, label: result.label });
    } finally {
      setPromoChecking(false);
    }
  }

  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  // Free-plan code: activates the chosen plan without payment.
  async function activateFreePlan(name: string) {
    if (!promo) return;

    setSavingPlan(true);

    try {
      const response = await fetch("/api/billing/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promo.code,
          plan: name,
          cycle,
          apply: true,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        onToast(result.error || t("The code could not be applied."));
        return;
      }

      await refreshPlan();
      removePromo();
      onToast(`${name} ${t("plan activated for free with your code.")}`);
    } finally {
      setSavingPlan(false);
    }
  }

  async function choosePlan(name: string) {
    if (!companyId) {
      onToast(
        t("Your workspace could not be found. Please refresh and try again.")
      );
      return;
    }

    if (promo?.type === "free") {
      await activateFreePlan(name);
      return;
    }

    await goToStripe("/api/billing/checkout", {
      plan: name,
      cycle,
      promoCode: promo?.type === "stripe" ? promo.code : undefined,
    });
  }

  // Development only: switch plans without paying to test each level.
  async function switchTestPlan(name: string | "trial") {
    setSavingPlan(true);

    try {
      const response = await fetch("/api/billing/test-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          name === "trial" ? { trial: true } : { plan: name }
        ),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        onToast(result.error || "Test plan could not be applied.");
        return;
      }

      await refreshPlan();
      onToast(`Test mode: ${name === "trial" ? "Free trial" : name} applied.`);
    } finally {
      setSavingPlan(false);
    }
  }

  /*
   * The PlanProvider is the source of truth for which plan is active.
   * PLANS remains the Settings page's display/pricing catalog, so the
   * existing Billing UI can continue to use its lead/team display values
   * without assuming those fields exist on PlanDefinition yet.
   */
  const activePlan =
  PLANS.find(
    (plan) => plan.name === currentPlan
  ) ?? PLANS[1];

const leadLimit =
  Number(
    String(activePlan.leads).replace(
      /,/g,
      ""
    )
  ) || 0;

const displayedLeadLimit = isTrial
  ? trialLeadLimit
  : leadLimit;

const displayedLeadUsage = isTrial
  ? trialLeadLimit - trialLeadsRemaining
  : leadUsage;

const teamLimit = getTeamLimit(currentPlan);

const leadPercent =
  displayedLeadLimit > 0
    ? Math.min(
        100,
        (displayedLeadUsage /
          displayedLeadLimit) *
          100
      )
    : 0;

const teamPercent =
  teamLimit === null
    ? 0
    : Math.min(
        100,
        (teamUsage /
          teamLimit) *
          100
      );

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#A78BFA]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-[#F5C518]/[0.06] blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241A38] text-[#A78BFA]">
              <Crown size={15} />
            </div>

            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
                {t("Current subscription")}
              </span>

              <div className="mt-0.5 flex items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {planLoading
                    ? t("Loading...")
                    : `${currentPlan} ${t("Plan")}`}
                </h2>

                <span
  className={`rounded-full px-2 py-1 text-[9px] font-semibold tracking-wide ${
    isTrial
      ? "border border-violet-400/25 bg-violet-400/10 text-violet-300"
      : "border border-[#84CC16]/20 bg-[#18200B] text-[#84CC16]"
  }`}
>
  {isTrial ? "FREE TRIAL" : t("ACTIVE")}
</span>
              </div>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-[14px] leading-5 text-gray-600">
            {t(
              "Your BaseLead plan controls the monthly lead capacity and team seats available to your workspace."
            )}
          </p>
{isTrial && (
  <div className="mt-5 rounded-2xl border border-violet-400/25 bg-violet-400/[0.08] p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
        <Sparkles size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          {trialExpired
            ? "Your free trial has ended"
            : "You are currently using your free trial"}
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-400">
          {trialExpired
            ? "Choose a subscription plan to continue using BaseLead."
            : `You have ${trialLeadsRemaining.toLocaleString()} of ${trialLeadLimit.toLocaleString()} trial leads remaining.`}
        </p>

        {!trialExpired && trialEndsAt && (
          <p className="mt-2 text-xs text-violet-300">
            Trial ends on{" "}
            {new Date(trialEndsAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  </div>
)}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!isTrial && (
              <button
                type="button"
                disabled={savingPlan}
                onClick={() => void goToStripe("/api/billing/portal")}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#101010] px-4 py-2.5 text-[13px] font-medium text-gray-200 transition hover:border-white/20 hover:bg-[#171717] disabled:opacity-60"
              >
                <CreditCard size={14} />
                {t("Manage billing, invoices & cancellation")}
              </button>
            )}

            {process.env.NODE_ENV !== "production" && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-amber-400/30 bg-amber-400/[0.05] px-3 py-2 text-[11px] text-amber-200">
                <span className="mr-1 font-semibold">Test mode (no charge):</span>
                {(["trial", "Starter", "Pro", "Scale"] as const).map((name) => (
                  <button
                    key={name}
                    type="button"
                    disabled={savingPlan}
                    onClick={() => void switchTestPlan(name)}
                    className="rounded-md border border-amber-400/30 px-2 py-1 font-medium hover:bg-amber-400/10 disabled:opacity-50"
                  >
                    {name === "trial" ? "Trial" : name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#101010] p-4 transition hover:border-[#2A2A2A] hover:bg-[#171717]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[13px] text-gray-500">
                    {t("Lead limit")}
                  </span>

                  <p className="mt-1 text-[14px] text-gray-300">
                    {usageLoading
                      ? t("Loading...")
                      : `${displayedLeadUsage.toLocaleString()} / ${displayedLeadLimit.toLocaleString()} ${
  isTrial ? "during trial" : t("this month")
}`}
                  </p>
                </div>

                <span className="text-[14px] font-semibold text-[#60A5FA]">
                  {displayedLeadLimit.toLocaleString()}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#191919]">
                <div
                  className="h-full rounded-full bg-[#60A5FA] transition-all duration-500"
                  style={{
                    width: `${leadPercent}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#101010] p-4 transition hover:border-[#2A2A2A] hover:bg-[#171717]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[13px] text-gray-500">
                    {t("Team limit")}
                  </span>

                  <p className="mt-1 text-[14px] text-gray-300">
                    {usageLoading
                      ? t("Loading...")
                      : teamLimit === null
                      ? `${teamUsage} ${t("active members")} · ${t("Unlimited")} ${t("seats")}`
                      : `${teamUsage} / ${activePlan.team} ${t("active members")}`}
                  </p>
                </div>

                <span className="text-[14px] font-semibold text-[#A78BFA]">
                  {activePlan.team}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#191919]">
                <div
                  className="h-full rounded-full bg-[#A78BFA] transition-all duration-500"
                  style={{
                    width: `${
                      teamLimit === null
                        ? 12
                        : teamPercent
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="relative overflow-hidden rounded-2xl border border-[#F5C518]/20 bg-gradient-to-r from-[#332A0C] via-[#0D0D0D] to-[#241A38] p-5 sm:p-6 shadow-[0_14px_38px_rgba(0,0,0,0.22)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#F5C518]/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles
                size={15}
                className="text-[#F5C518]"
              />

              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5C518]">
                {t("BaseLead")}
              </span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("Turn more opportunities into revenue.")}
            </h2>

            <p className="mt-2 max-w-xl text-[14px] leading-5 text-gray-500">
              {t(
                "Choose the level of AI-powered client acquisition that fits the way your business sells."
              )}
            </p>
          </div>

          <div className="flex w-fit items-center rounded-xl border border-white/10 bg-[#0D0D0D] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <button
              type="button"
              onClick={() =>
                setCycle("monthly")
              }
              className={`rounded-lg px-4 py-2.5 text-[12px] font-medium transition ${
                cycle === "monthly"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-300"
              }`}
            >
              {t("Monthly")}
            </button>

            <button
              type="button"
              onClick={() =>
                setCycle("yearly")
              }
              className={`rounded-lg px-4 py-2.5 text-[12px] font-semibold transition ${
                cycle === "yearly"
                  ? "bg-[#F5C518] text-black shadow-[0_6px_18px_rgba(245,197,24,0.18)]"
                  : "text-gray-600 hover:text-gray-300"
              }`}
            >
              {t("Yearly")}
            </button>

            <span className="ml-1 rounded-full border border-[#84CC16]/20 bg-[#18200B] px-2 py-1 text-[9px] font-semibold text-[#84CC16]">
              {t("Save 15%")}
            </span>
          </div>
        </div>
      </div>

      {/* DISCOUNT CODE */}
      <div className="relative overflow-hidden rounded-2xl border border-[#60A5FA]/25 bg-[#0B1524] p-5 shadow-[0_10px_30px_rgba(59,130,246,0.08)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#60A5FA]/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#60A5FA]/15 text-[#60A5FA]">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t("Have a discount code?")}
              </p>
              <p className="mt-0.5 text-xs text-[#93B4DA]">
                {promo
                  ? `${promo.code} · ${t(promo.label)}`
                  : t("Apply it before choosing your plan.")}
              </p>
            </div>
          </div>

          {promo ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#60A5FA]/40 bg-[#60A5FA]/15 px-3 py-1.5 text-xs font-semibold text-[#93C5FD]">
                <Check size={13} />
                {t("Code applied")}
              </span>
              <button
                type="button"
                onClick={removePromo}
                className="rounded-lg px-2 py-1.5 text-xs text-[#93B4DA] transition hover:text-white"
              >
                {t("Remove")}
              </button>
            </div>
          ) : (
            <div className="flex w-full gap-2 lg:w-auto">
              <input
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value.toUpperCase());
                  setPromoError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void applyPromo();
                }}
                placeholder={t("Enter code")}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#60A5FA]/25 bg-[#07101C] px-4 text-sm uppercase tracking-wider text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-[#4F6B8E] focus:border-[#60A5FA]/60 lg:w-56"
              />
              <button
                type="button"
                disabled={promoChecking || !promoInput.trim()}
                onClick={() => void applyPromo()}
                className="h-11 shrink-0 rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.25)] transition hover:-translate-y-0.5 hover:bg-[#4F8FF7] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {promoChecking ? t("Checking...") : t("Apply")}
              </button>
            </div>
          )}
        </div>

        {promoError && (
          <p className="relative mt-3 text-xs text-[#F0475C]">{promoError}</p>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const price =
            cycle === "monthly"
              ? plan.monthly
              : plan.yearly;

          const monthlyEquivalent =
            plan.yearly / 12;

          const annualSavings =
            plan.monthly * 12 - plan.yearly;

          const isCurrent =
            !isTrial &&
            !trialExpired &&
            currentPlan === plan.name;

          const planAccent =
            plan.name === "Starter"
              ? {
                  surface: "bg-[#10243A]",
                  text: "text-[#60A5FA]",
                  border: "border-[#60A5FA]/25",
                  glow: "bg-[#60A5FA]/[0.06]",
                }
              : plan.name === "Pro"
              ? {
                  surface: "bg-[#332A0C]",
                  text: "text-[#F5C518]",
                  border: "border-[#F5C518]/40",
                  glow: "bg-[#F5C518]/[0.08]",
                }
              : {
                  surface: "bg-[#241A38]",
                  text: "text-[#A78BFA]",
                  border: "border-[#A78BFA]/25",
                  glow: "bg-[#A78BFA]/[0.06]",
                };

          return (
            <Card
              key={plan.name}
              className={`relative flex flex-col overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.32)] ${
                plan.popular
                  ? "border-[#F5C518]/60 shadow-[0_12px_34px_rgba(245,197,24,0.08)]"
                  : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${planAccent.glow}`}
              />

              {plan.popular && (
                <div className="absolute right-4 top-4 rounded-full bg-[#F5C518] px-3 py-1.5 text-[8px] font-bold tracking-[0.08em] text-black shadow-[0_6px_18px_rgba(245,197,24,0.16)]">
                  {t("MOST POPULAR")}
                </div>
              )}

              <div className="relative">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${planAccent.surface} ${planAccent.text}`}
                  >
                    {plan.name === "Starter" ? (
                      <Zap size={15} />
                    ) : plan.name === "Pro" ? (
                      <Sparkles size={15} />
                    ) : (
                      <Crown size={15} />
                    )}
                  </div>

                  <h3 className="text-base font-semibold">
                    {plan.name}
                  </h3>
                </div>

                <p className="mt-3 min-h-[40px] text-[14px] leading-5 text-gray-600">
                  {t(plan.description)}
                </p>

                {cycle === "monthly" ? (
                  <div className="mt-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-semibold tracking-tight">
                        ${plan.monthly}
                      </span>

                      <span className="mb-1 text-[14px] text-gray-600">
                        /{t("month")}
                      </span>
                    </div>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#84CC16]/30 bg-[#18200B] px-3 py-1.5 shadow-[0_6px_18px_rgba(132,204,22,0.08)]">
                      <Check
                        size={12}
                        className="text-[#84CC16]"
                      />
                      <span className="text-[12px] font-semibold tracking-tight text-[#84CC16]">
                        {t("Save 15% with annual billing")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-semibold tracking-tight">
                        ${price.toFixed(2)}
                      </span>

                      <span className="mb-1 text-[14px] text-gray-600">
                        /{t("year")}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#84CC16]">
                        ${monthlyEquivalent.toFixed(2)}{" "}
                        {t("per month effective")}
                      </span>

                      <span className="rounded-full border border-[#84CC16]/25 bg-[#18200B] px-2 py-1 text-[9px] font-semibold text-[#84CC16]">
                        {t("SAVE 15%")}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] font-semibold text-[#84CC16]">
                      {t("You save")} ${annualSavings.toFixed(2)}{" "}
                      {t("per year")}
                    </p>
                  </div>
                )}

                <div className="my-5 h-px bg-[#202020]" />

                <div className="flex-1 space-y-3">
                  {plan.features.map(
                    (feature) => (
                      <div
                        key={feature}
                        className="flex gap-2"
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${planAccent.surface}`}
                        >
                          <Check
                            size={10}
                            className={planAccent.text}
                          />
                        </div>

                        <span className="text-[14px] leading-5 text-gray-400">
                          {t(feature)}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">
                      {t("Leads")}
                    </div>

                    <div className="mt-1 text-[13px] font-medium text-gray-300">
                      {plan.leads}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-[#101010] px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">
                      {t("Team")}
                    </div>

                    <div className="mt-1 text-[13px] font-medium text-gray-300">
                      {plan.team}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    isCurrent ||
                    savingPlan ||
                    planLoading
                  }
                  onClick={() => {
                    void choosePlan(
                      plan.name
                    );
                  }}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-semibold transition-all duration-200 ${
                    isCurrent
                      ? "cursor-default border border-white/10 bg-white/[0.03] text-gray-500"
                      : promo?.type === "free"
                      ? "bg-[#3B82F6] text-white shadow-[0_6px_18px_rgba(59,130,246,0.25)] hover:-translate-y-0.5 hover:bg-[#4F8FF7]"
                      : plan.popular
                      ? "bg-[#F5C518] text-black shadow-[0_6px_18px_rgba(245,197,24,0.12)] hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(245,197,24,0.2)]"
                      : "border border-white/10 bg-[#101010] text-gray-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#171717]"
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check size={13} />
                      {t("Current Plan")}
                    </>
                  ) : savingPlan ? (
                    <>
                      <Save size={13} />
                      {t("Saving...")}
                    </>
                  ) : (
                    promo?.type === "free" ? (
                      <>
                        <Sparkles size={13} />
                        {t("Activate")} {plan.name} {t("free")}
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} />
                        {t("Choose")}{" "}
                        {plan.name}
                      </>
                    )
                  )}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationsTab({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();

  const [settings, setSettings] =
    useState<NotificationSettings>(
      DEFAULT_NOTIFICATIONS
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } =
        await supabase
          .from("user_settings")
          .select(
            "email_notifications, new_lead_alerts, outreach_replies, meeting_reminders, weekly_report"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (error) {
        console.error(
          "Notifications load error:",
          error
        );

        onToast(
          `${t(
            "Could not load notifications:"
          )} ${error.message}`
        );

        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          email_notifications:
            data.email_notifications ??
            true,

          new_lead_alerts:
            data.new_lead_alerts ??
            true,

          outreach_replies:
            data.outreach_replies ??
            true,

          meeting_reminders:
            data.meeting_reminders ??
            true,

          weekly_report:
            data.weekly_report ??
            false,
        });
      }

      setLoading(false);
    }

    loadNotifications();
  }, [onToast, t]);

  const [testing, setTesting] =
    useState(false);

  async function sendTestNotification() {
    setTesting(true);

    try {
      const response = await fetch(
        "/api/notifications/test",
        { method: "POST" }
      );
      const json = await response.json().catch(() => ({}));

      onToast(
        response.ok
          ? `${t("Test email sent to")} ${json.to}`
          : json.error || t("Could not send the test email.")
      );
    } finally {
      setTesting(false);
    }
  }

  async function saveNotifications() {
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        onToast(t("You must be logged in."));
        return;
      }

      const { error } =
        await supabase
          .from("user_settings")
          .upsert(
            {
              user_id: user.id,
              ...settings,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );

      if (error) {
        onToast(
          `${t(
            "Could not save notifications:"
          )} ${error.message}`
        );
        return;
      }

      onToast(
        t(
          "Notification settings saved."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-medium">
        {t("Notifications")}
      </h2>

      <p className="mt-1 text-[14px] text-gray-600">
        {t(
          "Choose which BaseLead notifications you receive."
        )}
      </p>

      {loading ? (
        <div className="py-12 text-center text-[14px] text-gray-600">
          {t("Loading notifications...")}
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-5">
            <PreferenceRow
              title={t(
                "Email notifications"
              )}
              description={t(
                "Receive important account notifications by email."
              )}
            >
              <Toggle
                enabled={
                  settings.email_notifications
                }
                onChange={(value) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      email_notifications:
                        value,
                    })
                  )
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t("New lead alerts")}
              description={t(
                "Notify me when high-opportunity leads are discovered."
              )}
            >
              <Toggle
                enabled={
                  settings.new_lead_alerts
                }
                onChange={(value) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      new_lead_alerts:
                        value,
                    })
                  )
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t("Outreach replies")}
              description={t(
                "Notify me when a lead responds to outreach."
              )}
            >
              <Toggle
                enabled={
                  settings.outreach_replies
                }
                onChange={(value) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      outreach_replies:
                        value,
                    })
                  )
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t("Meeting reminders")}
              description={t(
                "Receive reminders before scheduled meetings."
              )}
            >
              <Toggle
                enabled={
                  settings.meeting_reminders
                }
                onChange={(value) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      meeting_reminders:
                        value,
                    })
                  )
                }
              />
            </PreferenceRow>

            <PreferenceRow
              title={t("Weekly report")}
              description={t(
                "Receive a weekly performance summary."
              )}
            >
              <Toggle
                enabled={
                  settings.weekly_report
                }
                onChange={(value) =>
                  setSettings(
                    (current) => ({
                      ...current,
                      weekly_report:
                        value,
                    }))
                  }
                
              />
            </PreferenceRow>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <YellowButton
              onClick={saveNotifications}
              disabled={saving}
            >
              <Save size={13} />
              {saving
                ? t("Saving...")
                : t(
                    "Save Notifications"
                  )}
            </YellowButton>

            <button
              type="button"
              onClick={sendTestNotification}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-2.5 text-xs font-semibold text-gray-200 transition hover:border-[#a3e635]/60 hover:text-white disabled:opacity-50"
            >
              <Mail size={13} />
              {testing
                ? t("Sending...")
                : t("Send test email")}
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            {t(
              "Notifications are sent to your login email through your connected Gmail. Meeting reminders arrive 1 hour before; the weekly report every Monday."
            )}
          </p>
        </>
      )}
    </Card>
  );
}

/* =========================================================
   SECURITY
========================================================= */

function SecurityTab({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();

  const [passwordOpen, setPasswordOpen] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function changePassword() {
    if (password.length < 8) {
      onToast(
        t(
          "Password must be at least 8 characters."
        )
      );
      return;
    }

    if (password !== confirmPassword) {
      onToast(
        t("Passwords do not match.")
      );
      return;
    }

    setSaving(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        onToast(error.message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);

      onToast(
        t("Password changed successfully.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <Shield
              size={18}
              className="text-green-400"
            />
          </div>

          <div>
            <h2 className="text-sm font-medium">
              {t("Account Security")}
            </h2>

            <p className="mt-1 text-[14px] text-gray-600">
              {t(
                "Manage authentication and account protection."
              )}
            </p>
          </div>
        </div>

        <TwoFactorCard onToast={onToast} />

        <div className="mt-5">
          <OutlineButton
            onClick={() =>
              setPasswordOpen(true)
            }
          >
            <KeyRound size={13} />
            {t("Change Password")}
          </OutlineButton>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-medium">
          {t("Active Session")}
        </h2>

        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Lock
              size={15}
              className="text-green-400"
            />

            <div>
              <p className="text-[14px] text-gray-300">
                {t("Current session")}
              </p>

              <p className="mt-1 text-[14px] text-gray-600">
                {t(
                  "Your current authenticated session"
                )}
              </p>
            </div>
          </div>

          <span className="text-[14px] text-green-400">
            {t("Active")}
          </span>
        </div>
      </Card>

      <Modal
        open={passwordOpen}
        title={t("Change Password")}
        onClose={() =>
          setPasswordOpen(false)
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[14px] text-gray-500">
              {t("New Password")}
            </span>

            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 pr-10 text-xs text-white outline-none focus:border-[#F5C518]/60"
                placeholder={t(
                  "Enter new password"
                )}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[14px] text-gray-500">
              {t("Confirm Password")}
            </span>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                confirmPassword
              }
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-xs text-white outline-none focus:border-[#F5C518]/60"
              placeholder={t(
                "Confirm new password"
              )}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <OutlineButton
            onClick={() =>
              setPasswordOpen(false)
            }
          >
            {t("Cancel")}
          </OutlineButton>

          <YellowButton
            onClick={changePassword}
            disabled={saving}
          >
            {saving
              ? t("Saving...")
              : t("Save Password")}
          </YellowButton>
        </div>
      </Modal>
    </div>
  );
}

/* =========================================================
   API & WEBHOOKS
========================================================= */

function ApiTab({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { t } = useLanguage();
  const { can } = usePlan();

  const [apiEnabled, setApiEnabled] =
    useState(false);

  const [webhooks, setWebhooks] =
    useState<Webhook[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [webhookOpen, setWebhookOpen] =
    useState(false);

  const [webhookUrl, setWebhookUrl] =
    useState("");

  const [webhookEvent, setWebhookEvent] =
    useState("lead.created");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    async function loadApiSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [
        settingsResult,
        webhooksResult,
      ] = await Promise.all([
        supabase
          .from("user_settings")
          .select("api_enabled")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("webhooks")
          .select(
            "id, event, url, active"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (settingsResult.error) {
        console.error(
          "API settings load error:",
          settingsResult.error
        );
      }

      if (webhooksResult.error) {
        console.error(
          "Webhooks load error:",
          webhooksResult.error
        );

        onToast(
          `${t(
            "Could not load webhooks:"
          )} ${webhooksResult.error.message}`
        );
      }

      if (settingsResult.data) {
        setApiEnabled(
          settingsResult.data
            .api_enabled ?? false
        );
      }

      setWebhooks(
        webhooksResult.data || []
      );

      setLoading(false);
    }

    loadApiSettings();
  }, [onToast, t]);

  async function toggleApi(
    value: boolean
  ) {
    if (value && !can("api_access")) {
      onToast(t("API access is available on the Scale plan."));
      return;
    }

    setApiEnabled(value);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } =
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            api_enabled: value,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

    if (error) {
      setApiEnabled(!value);

      onToast(
        `${t(
          "Could not update API access:"
        )} ${error.message}`
      );

      return;
    }

    onToast(
      value
        ? t("API access enabled.")
        : t("API access disabled.")
    );
  }

  async function addWebhook() {
      if (!can("integrations_webhooks")) {
    onToast(
      "Webhooks are available on the Pro and Scale plans. Upgrade to unlock them."
    );

    return;
  }
    const url =
      webhookUrl.trim();

    if (!url) {
      onToast(
        t("Enter a webhook URL.")
      );
      return;
    }

    try {
      new URL(url);
    } catch {
      onToast(
        t("Enter a valid webhook URL.")
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        onToast(t("You must be logged in."));
        return;
      }

      const { data, error } =
        await supabase
          .from("webhooks")
          .insert({
            user_id: user.id,
            event: webhookEvent,
            url,
            active: true,
          })
          .select(
            "id, event, url, active"
          )
          .single();

      if (error) {
        onToast(
          `${t(
            "Could not add webhook:"
          )} ${error.message}`
        );
        return;
      }

      if (data) {
        setWebhooks(
          (current) => [
            ...current,
            data,
          ]
        );
      }

      setWebhookUrl("");
      setWebhookEvent("lead.created");
      setWebhookOpen(false);

      onToast(
        t("Webhook added.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebhook(
  webhook: Webhook
) {
  const nextActive =
    !webhook.active;

  if (
    nextActive &&
    !can("integrations_webhooks")
  ) {
    onToast(
      "Webhooks are available on the Pro and Scale plans. Upgrade to reactivate this webhook."
    );

    return;
  }

    const { error } =
      await supabase
        .from("webhooks")
        .update({
          active: nextActive,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", webhook.id);

    if (error) {
      onToast(error.message);
      return;
    }

    setWebhooks(
      (current) =>
        current.map(
          (item) =>
            item.id === webhook.id
              ? {
                  ...item,
                  active:
                    nextActive,
                }
              : item
        )
    );
  }

  async function deleteWebhook(
    webhook: Webhook
  ) {
    const confirmed =
      window.confirm(
        t(
          "Delete this webhook?"
        )
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("webhooks")
        .delete()
        .eq("id", webhook.id);

    if (error) {
      onToast(error.message);
      return;
    }

    setWebhooks(
      (current) =>
        current.filter(
          (item) =>
            item.id !== webhook.id
        )
    );

    onToast(
      t("Webhook deleted.")
    );
  }

  const [apiKeyPrefix, setApiKeyPrefix] =
    useState<string | null>(null);
  const [newApiKey, setNewApiKey] =
    useState<string | null>(null);
  const [apiUsage, setApiUsage] = useState<{
    used: number;
    limit: number | null;
  } | null>(null);
  const [generatingKey, setGeneratingKey] =
    useState(false);

  useEffect(() => {
    fetch("/api/settings/api-key")
      .then((response) => response.json())
      .then((result) => {
        setApiKeyPrefix(result.key?.prefix ?? null);
        setApiUsage({
          used: result.key?.requests_this_month ?? 0,
          limit: result.monthlyLimit ?? null,
        });
      })
      .catch(() => undefined);
  }, []);

  async function generateKey() {
    if (!can("api_access")) {
      onToast(t("API access is available on the Scale plan."));
      return;
    }

    if (
      apiKeyPrefix &&
      !window.confirm(
        t("Creating a new key will stop the current key from working. Continue?")
      )
    ) {
      return;
    }

    setGeneratingKey(true);

    try {
      const response = await fetch("/api/settings/api-key", {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        onToast(result.error || t("Could not create the API key."));
        return;
      }

      setNewApiKey(result.key);
      setApiKeyPrefix(result.prefix);
      onToast(t("New API key created. Copy it now — it won't be shown again."));
    } finally {
      setGeneratingKey(false);
    }
  }

  async function copyApiKey() {
    if (!newApiKey) {
      onToast(t("For security, keys are only shown once. Create a new key to copy it."));
      return;
    }

    await navigator.clipboard?.writeText(newApiKey);
    onToast(t("API key copied."));
  }

  async function testWebhook(webhook: Webhook) {
    onToast(t("Sending test event..."));

    const response = await fetch("/api/webhooks/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: webhook.id }),
    });
    const result = await response.json().catch(() => ({}));

    onToast(
      result.success
        ? `${t("Test delivered")} (HTTP ${result.status}).`
        : `${t("Test failed")}: ${result.error || `HTTP ${result.status}`}`
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <KeyRound
                size={17}
                className="text-blue-400"
              />
            </div>

            <div>
              <h2 className="text-sm font-medium">
                {t("API Access")}
              </h2>

              <p className="mt-1 text-[14px] text-gray-600">
                {t(
                  "Connect BaseLead with your own tools and workflows."
                )}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <PreferenceRow
              title={t(
                "Enable API access"
              )}
              description={t(
                "Allow your own tools to read your leads with an API key."
              )}
            >
              <Toggle
                enabled={apiEnabled}
                onChange={toggleApi}
              />
            </PreferenceRow>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-[8px] text-gray-600">
              {t("API Key")}
            </p>

            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="truncate text-[14px] text-gray-400">
                {newApiKey
                  ? newApiKey
                  : apiKeyPrefix
                  ? `${apiKeyPrefix}••••••••••••`
                  : t("No API key yet")}
              </code>

              <div className="flex shrink-0 items-center gap-2">
                {newApiKey && (
                  <OutlineButton onClick={copyApiKey}>
                    <Copy size={12} />
                    {t("Copy")}
                  </OutlineButton>
                )}

                <OutlineButton onClick={generateKey}>
                  <KeyRound size={12} />
                  {generatingKey
                    ? t("Creating...")
                    : apiKeyPrefix
                    ? t("Regenerate")
                    : t("Create key")}
                </OutlineButton>
              </div>
            </div>

            <p className="mt-3 text-[13px] leading-5 text-gray-600">
              {can("api_access")
                ? `${t("Use it as")} "Authorization: Bearer <key>" ${t("with")} GET /api/v1/leads. ${
                    apiUsage
                      ? `${apiUsage.used.toLocaleString()} / ${
                          apiUsage.limit === null
                            ? t("Unlimited")
                            : apiUsage.limit.toLocaleString()
                        } ${t("requests this month")}.`
                      : ""
                  }`
                : t("API access is available on the Scale plan.")}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium">
                {t("Webhooks")}
              </h2>

              <p className="mt-1 text-[14px] text-gray-600">
                {t(
                  "BaseLead sends a POST request to your URL when the event happens."
                )}
              </p>
            </div>

            <YellowButton
              onClick={() =>
                setWebhookOpen(true)
              }
            >
              <Plus size={13} />
              {t("Add Webhook")}
            </YellowButton>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[14px] text-gray-600">
              {t("Loading webhooks...")}
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {webhooks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 p-5 text-center text-[14px] text-gray-600">
                  {t(
                    "No webhooks configured."
                  )}
                </div>
              ) : (
                webhooks.map(
                  (webhook) => (
                    <div
                      key={
                        webhook.id
                      }
                      className="flex flex-col gap-3 rounded-lg border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] text-gray-300">
                          {
                            webhook.event
                          }
                        </p>

                        <p className="mt-1 truncate text-[8px] text-gray-600">
                          {
                            webhook.url
                          }
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleWebhook(
                              webhook
                            )
                          }
                          className={`rounded-md px-2 py-1 text-[8px] ${
                            webhook.active
                              ? "bg-green-500/10 text-green-400"
                              : "bg-white/5 text-gray-500"
                          }`}
                        >
                          {webhook.active
                            ? t(
                                "Active"
                              )
                            : t(
                                "Disabled"
                              )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void testWebhook(
                              webhook
                            )
                          }
                          className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-gray-400 hover:bg-white/10 hover:text-white"
                        >
                          {t("Test")}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteWebhook(
                              webhook
                            )
                          }
                          className="rounded-md p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2
                            size={13}
                          />
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={webhookOpen}
        title={t("Add Webhook")}
        onClose={() => {
          if (!saving) {
            setWebhookOpen(false);
          }
        }}
      >
        <div className="space-y-4">
          <SelectField
            label={t("Event")}
            value={webhookEvent}
            onChange={setWebhookEvent}
            options={[
              "lead.created",
              "lead.updated",
              "lead.status_changed",
              "outreach.created",
              "outreach.replied",
              "meeting.created",
            ]}
          />

          <Field
            label={t("Webhook URL")}
            value={webhookUrl}
            onChange={setWebhookUrl}
            placeholder="https://yourapp.com/webhooks/baselead"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <OutlineButton
            disabled={saving}
            onClick={() =>
              setWebhookOpen(false)
            }
          >
            {t("Cancel")}
          </OutlineButton>

          <YellowButton
            disabled={saving}
            onClick={addWebhook}
          >
            <Save size={13} />
            {saving
              ? t("Saving...")
              : t("Save Webhook")}
          </YellowButton>
        </div>
      </Modal>
    </>
  );
}

/* =========================================================
   DANGER ZONE
========================================================= */

function DangerZone({
  onDeleted,
}: {
  onDeleted: () => void;
}) {
  const { t } = useLanguage();

  const [step, setStep] =
    useState<0 | 1 | 2>(0);

  const [confirmation, setConfirmation] =
    useState("");

  function closeDangerModal() {
    setStep(0);
    setConfirmation("");
  }

  return (
    <>
      <Card className="border-red-500/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
            <Trash2
              size={16}
              className="text-red-400"
            />
          </div>

          <div>
            <h2 className="text-sm font-medium text-red-400">
              {t("Danger Zone")}
            </h2>

            <p className="mt-1 text-[14px] text-gray-600">
              {t(
                "Permanently delete your account, workspace and all data."
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep(1)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2.5 text-[14px] text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 size={13} />
          {t("Delete Account")}
        </button>
      </Card>

      <Modal
        open={step === 1}
        title={t("Delete Account?")}
        onClose={closeDangerModal}
        danger
      >
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[14px] leading-5 text-gray-400">
            {t(
              "This permanently deletes your account, your workspace, all leads, outreach and calendar events, and cancels your subscription. This cannot be undone."
            )}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <OutlineButton
            onClick={closeDangerModal}
          >
            {t("Cancel")}
          </OutlineButton>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-lg bg-red-500 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-red-600"
          >
            {t("Continue")}
          </button>
        </div>
      </Modal>

      <Modal
        open={step === 2}
        title={t("Final Confirmation")}
        onClose={closeDangerModal}
        danger
      >
        <p className="text-[14px] leading-5 text-gray-400">
          {t("Type")}{" "}
          <strong className="text-red-400">
            DELETE
          </strong>{" "}
          {t("to confirm.")}
        </p>

        <input
          value={confirmation}
          onChange={(e) =>
            setConfirmation(
              e.target.value.toUpperCase()
            )
          }
          placeholder={t(
            "Type DELETE"
          )}
          className="mt-5 h-11 w-full rounded-lg border border-red-500/30 bg-black px-3 text-xs text-white outline-none focus:border-red-500"
        />

        <div className="mt-5 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.03] p-4">
          <p className="text-[13px] leading-5 text-gray-500">
            {t(
              "After confirming, you will be signed out and your data will be erased."
            )}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <OutlineButton
            onClick={closeDangerModal}
          >
            {t("Cancel")}
          </OutlineButton>

          <button
            type="button"
            disabled={
              confirmation !== "DELETE"
            }
            onClick={() => {
              closeDangerModal();
              onDeleted();
            }}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={13} />
            {t("Confirm")}
          </button>
        </div>
      </Modal>
    </>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SettingsPage() {
  const { t } = useLanguage();
  const { preferences } = usePreferences();
  const isLightMode = !preferences.dark_mode;

  const [activeTab, setActiveTab] =
    useState<SettingsTab>(
      "My Profile"
    );

  const [toast, setToast] =
    useState("");

  const [companySettings, setCompanySettings] =
    useState<CompanySettings>(
      DEFAULT_COMPANY
    );

  const [companyLoading, setCompanyLoading] =
    useState(true);

  const [companySaving, setCompanySaving] =
    useState(false);

  const [companyId, setCompanyId] =
    useState<string | null>(null);

  const [workspaceOwnerId, setWorkspaceOwnerId] =
    useState<string | null>(null);

  const [isWorkspaceOwner, setIsWorkspaceOwner] =
    useState(false);

  const toastTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  function showToast(message: string) {
    setToast(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current =
      setTimeout(() => {
        setToast("");
      }, 2500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

  /* =======================================================
     LOAD COMPANY PROFILE
  ======================================================= */

  useEffect(() => {
    async function loadCompanySettings() {
      setCompanyLoading(true);

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        setCompanyLoading(false);
        return;
      }

      /*
       * First try the normal owner relationship.
       */
      const {
        data: ownedCompany,
        error: ownedCompanyError,
      } =
        await supabase
          .from("company_profiles")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (ownedCompanyError) {
        console.error(
          "Owned company profile load error:",
          ownedCompanyError
        );
      }

      let data =
        ownedCompany || null;

      let workspaceOwner =
        Boolean(data);

      /*
       * If the current user is not the owner,
       * resolve the workspace through team_members.
       */
      if (!data) {
        const {
          data: membership,
          error: membershipError,
        } =
          await supabase
            .from("team_members")
            .select(
              "company_id, user_id, status"
            )
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "status",
              "active"
            )
            .limit(1)
            .maybeSingle();

        if (membershipError) {
          console.error(
            "Workspace membership load error:",
            membershipError
          );

          showToast(
            `${t(
              "Could not load workspace membership:"
            )} ${membershipError.message}`
          );

          setCompanyLoading(false);
          return;
        }

        if (membership?.company_id) {
          const {
            data: memberCompany,
            error: memberCompanyError,
          } =
            await supabase
              .from("company_profiles")
              .select("*")
              .eq(
                "id",
                membership.company_id
              )
              .maybeSingle();

          if (memberCompanyError) {
            console.error(
              "Member company profile load error:",
              memberCompanyError
            );

            showToast(
              `${t(
                "Could not load workspace settings:"
              )} ${memberCompanyError.message}`
            );

            setCompanyLoading(false);
            return;
          }

          data =
            memberCompany ||
            null;

          workspaceOwner =
            data?.user_id ===
            user.id;
        }
      }

      if (!data) {
        setCompanyId(null);
        setWorkspaceOwnerId(null);
        setIsWorkspaceOwner(false);
        setCompanySettings(
          DEFAULT_COMPANY
        );
        setCompanyLoading(false);
        return;
      }

      setCompanyId(data.id);
      setWorkspaceOwnerId(
        data.user_id || null
      );
      setIsWorkspaceOwner(
        workspaceOwner
      );

      const rawServices =
        Array.isArray(data.services)
          ? data.services
          : [];

      const normalizedServices: Service[] =
        rawServices
          .filter(
            (service: unknown) =>
              typeof service ===
                "object" &&
              service !== null
          )
          .map(
            (
              service: any,
              index: number
            ) => ({
              id:
                typeof service.id ===
                "string"
                  ? service.id
                  : `service-${index}-${Date.now()}`,

              name:
                typeof service.name ===
                "string"
                  ? service.name
                  : "",

              description:
                typeof service.description ===
                "string"
                  ? service.description
                  : "",

              price:
                service.price != null
                  ? String(
                      service.price
                    )
                  : "",
            })
          );

      setCompanySettings({
        company_name:
          data.company_name || "",

        website:
          data.website || "",

        industry:
          data.industry || "",

        company_description:
          data.description || "",

        target_customer:
          data.target_customer || "",

        target_locations:
  data.target_locations || "",

locations:
  Array.isArray(data.locations)
    ? data.locations
        .filter(
          (location: unknown) =>
            typeof location === "string"
        )
        .map(
          (location: string) =>
            location.trim()
        )
        .filter(Boolean)
    : [],

phone:
  data.phone || "",
        email:
          data.email || "",

        address:
          data.address || "",

        city:
          data.city || "",

        state:
          data.state || "",

        country:
          data.country || "",

        logo_url:
          data.logo_url || "",

        services:
          normalizedServices,

        min_project_value:
          data.min_project_value != null
            ? String(
                data.min_project_value
              )
            : "",

        max_project_value:
          data.max_project_value != null
            ? String(
                data.max_project_value
              )
            : "",

        selling_points:
          data.selling_points || "",

        ai_notes:
          data.ai_notes || "",

        instagram_url:
          data.instagram_url || "",

        facebook_url:
          data.facebook_url || "",

        linkedin_url:
          data.linkedin_url || "",

        x_url:
          data.x_url || "",

        tiktok_url:
          data.tiktok_url || "",

        pinterest_url:
          data.pinterest_url || "",

        google_maps_url:
          data.google_maps_url || "",
      });

      setCompanyLoading(false);
    }

    loadCompanySettings();
  }, [t]);

  /* =======================================================
     SAVE COMPANY PROFILE
  ======================================================= */

  async function saveCompanySettings() {
    if (companySaving) return;

    if (!isWorkspaceOwner) {
      showToast(
        t(
          "Only the workspace owner can edit company information."
        )
      );
      return;
    }

    setCompanySaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        showToast(
          t("You must be logged in.")
        );

        return;
      }

      /*
       * Never trust only the local owner state.
       * Verify that this authenticated user owns
       * the workspace before saving.
       */
      const {
        data: ownerCompany,
        error: ownerCompanyError,
      } =
        await supabase
          .from("company_profiles")
          .select("id")
          .eq(
            "id",
            companyId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        ownerCompanyError ||
        !ownerCompany
      ) {
        showToast(
          t(
            "Only the workspace owner can edit company information."
          )
        );

        return;
      }

      const minValue =
        companySettings.min_project_value.trim();

      const maxValue =
        companySettings.max_project_value.trim();

      const parsedMin =
        minValue === ""
          ? null
          : Number(minValue);

      const parsedMax =
        maxValue === ""
          ? null
          : Number(maxValue);

      if (
        parsedMin !== null &&
        !Number.isFinite(parsedMin)
      ) {
        showToast(
          t(
            "Minimum project value must be a valid number."
          )
        );
        return;
      }

      if (
        parsedMax !== null &&
        !Number.isFinite(parsedMax)
      ) {
        showToast(
          t(
            "Maximum project value must be a valid number."
          )
        );
        return;
      }

      if (
        parsedMin !== null &&
        parsedMax !== null &&
        parsedMin > parsedMax
      ) {
        showToast(
          t(
            "Minimum project value cannot be greater than maximum project value."
          )
        );
        return;
      }

      const normalizedServices =
        companySettings.services
          .map((service) => ({
            id: service.id,
            name: service.name.trim(),
            description:
              service.description.trim(),
            price: service.price.trim(),
          }))
          .filter(
            (service) =>
              service.name ||
              service.description ||
              service.price
          );

      const payload = {
        company_name:
          companySettings.company_name.trim() ||
          null,

        website:
          companySettings.website.trim() ||
          null,

        industry:
          companySettings.industry.trim() ||
          null,

        description:
          companySettings.company_description.trim() ||
          null,

        target_customer:
          companySettings.target_customer.trim() ||
          null,

        target_locations:
          companySettings.target_locations.trim() ||
          null,

        phone:
          companySettings.phone.trim() ||
          null,

        email:
          companySettings.email.trim() ||
          null,

        address:
          companySettings.address.trim() ||
          null,

        city:
          companySettings.city.trim() ||
          null,

        state:
          companySettings.state.trim() ||
          null,

        country:
          companySettings.country.trim() ||
          null,

        logo_url:
          companySettings.logo_url.trim() ||
          null,

        services:
          normalizedServices,

        min_project_value:
          parsedMin,

        max_project_value:
          parsedMax,

        selling_points:
          companySettings.selling_points.trim() ||
          null,

        ai_notes:
          companySettings.ai_notes.trim() ||
          null,

        instagram_url:
          companySettings.instagram_url.trim() ||
          null,

        facebook_url:
          companySettings.facebook_url.trim() ||
          null,

        linkedin_url:
          companySettings.linkedin_url.trim() ||
          null,

        x_url:
          companySettings.x_url.trim() ||
          null,

        tiktok_url:
          companySettings.tiktok_url.trim() ||
          null,

        pinterest_url:
          companySettings.pinterest_url.trim() ||
          null,

        google_maps_url:
          companySettings.google_maps_url.trim() ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } =
        await supabase
          .from("company_profiles")
          .update(payload)
          .eq(
            "id",
            companyId
          )
          .eq(
            "user_id",
            user.id
          )
          .select("*")
          .single();

      if (error) {
        console.error(
          "Company profile save error:",
          error
        );

        showToast(
          `${t(
            "Could not save settings:"
          )} ${error.message}`
        );

        return;
      }

      if (data) {
        setCompanySettings(
          (current) => ({
            ...current,
            company_name:
              data.company_name ||
              "",
            website:
              data.website ||
              "",
            industry:
              data.industry ||
              "",
            company_description:
              data.description ||
              "",
            target_customer:
              data.target_customer ||
              "",
            target_locations:
              data.target_locations ||
              "",
            phone:
              data.phone ||
              "",
            email:
              data.email ||
              "",
            address:
              data.address ||
              "",
            city:
              data.city ||
              "",
            state:
              data.state ||
              "",
            country:
              data.country ||
              "",
            logo_url:
              data.logo_url ||
              "",
            services:
              normalizedServices,
            min_project_value:
              data.min_project_value != null
                ? String(
                    data.min_project_value
                  )
                : "",
            max_project_value:
              data.max_project_value != null
                ? String(
                    data.max_project_value
                  )
                : "",
            selling_points:
              data.selling_points ||
              "",
            ai_notes:
              data.ai_notes ||
              "",
            instagram_url:
              data.instagram_url ||
              "",
            facebook_url:
              data.facebook_url ||
              "",
            linkedin_url:
              data.linkedin_url ||
              "",
            x_url:
              data.x_url ||
              "",
            tiktok_url:
              data.tiktok_url ||
              "",
            pinterest_url:
              data.pinterest_url ||
              "",
            google_maps_url:
              data.google_maps_url ||
              "",
          })
        );
      }

      window.dispatchEvent(
        new Event("baselead-company-updated")
      );

      showToast(
        t("Company information saved.")
      );
    } finally {
      setCompanySaving(false);
    }
  }

  async function handleAccountDeleted() {
    showToast(t("Deleting your account..."));

    const response = await fetch(
      "/api/account/delete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirm: "DELETE",
        }),
      }
    );

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      showToast(
        result.error ||
          t("Your account could not be deleted.")
      );
      return;
    }

    window.location.href = "/login";
  }

  function renderTab() {
    switch (activeTab) {
      case "My Profile":
        return (
          <ProfileTab
            companyLogo={
              companySettings.logo_url
            }
            onToast={showToast}
          />
        );

      case "Company":
        return (
          <CompanyTab
            settings={
              companySettings
            }
            setSettings={
              setCompanySettings
            }
            onToast={showToast}
            saveCompanySettings={
              saveCompanySettings
            }
            canEditCompany={
              isWorkspaceOwner
            }
          />
        );

      case "AI & Services":
        return (
          <AiServicesTab
            settings={
              companySettings
            }
            setSettings={
              setCompanySettings
            }
            saveCompanySettings={
              saveCompanySettings
            }
            canEditCompany={
              isWorkspaceOwner
            }
          />
        );

      case "Preferences":
        return (
          <PreferencesTab
            onToast={showToast}
          />
        );

      case "Team":
        return (
          <TeamTab
            onToast={showToast}
          />
        );

      case "Billing & Plan":
        return (
          <BillingPlan
            onToast={showToast}
          />
        );

      case "Notifications":
        return (
          <NotificationsTab
            onToast={showToast}
          />
        );

      case "Security":
        return (
          <SecurityTab
            onToast={showToast}
          />
        );

      case "API & Webhooks":
        return (
          <ApiTab
            onToast={showToast}
          />
        );

      default:
        return null;
    }
  }

  const tabs: SettingsTab[] = [
    "My Profile",
    "Company",
    "AI & Services",
    "Preferences",
    "Team",
    "Billing & Plan",
    "Notifications",
    "Security",
    "API & Webhooks",
  ];

  const tabStyle: Record<string, { emoji: string; color: string }> = {
    "My Profile": { emoji: "👤", color: "#F5C518" },
    Company: { emoji: "🏢", color: "#60A5FA" },
    "AI & Services": { emoji: "✨", color: "#A78BFA" },
    Preferences: { emoji: "🎨", color: "#F472B6" },
    Team: { emoji: "👥", color: "#22D3EE" },
    "Billing & Plan": { emoji: "💳", color: "#84CC16" },
    Notifications: { emoji: "🔔", color: "#F97316" },
    Security: { emoji: "🔒", color: "#F0475C" },
    "API & Webhooks": { emoji: "🔌", color: "#2DD4BF" },
  };

  return (
    <main
      className={`baselead-settings-shell min-h-screen ${
        isLightMode
          ? "baselead-settings-light"
          : "baselead-settings-dark"
      } bg-[#050505] text-white`}
    >
      <style jsx global>{`
        /* =====================================================
           BASELEAD SETTINGS — LIGHT MODE

           Dark mode remains untouched. These overrides activate
           only when the Settings preference has dark_mode=false.
        ===================================================== */
        .baselead-settings-light {
          background: #f7f7f8 !important;
          color: #171717 !important;
          color-scheme: light;
        }

        /* Child components such as Card render outside the parent
           component's styled-jsx scope, so these selectors must be
           global to reliably replace the dark surfaces in light mode. */
        .baselead-settings-light .group.rounded-xl {
          background: #ffffff !important;
          background-image: none !important;
          border-color: #e5e7eb !important;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06) !important;
        }

        .baselead-settings-light .group.rounded-xl:hover {
          background: #ffffff !important;
          border-color: #d7dce3 !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.09) !important;
        }

        .baselead-settings-light [class*="bg-[#050505]"],
        .baselead-settings-light [class*="bg-[#070707]"],
        .baselead-settings-light [class*="bg-[#0A0A0A]"],
        .baselead-settings-light [class*="bg-[#0D0D0D]"],
        .baselead-settings-light [class*="bg-[#101010]"],
        .baselead-settings-light [class*="bg-[#111]"],
        .baselead-settings-light [class*="bg-[#171717]"],
        .baselead-settings-light [class*="bg-[#191919]"],
        .baselead-settings-light [class*="bg-black"] {
          background-color: #ffffff !important;
          background-image: none !important;
        }

        .baselead-settings-light [class*="from-[#0D0D0D]"],
        .baselead-settings-light [class*="to-[#101010]"],
        .baselead-settings-light [class*="from-[#101010]"],
        .baselead-settings-light [class*="to-[#0D0D0D]"],
        .baselead-settings-light [class*="from-[#050505]"],
        .baselead-settings-light [class*="to-[#050505]"] {
          --tw-gradient-from: #ffffff !important;
          --tw-gradient-to: #ffffff !important;
          --tw-gradient-stops: #ffffff, #ffffff !important;
          background-image: none !important;
        }

        .baselead-settings-light [class*="text-white"],
        .baselead-settings-light [class*="text-gray-100"],
        .baselead-settings-light [class*="text-gray-200"],
        .baselead-settings-light [class*="text-gray-300"] {
          color: #1f2937 !important;
        }

        .baselead-settings-light [class*="text-gray-400"],
        .baselead-settings-light [class*="text-gray-500"] {
          color: #64748b !important;
        }

        .baselead-settings-light [class*="text-gray-600"] {
          color: #6b7280 !important;
        }

        .baselead-settings-light [class*="border-white/10"],
        .baselead-settings-light [class*="border-white/5"],
        .baselead-settings-light [class*="border-white/15"] {
          border-color: #e5e7eb !important;
        }

        .baselead-settings-light [class*="border-[#202020]"],
        .baselead-settings-light [class*="border-[#2A2A2A]"] {
          border-color: #e2e8f0 !important;
        }

        .baselead-settings-light [class*="bg-[#332A0C]"],
        .baselead-settings-light [class*="bg-[#241A38]"],
        .baselead-settings-light [class*="bg-[#3A1418]"],
        .baselead-settings-light [class*="bg-[#18200B]"],
        .baselead-settings-light [class*="bg-[#10243A]"] {
          background-color: #f8fafc !important;
        }

        .baselead-settings-light [class*="bg-white/10"] {
          background-color: #f1f5f9 !important;
        }

        .baselead-settings-light [class*="bg-white/5"] {
          background-color: #f8fafc !important;
        }

        .baselead-settings-light [class*="hover:bg-[#171717]"]:hover,
        .baselead-settings-light [class*="hover:bg-[#101010]"]:hover,
        .baselead-settings-light [class*="hover:bg-[#0D0D0D]"]:hover,
        .baselead-settings-light [class*="hover:bg-[#111]"]:hover,
        .baselead-settings-light [class*="hover:bg-black"]:hover {
          background-color: #f8fafc !important;
          background-image: none !important;
        }

        .baselead-settings-light [class*="hover:border-[#2A2A2A]"]:hover,
        .baselead-settings-light [class*="hover:border-white/10"]:hover {
          border-color: #cbd5e1 !important;
        }

        .baselead-settings-light [class*="hover:text-white"]:hover,
        .baselead-settings-light [class*="hover:text-gray-300"]:hover {
          color: #111827 !important;
        }

        .baselead-settings-light input,
        .baselead-settings-light textarea,
        .baselead-settings-light select {
          color: #111827 !important;
          background-color: #ffffff !important;
          border-color: #d1d5db !important;
          color-scheme: light;
        }

        .baselead-settings-light input::placeholder,
        .baselead-settings-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .baselead-settings-light option {
          color: #111827 !important;
          background: #ffffff !important;
        }

        .baselead-settings-light [class*="bg-[#191919]"] {
          background-color: #e5e7eb !important;
        }

        .baselead-settings-light [class*="bg-[#111]"] {
          background-color: #ffffff !important;
        }

        .baselead-settings-light footer {
          border-color: #e5e7eb !important;
        }

        .baselead-settings-light nav {
          background-color: rgba(255, 255, 255, 0.94) !important;
          border-color: #e5e7eb !important;
          color: #475569 !important;
        }

        .baselead-settings-light [class*="shadow-[0_8px_24px_rgba(0,0,0,0.16)]"],
        .baselead-settings-light [class*="shadow-[0_14px_34px_rgba(0,0,0,0.28)]"] {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
        }

        .baselead-settings-light [class*="shadow-2xl"] {
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14) !important;
        }
      `}</style>
      <div className="px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-8">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon
              size={20}
              className="text-[#F5C518]"
            />

            <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">
              {t("Settings")}
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {t(
              "Configure your company, AI intelligence, preferences, and organization settings."
            )}
          </p>
        </div>

        <div className="mt-5 overflow-x-auto border-b border-white/10">
          <div className="flex min-w-max gap-1">
            {tabs.map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab)
                  }
                  data-active={activeTab === tab}
                  style={{ "--tab": tabStyle[tab]?.color ?? "#F5C518" } as CSSProperties}
                  className={`bl-tab relative mb-2 flex items-center gap-2 rounded-xl border border-transparent px-3.5 py-2.5 text-[14px] ${
                    activeTab === tab
                      ? "font-medium"
                      : "text-gray-500"
                  }`}
                >
                  <span className="bl-tab-emoji" aria-hidden>{tabStyle[tab]?.emoji}</span>
                  {t(tab)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-5">
          {companyLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#F5C518]" />

                <p className="mt-4 text-[14px] text-gray-600">
                  {t(
                    "Loading workspace settings..."
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-[1180px]">
              {renderTab()}

              {activeTab ===
                "My Profile" && (
                <div className="mt-5 space-y-5">
                  <DeleteAllLeadsCard onToast={showToast} />

                  <DangerZone
                    onDeleted={
                      handleAccountDeleted
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-[8px] text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © 2026 BaseLead.{" "}
            {t("All rights reserved.")}
          </span>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() =>
                showToast(
                  t(
                    "Privacy Policy opened."
                  )
                )
              }
              className="hover:text-gray-300"
            >
              {t("Privacy Policy")}
            </button>

            <button
              type="button"
              onClick={() =>
                showToast(
                  t(
                    "Terms of Service opened."
                  )
                )
              }
              className="hover:text-gray-300"
            >
              {t("Terms of Service")}
            </button>

            <button
              type="button"
              onClick={() =>
                showToast(
                  t("Help Center opened.")
                )
              }
              className="hover:text-gray-300"
            >
              {t("Help Center")}
            </button>
          </div>
        </footer>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[300] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-[#111] px-4 py-3 shadow-2xl">
          <CheckCircle2
            size={14}
            className="shrink-0 text-green-400"
          />

          <span className="text-[14px] text-gray-200">
            {toast}
          </span>

          <button
            type="button"
            onClick={() =>
              setToast("")
            }
            className="text-gray-600 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

    </main>
  );
}