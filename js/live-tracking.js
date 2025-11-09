// JavaScript for Live Tracking page

// Initialize map variable
let map;

// Initialize the map on page load
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map directly without API key check
    initializeMap();

    // Initialize search functionality
    initializeSearch();

    // Initialize feedback button functionality
    initializeFeedbackButton();
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

        // Find and display nearby bus stops
        findNearbyBusStops(userLat, userLng);
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

        // Find and display nearby bus stops at default location
        findNearbyBusStops(defaultLat, defaultLng);
    }

    // Debounce function to limit API calls
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

    // Debounced version of finding bus stops
    const debouncedFindBusStops = debounce(async function (lat, lng) {
        // Clear existing bus stop markers
        clearBusStopMarkers();

        try {
            // Search for bus stops within a certain radius using Overpass API via Overpass-Turbo
            const overpassQuery = `[out:json];(node["highway"="bus_stop"](around:500,${lat},${lng});way["highway"="bus_stop"](around:500,${lat},${lng}););out;`;
            const encodedQuery = encodeURIComponent(overpassQuery);
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

            const response = await fetch(overpassUrl);

            if (!response.ok) {
                throw new Error(`Overpass API error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.elements && data.elements.length > 0) {
                data.elements.forEach(element => {
                    if (element.type === 'node') {
                        // Create a bus stop marker using the stop image
                        const busStopIcon = L.divIcon({
                            className: 'bus-stop-icon',
                            html: `<img src="images/stop.svg" style="width: 24px; height: 24px;">`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        });

                        const marker = L.marker([element.lat, element.lon], {
                            icon: busStopIcon,
                            purpose: 'bus-stop'
                        }).addTo(map);

                        // Create popup content with bus stop information
                        let popupContent = '<b>Bus Stop</b>';
                        if (element.tags && element.tags.name) {
                            popupContent += `<br>Name: ${element.tags.name}`;
                        }
                        if (element.tags && element.tags.network) {
                            popupContent += `<br>Network: ${element.tags.network}`;
                        }
                        if (element.tags && element.tags.operator) {
                            popupContent += `<br>Operator: ${element.tags.operator}`;
                        }
                        if (element.tags && element.tags.ref) {
                            popupContent += `<br>Ref: ${element.tags.ref}`;
                        }

                        marker.bindPopup(popupContent);
                    }
                });
            } else {
                console.log('No bus stops found in the area');
            }
        } catch (error) {
            console.error('Error finding nearby bus stops:', error);
        }
    }, 800); // Wait 800ms after the last call before executing

    // Function to find and display nearby bus stops (using the debounced version)
    async function findNearbyBusStops(lat, lng) {
        debouncedFindBusStops(lat, lng);
    }

    // Function to clear bus stop markers
    function clearBusStopMarkers() {
        map.eachLayer(function (layer) {
            if (layer.options && layer.options.purpose === 'bus-stop') {
                map.removeLayer(layer);
            }
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

    // Request location directly since we don't require API key from user anymore
    getUserLocation();

    // Initialize the app when the map is ready
    map.whenReady(function () {
        // Map is ready and functional

        // Set up map move listener to show bus stops wherever the user goes
        map.on('moveend', function () {
            // Get current map bounds
            const bounds = map.getBounds();
            const center = map.getCenter();

            // Find and display bus stops around the current map center
            // This prevents too many API calls by focusing on the center
            findNearbyBusStops(center.lat, center.lng);
        });

        // Also find bus stops at the initial location
        findNearbyBusStops(40.4406, -79.9951);
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
        searchResults.innerHTML = ''; // Clear previous results
        searchInput.value = ''; // Clear search input
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', function (event) {
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
            searchResults.innerHTML = '';
            searchInput.value = '';
        }
    });

    // Handle search input
    let searchTimeout;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (query.length === 0) {
            searchResults.innerHTML = '';
            return;
        }

        if (query.length < 3) {
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
            let busStopResults = [];
            let generalResults = [];

            // Search for bus stops regardless of the query
            const busStopSearchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=US&format=json&limit=10&addressdetails=1&amenity=bus_stop`;

            const busStopResponse = await fetch(busStopSearchUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)'
                }
            });

            if (busStopResponse.ok) {
                const busStopData = await busStopResponse.json();
                if (busStopData && Array.isArray(busStopData)) {
                    busStopResults = busStopData;
                }
            }

            // Perform a general search for locations (cities, states, etc.)
            const generalSearchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=US&format=json&limit=10&addressdetails=1`;

            const generalResponse = await fetch(generalSearchUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)'
                }
            });

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
                searchResults.innerHTML = '';
                searchInput.value = '';

                // Clear existing markers to avoid clutter but keep user location
                clearAllMarkers();

                // Find and display nearby bus stops at the new location
                findNearbyBusStops(lat, lon);
            });

            searchResults.appendChild(resultElement);
        });
    }

    // Function to clear existing markers from the map
    function clearMapMarkers() {
        // Remove all layers except tile layers (the base map)
        map.eachLayer(function (layer) {
            if (!(layer instanceof L.TileLayer)) {
                map.removeLayer(layer);
            }
        });
    }

    // Enhanced function to clear all markers including bus stops
    function clearAllMarkers() {
        // Remove all layers except tile layers (the base map) and any custom purpose markers
        map.eachLayer(function (layer) {
            if (!(layer instanceof L.TileLayer) &&
                !(layer.options && layer.options.purpose === 'user-location')) {
                map.removeLayer(layer);
            }
        });
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
            window.location.href = 'feedback.html';
        });
    }
}



