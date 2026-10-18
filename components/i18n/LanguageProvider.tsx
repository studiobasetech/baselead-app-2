"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/components/lib/supabase";

export type Language = "en" | "es";

type LanguageContextType = {
  language: Language;
  setLanguage: (
    language: Language
  ) => Promise<void>;
  t: (text: string) => string;
};

const LanguageContext =
  createContext<LanguageContextType | null>(
    null
  );

/* =========================================================
   ENGLISH → SPANISH TRANSLATIONS
========================================================= */

const TRANSLATIONS: Record<string, string> = {
  /* -------------------------
     MAIN NAVIGATION
  ------------------------- */

  Dashboard: "Panel",
  "Lead Discovery": "Descubrimiento de leads",
  Leads: "Leads",
  Pipeline: "Pipeline",
  Outreach: "Contactos",
  Calendar: "Calendario",
  Reports: "Reportes",
  Integrations: "Integraciones",
  Settings: "Configuración",
  "New Search": "Nueva búsqueda",

  /* -------------------------
     SETTINGS TABS
  ------------------------- */

  "My Profile": "Mi perfil",
  Company: "Empresa",
  "AI & Services": "IA y servicios",
  Preferences: "Preferencias",
  Team: "Equipo",
  "Billing & Plan": "Facturación y plan",
  Notifications: "Notificaciones",
  Security: "Seguridad",
  "API & Webhooks": "API y webhooks",

  /* -------------------------
     PROFILE
  ------------------------- */

  "Profile Information":
    "Información del perfil",

  "Your personal account information.":
    "Información personal de tu cuenta.",

  "Your Profile": "Tu perfil",

  "Account owner":
    "Propietario de la cuenta",

  "Company logo":
    "Logo de la empresa",

  "Full Name": "Nombre completo",

  Email: "Correo electrónico",

  Phone: "Teléfono",

  "Time Zone": "Zona horaria",

  Language: "Idioma",

  English: "Inglés",

  Spanish: "Español",

  "Save Changes":
    "Guardar cambios",

  "Profile changes saved.":
    "Cambios del perfil guardados.",

  "A confirmation email was sent to your new email address.":
    "Se envió un correo de confirmación a tu nueva dirección de correo.",

  /* -------------------------
     COMPANY
  ------------------------- */

  "Company Information":
    "Información de la empresa",

  "This information powers your BaseLead workspace.":
    "Esta información alimenta tu espacio de trabajo de BaseLead.",

  "Change Logo":
    "Cambiar logo",

  "Uploading...":
    "Subiendo...",

  "Company logo updated.":
    "Logo de la empresa actualizado.",

  "This logo is used in your workspace sidebar and profile.":
    "Este logo se utiliza en el menú lateral y en tu perfil.",

  "Company Name":
    "Nombre de la empresa",

  Website:
    "Sitio web",

  Industry:
    "Industria",

  "Target Customer":
    "Cliente objetivo",

  "Target Locations":
    "Ubicaciones objetivo",

  "Business Phone":
    "Teléfono empresarial",

  "Business Email":
    "Correo empresarial",

  Address:
    "Dirección",

  City:
    "Ciudad",

  "State / Province":
    "Estado / Provincia",

  Country:
    "País",

  "Company Description":
    "Descripción de la empresa",

  "Unique Selling Points":
    "Propuesta de valor diferencial",

  "Your company name":
    "Nombre de tu empresa",

  "e.g. Real Estate, Roofing, Marketing":
    "ej. Bienes raíces, techos, marketing",

  "Who are you trying to sell to?":
    "¿A quién intentas vender?",

  "Cities, states, countries...":
    "Ciudades, estados, países...",

  "Business street address":
    "Dirección física de la empresa",

  "Describe what your company does and who you serve.":
    "Describe qué hace tu empresa y a quién atiende.",

  "What makes your company different?":
    "¿Qué hace diferente a tu empresa?",

  "Company information saved.":
    "Información de la empresa guardada.",

  "Please select an image.":
    "Selecciona una imagen.",

  "The logo must be smaller than 5 MB.":
    "El logo debe pesar menos de 5 MB.",

  /* -------------------------
     AI & SERVICES
  ------------------------- */

  "AI Business Intelligence":
    "Inteligencia empresarial de IA",

  "Tell BaseLead exactly what your company sells. This information will be used by AI when scoring leads, generating recommendations, creating outreach and identifying opportunities.":
    "Indícale a BaseLead exactamente qué vende tu empresa. Esta información será utilizada por la IA para calificar leads, generar recomendaciones, crear contactos e identificar oportunidades.",

  "Minimum Project Value":
    "Valor mínimo del proyecto",

  "Maximum Project Value":
    "Valor máximo del proyecto",

  "AI Instructions":
    "Instrucciones para la IA",

  "Products & Services":
    "Productos y servicios",

  "Add what you sell and the price for each service.":
    "Agrega lo que vendes y el precio de cada servicio.",

  "Add Service":
    "Agregar servicio",

  "No services added yet":
    "Todavía no hay servicios",

  "Add your first service":
    "Agrega tu primer servicio",

  Service:
    "Servicio",

  "Service Name":
    "Nombre del servicio",

  Price:
    "Precio",

  "Service Description":
    "Descripción del servicio",

  "e.g. Roof Replacement":
    "ej. Reemplazo de techo",

  "Describe what is included in this service.":
    "Describe qué incluye este servicio.",

  "Why this matters":
    "Por qué esto importa",

  "BaseLead will use these services and prices as the company's commercial context so recommendations can match the right service to each lead.":
    "BaseLead utilizará estos servicios y precios como contexto comercial de la empresa para que las recomendaciones correspondan al servicio correcto para cada lead.",

  "Save AI & Services":
    "Guardar IA y servicios",

  "Business & Social Profiles":
    "Perfiles empresariales y sociales",

  "These profiles describe your company and can be used by outreach and AI context.":
    "Estos perfiles describen tu empresa y pueden utilizarse para contactos y contexto de IA.",

  "Save Business Profiles":
    "Guardar perfiles empresariales",

  /* -------------------------
     PREFERENCES
  ------------------------- */

  "Default Currency":
    "Moneda predeterminada",

  "Default Lead View":
    "Vista predeterminada de leads",

  "List View":
    "Vista de lista",

  "Grid View":
    "Vista de cuadrícula",

  "Kanban View":
    "Vista Kanban",

  "Show opportunity score":
    "Mostrar puntuación de oportunidad",

  "Display AI opportunity scores in lead lists.":
    "Mostrar las puntuaciones de oportunidad de IA en las listas de leads.",

  "Enable smart notifications":
    "Activar notificaciones inteligentes",

  "Receive AI insights and opportunity alerts.":
    "Recibir información de IA y alertas de oportunidades.",

  "Dark mode":
    "Modo oscuro",

  "Use the dark interface across BaseLead.":
    "Usar la interfaz oscura en todo BaseLead.",

  "Compact layout":
    "Diseño compacto",

  "Reduce spacing in tables and lists.":
    "Reducir el espacio en tablas y listas.",

  "Save Preferences":
    "Guardar preferencias",

  "Preferences saved.":
    "Preferencias guardadas.",

  /* -------------------------
     TEAM
  ------------------------- */

  "Team Members":
    "Miembros del equipo",

  "Manage access to your BaseLead workspace.":
    "Administra el acceso a tu espacio de trabajo de BaseLead.",

  "Invite Member":
    "Invitar miembro",

  "Workspace Owner":
    "Propietario del espacio",

  "Current account":
    "Cuenta actual",

  Member:
    "Miembro",

  "Enter the team member's name:":
    "Escribe el nombre del miembro del equipo:",

  "was added to the team.":
    "se agregó al equipo.",

  /* -------------------------
     BILLING
  ------------------------- */

  "Current subscription":
    "Suscripción actual",

  Plan:
    "Plan",

  ACTIVE:
    "ACTIVO",

  "Lead limit":
    "Límite de leads",

  "Team limit":
    "Límite del equipo",

  "Plans & Pricing":
    "Planes y precios",

  "Choose the plan that fits your business.":
    "Elige el plan que mejor se adapte a tu negocio.",

  Monthly:
    "Mensual",

  Yearly:
    "Anual",

  "MOST POPULAR":
    "MÁS POPULAR",

  month:
    "mes",

  "Current Plan":
    "Plan actual",

  Choose:
    "Elegir",

  "You are already on the":
    "Ya tienes el",

  "plan.":
    "plan.",

  "plan selected.":
    "plan seleccionado.",

  /* -------------------------
     PLAN DESCRIPTIONS
  ------------------------- */

  "For individuals getting started with lead generation.":
    "Para personas que están comenzando con la generación de leads.",

  "For growing businesses that need more automation.":
    "Para empresas en crecimiento que necesitan más automatización.",

  "For teams running high-volume lead generation.":
    "Para equipos que manejan generación de leads a gran escala.",

  "Basic lead discovery":
    "Descubrimiento básico de leads",

  "Basic lead scoring":
    "Calificación básica de leads",

  "Email templates":
    "Plantillas de correo",

  "Basic pipeline":
    "Pipeline básico",

  "Basic reports":
    "Reportes básicos",

  "Advanced lead discovery":
    "Descubrimiento avanzado de leads",

  "AI scoring & recommendations":
    "Calificación y recomendaciones con IA",

  "Email & outreach automation":
    "Automatización de correo y contactos",

  "Pipeline management":
    "Gestión del pipeline",

  "Calendar & follow-ups":
    "Calendario y seguimientos",

  "Advanced reports":
    "Reportes avanzados",

  "Integrations & webhooks":
    "Integraciones y webhooks",

  "Priority support":
    "Soporte prioritario",

  "Everything in Pro":
    "Todo lo incluido en Pro",

  "Advanced AI recommendations":
    "Recomendaciones avanzadas con IA",

  "Unlimited campaigns":
    "Campañas ilimitadas",

  "Advanced automation":
    "Automatización avanzada",

  "Team permissions":
    "Permisos de equipo",

  "Custom reports":
    "Reportes personalizados",

  "API access":
    "Acceso a API",

  /* -------------------------
     NOTIFICATIONS
  ------------------------- */

  "Choose which BaseLead notifications you receive.":
    "Elige qué notificaciones de BaseLead quieres recibir.",

  "Email notifications":
    "Notificaciones por correo",

  "Receive important account notifications by email.":
    "Recibe notificaciones importantes de tu cuenta por correo.",

  "New lead alerts":
    "Alertas de nuevos leads",

  "Notify me when high-opportunity leads are discovered.":
    "Avísame cuando se descubran leads con alta oportunidad.",

  "Outreach replies":
    "Respuestas de contactos",

  "Notify me when a lead responds to outreach.":
    "Avísame cuando un lead responda a un contacto.",

  "Meeting reminders":
    "Recordatorios de reuniones",

  "Receive reminders before scheduled meetings.":
    "Recibe recordatorios antes de reuniones programadas.",

  "Weekly report":
    "Reporte semanal",

  "Receive a weekly performance summary.":
    "Recibe un resumen semanal de rendimiento.",

  "Save Notifications":
    "Guardar notificaciones",

  "Notification settings saved.":
    "Configuración de notificaciones guardada.",

  /* -------------------------
     SECURITY
  ------------------------- */

  "Account Security":
    "Seguridad de la cuenta",

  "Manage authentication and account protection.":
    "Administra la autenticación y protección de tu cuenta.",

  "Two-factor authentication":
    "Autenticación de dos factores",

  "Add an extra layer of security to your account.":
    "Agrega una capa adicional de seguridad a tu cuenta.",

  "Two-factor authentication enabled.":
    "Autenticación de dos factores activada.",

  "Two-factor authentication disabled.":
    "Autenticación de dos factores desactivada.",

  "Change Password":
    "Cambiar contraseña",

  "Active Session":
    "Sesión activa",

  "Current session":
    "Sesión actual",

  "Your current authenticated session":
    "Tu sesión autenticada actual",

  Active:
    "Activa",

  "New Password":
    "Nueva contraseña",

  "Enter new password":
    "Ingresa la nueva contraseña",

  Cancel:
    "Cancelar",

  "Save Password":
    "Guardar contraseña",

  "Enter a new password.":
    "Ingresa una nueva contraseña.",

  "Password changed successfully.":
    "Contraseña cambiada correctamente.",

  /* -------------------------
     API
  ------------------------- */

  "API Access":
    "Acceso a API",

  "Connect BaseLead with your own tools and workflows.":
    "Conecta BaseLead con tus propias herramientas y flujos de trabajo.",

  "Enable API access":
    "Activar acceso a API",

  "API access will be connected to your plan.":
    "El acceso a API estará conectado a tu plan.",

  "API Key":
    "Clave API",

  Copy:
    "Copiar",

  "API key information copied.":
    "Información de la clave API copiada.",

  Webhooks:
    "Webhooks",

  "Send BaseLead events to another application.":
    "Envía eventos de BaseLead a otra aplicación.",

  "Add Webhook":
    "Agregar webhook",

  "Enter webhook URL:":
    "Ingresa la URL del webhook:",

  "Lead created":
    "Lead creado",

  "Webhook added.":
    "Webhook agregado.",

  "No webhooks configured.":
    "No hay webhooks configurados.",

  /* -------------------------
     DANGER ZONE
  ------------------------- */

  "Danger Zone":
    "Zona peligrosa",

  "Permanently delete your BaseLead account.":
    "Eliminar permanentemente tu cuenta de BaseLead.",

  "Delete Account":
    "Eliminar cuenta",

  "Delete Account?":
    "¿Eliminar cuenta?",

  "This action permanently deletes your account and workspace data.":
    "Esta acción eliminará permanentemente tu cuenta y los datos de tu espacio de trabajo.",

  Continue:
    "Continuar",

  "Final Confirmation":
    "Confirmación final",

  Type:
    "Escribe",

  "to confirm.":
    "para confirmar.",

  "Type DELETE":
    "Escribe DELETE",

  "Permanently Delete":
    "Eliminar permanentemente",

  /* -------------------------
     HEADER / WORKSPACE
  ------------------------- */

  Workspace:
    "Espacio de trabajo",

  "Workspace selector opened.":
    "Selector de espacio de trabajo abierto.",

  "Notifications opened.":
    "Notificaciones abiertas.",

  "Configure your company, AI intelligence, preferences, and organization settings.":
    "Configura tu empresa, inteligencia de IA, preferencias y organización.",

  "Loading workspace settings...":
    "Cargando configuración del espacio de trabajo...",

  /* -------------------------
     SIDEBAR / AUTH
  ------------------------- */

  Admin:
    "Administrador",

  "Logging out...":
    "Cerrando sesión...",

  "Log out":
    "Cerrar sesión",

  /* -------------------------
     FOOTER
  ------------------------- */

  "All rights reserved.":
    "Todos los derechos reservados.",

  "Privacy Policy":
    "Política de privacidad",

  "Terms of Service":
    "Términos de servicio",

  "Help Center":
    "Centro de ayuda",

  "Privacy Policy opened.":
    "Política de privacidad abierta.",

  "Terms of Service opened.":
    "Términos de servicio abiertos.",

  "Help Center opened.":
    "Centro de ayuda abierto.",

  /* -------------------------
     GENERAL
  ------------------------- */

  "You must be logged in.":
    "Debes iniciar sesión.",
};

