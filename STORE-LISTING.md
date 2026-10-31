# BaseLead — App Store & Google Play listing

Copy and paste these into App Store Connect and Google Play Console. Character limits are in brackets.

## Names

- **App name** [30]: `BaseLead: AI Lead Finder`
- **Subtitle (iPhone)** [30]: `Find clients. Follow up. Close`
- **Short description (Google Play)** [80]: `Find local clients, score them with AI, and follow up automatically.`
- **Bundle ID / package**: `com.studiobase.baselead`
- **Category**: Business (secondary: Productivity)
- **Age rating**: 4+ / Everyone (no objectionable content)
- **Price**: Free to download (subscriptions are sold on the website)
- **Seller / developer name**: Studio Base LLC (Apple shows the name from your D-U-N-S enrollment)
- **Copyright** (App Store Connect): `2026 Studio Base LLC`
- **Support email**: info@studiobase.tech

## Keywords (iPhone) [100]

`leads,sales,crm,prospecting,outreach,pipeline,b2b,follow up,email,small business,clients,ai`

## Promotional text (iPhone) [170]

`Find local businesses that need what you sell, score them with AI, and let BaseLead write the emails and follow up for you.`

## Description [4000]

BaseLead is the AI sales app for agencies, contractors and service businesses that sell to other local businesses. It finds the clients, tells you who to call first, writes the emails and follows up for you, so you spend your time closing.

FIND REAL CLIENTS
• Describe what you sell and who you want to reach. BaseLead searches real local businesses and adds the best fits.
• Opportunity Radar shows where your best opportunities are on a live map.

KNOW WHO TO CALL FIRST
• Every lead gets an AI opportunity score from 0 to 100, the reasons behind it, the service to offer and an estimated deal value.
• Your daily brief picks the 3 moves most likely to win a client today.
• Ask BaseLead anything: “Who should I call first?”, “Who opened my emails?”

REACH OUT AND FOLLOW UP AUTOMATICALLY
• AI writes a personal email for each lead, sent from your own Gmail.
• See who opened, who replied and who is interested.
• Sequences send each follow-up on schedule and stop the moment a lead replies.

BOOK, PROPOSE, CLOSE
• Leads book meetings from your link, with Google Meet and Google Calendar built in.
• Send proposals, collect e-signatures and take deposits by card.
• Your pipeline moves leads from New to Won on its own.

BUILT FOR TEAMS
• Invite your reps, set monthly goals and track performance on the leaderboard.
• Share scripts, training and price sheets in the Sales Toolkit.
• Live dashboards and reports for the whole team.

Start with a 7-day free trial. Plans and billing are managed on the BaseLead website.

Questions? Visit the Support page or email info@studiobase.tech.
BaseLead is a product of Studio Base LLC.

## URLs (replace YOUR-DOMAIN)

- Marketing URL: `https://YOUR-DOMAIN/`
- Support URL: `https://YOUR-DOMAIN/support`
- Privacy Policy URL: `https://YOUR-DOMAIN/privacy`
- Terms (EULA, optional): `https://YOUR-DOMAIN/terms`
- Account deletion URL (Google Play requires it): `https://YOUR-DOMAIN/support#delete` (the “Delete your account and data” section)

## Screenshots (in marketing/app-store/)

- iPhone 6.7" (1290 × 2796): `iphone-6.7-01-today.png` … `iphone-6.7-10-dashboard.png`. App Store Connect scales these to the other iPhone sizes.
- Google Play phone (1080 × 1920): `android-01-today.png` … `android-10-dashboard.png`
- Google Play feature graphic (1024 × 500): `play-feature-graphic.png`
- Google Play icon (512 × 512): `play-icon-512.png`
- App preview video (optional): `BaseLead-AI-App-Tour.mp4` (Google Play needs it on YouTube; Apple has its own preview format, so skip it for Apple at first)
- In Xcode, set the app to **iPhone only** (Target → General → Supported Destinations → remove iPad) so you don't need iPad screenshots.

## App Privacy (Apple “nutrition label”) and Google Play Data safety

Data collected, all **linked to the user**, **not used for tracking**, not sold:

| Data type | Why | Notes |
|---|---|---|
| Contact info: name, email address | App functionality, account | Required to sign in |
| Contact info: phone number | App functionality | Only if the user adds it |
| User content: emails/messages, other user content (leads, notes, proposals) | App functionality | Sales data the user creates or imports |
| Identifiers: user ID | App functionality | Supabase account ID |
| Identifiers: device ID (push token) | App functionality | Only if notifications are allowed |
| Diagnostics: crash data | App functionality | Only if error tracking is added |
| Purchases | App functionality | Plan status only; card data stays with Stripe (web) |

- Data is encrypted in transit: **Yes**. Users can request deletion: **Yes** (in app and at /support).
- Tracking (ATT): **No**. No ads, no third-party advertising SDKs.

## App Review notes (paste in App Store Connect → App Review Information)

> BaseLead is a B2B sales tool for businesses. To review, sign in with the demo account below. The workspace has sample leads, emails, sequences and a pipeline already filled in.
> Demo account: **[create one and paste the email + password here]**
> Sign in with Apple and Google are available on the login screen. Account deletion: Settings → My Profile → Delete Account.
> Subscriptions are purchased by businesses on our website; there is no purchase inside the iOS app.
> Push notifications are used for new replies from leads, booked meetings and meeting reminders.

Before submitting, create the demo account yourself on the live app (Sign up → Use a test company), fill it with a few searches, and keep it on an active plan (use the discount code that gives a free plan).
