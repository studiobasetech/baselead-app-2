# BaseLead – Configuración para que todo funcione con datos reales

El código ya está listo. Lo que falta son las **cuentas y claves** de los servicios externos.
Cada clave va en el archivo `.env.local` (ya tiene las líneas vacías esperando).
**Después de editar `.env.local`, detén la app (Ctrl+C) y vuelve a correr `npm run dev`.**

---

## 1. Base de datos (obligatorio, 2 minutos)

1. Entra a https://supabase.com → tu proyecto → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/20261018_billing_calendar.sql`, copia todo, pégalo y presiona **Run**.

Esto crea el calendario real, las claves de API, protege el plan para que nadie pueda “regalarse” un plan pagado y conecta tus leads antiguos con tu empresa.

### 1b. Automatización de ventas (obligatorio)
Ejecuta también `supabase/migrations/20261019_sales_automation.sql` (después del anterior).
Activa: tareas de “Hoy”, historial de cada lead, secuencias, link de reservas, asignación de leads al equipo y el pipeline automático.

## 2. Clave de servicio de Supabase (obligatorio)

Supabase → **Project Settings → API Keys** → copia la **service_role / secret key**.

```
SUPABASE_SERVICE_ROLE_KEY=...
```

Se usa solo en el servidor (activar planes después del pago, borrar cuenta, API pública, envíos programados). **Nunca la compartas.**

## 3. Búsqueda real de negocios – Google Places (obligatorio para leads reales)

1. https://console.cloud.google.com → crea un proyecto → **APIs & Services → Library** → activa **Places API (New)**.
2. **Credentials → Create credentials → API key**. Restríngela a “Places API (New)”.
3. Necesitas una cuenta de facturación en Google Cloud (Google da crédito mensual gratis).

```
GOOGLE_PLACES_API_KEY=...
```

Sin esta clave la búsqueda muestra un aviso pidiendo la clave (ya no se crean negocios de ejemplo).

Para borrar los leads de ejemplo que se crearon antes: Supabase → SQL Editor → pega `supabase/cleanup_demo_leads.sql` → Run.

## 4. Gmail, Google Calendar y Google Sheets (para enviar correos y sincronizar el calendario)

1. Google Cloud → **APIs & Services → OAuth consent screen** → configúralo (tipo *External*).
2. Activa **Gmail API**, **Google Calendar API** y **Google Drive API**.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI: `http://localhost:3000/api/integrations/oauth/google/callback`
   - (y la de tu dominio cuando publiques, ej. `https://app.tudominio.com/api/integrations/oauth/google/callback`)

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Luego en la app: **Integraciones → Gmail → Conectar** (si ya lo habías conectado, desconéctalo y vuelve a conectarlo: ahora pide permiso para leer respuestas y así detectar cuando un lead contesta).
Conecta también **Google Calendar**: el link de reservas revisa tu disponibilidad real y crea la reunión con link de Google Meet. Desde ahí “Send email now” envía de verdad.

> Para “Continuar con Google” en el login: Supabase → Authentication → Providers → Google (usa el mismo Client ID/Secret) y agrega `http://localhost:3000/auth/callback` en **Authentication → URL Configuration → Redirect URLs**.

## 5. IA (Claude) – opcional pero recomendado

https://console.anthropic.com → API Keys.

```
ANTHROPIC_API_KEY=...
```

Activa: correos escritos con IA y recomendaciones personalizadas (planes Pro y Scale). Sin la clave se usan las reglas internas de BaseLead.

## 6. Pagos – Stripe (para cobrar las suscripciones)

1. https://dashboard.stripe.com → **Product catalog** → crea 3 productos: Starter, Pro, Scale.
   Cada uno con 2 precios recurrentes: mensual ($79 / $199 / $399) y anual ($805.80 / $2,029.80 / $4,069.80).
2. Copia el **price ID** (empieza con `price_`) de cada precio.
3. **Developers → API keys** → Secret key.
4. **Developers → Webhooks → Add endpoint**: `https://TU-DOMINIO/api/billing/webhook`
   Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copia el *signing secret*.
