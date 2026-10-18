# BaseLead en el celular y en la App Store

## Opción 1 — Hoy mismo, sin App Store (gratis)
BaseLead ya es una app instalable (PWA): icono, pantalla completa, sin barra del navegador.

1. Publica la app (ver paso “Publicar” abajo).
2. **iPhone:** abre el link en Safari → botón Compartir → **Agregar a pantalla de inicio**.
3. **Android:** abre el link en Chrome → menú ⋮ → **Instalar app**.

Tu equipo la usa como una app normal desde hoy.

## Publicar (necesario para cualquier opción)
1. Sube el proyecto a GitHub (VS Code → Source Control → Publish).
2. https://vercel.com → **Add New Project** → elige el repositorio → Deploy.
3. En Vercel → Settings → **Environment Variables**: copia todas las variables de tu `.env.local`
   y cambia `APP_URL` por tu dominio (ej. `https://app.studiobase.tech`).
4. Vercel → Settings → **Domains**: conecta tu dominio.
5. Actualiza las URLs de redirección en Google Cloud, Supabase y Stripe con el dominio nuevo.
6. El archivo `vercel.json` ya activa la automatización cada 15 minutos (requiere Vercel Pro; en el plan gratis cámbialo a una vez al día).

## Opción 2 — App Store (iPhone) y Google Play
La app nativa “envuelve” tu web publicada con **Capacitor**. Ya dejé `capacitor.config.json` listo.

Necesitas: una Mac con **Xcode**, una cuenta **Apple Developer** ($99/año) y, para Android, **Google Play Console** ($25 una vez).

1. En `capacitor.config.json` reemplaza `app.YOUR-DOMAIN.com` por tu dominio real.
2. En la terminal de VS Code:
   ```
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   npx cap add ios
   npx cap add android
   npx cap sync
   npx cap open ios
   ```
3. En Xcode: elige tu equipo de Apple en *Signing & Capabilities*, pon el icono `public/icons/icon-1024.png`
   en *Assets → AppIcon*, y luego **Product → Archive → Distribute App → App Store Connect**.
4. En https://appstoreconnect.apple.com crea la ficha: nombre, descripción, capturas de pantalla
   (iPhone 6.7" y 6.5"), política de privacidad (URL) y una **cuenta de prueba** para el revisor de Apple.

### Importante sobre la revisión de Apple
Apple rechaza apps que son “solo un sitio web dentro de una app” (regla 4.2).
Para aprobarla con más seguridad, el siguiente paso recomendado es agregar funciones nativas:
**notificaciones push** (nueva respuesta, reunión reservada), **compartir** el link de reservas
y **llamar con un toque** desde el lead. Puedo agregarlas cuando estés lista para publicar.
