# SmartShuttle

> Real-time transit tracking as a Progressive Web App — stops, routes, occupancy, and live alerts on an interactive map.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://smartshuttle.vercel.app)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-brightgreen)](#progressive-web-app-pwa-support)

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Install](#install)
- [Architecture](#architecture)
- [Design System](#design-system)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [API](#api)
- [Environment Variables](#environment-variables)
- [PWA Support](#progressive-web-app-pwa-support)
- [License](#license)

---

## Features

| Feature | Description |
|---------|------------|
| Live Stop Map | Interactive Leaflet map with nearby transit stops and route info popups |
| Live GPS Tracking | Continuous `watchPosition` with auto-follow — map follows you as you walk |
| Compass Heading | Directional cone on your location marker rotates with device orientation |
| Route & Departures | Real-time departure countdowns for nearby routes |
| Estimated Occupancy | Per-route crowding estimate (Likely Full / Moderate / Seats Available) based on vehicle type, time of day, and day of week |
| Live Alerts | Service disruptions, delays, and detours from the Transit API |
| Location Search | Search any address or landmark; persists your last location between pages |
| Route Filtering | Search by route name/number to filter both the list and map markers simultaneously |
| Swipe Navigation | Swipe left/right between Stops, Routes, and Notifications |
| Pull-to-Refresh | Quick alert refresh on the Notifications page |
| Feedback Form | Submit issues with optional file attachments (creates a GitHub Issue) |
| Transit Data Caching | IndexedDB caches transit API responses per location (stale-while-revalidate: instant display, background refresh) |
| Offline Support | Service worker caches static assets (cache-first strategy); cached transit data displayed when offline |
| PWA Installable | Add to home screen for a native app experience |

---

## Demo

Visit **[smartshuttle.vercel.app](https://smartshuttle.vercel.app)** or scan the QR code on the desktop landing page with your phone.

---

## Install

```bash
git clone https://github.com/rhythmd22/SmartShuttle.git
cd SmartShuttle

# Install dev dependencies (ESLint, Prettier)
npm install

# Run locally (requires Vercel CLI)
npm start
```

---

## Architecture

```
SmartShuttle/
├── index.html             # Entry point, page templates, SPA boot
├── api/
│   ├── transit-proxy.js   # Transit API proxy (rate-limited, key on server)
│   └── send-feedback.js   # GitHub Issues webhook for feedback
├── js/
│   ├── utils.js           # Shared utilities (maps, search, markers, helpers)
│   ├── cache.js           # IndexedDB cache layer (stale-while-revalidate)
│   ├── router.js          # Client-side SPA router (View Transitions API)
│   ├── index.js           # Landing page
│   ├── stops.js           # Stops map page
│   ├── routes.js          # Routes + departures + occupancy page
│   ├── notifications.js   # Live service alerts page
│   └── feedback.js        # Feedback submission form
├── css/
│   ├── styles.css         # Design system, reset, shared components, states
│   ├── index.css          # Landing page (stars, night glow, gradient button)
│   ├── stops.css          # Stops map layout
│   ├── routes.css         # Route panels, occupancy rows, search pill
│   ├── notifications.css  # Alert feed, filter buttons, pull-to-refresh
│   └── feedback.css       # Form fields, popup, attachment preview
├── images/                # SVG icons and assets
├── icon.svg               # Vector PWA icon (source)
├── icon-maskable.svg      # Maskable icon variant (source)
├── android-chrome-192x192.png  # PWA icon 192x192
├── android-chrome-512x512.png  # PWA icon 512x512
├── android-chrome-maskable-192x192.png  # Android adaptive icon 192x192
├── android-chrome-maskable-512x512.png  # Android adaptive icon 512x512
├── apple-touch-icon.png          # iOS home screen 180x180
├── apple-touch-icon-120x120.png  # iOS home screen 120x120
├── apple-touch-icon-152x152.png  # iOS home screen 152x152
├── apple-touch-icon-167x167.png  # iOS home screen 167x167
├── favicon.ico            # Multi-resolution favicon (16+32+48)
├── manifest.json          # PWA manifest
├── service-worker.js      # Cache-first service worker
├── .gitignore
├── .env.example           # Environment variable template
├── vercel.json            # Vercel routing, headers, rewrites
└── LICENSE
```

---

## Design System

SmartShuttle uses a CSS custom properties system consolidated into a cohesive dark theme:

### Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-body` | `#181a1b` | Page background |
| `--bg-surface` | `#131516` | Cards, panels, form inputs |
| `--bg-surface-hover` | `#2a2d2e` | Hover states, button fills |
| `--bg-input` | `#2a2d2e` | Input fields |
| `--bg-input-focus` | `#333333` | Input focus state |
| `--bg-landing` | `#0b0c15` | Landing page gradient base |

### Text & Grays

| Token | Value | Usage |
|-------|-------|-------|
| `--gray-200` | `#bababa` | Header location text |
| `--gray-300` | `#aba9a6` | Body text, descriptions, icons |
| `--gray-500` | `#6e6e6e` | Form field borders |
| `--border-color` | `#333333` | Dividers, card borders |
| `--border-light` | `rgba(255,255,255,0.06)` | Subtle row separators |

### Brand

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | `#6a63f6` | Buttons, active nav, refresh, filters |
| `--brand-primary-hover` | `#7b75ff` | Button hover |
| `--brand-primary-dark` | `#413c96` | Route arrivals panel, inactive nav |
| `--brand-primary-light` | `#8277ff` | Landing button gradient |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#06d6a0` | Real-time badges, high capacity |
| `--color-warning` | `#ffd166` | Warning severity, medium capacity |
| `--color-danger` | `#ff6b6b` | Severe alerts, low capacity, errors |
| `--color-info` | `#7b75ff` | Info severity, search result badges |

### Type Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | `0.75rem` | Captions, meta labels |
| `--text-sm` | `0.8125rem` | Current location, loading text |
| `--text-base` | `0.875rem` | Body text, button labels |
| `--text-md` | `1rem` | Header text, popup headings |
| `--text-lg` | `1.25rem` | Empty state titles |
| `--text-xl` | `1.5rem` | Status labels |
| `--text-2xl` | `2rem` | Page titles |
| `--text-3xl` | `2.5rem` | Landing hero text |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Micro gaps |
| `--space-sm` | `8px` | Standard padding, button gaps |
| `--space-md` | `12px` | Search modal padding |
| `--space-lg` | `16px` | Header padding, element margins |
| `--space-xl` | `20px` | Illustration spacing |
| `--space-2xl` | `24px` | Section padding |
| `--space-3xl` | `32px` | Empty/error state padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badges, stop codes |
| `--radius-md` | `8px` | Inputs, buttons |
| `--radius-lg` | `12px` | Search modal, popup tags |
| `--radius-xl` | `20px` | Large cards |
| `--radius-full` | `999px` | Pill buttons |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 4px 20px rgba(0,0,0,0.4)` | Search modal, general elevation |
| `--shadow-md` | `0 8px 25px rgba(106,99,246,0.4)` | Branded elevation |
| `--shadow-lg` | `0 10px 30px rgba(106,99,246,0.6)` | Heavy branded elevation |

**Key design decisions:**
- **ES Modules** — explicit `import`/`export` dependency graph
- **Page templates** in `index.html` as `<template>` elements; router clones them into `#app-root`
- **CSS scoping** — each page's stylesheet is toggled via `<link disabled>` and uses a page-specific wrapper class (`.landing-page`, `.stops-page`, `.routes-page`, `.notifications-page`, `.feedback-page`)
- **View Transitions API** — smooth SPA page transitions with CSS animation fallback

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, ES6+ (vanilla, no framework) |
| Maps | [Leaflet.js](https://leafletjs.com) 1.9.4 + OpenStreetMap tiles |
| Animations | [dotLottie Web Component](https://github.com/LottieFiles/dotlottie-web) (Lottie) |
| Font | [Inter](https://fonts.google.com/specimen/Inter) |
| API Backend | [Vercel serverless functions](https://vercel.com/docs/functions) (Node.js) |
| Transit Data | [Transit API v3](https://transitapp.com) (`external.transitapp.com`) |
| Geocoding | [Nominatim](https://nominatim.org) (OpenStreetMap) |
| Feedback | [GitHub Issues API](https://docs.github.com/en/rest/issues/issues) |
| PWA | Service Worker (cache-first), Web App Manifest |
| Hosting | [Vercel](https://vercel.com) |
| Linting | [ESLint](https://eslint.org) 8 (recommended config) |
| Formatting | [Prettier](https://prettier.io) 3 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Vercel CLI](https://vercel.com/cli) (`npm i -g vercel`)
- A Transit API key (free tier available at [transitapp.com](https://transitapp.com))

### Setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
TRANSIT_API_KEY=your_transit_api_key
GITHUB_TOKEN=your_github_personal_access_token    # optional, for feedback
GITHUB_REPO_OWNER=your_github_username            # optional
GITHUB_REPO_NAME=your_repo_name                   # optional
```

```bash
npm start          # Starts Vercel Dev server on localhost:3000
```

---

## Scripts

| Command | Description |
|---------|------------|
| `npm start` | Start local dev server (`vercel dev`) |
| `npm run lint` | Lint JS files with ESLint |
| `npm run format` | Format all files with Prettier |

---

## API

### Transit Proxy

```
GET /api/transit/nearby_routes?lat={lat}&lon={lng}&max_distance=1500
```

Proxies requests to the Transit API v3. The API key is injected server-side. Rate limited to 120 requests/minute per IP.

### Send Feedback

```
POST /api/send-feedback
Content-Type: application/json

{
  "issue_type": "app-bug",
  "description": "The map doesn't load on iOS 17",
  "attachment_info": "Attached: screenshot.png (151564 bytes, type: image/png)",
  "image_attachment": "data:image/png;base64,...",
  "attachment_name": "screenshot.png"
}
```

Creates a GitHub Issue in the configured repository. Image attachments are uploaded to the repo and linked in the issue body. Input is sanitized to prevent Markdown injection.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|------------|
| `TRANSIT_API_KEY` | Yes | Transit API v3 key from [transitapp.com](https://transitapp.com) |
| `GITHUB_TOKEN` | No | GitHub personal access token (classic: `repo` scope; fine-grained: `Issues` and `Contents` read/write) |
| `GITHUB_REPO_OWNER` | No | GitHub username or org for feedback issues |
| `GITHUB_REPO_NAME` | No | GitHub repository name for feedback issues |

---

## Progressive Web App (PWA) Support

SmartShuttle can be installed on mobile devices:

1. Open the app on your mobile device
2. **iOS Safari**: Tap Share → **Add to Home Screen**
3. **Android Chrome**: Tap the install banner or ⋮ → **Add to Home Screen**

The app launches in standalone full-screen mode with offline support. The service worker caches static assets using a cache-first strategy.

---

## License

MIT © [Rhythm Desai](LICENSE)