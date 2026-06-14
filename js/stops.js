(() => {
    let map;
    let shuttleMarkers = [];

    let debouncedFindShuttles;

    window.initStopsPage = () => {
        map = null;
        shuttleMarkers = [];

        initializeMap();
        initializeSearch();
        initializeFeedbackButton();
        initializeDesktopNotification();
        initializeRefreshButton(refreshPageData);
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.isSPA) {
            window.initStopsPage();
        }
    });

    const initShuttleFinder = () => {
        debouncedFindShuttles = debounce(async (lat, lng) => {
            clearShuttleMarkers();

            try {
                const transitResponse = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`);

                if (!transitResponse.ok) {
                    throw new Error(`Transit API error! status: ${transitResponse.status}`);
                }

                const transitData = await transitResponse.json();

                if (transitData.routes && transitData.routes.length > 0) {
                    transitData.routes.forEach(route => {
                        if (route.itineraries && route.itineraries.length > 0) {
                            route.itineraries.forEach(itinerary => {
                                if (itinerary.closest_stop) {
                                    const stop = itinerary.closest_stop;

                                    // Color the stop dot using the route's GTFS
                                    // color, falling back to the brand purple.
                                    const routeColor = route.route_color || '413C96';
                                    const stopIcon = L.divIcon({
                                        className: 'stop-icon',
                                        html: `<div style="background-color: #${routeColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                                        iconSize: [16, 16],
                                        iconAnchor: [8, 8]
                                    });

                                    const popupContent = `
                                        <div class="bus-stop-popup">
                                            <h3 class="stop-name">${stop.stop_name}</h3>
                                            <div class="popup-details">
                                                <div class="vehicle-type">
                                                    <span class="vehicle-type-label">Vehicle:</span>
                                                    <span class="vehicle-type-value ${getVehicleTypeClass(route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus')))}">${route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus'))}</span>
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
        }, 800);
    };

    const findNearbyShuttles = async (lat, lng) => {
        if (debouncedFindShuttles) {
            debouncedFindShuttles(lat, lng);
        }
    };

    const clearShuttleMarkers = () => {
        shuttleMarkers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        shuttleMarkers = [];
    };

    const initializeMap = () => {
        map = createLeafletMap('map');

        initShuttleFinder();

        const getUserLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
            } else {
                console.log("Geolocation is not supported by this browser.");
            }
        };

        const showUserLocation = async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            addMapUserMarker(map, userLat, userLng, position);
            map.setView([userLat, userLng], 15);

            try {
                const displayName = await reverseGeocodeLocation(userLat, userLng);
                updateLocationDisplay(displayName);
            } catch (error) {
                console.error('Error getting location name:', error);
                updateLocationDisplay('Current Location');
            }

            findNearbyShuttles(userLat, userLng);
        };

        const handleLocationError = async (error) => {
            console.log('Unable to retrieve your location. Error code: ' + error.code + ', Message: ' + error.message);

            // Fall back to a roughly central US point so the user still sees
            // a populated map if they deny geolocation.
            const defaultLat = 39.8283;
            const defaultLng = -98.5795;

            const defaultMarker = L.marker([defaultLat, defaultLng]).addTo(map);
            defaultMarker.bindPopup('Current Location').openPopup();

            try {
                const displayName = await reverseGeocodeLocation(defaultLat, defaultLng);
                updateLocationDisplay(displayName);
            } catch (e) {
                console.error('Error getting location name:', e);
                updateLocationDisplay('Current Location');
            }

            findNearbyShuttles(defaultLat, defaultLng);
        };

        map.whenReady(() => {
            // Re-fetch shuttles whenever the user pans/zooms to a new area.
            map.on('moveend', () => {
                const center = map.getCenter();
                findNearbyShuttles(center.lat, center.lng);
            });

            const savedLocation = localStorage.getItem('selectedLocation');
            if (savedLocation) {
                try {
                    const locationData = JSON.parse(savedLocation);

                    updateLocationDisplay(locationData.displayName || 'Current Location');

                    map.setView([locationData.lat, locationData.lon], 15);

                    addMapUserMarker(map, locationData.lat, locationData.lon, null);

                    findNearbyShuttles(locationData.lat, locationData.lon);
                } catch (e) {
                    console.error('Error loading saved location:', e);
                    getUserLocation();
                }
            } else {
                getUserLocation();
            }
        });
    };

    const initializeSearch = () => {
        const searchBtn = document.querySelector('.search-btn');
        const searchModal = document.getElementById('searchModal');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');

        searchBtn.addEventListener('click', () => {
            searchModal.style.display = 'block';
            searchInput.focus();
        });

        const closeSearchModalFn = () => {
            searchModal.style.display = 'none';
            clearSearchResults();
        };

        closeSearchModal.addEventListener('click', closeSearchModalFn);

        window.addEventListener('click', (event) => {
            if (event.target === searchModal) {
                closeSearchModalFn();
            }
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() === '') {
                showCurrentLocationOption();
            }
        });

        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();

            if (query.length === 0) {
                showCurrentLocationOption();
                return;
            }

            if (query.length < 3) {
                searchResults.innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 500);
        });

        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length >= 3) {
                    performSearch(query);
                }
            }
        });

        const performSearch = async (query) => {
            try {
                const generalResults = await searchNominatim(query);
                displaySearchResults(generalResults);
            } catch (error) {
                console.error('Error with search:', error);
                searchResults.innerHTML = '<div class="search-result-item">Error performing search. Please try again.</div>';
            }
        };

        const displaySearchResults = (results) => {
            searchResults.innerHTML = '';

            if (!results || !Array.isArray(results) || results.length === 0) {
                searchResults.innerHTML = '<div class="search-result-item">No results found. Try a different search term.</div>';
                return;
            }

            const validResults = results.filter(result => {
                return result &&
                    typeof result.lat !== 'undefined' &&
                    typeof result.lon !== 'undefined' &&
                    result.display_name;
            });

            if (validResults.length !== results.length) {
                const invalidCount = results.length - validResults.length;
                console.warn(`Filtered out ${invalidCount} invalid search results`);
            }

            const busStops = [];
            const otherLocations = [];

            validResults.forEach(result => {
                // Same Nominatim quirk as in routes.js: bus stops come back
                // tagged inconsistently (class=highway type=bus_stop, class=
                // amenity type=bus_stop, or just "bus stop" in the name).
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

            const orderedResults = [...busStops, ...otherLocations];

            orderedResults.forEach(result => {
                const resultElement = document.createElement('div');
                resultElement.className = 'search-result-item';

                resultElement.innerHTML = `
                    <div class="result-title">${result.display_name}</div>
                    <div class="result-address">${result.address?.state || result.address?.county || result.address?.country || 'United States'}</div>
                `;

                resultElement.addEventListener('click', () => {
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);

                    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                        console.error('Invalid coordinates from search result:', lat, lon);
                        return;
                    }

                    saveLocationToStorage(lat, lon, result.display_name);

                    updateLocationDisplay(result.display_name);
                    map.setView([lat, lon], 13);

                    searchModal.style.display = 'none';
                    clearSearchResults();

                    findNearbyShuttles(lat, lon);
                });

                searchResults.appendChild(resultElement);
            });
        };

        const clearSearchResults = () => {
            searchResults.innerHTML = '';
            searchInput.value = '';
        };

        const showCurrentLocationOption = () => {
            searchResults.innerHTML = '';

            const currentLocationElement = document.createElement('div');
            currentLocationElement.className = 'search-result-item';
            currentLocationElement.innerHTML = `
                <div class="result-title">📍 Current Location</div>
                <div class="result-address">Use my current location</div>
            `;

            currentLocationElement.addEventListener('click', () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const userLat = position.coords.latitude;
                            const userLng = position.coords.longitude;

                            try {
                                const displayName = await reverseGeocodeLocation(userLat, userLng);
                                saveLocationAndCenterMap(userLat, userLng, displayName);
                            } catch (error) {
                                console.error('Error getting location name:', error);
                                saveLocationAndCenterMap(userLat, userLng, 'Current Location');
                            }
                        },
                        (error) => {
                            console.error('Error getting current location:', error);
                            searchResults.innerHTML = '<div class="search-result-item">Unable to retrieve your location. Please check permissions.</div>';
                            updateLocationDisplay('Location access denied');
                        }
                    );
                } else {
                    searchResults.innerHTML = '<div class="search-result-item">Geolocation is not supported by your browser.</div>';
                }
            });

            searchResults.appendChild(currentLocationElement);
        };

        const saveLocationAndCenterMap = (lat, lng, displayName) => {
            saveLocationToStorage(lat, lng, displayName);
            updateLocationDisplay(displayName);
            map.setView([lat, lng], 13);

            const searchModal = document.getElementById('searchModal');
            if (searchModal) {
                searchModal.style.display = 'none';
            }
            clearSearchResults();

            addMapUserMarker(map, lat, lng, null);

            findNearbyShuttles(lat, lng);
        };
    };

    const refreshPageData = async () => {
        const center = map.getCenter();

        clearShuttleMarkers();
        findNearbyShuttles(center.lat, center.lng);

        try {
            const displayName = await reverseGeocodeLocation(center.lat, center.lng);
            updateLocationDisplay(displayName);
        } catch (error) {
            console.error('Error getting location name:', error);
            updateLocationDisplay('Current Location');
        }
    };
})();