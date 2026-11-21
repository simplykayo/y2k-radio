# Y2K Radio

A Y2K-inspired music discovery and playlist app, built around a glossy dark interface, big artwork and a proper listening view.

Search results and playback are provided through YouTube's official services. Y2K Radio does not host music files or extract audio from YouTube.

## What it does

- Discover music through mood-based radio collections
- Search songs, artists and genres with quick search suggestions
- Play music in YouTube's official embedded player
- Open a full-screen Now Playing view with an animated artwork backdrop and playback visualizer
- Build a Song Radio queue from the current track
- Display time-synced lyrics when a licensed lyrics provider is configured
- Create playlists and add discovered tracks
- Import and export playlists as JSON files
- Like tracks and revisit recently played songs
- Manage an upcoming queue
- Toggle repeat and shuffle controls
- Set a sleep timer
- View a Wrapped-style recap with play counts and top tracks
- Switch between dark and light colourways
- Responsive desktop and mobile layouts

## Run locally

You will need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

The production files are written to `dist/`.

## YouTube search setup

Search requests run through a Cloudflare Pages Function. The API key stays in Cloudflare and is not sent to visitors' browsers.

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
2. Create or select a project and enable **YouTube Data API v3**.
3. Create an API key and restrict it to YouTube Data API v3.
4. In Cloudflare, open the Pages project and go to **Settings → Variables and Secrets**.
5. Add a secret named `YOUTUBE_API_KEY` and paste the key as its value.
6. Save and trigger a new deployment.

Do not put the key in source code, the GitHub repository, or the website. Searches from all visitors use the same project quota.

## Synced lyrics setup

Live synced lyrics use the Musixmatch subtitle API through a Cloudflare Pages Function. Access to synchronized subtitles may require an eligible commercial plan and is subject to Musixmatch terms and attribution requirements.

1. Obtain an API key and the required rights/plan from [Musixmatch for Developers](https://developer.musixmatch.com/).
2. In Cloudflare Pages, open **Settings → Variables and Secrets**.
3. Add a secret named `MUSIXMATCH_API_KEY`.
4. Save and trigger a new deployment.

The key stays server-side. If the secret is not configured, the lyrics panel explains that synced lyrics are unavailable. Do not put the key in frontend code or GitHub.

## Playback notes

Playback uses YouTube's official embedded player, which remains visible and accessible. The animated visualizer is a playback-state animation rather than a true waveform analyser: browser security prevents this app from reading audio samples from YouTube's cross-origin iframe. The animated backdrop uses the current track artwork. Song Radio searches YouTube for tracks related to the current title and artist; it is a search-based mix, not a proprietary recommendation model. YouTube determines advertising, availability, regional restrictions and other playback behaviour. The app can record when a track is selected, but it cannot reliably read full listening duration or detailed playback analytics from the embedded player. The Wrapped page therefore reports play counts and top tracks rather than claiming exact listening minutes.

The repeat option uses the embed's loop setting. Queue navigation is controlled from the app's player controls; YouTube may still apply its own playback restrictions.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

Connect this repository to Cloudflare Pages. Pushes to the connected branch can trigger a new deployment.

## Browser storage and privacy

Playlists, liked tracks, recently played tracks, and recap counts are saved in local storage in the current browser. Playlist export creates a JSON backup you can keep or import on another browser. This app does not upload personal music files because local-file importing is not part of this version.

The YouTube API key is stored as a Cloudflare secret. Y2K Radio does not host or redistribute music.
