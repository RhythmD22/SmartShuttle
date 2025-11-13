// JavaScript for Stops page

// Initialize map variable
let map;
let shuttleMarkers = []; // Store shuttle markers for efficient cleanup

// Debounced version of finding shuttles - moved to global scope
let debouncedFindShuttles;

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

// Initialize the map on page load
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map directly without API key check
    initializeMap();

    // Initialize search functionality
    initializeSearch();

    // Initialize feedback button functionality
    initializeFeedbackButton();
});

// Debounce function to limit API calls - moved to global scope
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced version of finding bus stops - moved to global scope
function initShuttleFinder() {
    debouncedFindShuttles = debounce(async function (lat, lng) {
        // Clear existing shuttle markers
        clearShuttleMarkers();

        try {
            // Use the Transit API to get nearby transit stops
            const transitResponse = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`);

            if (!transitResponse.ok) {
                throw new Error(`Transit API error! status: ${transitResponse.status}`);
            }

            const transitData = await transitResponse.json();

            if (transitData.routes && transitData.routes.length > 0) {
                // Process each route to find stops
                transitData.routes.forEach(route => {
                    if (route.itineraries && route.itineraries.length > 0) {
                        route.itineraries.forEach(itinerary => {
                            // Process stops regardless of active shuttle status to create bus stop markers
                            if (itinerary.closest_stop) {
                                const stop = itinerary.closest_stop;

                                // Create a bus stop marker using API route color
                                const routeColor = route.route_color || '413C96'; // Use route color or default purple
                                const stopIcon = L.divIcon({
                                    className: 'stop-icon',
                                    html: `<div style="background-color: #${routeColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                                    iconSize: [16, 16],
                                    iconAnchor: [8, 8]
                                });

                                // Gather all schedule items for next departure times
                                let nextDepartureTime = 'No schedule available';
                                let isRealTime = false;
                                let tripInfo = '';

                                if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                                    const nextDeparture = itinerary.schedule_items[0]; // Get first schedule item
                                    if (nextDeparture.departure_time) {
                                        const now = Date.now() / 1000; // Current time in seconds
                                        const timeDiff = Math.max(0, nextDeparture.departure_time - now);
                                        const minutes = Math.ceil(timeDiff / 60);

                                        if (minutes === 0) {
                                            nextDepartureTime = 'Departing now';
                                        } else {
                                            nextDepartureTime = `Departing in ${minutes} min`;
                                        }

                                        isRealTime = nextDeparture.is_real_time || false;
                                        tripInfo = nextDeparture.rt_trip_id ? `<br>Trip: ${nextDeparture.rt_trip_id}` : '';
                                    }
                                }

                                // Create detailed popup content for bus stop
                                const popupContent = `
                                    <div class="bus-stop-popup">
                                        <h3 class="stop-name">${stop.stop_name}</h3>
                                        <div class="popup-details">
                                            <div class="stop-info">
                                                <span class="stop-code">Stop: ${stop.stop_code || 'N/A'}</span>
                                            </div>
                                            <div class="vehicle-type">
                                                <span class="vehicle-type-label">Vehicle:</span>
                                                <span class="vehicle-type-value">${route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus'))}</span>
                                            </div>
                                            <div class="departure-info">
                                                <span class="next-departure">
                                                    ${nextDepartureTime}
                                                </span>
                                                <span class="real-time-indicator" style="color: ${isRealTime ? '#06d6a0' : '#C8C7C5'};">
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

                                const stopMarker = L.marker([stop.stop_lat, stop.stop_lon], {
                                    icon: stopIcon,
                                    purpose: 'bus-stop'
                                }).addTo(map).bindPopup(popupContent);

                                // Store reference to marker for efficient cleanup
                                shuttleMarkers.push(stopMarker);
                            }
                        });
                    }
                });
            } else {
                console.log('No bus stops found in the area');
            }
        } catch (error) {
            console.error('Error finding nearby bus stops:', error);
        }
    }, 800); // Wait 800ms after the last call before executing
}

// Function to find and display nearby shuttles (using the debounced version)
async function findNearbyShuttles(lat, lng) {
    if (debouncedFindShuttles) {
        debouncedFindShuttles(lat, lng);
    }
}

// Function to clear shuttle markers
function clearShuttleMarkers() {
    shuttleMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    shuttleMarkers = []; // Reset the array
}

// Initialize the map
function initializeMap() {
    // Initialize the map
    map = L.map('map').setView([40.4406, -79.9951], 15); // Set initial view to a default location (Pittsburgh as example)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize shuttle finder
    initShuttleFinder();

    // Function to get user's current location
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
        } else {
            console.log("Geolocation is not supported by this browser.");
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
        const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup('Your Location').openPopup();

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
        map.setView([userLat, userLng], 15);

        // Get the actual location name using reverse geocoding
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
            const data = await response.json();

            // Update the header to show the actual location name
            const locationDisplay = document.querySelector('.current-location span');
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
            const locationDisplay = document.querySelector('.current-location span');
            if (locationDisplay) {
                locationDisplay.textContent = 'Current Location';
            }
        }

        // Find and display real-time shuttles
        findNearbyShuttles(userLat, userLng);
    }

    // Function to handle location errors
    async function handleLocationError(error) {
        console.log("Unable to retrieve your location. Error code: " + error.code + ", Message: " + error.message);

        // Use default location if user denies location access
        const defaultLat = 40.4406;
        const defaultLng = -79.9951;

        const defaultMarker = L.marker([defaultLat, defaultLng]).addTo(map);
        defaultMarker.bindPopup('Current Location').openPopup();

        // Update the header to show the location name for the default location
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${defaultLat}&lon=${defaultLng}`);
            const data = await response.json();

            // Update the header to show the actual location name
            const locationDisplay = document.querySelector('.current-location span');
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
            const locationDisplay = document.querySelector('.current-location span');
            if (locationDisplay) {
                locationDisplay.textContent = 'Current Location';
            }
        }

        // Find and display real-time shuttles at default location
        findNearbyShuttles(defaultLat, defaultLng);
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

    // Request location directly since we don't require API key from user anymore
    getUserLocation();

    // Initialize the app when the map is ready
    map.whenReady(function () {
        // Map is ready and functional

        // Set up map move listener to show shuttles wherever the user goes
        map.on('moveend', function () {
            // Get current map bounds
            const bounds = map.getBounds();
            const center = map.getCenter();

            // Find and display shuttles around the current map center
            // This prevents too many API calls by focusing on the center
            findNearbyShuttles(center.lat, center.lng);
        });

        // Also find shuttles at the initial location
        findNearbyShuttles(40.4406, -79.9951);
    });
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

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function (event) {
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
            clearSearchResults();
        }
    });

    // Show "Current Location" option when user focuses on search input
    searchInput.addEventListener('focus', function () {
        // Only show current location option if input is empty
        if (searchInput.value.trim() === '') {
            showCurrentLocationOption();
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
            // The class and type properties from Nominatim are used to identify different place types
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
                localStorage.setItem('selectedTrackingLocation', JSON.stringify(selectedLocation));

                // Update the header text to reflect the selected location
                updateSelectedLocationDisplay(result.display_name);

                // Center the map on the selected location
                map.setView([lat, lon], 13); // Zoom level 13 for good detail

                // Close the modal after selection
                searchModal.style.display = 'none';
                clearSearchResults();

                // Find and display nearby shuttles at the new location
                findNearbyShuttles(lat, lon);
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
                        updateSelectedLocationDisplay('Location access denied');
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
        localStorage.setItem('selectedTrackingLocation', JSON.stringify(selectedLocation));

        // Update the location display
        updateSelectedLocationDisplay(displayName);

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

        // Find and display nearby shuttles at the new location
        findNearbyShuttles(lat, lng);
    }

    // Function to add user location marker to the map
    function addUserLocationMarker(userLat, userLng, position) {
        const userIcon = L.divIcon({
            className: 'user-location-icon',
            html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        // Check if there's already a user location marker and remove it
        if (window.userLocationMarker) {
            map.removeLayer(window.userLocationMarker);
        }

        const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup('Your Location').openPopup();
        window.userLocationMarker = userMarker; // Store reference to remove later if needed

        // Add a circle around the user location to indicate accuracy
        const accuracy = position?.coords?.accuracy || 100; // Use actual accuracy or default to 100
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

    // Function to update the selected location display in the header
    function updateSelectedLocationDisplay(displayName) {
        const currentLocationSpan = document.querySelector('.current-location span');
        if (currentLocationSpan) {
            currentLocationSpan.textContent = displayName || 'Current Location';
        }
    }
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

// Refresh function to update all map data
async function refreshPageData() {
    // Get current map center
    const center = map.getCenter();

    // Clear existing markers
    clearShuttleMarkers();

    // Find and display nearby shuttles at current location
    findNearbyShuttles(center.lat, center.lng);

    // Update the location display
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`);
        const data = await response.json();

        // Update the header to show the actual location name
        const locationDisplay = document.querySelector('.current-location span');
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
        const locationDisplay = document.querySelector('.current-location span');
        if (locationDisplay) {
            locationDisplay.textContent = 'Current Location';
        }
    }
}

// Initialize the refresh functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeRefreshButton();
});