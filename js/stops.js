// JavaScript for Stops page

// Initialize map variable
let map;
let shuttleMarkers = []; // Store shuttle markers for efficient cleanup

// Debounced version of finding shuttles - moved to global scope
let debouncedFindShuttles;

// Initialize the map on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map directly without API key check
    initializeMap();

    // Initialize search functionality
    initializeSearch();

    // Initialize feedback button functionality
    initializeFeedbackButton();

    // Initialize desktop notification functionality
    initializeDesktopNotification();
});

// Debounced version of finding bus stops - moved to global scope
const initShuttleFinder = () => {
    debouncedFindShuttles = debounce(async (lat, lng) => {
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

                                // No departure info needed for popup

                                // Log stop object to see what fields are available
                                console.log('Stop object:', stop);

                                // Create detailed popup content for bus stop
                                const popupContent = `
                                    <div class="bus-stop-popup">
                                        <h3 class="stop-name">${stop.stop_name}</h3>
                                        <div class="popup-details">
                                            <div class="vehicle-type">
                                                <span class="vehicle-type-label">Vehicle:</span>
                                                <span class="vehicle-type-value ${getVehicleTypeClass(route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus')))}">${route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus'))}</span>
                                            </div>
                                            <div class="distance-info">
                                                <span class="distance-label">Distance:</span>
                                                <span class="distance-value">${stop.distance ? Math.round(stop.distance) + 'm' : 'Distance unknown'}</span>
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
};

// Function to find and display nearby shuttles (using the debounced version)
const findNearbyShuttles = async (lat, lng) => {
    if (debouncedFindShuttles) {
        debouncedFindShuttles(lat, lng);
    }
};

// Function to clear shuttle markers
const clearShuttleMarkers = () => {
    shuttleMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    shuttleMarkers = []; // Reset the array
};

// Initialize the map
const initializeMap = () => {
    // Initialize the map - start with a world view that will be replaced when location is determined
    map = L.map('map').setView([0, 0], 2); // Start with world view (0,0, zoom 2)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize shuttle finder
    initShuttleFinder();

    // Function to get user's current location
    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
        } else {
            console.log("Geolocation is not supported by this browser.");
        }
    };

    // Function to show user's location on the map
    const showUserLocation = async (position) => {
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
    };

    // Function to handle location errors
    const handleLocationError = async (error) => {
        console.log("Unable to retrieve your location. Error code: " + error.code + ", Message: " + error.message);

        // Use a more neutral default if user denies location access
        const defaultLat = 39.8283; // Approximate center of US
        const defaultLng = -98.5795;

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
    };

    // Request location directly since we don't require API key from user anymore
    getUserLocation();

    // Initialize the app when the map is ready
    map.whenReady(() => {
        // Map is ready and functional

        // Set up map move listener to show shuttles wherever the user goes
        map.on('moveend', () => {
            // Get current map center
            const center = map.getCenter();

            // Find and display shuttles around the current map center
            // This prevents too many API calls by focusing on the center
            findNearbyShuttles(center.lat, center.lng);
        });

        // Try to get user's location first, fallback to default if needed
        getUserLocation();
    });
};

// Initialize search functionality
const initializeSearch = () => {
    const searchBtn = document.querySelector('.search-btn');
    const searchModal = document.getElementById('searchModal');
    const closeSearchModal = document.getElementById('closeSearchModal');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    // Show modal when search button is clicked
    searchBtn.addEventListener('click', () => {
        searchModal.style.display = 'block';
        searchInput.focus();
    });

    // Close modal when close button is clicked
    closeSearchModal.addEventListener('click', () => {
        searchModal.style.display = 'none';
        clearSearchResults();
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
            clearSearchResults();
        }
    });

    // Show "Current Location" option when user focuses on search input
    searchInput.addEventListener('focus', () => {
        // Only show current location option if input is empty
        if (searchInput.value.trim() === '') {
            showCurrentLocationOption();
        }
    });

    // Handle search input
    let searchTimeout;
    searchInput.addEventListener('input', () => {
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
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length >= 3) {
                performSearch(query);
            }
        }
    });

    // Perform search using Nominatim API
    const performSearch = async (query) => {
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
    };

    // Display search results in the modal with bus stops first, then cities/towns
    const displaySearchResults = (results) => {
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
            resultElement.addEventListener('click', () => {
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
    };

    // Function to clear search results and input
    const clearSearchResults = () => {
        searchResults.innerHTML = '';
        searchInput.value = '';
    };

    // Function to show current location option when search input is focused
    const showCurrentLocationOption = () => {
        searchResults.innerHTML = '';

        // Create current location option
        const currentLocationElement = document.createElement('div');
        currentLocationElement.className = 'search-result-item';
        currentLocationElement.innerHTML = `
            <div class="result-title">📍 Current Location</div>
            <div class="result-address">Use my current location</div>
        `;

        // Add click event to use current location
        currentLocationElement.addEventListener('click', () => {
            // Get user's current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
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
                    (error) => {
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
    };

    // Function to save location, update UI, and center map
    const saveLocationAndCenterMap = (lat, lng, displayName) => {
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
    };

    // Function to add user location marker to the map
    const addUserLocationMarker = (userLat, userLng, position) => {
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
    };

    // Function to update the selected location display in the header
    const updateSelectedLocationDisplay = (displayName) => {
        const currentLocationSpan = document.querySelector('.current-location span');
        if (currentLocationSpan) {
            currentLocationSpan.textContent = displayName || 'Current Location';
        }
    };
};

// Refresh function to update all map data
const refreshPageData = async () => {
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
};

// Initialize the refresh functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeRefreshButton(refreshPageData);
});