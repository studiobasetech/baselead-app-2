# Push notifications — setup (iPhone + Android app)

The code is done: the app asks for permission, saves each phone, and BaseLead sends
notifications for replies, bookings, meeting reminders, proposal updates, new leads,
the weekly report and **missed calls**. Users control them in Settings → Notifications
(Push notifications, Missed calls, "Send test notification").

Only the keys are missing. Paste them in `.env.local` (and later in Vercel).

## 1. Database (now)
Supabase → SQL Editor → paste `supabase/UPDATE_13_RUN_THIS.sql` → Run.

## 2. Android — Firebase (free, can be done now)
1. console.firebase.google.com → Add project "BaseLead" (Analytics off).
2. Add app → Android → package name `com.studiobase.baselead` → download `google-services.json`
   → put it in `android/app/` after running `scripts/mobile-setup.sh`.
3. Project settings → Service accounts → Generate new private key (JSON file).
4. Paste the whole JSON (one line) in `.env.local` as `FIREBASE_SERVICE_ACCOUNT=`.

## 3. iPhone / iPad — Apple (after the $99 Apple Developer account)
1. developer.apple.com → Certificates, IDs & Profiles → Keys → **+** → check
   "Apple Push Notifications service (APNs)" → download the `.p8` file (only once!).
2. In `.env.local`:
   - `APNS_KEY=` the text inside the .p8 file (keep the BEGIN/END lines; use \n for line breaks)
   - `APNS_KEY_ID=` the 10-character Key ID shown next to the key
   - `APNS_TEAM_ID=` your Team ID (top right of the developer site)
   - `APNS_PRODUCTION=true` for the App Store / TestFlight build (leave empty while testing from Xcode)
3. Xcode → Signing & Capabilities → add **Push Notifications** and
   **Background Modes → Remote notifications**.

## 4. Test
Install the app on your phone → sign in → allow notifications →
Settings → Notifications → "Send test notification".
