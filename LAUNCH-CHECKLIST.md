# BaseLead — lista para lanzar (gratis primero, luego lo que se paga)

Marca cada paso cuando lo termines. Lo que dice **(Claude)** ya está hecho en el código.

## Ya hecho en el código (Claude)

- [x] Página de inicio pública en `/` (explica la app, precios, enlaces a Privacidad, Términos y Soporte). Google y Apple la piden.
- [x] Página `/support` con contacto, ayuda y cómo borrar la cuenta (Google Play exige un enlace para borrar la cuenta).
- [x] Páginas de error y 404 con diseño, y cabeceras de seguridad (`next.config.ts`).
- [x] Botón **Continuar con Apple** en login y registro (oculto hasta que lo actives, ver paso 9).
- [x] Automatización cada 15 minutos gratis con GitHub (`.github/workflows/automation.yml`), porque el plan gratis de Vercel solo permite una vez al día.
- [x] Apps de iPhone y Android preparadas: `capacitor.config.json`, iconos y splash en `assets/`, página sin internet, enlaces de regreso a la app, notificaciones push (`lib/push.ts`, `/api/push/register`) y script `scripts/mobile-setup.sh`.
- [x] En la app del teléfono: Google, Stripe y sitios externos se abren en el navegador del sistema (Google bloquea su login dentro de apps).
- [x] 306 textos nuevos traducidos al español.
- [x] Textos, capturas e imágenes para App Store y Google Play: `STORE-LISTING.md` y `marketing/app-store/`.

## Gratis: pasos tuyos (en este orden)

1. **Supabase → SQL Editor**, pega y corre (uno por uno):
   - `supabase/SECURITY_CHECK_RUN_THIS.sql` → copia el resultado y pásamelo. Revisa que cada tabla tenga seguridad activada.
   - `supabase/cleanup_demo_leads.sql` → borra los leads de prueba.
   - `supabase/UPDATE_6_RUN_THIS.sql` → actualizaciones en vivo.
   - `supabase/UPDATE_7_RUN_THIS.sql` → notificaciones del teléfono.
   - `supabase/UPDATE_8_RUN_THIS.sql` → cuentas gratis: la prueba de 7 días empieza cuando la persona toca “Start my 7-day free trial”.
2. **Prueba local**: en la Terminal, dentro de la carpeta, `npm run dev`, abre http://localhost:3000 sin sesión y revisa la nueva página de inicio. Avísame y reviso modo claro, tablet y todo lo visual.
3. **Pide el número D-U-N-S** de Studio Base LLC (gratis, 1–2 semanas): https://developer.apple.com/enroll/duns-lookup/ — Apple lo exige para cuentas de empresa.
4. **Stripe (modo prueba, gratis)**: crea la cuenta, crea los productos Starter/Pro/Scale con precio mensual y anual, y pega las claves en `.env.local` (te guío).
5. **Resend (gratis hasta 3,000 correos al mes)**: crea la cuenta y verifica el dominio para los correos de la app.
6. **Firebase (gratis)**: crea un proyecto para las notificaciones de Android y descarga `google-services.json` (te guío cuando lleguemos).
7. **Google Cloud → OAuth consent screen**: cuando el dominio esté listo, envía la app a verificación (gratis, 1–4 semanas). Usa el video `BaseLead-AI-App-Tour.mp4` como demostración. Antes, cambia `GMAIL_INBOX_READ` a `false` y usa la dirección de respuestas de Cloudflare para no necesitar la auditoría pagada.
8. **GitHub → Settings → Secrets → Actions**: agrega `APP_URL` y `CRON_SECRET` (los mismos de Vercel) para que corra la automatización.

## Cuando pagues (en este orden)

| Paso | Costo | Qué hacer después |
|---|---|---|
| Dominio (baselead.ai o .app) | ~$15–100/año | Pásalo a Cloudflare (gratis). Te guío. |
| Vercel Pro | ~$20/mes | Subimos la app al dominio. |
| Supabase Pro | ~$25/mes | Respaldos y sin pausas. |
| Apple Developer | $99/año | Activa Sign in with Apple, la llave de notificaciones (APNs) y sube la app. |
| Google Play | $25 una vez | Sube la app de Android. |
| Anthropic API | por uso | Pega `ANTHROPIC_API_KEY` para activar la IA. |

9. **Sign in with Apple** (después de pagar Apple): Apple Developer → Identifiers → Services ID + llave; Supabase → Auth → Providers → Apple; luego `NEXT_PUBLIC_APPLE_SIGNIN=true` en Vercel.
10. **Apps del teléfono** (en tu Mac, con Xcode y Android Studio instalados):
    ```
    bash scripts/mobile-setup.sh https://TU-DOMINIO
    npx cap open ios
    ```
    En Xcode: Signing & Capabilities → tu equipo, agrega **Push Notifications** y **Background Modes → Remote notifications**, y deja iPhone **y iPad** (la app ya está adaptada al iPad en vertical, horizontal y pantalla dividida).
11. **Supabase → Auth → URL Configuration**: agrega `https://TU-DOMINIO/**` y `com.studiobase.baselead://**` a las Redirect URLs.
12. **App Store Connect**: crea la app, pega los textos de `STORE-LISTING.md`, sube las capturas, crea una cuenta demo para Apple y envía a revisión. Al principio publícala solo en **Estados Unidos**.
