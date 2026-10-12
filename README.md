# Kana Studio

A responsive, installable Japanese kana study and practice app, built with Vite, vanilla JavaScript, Lucide, WanaKana, and vite-plugin-pwa.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Features

- Hiragana, katakana, or mixed practice.
- Select individual characters or whole rows from basic kana, dakuten, and combinations.
- Study flashcards with pronunciation reveal, shuffle, and Japanese speech playback.
- Multiple-choice or typed-answer quizzes with 10, 20, or 30 questions.
- Immediate correction, session results, and review of missed characters.
- Practice history, accuracy, and daily streaks saved in browser local storage.
- Installable Android PWA with offline study, quizzes, fonts, and photography.

Changing the alphabet, character selection, answer style, or session length starts a fresh quiz. Clearing browser storage removes saved progress and may remove offline resources.

## Install on Android

1. Run `npm run build` and publish the entire `dist/` directory to an HTTPS static host, such as GitHub Pages or Netlify. Keep all generated files, including the manifest, service worker, font files, image, and icons.
2. Open that HTTPS address in Chrome on Android while connected to the internet. The first visit downloads approximately 6 MB of resources for offline use.
3. When offered, tap **Install** in the app, or use Chrome's menu and select **Install app** (sometimes **Add to Home screen**, then **Install**).
4. Open Kana Studio from its home-screen icon. After the initial download completes, enable airplane mode and reopen it to verify offline access.

Study, character selection, quizzes, sound effects, and saved results work offline. Japanese pronunciation playback depends on a Japanese text-to-speech voice installed on the phone; a cloud-only voice may require a connection. The app prefers a local Japanese voice when one is available.

Updates are downloaded when online and an **Update** button appears when a new version is ready. Updates are applied only when you choose that button, so they do not interrupt a quiz automatically.

## Test offline locally

```sh
npm run build
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173/` on this computer, let the service worker finish installing, and reload once. In browser developer tools, set the network to **Offline** and reload again. Study, quizzes, images, and fonts should still load.

The development server does not register the production service worker. Use the production preview to test the PWA. Service workers require HTTPS, except for localhost on the same device. The computer's `127.0.0.1` address is not accessible from the phone, and a normal HTTP LAN address is not sufficient for Android installation.

No hosting account, remote deployment, or store publication is configured by this project.

## Check and build

```sh
npm test
npm run build
npm run preview
```

Tests cover kana completeness, selection isolation, quiz answer choices, empty selections, and alternate romanizations. The build generates PNG app icons from `public/icon.svg` and precaches every production asset needed for offline operation. Fonts come from locally bundled Fontsource packages; the locally bundled Kyoto photo is from Unsplash.