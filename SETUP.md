# AuraHealth Pro — setup

Android-first wellness journal. This preview stores accounts on the device. Gemini is reached only through a server proxy (recommended) or a development key you paste yourself.

## What is reference data

Hospital phones, hours, fees, sample medicines, sample readings and sample appointments are **not verified production records**. Confirm a centre before you travel. Prices in the app (LKR 390 / month, LKR 3,490 / year) are illustrative demo prices. Checkout never charges a card and never sends a card number.

## Gemini API server (integration in progress)

The former Vercel proxy is disabled because it allowed unauthenticated public requests. `backend/server.js` is a Render-compatible Node service that verifies Firebase ID tokens for this project and requires a verified email. It keeps `GEMINI_API_KEY` on the server and limits requests per user in memory. A health check is available at `/health`.

**The mobile app does not yet authenticate with Firebase or send ID tokens to this server.** Do not deploy expecting AI or Google sign-in to work until the app integration is completed and tested. The in-memory rate limit resets on restart and applies per instance; it is not sufficient protection against abuse for a public production launch. Add persistent rate limits, App Check/abuse controls, quotas and monitoring before public deployment. ID token verification does not check revocation. Review privacy, consent and deployment requirements before handling health data.

When ready, deploy the `backend` directory with Node 20+, `npm ci` and `npm start`; configure `FIREBASE_PROJECT_ID` and `GEMINI_API_KEY` as environment variables in the hosting dashboard, never in source control or the APK. See `backend/package.json` for the local backend test command.

Direct mode stores a user-supplied key on the device for development. Prefer a properly protected backend for shared use.

## Database

The preview does not need Postgres. If you host accounts later:

```bash
psql "$DATABASE_URL" -f backend/schema.sql
```

Turn on row-level security policies before any client can read those tables. Do not store card numbers. The demo checkout discards them after a local Luhn check.

## Android

iOS is not a release target. For a signed preview using your Expo account:

```bash
npx eas-cli@latest build -p android --profile preview
```

The `preview` profile in `eas.json` produces an APK. Use a securely stored production upload key for store distribution.

### Test-install APK without Expo credentials

The **Build Android APK** GitHub Actions workflow builds without EAS credentials or repository secrets. Push this working branch, or open **Actions → Build Android APK → Run workflow** once the workflow is available on the default branch.

The workflow installs the locked dependencies, typechecks, generates the native project with Expo prebuild, and compiles a release-variant APK with an embedded Hermes JavaScript bundle. It supports Android 7.0+ on ARM phones (`arm64-v8a` and `armeabi-v7a`); it is not an x86 emulator build.

Download **AuraHealth-Pro-APK** from the successful run. It contains `AuraHealth-Pro.apk`, its SHA-256 checksum, and package metadata. The workflow checks the APK signature, package ID, native architectures, and embedded Hermes bundle before uploading it.

**This is a test-install build signed with the generated Android debug certificate, not a production-signed or Play Store-ready release.** Do not use its certificate as a production upload key. Installing a build signed with a different certificate over an existing installation may require uninstalling the old app first, which can remove its local data. No signing keystore or password is uploaded as an artifact.

## Languages

English, Sinhala and Tamil. Switch from Profile. Untranslated strings fall back to English.

## Emergency

1990 Suwa Seriya, or 119. The app is not an emergency service and not a diagnosis.

## Medication reminders and readings

In Meds, choose **Enable medication reminders** and allow notifications. Saved, non-sample medicines are scheduled daily at their listed local times; changing or deleting a medicine updates its reminders. Signing out cancels this device's medication reminders until the user signs back in. Notifications use a generic message to avoid showing medication names on the lock screen. They use the device's notification sound, not a continuous alarm. Silent mode, notification permissions, Android exact-alarm access, battery restrictions, device time changes, or other OS settings may delay or silence reminders. They must not be relied on as the only way to remember medication. Sample medicines do not generate reminders.

New email accounts start without sample health records; the Explore account and the explicit Reset samples action still use clearly labelled demonstration data. Existing accounts are not automatically changed. Readings are manually entered, not measured by the app. Input limits only catch obvious errors, not diagnoses or medical advice.
