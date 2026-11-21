# Y2K Radio

A glossy little music player inspired by the colour, texture and optimism of the early 2000s.

Y2K Radio keeps a personal audio library in the browser and can search YouTube through the official YouTube Data API. YouTube videos play in YouTube's own embedded player.

## Features

- Import audio files from your device
- Keep a local library in IndexedDB
- Search YouTube music videos
- Play YouTube results using the official embedded player
- Like tracks and keep a favourites list
- Queue local tracks
- Playback controls, seek bar and volume
- Responsive layout for desktop and mobile
- Preferences saved in the current browser

## Run it locally

You will need Node.js 18 or newer.

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
npm run preview
```

The production files are written to `dist/`.

## YouTube search setup

Search requests run through a Cloudflare Pages Function. The API key stays in Cloudflare and is not sent to visitors' browsers.

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
2. Create or select a project and enable **YouTube Data API v3**.
3. Create an API key. Restrict it to YouTube Data API v3.
4. In Cloudflare, open the Pages project and go to **Settings → Variables and Secrets**.
5. Add a secret named `YOUTUBE_API_KEY` and paste the key as its value.
6. Save the setting and trigger a new deployment.

Do not add the key to the source code, GitHub repository, or the website's settings screen. The API has quota limits; searches made by all visitors count against the same Google Cloud project quota.

YouTube playback is handled by the official embedded player. YouTube determines advertising, playback availability, regional restrictions and other playback behaviour.

## Cloudflare Pages

This project is a Vite app.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

Connect this repository in Cloudflare Pages and deploy. Every push to the connected branch can trigger a new build.

## Privacy and storage

Imported audio files are stored in the browser's IndexedDB database on the device where they were added. They are not uploaded to a server. Clearing browser site data can remove the local library, so keep original copies of your music files.

Favourites are stored in local storage in the same browser. The YouTube API key is stored as a Cloudflare secret.

## Notes

Y2K Radio does not host or redistribute music. Use audio files you have the right to play, and follow the terms of each integrated service.
