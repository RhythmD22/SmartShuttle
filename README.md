# SmartShuttle

SmartShuttle is a Progressive Web Application (PWA) that provides real-time shuttle tracking for users. The application allows passengers to track shuttle locations in real-time using an interactive map, view shuttle schedules, and receive live updates about shuttle services.

## Features

- **Real-time Tracking**: View shuttle locations on an interactive map with live updates
- **Location Services**: Access to user's location for finding nearby shuttles
- **Service Information**: Access to shuttle schedules and service information
- **Offline Capability**: Basic functionality available offline through service worker
- **Responsive Design**: Works across mobile, tablet, and desktop devices
- **PWA Installation**: Can be installed on devices as a standalone application
- **Push Notifications**: Live updates about shuttle status and arrival times (planned)

## Technologies Used

- HTML5
- CSS3 (with responsive design)
- JavaScript (ES6+)
- Leaflet.js for interactive maps
- Service Worker API for offline capabilities
- Web Manifest for PWA features
- Geolocation API for location services

## Installation and Setup

1. Clone or download this repository to your local machine
2. Open `index.html` in your web browser to view the main application
3. Navigate to `live-tracking.html` to access the real-time tracking interface
4. For local development server (recommended), use:
   - Python: `python -m http.server 8000`
   - Node.js: `npx serve .`
   - Or any local server that can serve static files

## PWA Capabilities

SmartShuttle is built as a Progressive Web App with the following features:

- **Installable**: Users can install the app on their device home screen
- **Offline Support**: Basic functionality available when offline
- **App-like Experience**: Looks and feels like a native app when installed
- **Responsive**: Works on any device size
- **Fast Loading**: Optimized for performance and quick loading
- **Secure**: Served via HTTPS in production

## Project Structure

```
SmartShuttle/
├── index.html              # Main application landing page
├── live-tracking.html      # Real-time shuttle tracking interface
├── manifest.json           # PWA manifest configuration
├── service-worker.js       # Service worker for offline functionality
├── css/
│   ├── style.css           # Main application styles
│   └── live-tracking.css   # Live tracking page styles
├── js/
│   ├── main.js             # Main application JavaScript
│   └── live-tracking.js    # Live tracking page JavaScript
├── images/                 # Application images and icons
└── README.md              # Project documentation
```

## How It Works

1. **Main Interface**: The home page provides access to the live tracking feature
2. **Location Access**: On the live tracking page, the app requests access to your location
3. **Real-time Tracking**: Once location access is granted, the map displays your location and nearby shuttles
4. **Interactive Map**: Use the map controls to navigate and view shuttle positions
5. **Service Information**: Access additional information about shuttle schedules and routes

## Browser Compatibility

SmartShuttle is compatible with all modern browsers that support PWA features:
- Chrome (latest versions)
- Firefox (latest versions)
- Safari (iOS and macOS)
- Edge (latest versions)

## Contributing

Contributions to improve SmartShuttle are welcome. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Future Enhancements

- Push notifications for shuttle arrival times
- Enhanced route planning features
- User feedback and rating system
- Shuttle capacity information
- Multi-language support
- Accessibility improvements

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions about the application, please open an issue in the repository or contact the development team.