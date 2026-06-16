# SmartShuttle

> Real-time transit tracking as a Progressive Web App — stops, routes, occupancy, and live alerts on an interactive map.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://smartshuttle.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Install](#install)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [API](#api)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Features

| Feature | Description |
|---------|------------|
| Live Stop Map | Interactive Leaflet map with nearby transit stops and route info popups |
| Route & Departures | Real-time departure countdowns for nearby routes |
| Estimated Occupancy | Per-route crowding estimate (Likely Full / Moderate / Seats Available) based on vehicle type, time of day, and day of week |
| Live Alerts | Service disruptions, delays, and detours from the Transit API |
| Location Search | Search any address or landmark; persists your last location between pages |
| Route Filtering | Search by route name/number to filter both the list and map markers simultaneously |
| Swipe Navigation | Swipe left/right between Stops, Routes, and Notifications |
| Pull-to-Refresh | Quick alert refresh on the Notifications page |
| Feedback Form | Submit issues with optional file attachments (creates a GitHub Issue) |
| Offline Support | Service worker caches static assets (cache-first strategy) |
| PWA Installable | Add to home screen for a native app experience |

---

## Demo

Visit **[smartshuttle.vercel.app](https://smartshuttle.vercel.app)** or scan the QR code on the desktop landing page with your phone.

---

## Install

### As a Progressive Web App

1. Open the app on your mobile device
2. **iOS Safari**: Tap Share → Add to Home Screen
3. **Android Chrome**: Tap the install banner or ⋮ → Add to Home Screen

### As a developer

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
├── manifest.json          # PWA manifest
├── service-worker.js      # Cache-first service worker
├── vercel.json            # Vercel routing, headers, rewrites
├── api/
│   ├── transit-proxy.js   # Transit API proxy (rate-limited, key on server)
│   └── send-feedback.js   # GitHub Issues webhook for feedback
├── js/
│   ├── utils.js           # Shared utilities (maps, search, markers, helpers)
│   ├── router.js          # Client-side SPA router (View Transitions API)
│   ├── index.js           # Landing page
│   ├── stops.js           # Stops map page
│   ├── routes.js          # Routes + departures + occupancy page
│   ├── notifications.js   # Live service alerts page
│   └── feedback.js        # Feedback submission form
├── css/
│   ├── styles.css         # Reset, shared components, skeleton/empty/error states
│   ├── index.css          # Landing page (stars, night glow, gradient button)
│   ├── stops.css          # Stops map layout
│   ├── routes.css         # Route panels, occupancy rows, search pill
│   ├── notifications.css  # Alert feed, filter buttons, pull-to-refresh
│   └── feedback.css       # Form fields, popup, attachment preview
└── images/                # SVG icons and assets
```

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
| Animations | [dotlottie-wc](https://github.com/dotlottie/dotlottie-web) (Lottie) |
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
  "attachment_info": "No attachment"
}
```

Creates a GitHub Issue in the configured repository. Input is sanitized to prevent Markdown injection.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|------------|
| `TRANSIT_API_KEY` | Yes | Transit API v3 key from [transitapp.com](https://transitapp.com) |
| `GITHUB_TOKEN` | No | GitHub personal access token for feedback issue creation |
| `GITHUB_REPO_OWNER` | No | GitHub username or org for feedback issues |
| `GITHUB_REPO_NAME` | No | GitHub repository name for feedback issues |

---

## License

MIT © [Rhythm Desai](LICENSE)