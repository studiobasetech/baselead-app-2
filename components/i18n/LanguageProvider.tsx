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
  /* Added: billing, team, API, sidebar */
  "Have a discount code?": "¿Tienes un código de descuento?",
  "Apply it before choosing your plan.": "Aplícalo antes de elegir tu plan.",
  "Code applied": "Código aplicado",
  "Enter code": "Escribe el código",
  "Checking...": "Verificando...",
  "Apply": "Aplicar",
  "This discount code is not valid.": "Este código de descuento no es válido.",
  "The code could not be applied.": "No se pudo aplicar el código.",
  "plan activated for free with your code.": "activado gratis con tu código.",
  "Activate": "Activar",
  "free": "gratis",
  "100% off — any plan free": "100% de descuento — cualquier plan gratis",
  Today: "Hoy",
  Sequences: "Secuencias",
  Proposals: "Propuestas",
  "Team Performance": "Rendimiento del equipo",
  "On": "Activada",
  "Your account asks for a code from your authenticator app when you sign in.": "Tu cuenta pide un código de tu app de autenticación al iniciar sesión.",
  "Protect your account with a 6-digit code from an authenticator app.": "Protege tu cuenta con un código de 6 dígitos de una app de autenticación.",
  "Scan this QR code with your authenticator app, then enter the 6-digit code.": "Escanea este código QR con tu app de autenticación y escribe el código de 6 dígitos.",
  "Or enter this key manually:": "O escribe esta clave manualmente:",
  "Verify": "Verificar",
  "Turn off": "Desactivar",
  "Turn on two-factor": "Activar dos factores",
  "Could not start two-factor setup.": "No se pudo iniciar la configuración de dos factores.",
  "That code is not valid. Try again.": "Ese código no es válido. Inténtalo de nuevo.",
  "Two-factor authentication is now on.": "La autenticación de dos factores está activada.",
  "Turn off two-factor authentication?": "¿Desactivar la autenticación de dos factores?",
  "Two-factor authentication is off.": "La autenticación de dos factores está desactivada.",
  "Deleting your account...": "Eliminando tu cuenta...",
  "Your account could not be deleted.": "No se pudo eliminar tu cuenta.",
  "Permanently delete your account, workspace and all data.": "Elimina permanentemente tu cuenta, tu espacio de trabajo y todos los datos.",
  "This permanently deletes your account, your workspace, all leads, outreach and calendar events, and cancels your subscription. This cannot be undone.": "Esto elimina permanentemente tu cuenta, tu espacio de trabajo, todos los leads, contactos y eventos, y cancela tu suscripción. No se puede deshacer.",
  "After confirming, you will be signed out and your data will be erased.": "Al confirmar, se cerrará tu sesión y se borrarán tus datos.",
  "API access disabled.": "Acceso a la API desactivado.",
  "API access enabled.": "Acceso a la API activado.",
  "API access is available on the Scale plan.": "El acceso a la API está disponible en el plan Scale.",
  "API key copied.": "Clave de API copiada.",
  "Account Owner": "Propietario de la cuenta",
  "Add Location": "Agregar ubicación",
  "Add the locations your company operates from. These locations will appear in the Dashboard location filter.": "Agrega las ubicaciones donde opera tu empresa. Aparecerán en el filtro de ubicación del Panel.",
  "Add your first service so BaseLead can understand what you sell.": "Agrega tu primer servicio para que BaseLead entienda lo que vendes.",
  "After creating the invitation, you can copy the secure invitation link and send it to the team member.": "Después de crear la invitación, puedes copiar el enlace seguro y enviárselo al miembro del equipo.",
  "Allow your own tools to read your leads with an API key.": "Permite que tus propias herramientas lean tus leads con una clave de API.",
  "BaseLead sends a POST request to your URL when the event happens.": "BaseLead envía una solicitud POST a tu URL cuando ocurre el evento.",
  "Business Locations": "Ubicaciones del negocio",
  "Can manage leads, pipeline, outreach and day-to-day operations.": "Puede gestionar leads, pipeline, contactos y operaciones diarias.",
  "Cancel Invitation": "Cancelar invitación",
  "Cancel the invitation for": "¿Cancelar la invitación para",
  "Checkout cancelled. No changes were made.": "Pago cancelado. No se hizo ningún cambio.",
  "Choose the level of AI-powered client acquisition that fits the way your business sells.": "Elige el nivel de captación de clientes con IA que se ajuste a cómo vende tu negocio.",
  "Close menu": "Cerrar menú",
  "Close notifications": "Cerrar notificaciones",
  "Confirm": "Confirmar",
  "Confirm Password": "Confirmar contraseña",
  "Confirm new password": "Confirma la nueva contraseña",
  "Copy Link": "Copiar enlace",
  "Copy the invitation link and send it directly to the team member. When they open it, BaseLead will verify the invitation and connect their account to this workspace.": "Copia el enlace de invitación y envíalo al miembro del equipo. Al abrirlo, BaseLead verificará la invitación y conectará su cuenta a este espacio de trabajo.",
  "Copying...": "Copiando...",
  "Could not add webhook:": "No se pudo agregar el webhook:",
  "Could not cancel invitation:": "No se pudo cancelar la invitación:",
  "Could not copy the invitation link.": "No se pudo copiar el enlace de invitación.",
  "Could not create invitation:": "No se pudo crear la invitación:",
  "Could not create the API key.": "No se pudo crear la clave de API.",
  "Could not load invitations:": "No se pudieron cargar las invitaciones:",
  "Could not load notifications:": "No se pudieron cargar las notificaciones:",
  "Could not load team information.": "No se pudo cargar la información del equipo.",
  "Could not load team:": "No se pudo cargar el equipo:",
  "Could not load webhooks:": "No se pudieron cargar los webhooks:",
  "Could not load workspace membership:": "No se pudo cargar la membresía del espacio de trabajo:",
  "Could not load workspace settings:": "No se pudo cargar la configuración del espacio de trabajo:",
  "Could not load workspace:": "No se pudo cargar el espacio de trabajo:",
  "Could not remove team member:": "No se pudo quitar al miembro del equipo:",
  "Could not save notifications:": "No se pudieron guardar las notificaciones:",
  "Could not save preferences. Your current changes are still active locally.": "No se pudieron guardar las preferencias. Tus cambios siguen activos en este dispositivo.",
  "Could not save settings:": "No se pudo guardar la configuración:",
  "Could not update API access:": "No se pudo actualizar el acceso a la API:",
  "Could not update role:": "No se pudo actualizar el rol:",
  "Could not upload logo:": "No se pudo subir el logo:",
  "Create Invitation": "Crear invitación",
  "Create key": "Crear clave",
  "Create your company profile before inviting team members.": "Crea el perfil de tu empresa antes de invitar a miembros del equipo.",
  "Created": "Creado",
  "Creating a new key will stop the current key from working. Continue?": "Crear una clave nueva desactivará la clave actual. ¿Continuar?",
  "Creating...": "Creando...",
  "Custom roles and permissions are available on the Scale plan.": "Los roles y permisos personalizados están disponibles en el plan Scale.",
  "Delete this webhook?": "¿Eliminar este webhook?",
  "Disabled": "Desactivado",
  "Enter a team member email.": "Ingresa el correo del miembro del equipo.",
  "Enter a valid email address.": "Ingresa un correo válido.",
  "Enter a valid webhook URL.": "Ingresa una URL de webhook válida.",
  "Enter a webhook URL.": "Ingresa una URL de webhook.",
  "Event": "Evento",
  "For security, keys are only shown once. Create a new key to copy it.": "Por seguridad, las claves solo se muestran una vez. Crea una clave nueva para copiarla.",
  "Full workspace management and team administration.": "Gestión completa del espacio de trabajo y del equipo.",
  "Invitation cancelled.": "Invitación cancelada.",
  "Invitation could not be completed:": "No se pudo completar la invitación:",
  "Invitation link copied.": "Enlace de invitación copiado.",
  "Invitation pending": "Invitación pendiente",
  "Invitations created for people who have not joined the workspace yet.": "Invitaciones para personas que aún no se han unido al espacio de trabajo.",
  "Invite Team Member": "Invitar miembro del equipo",
  "Loading notifications...": "Cargando notificaciones...",
  "Loading preferences...": "Cargando preferencias...",
  "Loading team...": "Cargando equipo...",
  "Loading webhooks...": "Cargando webhooks...",
  "Loading...": "Cargando...",
  "Logo uploaded, but could not save it:": "El logo se subió, pero no se pudo guardar:",
  "Manage billing, invoices & cancellation": "Facturación, facturas y cancelación",
  "Manager": "Gerente",
  "Mark all as read": "Marcar todo como leído",
  "Maximum project value must be a valid number.": "El valor máximo del proyecto debe ser un número válido.",
  "Minimum project value cannot be greater than maximum project value.": "El valor mínimo no puede ser mayor que el valor máximo del proyecto.",
  "Minimum project value must be a valid number.": "El valor mínimo del proyecto debe ser un número válido.",
  "More": "Más",
  "Name": "Nombre",
  "New API key created. Copy it now — it won't be shown again.": "Nueva clave de API creada. Cópiala ahora: no se volverá a mostrar.",
  "New leads, replies and follow-ups will appear here.": "Aquí aparecerán leads nuevos, respuestas y seguimientos.",
  "New high-opportunity lead": "Nuevo lead de alta oportunidad",
  "New lead added": "Nuevo lead agregado",
  "Outreach reply received": "Respuesta recibida",
  "Upcoming follow-up": "Seguimiento próximo",
  "No API key yet": "Aún no hay clave de API",
  "No business locations added yet.": "Aún no hay ubicaciones agregadas.",
  "No notifications": "Sin notificaciones",
  "No pending invitations.": "No hay invitaciones pendientes.",
  "No team members yet.": "Aún no hay miembros del equipo.",
  "Only the workspace owner can cancel invitations.": "Solo el propietario puede cancelar invitaciones.",
  "Only the workspace owner can change team roles.": "Solo el propietario puede cambiar los roles del equipo.",
  "Only the workspace owner can change the company logo.": "Solo el propietario puede cambiar el logo de la empresa.",
  "Only the workspace owner can copy invitation links.": "Solo el propietario puede copiar enlaces de invitación.",
  "Only the workspace owner can create invitations.": "Solo el propietario puede crear invitaciones.",
  "Only the workspace owner can edit company information.": "Solo el propietario puede editar la información de la empresa.",
  "Only the workspace owner can invite team members.": "Solo el propietario puede invitar miembros.",
  "Only the workspace owner can remove team members.": "Solo el propietario puede quitar miembros.",
  "Open menu": "Abrir menú",
  "Owner": "Propietario",
  "Password must be at least 8 characters.": "La contraseña debe tener al menos 8 caracteres.",
  "Passwords do not match.": "Las contraseñas no coinciden.",
  "Payment confirmed. Your new plan is active.": "Pago confirmado. Tu nuevo plan está activo.",
  "Pending": "Pendiente",
  "Pending Invitations": "Invitaciones pendientes",
  "Profile saved, but email could not be changed:": "Perfil guardado, pero no se pudo cambiar el correo:",
  "Regenerate": "Regenerar",
  "Remove": "Quitar",
  "Remove location": "Quitar ubicación",
  "Remove team member": "Quitar miembro del equipo",
  "Role": "Rol",
  "Roles control how much access each team member has inside the workspace.": "Los roles controlan cuánto acceso tiene cada miembro dentro del espacio de trabajo.",
  "SAVE 15%": "AHORRA 15%",
  "Save 15%": "Ahorra 15%",
  "Save 15% with annual billing": "Ahorra 15% con facturación anual",
  "Save Webhook": "Guardar webhook",
  "Saving...": "Guardando...",
  "Sending test event...": "Enviando evento de prueba...",
  "Set up your company": "Configura tu empresa",
  "Standard access to workspace tools and assigned work.": "Acceso estándar a las herramientas y al trabajo asignado.",
  "Team Roles": "Roles del equipo",
  "Team administration is managed by the workspace owner.": "La administración del equipo la gestiona el propietario.",
  "Team invitation created successfully.": "Invitación creada correctamente.",
  "Team member name": "Nombre del miembro",
  "Team member removed.": "Miembro del equipo eliminado.",
  "Team role updated.": "Rol actualizado.",
  "Tell the AI what makes a lead valuable to your company.": "Dile a la IA qué hace valioso a un lead para tu empresa.",
  "Test": "Probar",
  "Test delivered": "Prueba entregada",
  "Test failed": "La prueba falló",
  "The workspace owner always has Admin access.": "El propietario siempre tiene acceso de administrador.",
  "The workspace owner cannot be removed.": "No se puede quitar al propietario.",
  "There is already a pending invitation for this email.": "Ya existe una invitación pendiente para este correo.",
  "These preferences are saved to your BaseLead account and used across the application.": "Estas preferencias se guardan en tu cuenta de BaseLead y se usan en toda la aplicación.",
  "This email is already part of the team.": "Este correo ya forma parte del equipo.",
  "This invitation does not have a valid token.": "Esta invitación no tiene un token válido.",
  "This is the only profile image in BaseLead. It appears in your workspace sidebar and My Profile.": "Esta es la única imagen de perfil en BaseLead. Aparece en la barra lateral y en Mi perfil.",
  "Turn more opportunities into revenue.": "Convierte más oportunidades en ingresos.",
  "Unlimited": "Ilimitado",
  "Use it as": "Úsala como",
  "We couldn't confirm the payment. Please contact support.": "No pudimos confirmar el pago. Contacta a soporte.",
  "Webhook URL": "URL del webhook",
  "Webhook deleted.": "Webhook eliminado.",
  "You save": "Ahorras",
  "Your BaseLead plan controls the monthly lead capacity and team seats available to your workspace.": "Tu plan de BaseLead define la cantidad mensual de leads y los puestos de equipo disponibles.",
  "Your company logo is managed from Company settings.": "El logo de tu empresa se gestiona en la configuración de Empresa.",
  "Your plan could not be updated. Please try again.": "No se pudo actualizar tu plan. Inténtalo de nuevo.",
  "Your plan includes": "Tu plan incluye",
  "Your workspace could not be found. Please refresh and try again.": "No se encontró tu espacio de trabajo. Actualiza la página e inténtalo de nuevo.",
  "active members": "miembros activos",
  "e.g. Miami, FL": "ej. Miami, FL",
  "from the team?": "del equipo?",
  "per month effective": "por mes efectivo",
  "per year": "por año",
  "requests this month": "solicitudes este mes",
  "seats": "puestos",
  "team seats. Upgrade your plan to invite more people.": "puestos de equipo. Mejora tu plan para invitar a más personas.",
  "this month": "este mes",
  "unread": "sin leer",
  "with": "con",
  "year": "año",
  "Payments are not connected yet. Add your Stripe keys to enable subscriptions.": "Los pagos aún no están conectados. Agrega tus claves de Stripe para activar las suscripciones.",
  "Only the workspace owner can change the subscription.": "Solo el propietario puede cambiar la suscripción.",
  "You don't have an active subscription yet.": "Aún no tienes una suscripción activa.",

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