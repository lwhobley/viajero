# Viajero iOS

This is the native Expo version of the Viajero Spanish course. It now contains a 90-day travel curriculum for Mexico, Costa Rica, and Spain, with restaurant, hotel, transportation, and local conversation practice.

## Run it on an iPhone

1. Install Expo Go from the App Store.
2. From this directory, run `npm start`.
3. Scan the QR code with the iPhone camera or Expo Go.

The app uses the phone's native speech engine for Spanish playback, including slow playback for shadowing. Speaking practice uses the phone's native speech recognizer (via `expo-speech-recognition`) to transcribe what you say in Spanish; the "Say it aloud" challenge compares your transcript against the target phrase and shows a match score, and the Talk screen also accepts a spoken reply, transcribing it into the conversation. A small review scheduler and progress model are included; the storage adapter is isolated in `lib/progress.ts` so native durable storage can be swapped in without changing the learning screens.

**Speech recognition needs a development build**, because Expo Go does not bundle
the native speech-recognition module. That library resolves its native module at
import time and throws when it is missing, so `lib/useSpeechToText.ts` requires
it defensively — in Expo Go the app still starts, voice input reports
"unsupported", and typed replies plus phrase playback work normally. Keep
`expo-speech-recognition` on the `2.x` line: from `56.0.0` onward its version
numbers track Expo SDK releases, and this app is on Expo SDK 53. Its
`peerDependencies` are `expo: "*"`, so npm will happily install a version that
only breaks once you make a native build.

## AI conversation mode (Phase 3)

The Talk screen has a "Guided scene" mode (the original scripted practice) and an
"AI conversation" mode, which talks to a real Gemini-backed conversation partner
through a Supabase Edge Function (`supabase/functions/ai-conversation`). The
Gemini API key never ships to the device — it lives only as a server-side
secret on the Edge Function. Conversation difficulty (1-5) is derived from
`progress.completedDays` on-device and sent with each request so the model's
system prompt adapts to the learner without the client holding any prompt logic.

The function requires a valid Supabase auth session (`verify_jwt`), but note
that this is **not** a meaningful barrier on its own: the anon key is public by
design and anonymous sign-ins are enabled, so anyone with the project URL can
mint a JWT. The actual protection against someone using the endpoint as a free
Gemini relay is a per-user daily cap (`DAILY_REQUEST_LIMIT`, currently 200),
claimed atomically through the `claim_ai_request` Postgres function backed by
the `ai_usage` table; over the cap the function returns 429. That table has RLS
on with no policies on purpose — only the Edge Function's service role touches
it. The cap fails open if the check itself errors, so also set a spend cap on
the Gemini key as the real backstop.

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
Function requires. That anonymous session is persisted (AsyncStorage) so each
launch reuses the same auth user rather than creating a new permanent one every
cold start. An earlier revision had an optional account/cloud-sync feature; it
was removed as unnecessary here, and its `user_progress` table has been dropped.

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
