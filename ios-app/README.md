# Viajero iOS

This is the native Expo version of the Viajero Spanish course. It now contains a 90-day travel curriculum for Mexico, Costa Rica, and Spain, with restaurant, hotel, transportation, and local conversation practice.

## Run it on an iPhone

1. Install Expo Go from the App Store.
2. From this directory, run `npm start`.
3. Scan the QR code with the iPhone camera or Expo Go.

The app uses the phone's native speech engine for Spanish playback, including slow playback for shadowing. Speaking practice uses the phone's native speech recognizer (via `expo-speech-recognition`) to transcribe what you say in Spanish; the "Say it aloud" challenge compares your transcript against the target phrase and shows a match score, and the Talk screen also accepts a spoken reply, transcribing it into the conversation. Speech recognition needs a development build — Expo Go does not provide a speech-recognition service, so voice input shows an "unsupported" message there; typed replies and phrase playback still work in Expo Go. A small review scheduler and progress model are included; the storage adapter is isolated in `lib/progress.ts` so native durable storage can be swapped in without changing the learning screens.

## AI conversation mode (Phase 3)

The Talk screen has a "Guided scene" mode (the original scripted practice) and an
"AI conversation" mode, which talks to a real Gemini-backed conversation partner
through a Supabase Edge Function (`supabase/functions/ai-conversation`). The
Gemini API key never ships to the device — it lives only as a server-side
secret on the Edge Function, and the function requires a valid Supabase auth
session (anonymous sign-in) before it will respond, so it can't be called
anonymously from outside the app. Conversation difficulty (1-5) is derived from
`progress.completedDays` on-device and sent with each request so the model's
system prompt adapts to the learner without the client holding any prompt logic.

This is already deployed to the `viajero` Supabase project
(`opklrtrqvaxutjtefcko`) with `verify_jwt` enabled, and `.env` in this directory
already points at it (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
— both are public, safe-to-commit values, not secrets). The function reads its
key from the `GEMINI_API_KEY` secret (get one at
https://aistudio.google.com/apikey), set via the dashboard (Edge Functions →
Secrets) or the CLI:
```bash
npx supabase login
npx supabase link --project-ref opklrtrqvaxutjtefcko
npx supabase secrets set GEMINI_API_KEY=...
```
One more thing still needs to be done by hand in the Supabase dashboard, since
it isn't exposed through the tooling used to set this up: **enable anonymous
sign-ins** — Authentication → Sign In / Providers → "Allow anonymous
sign-ins". Without it, `supabase.auth.signInAnonymously()` fails and AI
conversation mode shows a connection error (guided-scene practice is
unaffected either way).

To redeploy the function after editing `supabase/functions/ai-conversation/index.ts`:
```bash
npx supabase functions deploy ai-conversation --project-ref opklrtrqvaxutjtefcko
```

This is a single-user, personal app — there's no sign-in or cloud sync.
Progress lives only in local SQLite (`lib/progress.ts`); the only reason it
talks to Supabase at all is the anonymous session the AI conversation Edge
Function requires. (An earlier revision had an optional account/cloud-sync
feature; it was removed as unnecessary for a single-user app. The unused
`public.user_progress` table still exists in the Supabase project — drop it
by hand if you'd rather not keep it around.)

## Build with EAS

From this directory, install or use the EAS CLI, then sign in to your Expo account:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Choose `preview` for an internal iPhone build or `production` for a TestFlight/App Store build:

```bash
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest build --platform ios --profile production
```

EAS will ask for Apple Developer credentials and create or reuse the signing certificates and provisioning profile. The app's bundle identifier is `com.viajero.spanish`.

## Checks

`npm run typecheck` and `npx expo export --platform ios --clear` pass with the current project.
