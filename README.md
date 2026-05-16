# Web-Aonime

A modern web client to browse, search, and watch anime. Built with Next.js App Router, Tailwind CSS, and shadcn/ui.

## Features

- **Browse & Search Anime**: Find your favorite anime with ease.
- **View Anime Details**: Check episodes, descriptions, and show information.
- **Watch Anime**: Seamless video playback using a custom `hls.js` video player.
- **Robust APIs**: Integrates with `anikoto-scrap`.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18
- **Styling**: Tailwind CSS, shadcn/ui components
- **Video Player**: HLS.js, custom UI
- **Proxy/Backend**: Cloudflare Workers

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```
   *Note: Next.js dev server is configured to run on port 9002 with Turbopack.*

3. **Open [http://localhost:9002](http://localhost:9002) in your browser.**

## Proxy Configuration

To play certain protected M3U8 HLS streams, Web-Aonime uses a proxy to spoof headers (Origin, Referer) so requests aren't blocked by CORS.

### Cloudflare Worker Proxy (OPTIONAL)

A lightweight proxy designed to run on Cloudflare Workers. It proxies all HLS requests (manifests, segments, subtitles) securely. Free tier includes 100K requests/day and unlimited bandwidth.

To deploy your own proxy:
1. Navigate to the worker directory: `cd cloudflare-worker`
2. Deploy via wrangler: `npx wrangler deploy`
3. Once deployed, add the worker URL to your project's `.env` or `.env.local` file:

   ```env
   NEXT_PUBLIC_CF_PROXY_URL=https://your-worker-url.workers.dev
   ```
