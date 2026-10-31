// Adds the deep-link scheme (com.studiobase.baselead://) and push settings to the native projects.
// Called by scripts/mobile-setup.sh. Safe to run more than once.
const fs = require("fs");
const SCHEME = "com.studiobase.baselead";
const host = process.argv[2] || "";

// iOS: URL scheme in Info.plist
const plist = "ios/App/App/Info.plist";
if (fs.existsSync(plist)) {
  let s = fs.readFileSync(plist, "utf8");
  if (!s.includes(`<string>${SCHEME}</string>`)) {
    s = s.replace(/<dict>/, `<dict>
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>${SCHEME}</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>${SCHEME}</string>
			</array>
		</dict>
	</array>
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>`);
    fs.writeFileSync(plist, s);
    console.log("iOS: added URL scheme");
  }
}

// iOS: push notification callbacks in AppDelegate (required by @capacitor/push-notifications)
const delegate = "ios/App/App/AppDelegate.swift";
if (fs.existsSync(delegate)) {
  let s = fs.readFileSync(delegate, "utf8");
  if (!s.includes("didRegisterForRemoteNotificationsWithDeviceToken")) {
    const idx = s.lastIndexOf("}");
    s = s.slice(0, idx) + `
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
` + s.slice(idx);
    fs.writeFileSync(delegate, s);
    console.log("iOS: added push callbacks");
  }
}

// Android: deep-link intent filter
const manifest = "android/app/src/main/AndroidManifest.xml";
if (fs.existsSync(manifest)) {
  let s = fs.readFileSync(manifest, "utf8");
  if (!s.includes(`android:scheme="${SCHEME}"`)) {
    s = s.replace(/(<activity[\s\S]*?>)/, `$1
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${SCHEME}" />
            </intent-filter>`);
    fs.writeFileSync(manifest, s);
    console.log("Android: added deep link");
  }
  if (!s.includes("POST_NOTIFICATIONS")) {
    s = fs.readFileSync(manifest, "utf8").replace(/<application/, `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <application`);
    fs.writeFileSync(manifest, s);
    console.log("Android: added notification permission");
  }
}
if (host) console.log("App points to", host);
