// JavaScript for Live Tracking page

// Initialize map variable
let map;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map if it doesn't exist yet
    if (typeof L !== 'undefined' && !map) {
        initializeMap();
    } else {
        // If Leaflet is not loaded yet, wait for window load
        window.addEventListener('load', function () {
            if (!map) {
                initializeMap();
            }
        });
    }

    // Add any specific functionality for the live tracking page here
    // Example: Update bus location periodically
    function updateBusLocation() {
        // In a real app, this would fetch live data from an API
        console.log('Updating bus location...');
    }

    // Update location every 30 seconds
    setInterval(updateBusLocation, 30000);

    // Service Worker registration for PWA functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('./service-worker.js')
                .then(function (registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(function (error) {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
});

// Initialize the map
function initializeMap() {
    // Initialize the map
    map = L.map('map').setView([40.4406, -79.9951], 15); // Set initial view to a default location (Pittsburgh as example)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Function to get user's current location
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
        } else {
            console.log("Geolocation is not supported by this browser.");
        }
    }

    // Function to show user's location on the map
    function showUserLocation(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Add user location marker
        const userMarker = L.marker([userLat, userLng]).addTo(map);
        userMarker.bindPopup('Your Location').openPopup();

        // Add a circle around the user location to indicate accuracy
        const accuracy = position.coords.accuracy;
        L.circle([userLat, userLng], {
            color: '#6A63F6',
            fillColor: '#6A63F6',
            fillOpacity: 0.2,
            radius: accuracy
        }).addTo(map);

        // Optionally center map on user location
        map.setView([userLat, userLng], 15);

        // Hide the location confirmation popup after successful location access
        const locationConfirmation = document.getElementById('location-confirmation');
        if (locationConfirmation) {
            locationConfirmation.style.display = 'none';
        }
    }

    // Function to handle location errors
    function handleLocationError(error) {
        console.log("Unable to retrieve your location. Error code: " + error.code + ", Message: " + error.message);

        // Still show a default location if user denies location access
        // Using a default location (e.g., center of campus or city)
        const defaultMarker = L.marker([40.4406, -79.9951]).addTo(map);
        defaultMarker.bindPopup('Current Location').openPopup();

        // Hide the location confirmation popup after user has made a decision
        const locationConfirmation = document.getElementById('location-confirmation');
        if (locationConfirmation) {
            locationConfirmation.style.display = 'none';
        }
    }

    // Function to add shuttle markers to the map (currently empty as manual buses removed)
    function addShuttleMarkers() {
        // In a real app, shuttle locations would come from an API
        // For now, this function remains empty since manual buses have been removed
    }

    // Handle location confirmation buttons
    // Get references to the location confirmation elements
    const allowLocationBtn = document.getElementById('allow-location');
    const denyLocationBtn = document.getElementById('deny-location');
    const locationConfirmation = document.getElementById('location-confirmation');

    // Check if location has been previously granted or denied
    const locationPermission = localStorage.getItem('locationPermission');

    if (locationPermission === 'granted') {
        // If permission was previously granted, get location directly
        getUserLocation();
        if (locationConfirmation) {
            locationConfirmation.style.display = 'none';
        }
    } else if (locationPermission === 'denied') {
        // If permission was previously denied, show default location
        const defaultMarker = L.marker([40.4406, -79.9951]).addTo(map);
        defaultMarker.bindPopup('Current Location').openPopup();
        if (locationConfirmation) {
            locationConfirmation.style.display = 'none';
        }
    } else {
        // If no previous decision, show the confirmation popup
        // but only after the map is ready to avoid visual issues
        map.whenReady(function () {
            if (locationConfirmation) {
                locationConfirmation.style.display = 'flex';
            }
        });
    }

    // Add event listeners to the buttons
    if (allowLocationBtn) {
        allowLocationBtn.addEventListener('click', function () {
            // Store the user's choice
            localStorage.setItem('locationPermission', 'granted');
            // Get user location
            getUserLocation();
            // Hide the popup
            if (locationConfirmation) {
                locationConfirmation.style.display = 'none';
            }
        });
    }

    if (denyLocationBtn) {
        denyLocationBtn.addEventListener('click', function () {
            // Store the user's choice
            localStorage.setItem('locationPermission', 'denied');
            // Show default location
            const defaultMarker = L.marker([40.4406, -79.9951]).addTo(map);
            defaultMarker.bindPopup('Current Location').openPopup();
            // Hide the popup
            if (locationConfirmation) {
                locationConfirmation.style.display = 'none';
            }
        });
    }

    // Initialize the app when the map is ready
    map.whenReady(function () {
        // Removed shuttle markers as manual buses were removed
    });
}