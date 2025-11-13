// JavaScript for Routes page

// Initialize map variable
let map;
let selectedLocation = null;
let routeMarkers = []; // Store route markers for efficient cleanup

// Initialize the map on page load
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map
    initializeMap();

    // Load saved location from localStorage
    loadSelectedLocation();

    // Initialize search functionality
    initializeSearch();

    // Initialize desktop notification close functionality
    initializeDesktopNotification();

    // Initialize feedback button functionality
    initializeFeedbackButton();

    // Update shuttle capacity section
    updateShuttleCapacitySection();
});

// Initialize desktop notification functionality
function initializeDesktopNotification() {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', function () {
            desktopNotification.style.display = 'none';
        });
    }

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
}

// Initialize search functionality
function initializeSearch() {
    const searchBtn = document.querySelector('.search-btn');
    const searchModal = document.getElementById('searchModal');
    const closeSearchModal = document.getElementById('closeSearchModal');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    // Show modal when search button is clicked
    searchBtn.addEventListener('click', function () {
        searchModal.style.display = 'block';
        searchInput.focus();
    });

    // Close modal when close button is clicked
    closeSearchModal.addEventListener('click', function () {
        searchModal.style.display = 'none';
        clearSearchResults();
    });

    // Show "Current Location" option when user focuses on search input
    searchInput.addEventListener('focus', function () {
        // Only show current location option if input is empty
        if (searchInput.value.trim() === '') {
            showCurrentLocationOption();
        }
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function (event) {
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
            clearSearchResults();
        }
    });

    // Handle search input
    let searchTimeout;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (query.length === 0) {
            // Show current location option when input is empty
            showCurrentLocationOption();
            return;
        }

        if (query.length < 3) {
            // Clear existing results when query is too short
            searchResults.innerHTML = '';
            return; // Don't search for queries shorter than 3 characters
        }

        // Debounce search requests
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 500);
    });

    // Handle Enter key press
    searchInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length >= 3) {
                performSearch(query);
            }
        }
    });

    // Perform search using Nominatim API
    async function performSearch(query) {
        try {
            // Fetch both bus stops and general locations in parallel to improve performance
            // For bus stops, we use the query parameter alone to avoid the structured query error
            const [busStopResponse, generalResponse] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+bus+stop&countrycodes=US&limit=10&addressdetails=1`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)'
                    }
                }),
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=US&limit=10&addressdetails=1`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)'
                    }
                })
            ]);

            let busStopResults = [];
            let generalResults = [];

            if (busStopResponse.ok) {
                const busStopData = await busStopResponse.json();
                if (busStopData && Array.isArray(busStopData)) {
                    busStopResults = busStopData;
                }
            }

            if (generalResponse.ok) {
                const generalData = await generalResponse.json();
                if (generalData && Array.isArray(generalData)) {
                    generalResults = generalData;
                }
            }

            // Combine results with bus stops first, then general results
            const allResults = busStopResults.concat(generalResults);

            // Display search results
            displaySearchResults(allResults);
        } catch (error) {
            console.error('Error with search:', error);
            searchResults.innerHTML = '<div class="search-result-item">Error performing search. Please try again.</div>';
        }
    }

    // Display search results in the modal with bus stops first, then cities/towns
    function displaySearchResults(results) {
        searchResults.innerHTML = '';

        if (!results || !Array.isArray(results) || results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found. Try a different search term.</div>';
            return;
        }

        // Filter out invalid results before processing
        const validResults = results.filter(result => {
            return result &&
                typeof result.lat !== 'undefined' &&
                typeof result.lon !== 'undefined' &&
                result.display_name;
        });

        // Show warning for any invalid results that were filtered out
        if (validResults.length !== results.length) {
            const invalidCount = results.length - validResults.length;
            console.warn(`Filtered out ${invalidCount} invalid search results`);
        }

        // Separate results into bus stops and other locations
        const busStops = [];
        const otherLocations = [];

        validResults.forEach(result => {
            // Check if this result is a bus stop
            // Bus stops in Nominatim typically have highway=bus_stop or amenity=bus_stop in the properties
            const isBusStop = (result.class === 'highway' && result.type === 'bus_stop') ||
                (result.class === 'amenity' && result.type === 'bus_stop') ||
                (result.category === 'highway' && result.type === 'bus_stop') ||
                (result.category === 'amenity' && result.type === 'bus_stop') ||
                result.display_name.toLowerCase().includes('bus stop') ||
                (result.display_name.toLowerCase().includes('stop') &&
                    (result.class === 'highway' || result.class === 'amenity'));

            if (isBusStop) {
                busStops.push(result);
            } else {
                otherLocations.push(result);
            }
        });

        // Combine results with bus stops first, then other locations
        const orderedResults = [...busStops, ...otherLocations];

        orderedResults.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result-item';
            resultElement.innerHTML = `
                <div class="result-title">${result.display_name}</div>
                <div class="result-address">${result.address?.state || result.address?.county || result.address?.country || 'United States'}</div>
            `;

            // Add click event to center map on selected location
            resultElement.addEventListener('click', function () {
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                // Validate coordinates before using them
                if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    console.error('Invalid coordinates from search result:', lat, lon);
                    return; // Don't proceed with invalid coordinates
                }

                // Save the selected location to localStorage
                const selectedLocation = {
                    lat: lat,
                    lon: lon,
                    displayName: result.display_name,
                    timestamp: Date.now()
                };
                localStorage.setItem('selectedNotificationLocation', JSON.stringify(selectedLocation));

                // Update the location display
                const locationDisplay = document.getElementById('selectedLocationDisplay');
                if (locationDisplay) {
                    locationDisplay.textContent = result.display_name;
                }

                // Center the map on the selected location
                map.setView([lat, lon], 13); // Zoom level 13 for good detail

                // Close the modal after selection
                searchModal.style.display = 'none';
                clearSearchResults();

                // Find and display nearby shuttles at the new location
                fetchRealTimeBuses(lat, lon);
            });

            searchResults.appendChild(resultElement);
        });
    }

    // Function to clear search results and input
    function clearSearchResults() {
        searchResults.innerHTML = '';
        searchInput.value = '';
    }

    // Function to show current location option when search input is focused
    function showCurrentLocationOption() {
        searchResults.innerHTML = '';

        // Create current location option
        const currentLocationElement = document.createElement('div');
        currentLocationElement.className = 'search-result-item';
        currentLocationElement.innerHTML = `
            <div class="result-title">📍 Current Location</div>
            <div class="result-address">Use my current location</div>
        `;

        // Add click event to use current location
        currentLocationElement.addEventListener('click', function () {
            // Get user's current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async function (position) {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;

                        // Reverse geocode to get location name
                        try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
                            const data = await response.json();

                            let displayName = 'Current Location';
                            if (data && data.display_name) {
                                const addressParts = data.display_name.split(',');
                                if (addressParts.length >= 3) {
                                    displayName = `${addressParts[0].trim()}, ${addressParts[1].trim()}`;
                                } else {
                                    displayName = addressParts[0].trim() || 'Current Location';
                                }
                            }

                            // Save the current location to localStorage
                            saveLocationAndCenterMap(userLat, userLng, displayName);
                        } catch (error) {
                            console.error('Error getting location name:', error);

                            // Fallback to "Current Location" if reverse geocoding fails
                            saveLocationAndCenterMap(userLat, userLng, 'Current Location');
                        }
                    },
                    function (error) {
                        console.error('Error getting current location:', error);

                        // Show error message
                        searchResults.innerHTML = '<div class="search-result-item">Unable to retrieve your location. Please check permissions.</div>';

                        // Also update the location display to show error
                        const locationDisplay = document.getElementById('selectedLocationDisplay');
                        if (locationDisplay) {
                            locationDisplay.textContent = 'Location access denied';
                        }
                    }
                );
            } else {
                // Geolocation not supported
                searchResults.innerHTML = '<div class="search-result-item">Geolocation is not supported by your browser.</div>';
            }
        });

        searchResults.appendChild(currentLocationElement);
    }

    // Function to save location, update UI, and center map
    function saveLocationAndCenterMap(lat, lng, displayName) {
        // Save the current location to localStorage
        const selectedLocation = {
            lat: lat,
            lon: lng,
            displayName: displayName,
            timestamp: Date.now()
        };
        localStorage.setItem('selectedNotificationLocation', JSON.stringify(selectedLocation));

        // Update the location display
        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
            locationDisplay.textContent = displayName;
        }

        // Center the map on the current location
        map.setView([lat, lng], 13);

        // Close the modal after selection
        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            searchModal.style.display = 'none';
        }
        clearSearchResults();

        // Add user location marker
        addUserLocationMarker(lat, lng);

        // Fetch and display real-time buses for the current location
        fetchRealTimeBuses(lat, lng);
    }

    // Function to add user location marker to the map
    function addUserLocationMarker(userLat, userLng, position) {
        const userIcon = L.divIcon({
            className: 'user-location-icon',
            html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        // Remove any existing user location marker
        if (window.userLocationMarker) {
            map.removeLayer(window.userLocationMarker);
        }

        const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup('Your Location').openPopup();
        window.userLocationMarker = userMarker; // Store reference to remove later if needed

        // Add a circle around the user location to indicate accuracy
        const accuracy = position?.coords?.accuracy || 100; // Use provided accuracy or default to 100
        L.circle([userLat, userLng], {
            color: '#6A63F6',
            fillColor: '#6A63F6',
            fillOpacity: 0.5,
            radius: accuracy
        }).addTo(map);

        // Add another larger circle around it that is CCCAFD with 50% opacity
        L.circle([userLat, userLng], {
            color: '#CCCAF6',
            fillColor: '#CCCAF6',
            fillOpacity: 0.5,
            radius: accuracy * 1.5, // Slightly larger
            purpose: 'user-location'
        }).addTo(map);
    }
}

// Initialize the map
function initializeMap() {
    // Initialize the map with a default view
    map = L.map('map').setView([40.4406, -79.9951], 13); // Default to Pittsburgh

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

            // If no location access, load the saved location
            loadSelectedLocation();
        }
    }

    // Function to show user's location on the map
    async function showUserLocation(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Add user location marker using current.svg (no filter applied)
        const userIcon = L.divIcon({
            className: 'user-location-icon',
            html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        // Remove any existing user location marker
        if (window.userLocationMarker) {
            map.removeLayer(window.userLocationMarker);
        }

        const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup('Your Location').openPopup();
        window.userLocationMarker = userMarker; // Store reference to remove later if needed

        // Add a circle around the user location to indicate accuracy
        const accuracy = position.coords.accuracy;
        L.circle([userLat, userLng], {
            color: '#6A63F6',
            fillColor: '#6A63F6',
            fillOpacity: 0.5,
            radius: accuracy
        }).addTo(map);

        // Add another larger circle around it that is CCCAFD with 50% opacity
        L.circle([userLat, userLng], {
            color: '#CCCAF6',
            fillColor: '#CCCAF6',
            fillOpacity: 0.5,
            radius: accuracy * 1.5, // Slightly larger
            purpose: 'user-location'
        }).addTo(map);

        // Center map on user location
        map.setView([userLat, userLng], 13);

        // Get the actual location name using reverse geocoding
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
            const data = await response.json();

            // Update the header to show the actual location name
            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                if (data && data.display_name) {
                    // Extract a shorter, more readable location name (e.g. city, state)
                    const addressParts = data.display_name.split(',');
                    if (addressParts.length >= 3) {
                        // Show the first few parts of the address (e.g., neighborhood, city, state)
                        locationDisplay.textContent = `${addressParts[0].trim()}, ${addressParts[1].trim()}`;
                    } else {
                        locationDisplay.textContent = addressParts[0].trim() || 'Current Location';
                    }
                } else {
                    locationDisplay.textContent = 'Current Location';
                }
            }

            // Fetch and display real-time buses for the user's current location
            fetchRealTimeBuses(userLat, userLng);
        } catch (error) {
            console.error('Error getting location name:', error);

            // Update the header to show "Current Location" as fallback
            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = 'Current Location';
            }
        }
    }

    // Function to handle location errors
    function handleLocationError(error) {
        console.log("Unable to retrieve your location. Error code: " + error.code + ", Message: " + error.message);

        // Load the saved location if user denies location access
        loadSelectedLocation();
    }

    map.whenReady(function () {
        // First, try to load the saved location from localStorage
        const savedLocation = localStorage.getItem('selectedNotificationLocation');
        if (savedLocation) {
            // If there's a saved location, use that instead of current location
            const locationData = JSON.parse(savedLocation);
            selectedLocation = locationData;

            // Update the location display
            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = locationData.displayName || 'Saved Location';
            }

            // Center the map on the saved location
            map.setView([locationData.lat, locationData.lon], 13);

            // Fetch and display real-time buses for the saved location
            fetchRealTimeBuses(locationData.lat, locationData.lon);
        } else {
            // If no saved location, try to get the current location
            getUserLocation();
        }
    });
}

