# Built-in calling — setup (Telnyx)

Calling is built into BaseLead (Pro and Scale). It turns on when these steps are done.
Do them after buying the domain (Telnyx must reach https://YOUR-DOMAIN/api/phone/webhook).

## 1. Run the database update
Supabase → SQL Editor → paste `supabase/UPDATE_12_RUN_THIS.sql` → Run.

## 2. Install the phone component (once)
In Terminal, in the project folder:
```
npm install @telnyx/webrtc
```
Then restart the app (`npm run dev`).

## 3. Telnyx account (Studio Base LLC)
1. Sign up at telnyx.com with the company email, verify the business (EIN), add a payment method and turn on auto-recharge.
2. **Outbound Voice Profile** → create "BaseLead" → allowed destinations: **United States and Canada only**.
3. **Call Control application** → create "BaseLead numbers":
   - Webhook URL: `https://YOUR-DOMAIN/api/phone/webhook`
   - Outbound voice profile: BaseLead
   - Copy its ID → `TELNYX_CALL_CONTROL_APP_ID`
4. **SIP Connection** → type **Credentials** → "BaseLead in-app phone":
   - Webhook URL: `https://YOUR-DOMAIN/api/phone/webhook`
   - Outbound voice profile: BaseLead
   - Copy its ID → `TELNYX_CREDENTIAL_CONNECTION_ID`
5. **Auth → API Keys** → create key → `TELNYX_API_KEY`
6. **Auth → Public Key** → copy → `TELNYX_PUBLIC_KEY`
7. Paste the four values in `.env.local` (lines are already there) and restart the app.

## 4. In BaseLead
1. Calls → Phone setup → "Get a number" for yourself and each rep (choose area code).
2. Each rep opens the Phone button, accepts the recording policy, and can call.

## Notes
- Calls only to USA and Canada (blocked elsewhere in Telnyx and in BaseLead).
- Every call is recorded; callers hear "This call may be recorded for quality and training."
- Calling is off during the free trial (paid Pro/Scale only).
- Recommended: register numbers at freecallerregistry.com so they don't show as "Spam Likely".