/* =========================================================
   PROVIDER
========================================================= */

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] =
    useState<Language>("en");

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    async function loadLanguage() {
      let savedLanguage: Language = "en";

      /*
       * First check local storage.
       * This makes the language change immediately
       * available even before Supabase finishes loading.
       */

      try {
        const localLanguage =
          window.localStorage.getItem(
            "baselead-language"
          );

        if (
          localLanguage === "en" ||
          localLanguage === "es"
        ) {
          savedLanguage =
            localLanguage;
        }
      } catch {
        // Ignore localStorage errors.
      }

      /*
       * Then check the authenticated user's
       * Supabase metadata.
       */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const metadata =
        user?.user_metadata || {};

      const userLanguage =
        metadata.language;

      if (
        userLanguage === "en" ||
        userLanguage === "es"
      ) {
        savedLanguage =
          userLanguage;
      }

      setLanguageState(
        savedLanguage
      );

      try {
        window.localStorage.setItem(
          "baselead-language",
          savedLanguage
        );
      } catch {
        // Ignore localStorage errors.
      }

      setReady(true);
    }

    loadLanguage();
  }, []);

  async function setLanguage(
    nextLanguage: Language
  ) {
    /*
     * Update the UI immediately.
     */

    setLanguageState(
      nextLanguage
    );

    /*
     * Save locally.
     */

    try {
      window.localStorage.setItem(
        "baselead-language",
        nextLanguage
      );
    } catch {
      // Ignore localStorage errors.
    }

    /*
     * Save to Supabase user metadata.
     * This means the user's preference follows
     * them when they log in again.
     */

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } =
        await supabase.auth.updateUser({
          data: {
            language:
              nextLanguage,
          },
        });

      if (error) {
        console.error(
          "Could not save language preference:",
          error
        );
      }
    }

    /*
     * Let other components know that the language changed.
     */

    window.dispatchEvent(
      new CustomEvent(
        "baselead-language-change",
        {
          detail: {
            language:
              nextLanguage,
          },
        }
      )
    );
  }

  const value =
    useMemo<LanguageContextType>(
      () => ({
        language,

        setLanguage,

        t: (text: string) => {
          if (
            language === "en"
          ) {
            return text;
          }

          return (
            TRANSLATIONS[text] ||
            text
          );
        },
      }),
      [language]
    );

  /*
   * We still render children while the
   * language preference is being loaded.
   * This avoids blocking the entire application.
   */

  if (!ready) {
    return (
      <LanguageContext.Provider
        value={value}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider
      value={value}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useLanguage() {
  const context =
    useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}