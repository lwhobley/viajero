# Viajero iOS

This is the native Expo version of the Viajero Spanish course. It now contains a 90-day travel curriculum for Mexico, Costa Rica, and Spain, with restaurant, hotel, transportation, and local conversation practice.

## Run it on an iPhone

1. Install Expo Go from the App Store.
2. From this directory, run `npm start`.
3. Scan the QR code with the iPhone camera or Expo Go.

The app uses the phone's native speech engine for Spanish playback, including slow playback for shadowing. The Talk screen accepts typed replies and speaks the server's response. A small review scheduler and progress model are included; the storage adapter is isolated in `lib/progress.ts` so native durable storage can be swapped in without changing the learning screens. Microphone recording/transcription remains a development-build phase because Expo Go does not provide a speech-recognition service.

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
