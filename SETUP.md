# AuraHealth Pro — setup

Android-first wellness journal. This preview stores accounts on the device. Gemini is reached only through a server proxy (recommended) or a development key you paste yourself.

## What is reference data

Hospital phones, hours, fees, sample medicines, sample readings and sample appointments are **not verified production records**. Confirm a centre before you travel. Prices in the app (LKR 390 / month, LKR 3,490 / year) are illustrative demo prices. Checkout never charges a card and never sends a card number.

## Gemini proxy

1. Create a key in Google AI Studio.
2. Set `GEMINI_API_KEY` on the server only. Never commit it.
3. Deploy `backend/api/coach.js` as a POST route (Vercel serverless, or any Node host).
4. Optional: set `ALLOWED_ORIGIN` to your app origin.
5. In the app: Profile → AI connection → Secure proxy → paste `https://<host>/api/coach`.
6. Allow sharing before the first analysis. Health data is not sent until you do.

Direct mode stores the key on the device for development. Prefer the proxy.

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

Download **AuraHealth-Pro-preview-APK** from the successful run. It contains `AuraHealth-Pro-preview.apk`, its SHA-256 checksum, and package metadata. The workflow checks the APK signature, package ID, native architectures, and embedded Hermes bundle before uploading it.

**This is a test-install build signed with the generated Android debug certificate, not a production-signed or Play Store-ready release.** Do not use its certificate as a production upload key. Installing a build signed with a different certificate over an existing installation may require uninstalling the old app first, which can remove its local data. No signing keystore or password is uploaded as an artifact.

## Languages

English, Sinhala and Tamil. Switch from Profile. Untranslated strings fall back to English.

## Emergency

1990 Suwa Seriya, or 119. The app is not an emergency service and not a diagnosis.