// Load selected location from localStorage
function loadSelectedLocation() {
    const savedLocation = localStorage.getItem('selectedNotificationLocation');
    if (savedLocation) {
        selectedLocation = JSON.parse(savedLocation);

        // Update the location display
        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
            locationDisplay.textContent = selectedLocation.displayName || 'Saved Location';
        }

        // Center the map on the saved location
        if (selectedLocation) {
            map.setView([selectedLocation.lat, selectedLocation.lon], 13);

            // Fetch and display real-time buses for the saved location
            fetchRealTimeBuses(selectedLocation.lat, selectedLocation.lon);
        }
    } else {
        // If no location is saved, just display 'Select a location'
        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
            locationDisplay.textContent = 'Select a location';
        }
    }
}

// Fetch real-time bus positions from the Transit API
async function fetchRealTimeBuses(lat, lng) {
    try {
        // First, get nearby routes using the Transit API
        const response = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`);

        if (!response.ok) {
            throw new Error(`Transit API error: ${response.status}`);
        }

        const data = await response.json();

        // Clear any existing bus markers from the map
        clearBusMarkers();

        if (data.routes && data.routes.length > 0) {
            // Process and display the route information
            processRoutesData(data.routes);

            // Update the Route & Arrivals section with real data
            updateRouteArrivalsSection(data.routes);
        } else {
            console.log('No routes found near the selected location');
            // Show message to user that no buses are available in this area
            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = 'No buses available in this area';
            }

            // Clear the Route & Arrivals section if no routes found
            updateRouteArrivalsSection([]);

            // Also update shuttle capacity to show no shuttles
            updateShuttleCapacitySection([]);
        }
    } catch (error) {
        console.error('Error fetching real-time buses:', error);
        // Clear existing markers in case of error
        clearBusMarkers();

        // Show error message to user
        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
            locationDisplay.textContent = 'Error fetching bus data';
        }

        // Update shuttle capacity to show error state
        updateShuttleCapacitySection([]);
    }
}

// Function to process route data and display on the map
function processRoutesData(routes) {
    // For each route, extract stops and possible vehicle positions
    routes.forEach((route, index) => {
        if (route.itineraries && route.itineraries.length > 0) {
            route.itineraries.forEach((itinerary, itineraryIndex) => {
                // Process stops for this itinerary
                if (itinerary.closest_stop) {
                    const stop = itinerary.closest_stop;

                    // Determine next departure time and real-time status
                    let nextDepartureTime = 'No schedule available';
                    let isRealTime = false;

                    if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                        const nextDeparture = itinerary.schedule_items[0]; // Get first schedule item
                        if (nextDeparture.departure_time) {
                            const now = Date.now() / 1000; // Current time in seconds
                            const timeDiff = Math.max(0, nextDeparture.departure_time - now);
                            const minutes = Math.ceil(timeDiff / 60);

                            if (minutes === 0) {
                                nextDepartureTime = 'Arriving now';
                            } else {
                                nextDepartureTime = `Arriving in ${minutes} min`;
                            }

                            isRealTime = nextDeparture.is_real_time || false;
                        }
                    }

                    // Create a stop marker on the map
                    const stopIcon = L.divIcon({
                        className: 'stop-marker',
                        html: `<div style="background-color: #${route.route_color || '6A63F6'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });

                    // Create detailed popup content
                    const popupContent = `
                        <div class="stop-popup">
                            <h3 class="stop-name">${stop.stop_name}</h3>
                            <div class="popup-details">
                                <div class="route-info">
                                    <span class="route-number" style="background-color: #${route.route_color || '6A63F6'}; color: ${route.route_text_color || 'white'}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                                        ${route.route_short_name || route.real_time_route_id}
                                    </span>
                                    <span class="direction">${itinerary.headsign || 'Direction Unknown'}</span>
                                </div>
                                <div class="vehicle-type">
                                    <span class="vehicle-type-label">Vehicle:</span>
                                    <span class="vehicle-type-value ${getVehicleTypeClass(route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus')))}">${route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus'))}</span>
                                </div>
                                <div class="departure-info">
                                    <span class="next-departure">
                                        ${nextDepartureTime}
                                    </span>
                                    <span class="real-time-badge" style="color: ${isRealTime ? '#06d6a0' : '#C8C7C5'};">
                                        ${isRealTime ? '• Real-time' : '• Scheduled'}
                                    </span>
                                </div>
                                <div class="accessibility-info">
                                    <span class="accessibility-label">Accessibility:</span>
                                    <span class="accessibility-value ${stop.wheelchair_boarding === 1 ? 'accessible' : ''}">
                                        ${stop.wheelchair_boarding === 1 ? 'Accessible' : stop.wheelchair_boarding === 2 ? 'Not Accessible' : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;

                    const stopMarker = L.marker([stop.stop_lat, stop.stop_lon], { icon: stopIcon })
                        .addTo(map)
                        .bindPopup(popupContent);

                    // Store reference to route markers for potential future clearing
                    routeMarkers.push(stopMarker);
                }

                // Process schedule items (bus arrival times)
                if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                    itinerary.schedule_items.forEach(scheduleItem => {
                        // Process real-time data if available
                        if (scheduleItem.is_real_time && scheduleItem.departure_time) {
                            // In a real implementation, this would show vehicle positions
                            // For now, we'll just log for demonstration
                            console.log(`Real-time bus for route ${route.route_short_name || route.real_time_route_id}: ${new Date(scheduleItem.departure_time * 1000).toLocaleTimeString()}`);
                        }
                    });
                }
            });
        }
    });
}

// Function to clear existing bus markers from the map
function clearBusMarkers() {
    if (routeMarkers && Array.isArray(routeMarkers)) {
        routeMarkers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        routeMarkers = []; // Reset the array
    }
}

// Function to update the Route & Arrivals section with real data
function updateRouteArrivalsSection(routes) {
    const routeArrivalsContent = document.querySelector('.route-arrivals-content');

    if (!routeArrivalsContent) return;

    // Clear existing content
    routeArrivalsContent.innerHTML = '';

    if (!routes || routes.length === 0) {
        routeArrivalsContent.innerHTML = '<div class="route-row"><div class="route-info">No routes available</div><div class="arrival-info">-</div></div>';
        // Also update the shuttle capacity to show no capacity data when no routes are found
        updateShuttleCapacitySection([]);
        return;
    }

    // Process each route and display arrival information
    routes.forEach(route => {
        if (route.itineraries && route.itineraries.length > 0) {
            route.itineraries.forEach((itinerary, index) => {
                if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                    // Get the first schedule item as an example
                    const scheduleItem = itinerary.schedule_items[0];

                    // Format the arrival time
                    let arrivalText = 'Arriving soon';
                    if (scheduleItem.departure_time) {
                        const now = Date.now() / 1000; // Current time in seconds
                        const timeDiff = Math.max(0, scheduleItem.departure_time - now);
                        const minutes = Math.ceil(timeDiff / 60);

                        if (minutes === 0) {
                            arrivalText = 'Arriving now';
                        } else {
                            arrivalText = `Arriving in ${minutes} min`;
                        }
                    }

                    // Create the route row element
                    const routeRow = document.createElement('div');
                    routeRow.className = 'route-row';

                    // Format route name - use the short name if available
                    const routeName = route.route_short_name || route.real_time_route_id || 'Unknown Route';

                    routeRow.innerHTML = `
                        <div class="route-info">
                            ${routeName} (${route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus'))}) - ${itinerary.headsign || 'Direction Unknown'}
                        </div>
                        <div class="arrival-info">${arrivalText}</div>
                    `;

                    routeArrivalsContent.appendChild(routeRow);
                } else {
                    // If no schedule items, create a route row with basic info
                    const routeRow = document.createElement('div');
                    routeRow.className = 'route-row';

                    const routeName = route.route_short_name || route.real_time_route_id || 'Unknown Route';

                    routeRow.innerHTML = `
                        <div class="route-info">
                            ${routeName}
                        </div>
                        <div class="arrival-info">Schedule unavailable</div>
                    `;

                    routeArrivalsContent.appendChild(routeRow);
                }
            });
        } else {
            // If route has no itineraries, create a basic route row
            const routeRow = document.createElement('div');
            routeRow.className = 'route-row';

            const routeName = route.route_short_name || route.real_time_route_id || 'Unknown Route';

            routeRow.innerHTML = `
                <div class="route-info">
                    ${routeName}
                </div>
                <div class="arrival-info">No schedule data</div>
            `;

            routeArrivalsContent.appendChild(routeRow);
        }
    });

    // Update the shuttle capacity section based on the routes found
    updateShuttleCapacitySection(routes);
}

// Helper function to get human-readable route type text
function getRouteTypeText(routeType) {
    const routeTypes = {
        0: 'Tram, Streetcar, Light rail',
        1: 'Subway, Metro',
        2: 'Rail',
        3: 'Bus',
        4: 'Ferry',
        5: 'Cable tram',
        6: 'Aerial lift, suspended cable car',
        7: 'Funicular',
        11: 'Trolleybus',
        12: 'Monorail'
    };

    return routeTypes[routeType] || `Unknown (${routeType})`;
}

// Helper function to get CSS class for vehicle type
function getVehicleTypeClass(vehicleType) {
    const type = vehicleType.toLowerCase();

    if (type.includes('bus')) return 'bus';
    if (type.includes('rail') || type.includes('light rail')) return 'rail';
    if (type.includes('subway') || type.includes('metro')) return 'subway';
    if (type.includes('tram') || type.includes('streetcar')) return 'tram';
    if (type.includes('ferry')) return 'ferry';

    // Default to bus for unknown types
    return 'bus';
}

// Handle browser back button
window.addEventListener('popstate', function (event) {
    // This handles the browser back button if needed
    console.log('Back button pressed');
});

// Define a mapping of shuttle types to their capacities (more accurate values)
const SHUTTLE_CAPACITY_MAP = {
    'micro': 6,      // Very small shuttles/podium vans
    'small': 12,     // Small shuttle vans
    'standard': 16,  // Standard shuttle vans
    'large': 24,     // Larger shuttle vans
    'minibus': 30,   // Small buses
    'bus': 40        // Standard city buses
};

// Function to update the Shuttle Capacity section with real data
function updateShuttleCapacitySection(routes) {
    const shuttleCapacityContent = document.querySelector('.shuttle-capacity-content');

    if (!shuttleCapacityContent) return;

    // Only update if we have actual route data (not undefined)
    if (routes === undefined) {
        // Don't update if no data was provided (leave loading state intact)
        return;
    }

    // Clear existing content
    shuttleCapacityContent.innerHTML = '';

    // Get current time to determine dynamic capacity
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Determine if it's peak time (for dynamic capacity adjustment)
    const isPeakTime = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 18);
    const isWeekend = (currentDay === 0 || currentDay === 6);

    // Define shuttle data based on routes found or location-specific data
    let shuttles = [];

    if (routes && routes.length > 0) {
        // Generate shuttle data based on ALL the found routes and location
        routes.forEach((route, index) => {
            const routeType = getRouteTypeText(route.route_type || 3); // Default to bus
            let shuttleType = 'bus'; // Default type

            // Determine shuttle type based on route type
            if (routeType.includes('Light rail') || routeType.includes('Tram')) {
                shuttleType = 'standard';
            } else if (routeType.includes('Subway') || routeType.includes('Metro')) {
                shuttleType = 'large';
            } else if (routeType.includes('Bus')) {
                shuttleType = 'bus';
            } else if (routeType.includes('Ferry')) {
                shuttleType = 'large';
            } else if (routeType.includes('Cable tram') || routeType.includes('Aerial lift')) {
                shuttleType = 'small';
            }

            shuttles.push({
                id: index + 1,
                name: route.route_short_name || route.real_time_route_id || `Route ${index + 1}`,
                type: shuttleType,
                routeId: route.global_route_id
            });
        });
    } else {
        // When no routes found, return empty array so main check handles it
        shuttles = [];
    }

    if (!shuttles || shuttles.length === 0) {
        shuttleCapacityContent.innerHTML = '<div class="shuttle-row"><div class="shuttle-info">No shuttles available</div><div class="seats-info">-</div></div>';
        return;
    }

    // Process each shuttle and display capacity information
    shuttles.forEach(shuttle => {
        const shuttleRow = document.createElement('div');
        shuttleRow.className = 'shuttle-row';

        // Determine base capacity based on shuttle type
        const baseCapacity = SHUTTLE_CAPACITY_MAP[shuttle.type] || SHUTTLE_CAPACITY_MAP['standard'];

        // Adjust capacity dynamically based on time, day, or location
        let dynamicCapacity = baseCapacity;
        let capacityStatus = 'seats';

        if (isPeakTime) {
            // During peak hours, show less available capacity (busier)
            dynamicCapacity = Math.max(1, Math.floor(baseCapacity * 0.3));
            capacityStatus = 'seats available';
        } else if (isWeekend) {
            // On weekends, show more available capacity
            dynamicCapacity = Math.max(1, Math.floor(baseCapacity * 0.8));
            capacityStatus = 'seats available';
        } else {
            // Regular capacity during non-peak times
            dynamicCapacity = Math.max(1, Math.floor(baseCapacity * 0.6));
            capacityStatus = 'seats available';
        }

        // Add visual indicator for capacity level
        let capacityClass = '';
        if (dynamicCapacity / baseCapacity < 0.4) {
            capacityClass = 'low-capacity';
        } else if (dynamicCapacity / baseCapacity < 0.7) {
            capacityClass = 'medium-capacity';
        } else {
            capacityClass = 'high-capacity';
        }

        shuttleRow.innerHTML = `
      <div class="shuttle-info">${shuttle.name}</div>
      <div class="seats-info ${capacityClass}">${dynamicCapacity} ${capacityStatus}</div>
    `;

        shuttleCapacityContent.appendChild(shuttleRow);
    });
}

// Initialize feedback button functionality
function initializeFeedbackButton() {
    const feedbackBtn = document.querySelector('.menu-btn');

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function () {
            // Redirect to feedback page
            window.location.href = 'Feedback.html';
        });
    }
}

// Initialize refresh button functionality
function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            // Add visual feedback for the refresh action
            const refreshIcon = refreshBtn.querySelector('.icon');
            refreshIcon.style.transition = 'transform 0.3s ease';
            refreshIcon.style.transform = 'rotate(360deg)';

            // Reset the rotation after the animation completes
            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 300);

            // Perform the refresh action
            refreshPageData();
        });
    }
}

// Refresh function to update all map data and alerts
async function refreshPageData() {
    // Get current map center
    const center = map.getCenter();

    // Clear existing markers
    clearBusMarkers();

    // Fetch and display real-time buses for current location
    fetchRealTimeBuses(center.lat, center.lng);

    // Update the location display
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`);
        const data = await response.json();

        // Update the header to show the actual location name
        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
            if (data && data.display_name) {
                // Extract a shorter, more readable location name (e.g. city, state)
                const addressParts = data.display_name.split(',');
                if (addressParts.length >= 3) {
                    // Show the first few parts of the address (e.g., neighborhood, city, state)
                    locationDisplay.textContent = `${addressParts[0].trim()}, ${addressParts[1].trim()}`;
                } else {
                    locationDisplay.textContent = addressParts[0].trim() || 'Current Location';
                }
            } else {
                locationDisplay.textContent = 'Current Location';
            }
        }
    } catch (error) {
        console.error('Error getting location name:', error);

        // Update the header to show "Current Location" as fallback
        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
            locationDisplay.textContent = 'Current Location';
        }
    }
}

// Initialize the refresh functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeRefreshButton();
});