5. **Settings → Billing → Customer portal** → actívalo (para cambiar plan, tarjeta o cancelar).

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_SCALE_MONTHLY=price_...
STRIPE_PRICE_SCALE_YEARLY=price_...
```

Para probar en tu computadora sin publicar: instala Stripe CLI y corre
`stripe listen --forward-to localhost:3000/api/billing/webhook` (te da el `whsec_` de prueba).
Tarjeta de prueba de Stripe: `4242 4242 4242 4242`.

**Mientras tanto**, en Configuración → Facturación hay una barra “Test mode (no charge)” (solo visible en desarrollo) para cambiar entre Trial / Starter / Pro / Scale y probar los límites.

## 7. Automatización (respuestas, secuencias y envíos programados)

Al publicar en Vercel, `vercel.json` llama a `/api/automation/run` cada 15 minutos: detecta respuestas en Gmail, mueve los leads en el pipeline, envía los seguimientos de las secuencias y los correos programados.
Mientras pruebas en tu computadora, usa el botón **“Check replies & run follow-ups”** en la página **Today**.
Agrega en Vercel la variable `CRON_SECRET` (ya generada en tu `.env.local`).
Nota: el plan gratis de Vercel solo permite crons diarios; para cada 15 min necesitas Vercel Pro.

---

## Qué incluye cada plan (ya aplicado en la app y en el servidor)

| | Prueba (7 días) | Starter | Pro | Scale |
|---|---|---|---|---|
| Leads | 100 en total | 1,000 / mes | 5,000 / mes | 20,000 / mes |
| Miembros del equipo | 3 | 3 | 5 | Ilimitado |
| Integraciones conectadas | 5 | 5 | Ilimitadas | Ilimitadas |
| Campañas activas | 3 | 3 | 25 | Ilimitadas |
| Búsqueda + puntuación de leads | ✓ | ✓ | ✓ | ✓ |
| Pipeline, calendario, plantillas de correo, envío por Gmail | ✓ | ✓ | ✓ | ✓ |
| Reportes básicos (Resumen, Leads, Outreach) | ✓ | ✓ | ✓ | ✓ |
| Filtros avanzados de búsqueda (tamaño, ingresos, intención) | – | – | ✓ | ✓ |
| Recomendaciones IA + correos escritos con IA | – | – | ✓ | ✓ |
| Envíos programados (automatización) | – | – | ✓ | ✓ |
| Pipeline avanzado (filtros + exportar) | – | – | ✓ | ✓ |
| Reportes avanzados (Pipeline, Ingresos) + exportar CSV | – | – | ✓ | ✓ |
| Webhooks | – | – | ✓ | ✓ |
| Roles y permisos (Manager/Admin) | – | – | – | ✓ |
| Reportes personalizados | – | – | – | ✓ |
| API pública (`GET /api/v1/leads`) | – | – | – | ✓ (100,000 solicitudes/mes) |

Los límites se aplican también en el servidor: aunque alguien modifique la página, no puede saltarse su plan.

---

## 8. Propuestas con firma y pago

- Ya incluidas en `supabase/RUN_THIS_IN_SUPABASE.sql` (tabla `proposals`).
- Crea una propuesta en **Proposals** o desde un lead en el Pipeline (“Create proposal”).
- El cliente recibe un link (`/p/...`), la firma con el dedo o el mouse y, si eliges depósito o pago completo, paga con tarjeta.
- Para cobrar en línea: **Proposals → Connect payments** y pega la *secret key* de **tu propia cuenta de Stripe** (la del negocio que cobra). El dinero va directo a esa cuenta.
- Automático: enviada → etapa *Proposal*; abierta → tarea “haz seguimiento ahora”; firmada → *Negotiation* (o *Won* si no hay pago); pagada → *Won* con el valor del trato.

## 9. Rendimiento del equipo
**Team Performance** (Pro y Scale; dueño, Admin o Manager): correos, respuestas, reuniones, propuestas, ingresos ganados por vendedor, embudo y metas mensuales (el dueño las define haciendo clic en “Set goal”).

## 10. Contactos de tomadores de decisión (Hunter.io)

1. Crea una cuenta en https://hunter.io (el plan gratis da 25 búsquedas al mes; los planes pagos dan más).
2. **API → API key** → cópiala en `.env.local`:
```
HUNTER_API_KEY=...
```
3. Reinicia `npm run dev`.

Uso: en el panel de cualquier lead (Pipeline o Leads) → **Find decision makers**. BaseLead busca a las personas de esa empresa por su sitio web, las ordena por quién decide (dueño, fundador, director…), y pone al mejor como contacto principal (reemplaza correos genéricos como info@). También puedes buscar en grupo desde **Sequences → Add leads**.
Límites mensuales por plan: Starter 50, Pro 500, Scale 2,000 búsquedas.

## 11. Llamadas y mensajes de texto (SMS)

- **Llamar:** en el panel de cada lead, botón **Call** (abre el teléfono del celular o FaceTime/Skype en la computadora). Al volver, **Log call** guarda el resultado (habló, interesado, reunión agendada, buzón de voz, no contestó…), notas y duración; crea la tarea de seguimiento y mueve el pipeline solo.
- **SMS (Pro y Scale):** crea una cuenta en https://twilio.com, compra un número con SMS y en BaseLead → **Integrations → Connect Twilio** pega el *Account SID*, *Auth Token* y el número. Luego copia la URL de webhook que aparece y pégala en Twilio → tu número → *Messaging → A message comes in*. Las respuestas del lead llegan a BaseLead, lo mueven a *Responded*, detienen la secuencia y crean una tarea.
- Cada negocio usa su propia cuenta de Twilio (cada uno paga sus mensajes).

## 12. Empezar de cero (borrar todos los leads)
Configuración → **My Profile** → **Delete all leads** → escribe `DELETE ALL LEADS`. Borra todos los leads y su historial; tu cuenta, equipo y plan se quedan.

## 13. Email notifications

BaseLead emails each rep when: a lead replies, someone books a meeting, a proposal is opened / signed / paid / declined, 1 hour before every meeting, and a weekly report on Mondays (if turned on).

- Works automatically through the rep's **connected Gmail** (Integrations → Gmail).
- Optional branded emails: create a free account at resend.com, verify your domain, then set `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL="BaseLead <alerts@yourdomain.com>"` in `.env.local`.
- Needs `SUPABASE_SERVICE_ROLE_KEY`. Reminders and the weekly report run from the `/api/automation/run` cron.
- Each person controls them in Settings → Notifications ("Send test email" checks delivery).
