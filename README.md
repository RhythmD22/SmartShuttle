# SmartShuttle - Live Shuttle Tracker

## Overview

SmartShuttle is a mobile web application that provides real-time shuttle tracking for users. The application allows passengers to track shuttle locations in real-time using an interactive map, view shuttle schedules, and receive live updates about shuttle services.

## Getting Started

1. Clone this repository.
2. Launch a local web server from the project directory:
   ```bash
   python3 -m http.server
   ```
   Then open `http://localhost:8000` in your browser. You can also open `index.html` directly without a server.
3. If you prefer not to run a server, the latest version is hosted on GitHub Pages:
   <https://rhythmd22.github.io/SmartShuttle/>

## PWA Capabilities

SmartShuttle is built as a mobile and Progressive Web App with the following features:

- **Installable**: Users can install the app on their device home screen.
- **Offline Support**: Basic functionality available when offline.
- **App-like Experience**: Looks and feels like a native app when installed.
- **Fast Loading**: Optimized for performance and quick loading.

## Key Features

- **Location Services**: Access to user's location for finding nearby shuttles.
- **Offline Capability**: Basic functionality available offline through service worker.
- **PWA Installation**: Can be installed on devices as a standalone application.
- **Real-time Tracking**: View shuttle locations on an interactive map with live updates (planned).
- **Service Information**: Access to shuttle schedules, capacity, and service information (planned).
- **Push Notifications**: Live updates about shuttle status and arrival times (planned).
- **Feedback**: User feedback and rating system (planned).

## Technology Stack

- **Core Technologies**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Custom CSS with responsive design for mobile.
- **Leaflet.js**: For interactive maps.
- **PWA Support**: Includes a service worker for offline functionality and installability.

## License

This project is open source and available under the [MIT License](LICENSE).