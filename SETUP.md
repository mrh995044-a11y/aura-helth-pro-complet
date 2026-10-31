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

iOS is not a release target. From a machine with an Expo account:

```bash
npx eas build -p android --profile preview
```

`eas.json` preview profile is set to produce an APK. A signed APK cannot be compiled inside this preview environment (no Android SDK or signing key). The command above is the release path.

## Languages

English, Sinhala and Tamil. Switch from Profile. Untranslated strings fall back to English.

## Emergency

1990 Suwa Seriya, or 119. The app is not an emergency service and not a diagnosis.
