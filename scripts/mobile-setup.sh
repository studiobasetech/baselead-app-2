#!/usr/bin/env bash
# Creates the iPhone and Android apps for BaseLead (run once, on your Mac, inside the project folder):
#   bash scripts/mobile-setup.sh https://your-domain
# Needs: Node, Xcode (for iPhone) and Android Studio (for Android). Re-run safely anytime.
set -euo pipefail

DOMAIN_URL="${1:-}"
if [ -z "$DOMAIN_URL" ]; then
  echo "Usage: bash scripts/mobile-setup.sh https://your-domain"; exit 1
fi
HOST="$(echo "$DOMAIN_URL" | sed -E 's#https?://##; s#/.*##')"

echo "→ Pointing the app at $DOMAIN_URL"
node -e '
const fs=require("fs");const c=JSON.parse(fs.readFileSync("capacitor.config.json","utf8"));
c.server.url=process.argv[1].replace(/\/$/,"")+"/today";
c.server.allowNavigation=[process.argv[2],"*.supabase.co","checkout.stripe.com","billing.stripe.com"];
fs.writeFileSync("capacitor.config.json",JSON.stringify(c,null,2)+"\n");' "$DOMAIN_URL" "$HOST"

echo "→ Installing Capacitor"
npm install @capacitor/core @capacitor/ios @capacitor/android @capacitor/app @capacitor/browser \
  @capacitor/push-notifications @capacitor/splash-screen @capacitor/status-bar
npm install -D @capacitor/cli @capacitor/assets

[ -d ios ] || npx cap add ios
[ -d android ] || npx cap add android

echo "→ App icons and splash screens"
npx capacitor-assets generate --iconBackgroundColor '#050505' --iconBackgroundColorDark '#050505' \
  --splashBackgroundColor '#050505' --splashBackgroundColorDark '#050505'

echo "→ Deep links and permissions"
node scripts/mobile-patch.cjs "$HOST"

npx cap sync
echo
echo "Done. Open the projects with:  npx cap open ios   /   npx cap open android"
echo "In Xcode: Signing & Capabilities → add 'Push Notifications' and 'Background Modes → Remote notifications'."
