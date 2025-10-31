// JavaScript for Live Tracking page

document.addEventListener('DOMContentLoaded', function () {
    // Add any specific functionality for the live tracking page here

    // Example: Update bus location periodically
    function updateBusLocation() {
        // In a real app, this would fetch live data from an API
        console.log('Updating bus location...');
    }

    // Update location every 30 seconds
    setInterval(updateBusLocation, 30000);
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/service-worker.js')
            .then(function (registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(function (error) {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}