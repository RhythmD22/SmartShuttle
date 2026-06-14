(() => {
    let map;
    let selectedLocation = null;
    let routeMarkers = [];
    let currentRoutes = [];

    window.initRoutesPage = () => {
        map = null;
        selectedLocation = null;
        routeMarkers = [];
        currentRoutes = [];

        initializeMap();
        loadSelectedLocation();
        initializeSearch();
        initializeRouteSearch();
        initializeDesktopNotification();
        initializeFeedbackButton();
        updateShuttleCapacitySection();
        initializeRefreshButton(refreshPageData);
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.isSPA) {
            window.initRoutesPage();
        }
    });

    const initializeSearch = () => {
        const searchBtn = document.querySelector('.search-btn');
        const searchModal = document.getElementById('searchModal');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');

        const closeSearchModalFn = () => {
            searchModal.style.display = 'none';
            clearSearchResults();
        };

        // Show modal when search button is clicked
        searchBtn.addEventListener('click', () => {
            searchModal.style.display = 'block';
            searchInput.focus();
        });

        closeSearchModal.addEventListener('click', closeSearchModalFn);

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() === '') {
                showCurrentLocationOption();
            }
        });

        window.addEventListener('click', (event) => {
            if (event.target === searchModal) {
                closeSearchModalFn();
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
                const generalResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=US&limit=10&addressdetails=1`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)'
                    }
                });

                let generalResults = [];

                if (generalResponse.ok) {
                    const generalData = await generalResponse.json();
                    if (generalData && Array.isArray(generalData)) {
                        generalResults = generalData;
                    }
                }

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
                // Nominatim tags bus stops inconsistently: some come back with
                // class=highway type=bus_stop, others as amenity, and some only
                // have "bus stop" in the display name. We check all of these.
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

                    const selectedLocation = {
                        lat: lat,
                        lon: lon,
                        displayName: result.display_name,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('selectedLocation', JSON.stringify(selectedLocation));

                    const locationDisplay = document.getElementById('selectedLocationDisplay');
                    if (locationDisplay) {
                        locationDisplay.textContent = result.display_name;
                    }

                    map.setView([lat, lon], 13);

                    searchModal.style.display = 'none';
                    clearSearchResults();

                    fetchRealTimeBuses(lat, lon);
                });

                searchResults.appendChild(resultElement);
            });
        };

        function clearSearchResults() {
            searchResults.innerHTML = '';
            searchInput.value = '';
        }

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

                            // Reverse geocode to a human-readable name for the header
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

                                saveLocationAndCenterMap(userLat, userLng, displayName);
                            } catch (error) {
                                console.error('Error getting location name:', error);
                                saveLocationAndCenterMap(userLat, userLng, 'Current Location');
                            }
                        },
                        (error) => {
                            console.error('Error getting current location:', error);

                            searchResults.innerHTML = '<div class="search-result-item">Unable to retrieve your location. Please check permissions.</div>';

                            const locationDisplay = document.getElementById('selectedLocationDisplay');
                            if (locationDisplay) {
                                locationDisplay.textContent = 'Location access denied';
                            }
                        }
                    );
                } else {
                    searchResults.innerHTML = '<div class="search-result-item">Geolocation is not supported by your browser.</div>';
                }
            });

            searchResults.appendChild(currentLocationElement);
        };

        const saveLocationAndCenterMap = (lat, lng, displayName) => {
            const selectedLocation = {
                lat: lat,
                lon: lng,
                displayName: displayName,
                timestamp: Date.now()
            };
            localStorage.setItem('selectedLocation', JSON.stringify(selectedLocation));

            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = displayName;
            }

            map.setView([lat, lng], 13);

            const searchModal = document.getElementById('searchModal');
            if (searchModal) {
                searchModal.style.display = 'none';
            }
            clearSearchResults();

            addUserLocationMarker(lat, lng);

            fetchRealTimeBuses(lat, lng);
        }

        const addUserLocationMarker = (userLat, userLng, position) => {
            const userIcon = L.divIcon({
                className: 'user-location-icon',
                html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            if (window.userLocationMarker) {
                map.removeLayer(window.userLocationMarker);
            }

            const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
            userMarker.bindPopup('Your Location').openPopup();
            window.userLocationMarker = userMarker;

            const accuracy = position?.coords?.accuracy || 100;
            L.circle([userLat, userLng], {
                color: '#6A63F6',
                fillColor: '#6A63F6',
                fillOpacity: 0.5,
                radius: accuracy
            }).addTo(map);

            L.circle([userLat, userLng], {
                color: '#CCCAF6',
                fillColor: '#CCCAF6',
                fillOpacity: 0.5,
                radius: accuracy * 1.5,
                purpose: 'user-location'
            }).addTo(map);
        };
    }

    const initializeRouteSearch = () => {
        const routeSearchInput = document.getElementById('routeSearchInput');
        if (!routeSearchInput) return;

        routeSearchInput.addEventListener('input', () => {
            const query = routeSearchInput.value.toLowerCase().trim();

            if (query === '') {
                updateRouteArrivalsSection(currentRoutes);
                return;
            }

            const filteredRoutes = currentRoutes.filter(route => {
                const shortName = (route.route_short_name || '').toLowerCase();
                const longName = (route.route_long_name || '').toLowerCase();
                const routeName = (route.route_name || '').toLowerCase();
                const routeId = (route.real_time_route_id || '').toLowerCase();
                const headsign = route.itineraries?.[0]?.headsign?.toLowerCase() || '';

                return shortName.includes(query) ||
                    longName.includes(query) ||
                    routeName.includes(query) ||
                    routeId.includes(query) ||
                    headsign.includes(query);
            });

            updateRouteArrivalsSection(filteredRoutes);
        });
    };

    const initializeMap = () => {
        map = L.map('map').setView([0, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const getUserLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
            } else {
                console.log("Geolocation is not supported by this browser.");
                loadSelectedLocation();
            }
        };

        const showUserLocation = async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            const userIcon = L.divIcon({
                className: 'user-location-icon',
                html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            if (window.userLocationMarker) {
                map.removeLayer(window.userLocationMarker);
            }

            const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
            userMarker.bindPopup('Your Location').openPopup();
            window.userLocationMarker = userMarker;

            const accuracy = position.coords.accuracy;
            L.circle([userLat, userLng], {
                color: '#6A63F6',
                fillColor: '#6A63F6',
                fillOpacity: 0.5,
                radius: accuracy
            }).addTo(map);

            L.circle([userLat, userLng], {
                color: '#CCCAF6',
                fillColor: '#CCCAF6',
                fillOpacity: 0.5,
                radius: accuracy * 1.5,
                purpose: 'user-location'
            }).addTo(map);

            map.setView([userLat, userLng], 13);

            // Reverse-geocode to a short human-readable name for the header
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
                const data = await response.json();

                const locationDisplay = document.getElementById('selectedLocationDisplay');
                if (locationDisplay) {
                    if (data && data.display_name) {
                        const addressParts = data.display_name.split(',');
                        if (addressParts.length >= 3) {
                            locationDisplay.textContent = `${addressParts[0].trim()}, ${addressParts[1].trim()}`;
                        } else {
                            locationDisplay.textContent = addressParts[0].trim() || 'Current Location';
                        }
                    } else {
                        locationDisplay.textContent = 'Current Location';
                    }
                }

                fetchRealTimeBuses(userLat, userLng);
            } catch (error) {
                console.error('Error getting location name:', error);

                const locationDisplay = document.getElementById('selectedLocationDisplay');
                if (locationDisplay) {
                    locationDisplay.textContent = 'Current Location';
                }
            }
        };

        const handleLocationError = (error) => {
            console.log("Unable to retrieve your location. Error code: " + error.code + ", Message: " + error.message);
            loadSelectedLocation();
        };

        map.whenReady(() => {
            const savedLocation = localStorage.getItem('selectedLocation');
            if (savedLocation) {
                const locationData = JSON.parse(savedLocation);
                selectedLocation = locationData;

                const locationDisplay = document.getElementById('selectedLocationDisplay');
                if (locationDisplay) {
                    locationDisplay.textContent = locationData.displayName || 'Saved Location';
                }

                map.setView([locationData.lat, locationData.lon], 13);
                fetchRealTimeBuses(locationData.lat, locationData.lon);
            } else {
                getUserLocation();
            }
        });
    };

    const loadSelectedLocation = () => {
        const savedLocation = localStorage.getItem('selectedLocation');
        if (savedLocation) {
            selectedLocation = JSON.parse(savedLocation);

            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = selectedLocation.displayName || 'Saved Location';
            }

            if (selectedLocation) {
                map.setView([selectedLocation.lat, selectedLocation.lon], 13);
                fetchRealTimeBuses(selectedLocation.lat, selectedLocation.lon);
            }
        } else {
            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = 'Select a location';
            }
        }
    };

    const fetchRealTimeBuses = async (lat, lng) => {
        try {
            const response = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`);

            if (!response.ok) {
                throw new Error(`Transit API error: ${response.status}`);
            }

            const data = await response.json();

            clearBusMarkers();

            if (data.routes && data.routes.length > 0) {
                currentRoutes = data.routes;

                processRoutesData(data.routes);
                updateRouteArrivalsSection(data.routes);
            } else {
                currentRoutes = [];
                console.log('No routes found near the selected location');

                const locationDisplay = document.getElementById('selectedLocationDisplay');
                if (locationDisplay) {
                    locationDisplay.textContent = 'No transit available in this area';
                }

                updateRouteArrivalsSection([]);
                updateShuttleCapacitySection([]);
            }
        } catch (error) {
            console.error('Error fetching real-time transit:', error);
            clearBusMarkers();

            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = 'Error fetching transit data';
            }

            updateShuttleCapacitySection([]);
        }
    };

    const processRoutesData = (routes) => {
        routes.forEach((route, index) => {
            if (route.itineraries && route.itineraries.length > 0) {
                route.itineraries.forEach((itinerary, itineraryIndex) => {
                    if (itinerary.closest_stop) {
                        const stop = itinerary.closest_stop;

                        let nextDepartureTime = 'No schedule available';
                        let isRealTime = false;

                        if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                            const nextDeparture = itinerary.schedule_items[0];
                            if (nextDeparture.departure_time) {
                                const now = Date.now() / 1000;
                                const timeDiff = Math.max(0, nextDeparture.departure_time - now);
                                const minutes = Math.ceil(timeDiff / 60);

                                if (minutes === 0) {
                                    nextDepartureTime = 'Departing now';
                                } else {
                                    nextDepartureTime = `Departing in ${minutes} min`;
                                }

                                isRealTime = nextDeparture.is_real_time || false;
                            }
                        }

                        const stopIcon = L.divIcon({
                            className: 'stop-marker',
                            html: `<div style="background-color: #${route.route_color || '6A63F6'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        });

                        const popupContent = `
                        <div class="bus-stop-popup">
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
                                    <span class="${isRealTime ? 'real-time-badge' : 'scheduled-badge'}">
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

                        routeMarkers.push(stopMarker);
                    }

                    // Process schedule items (bus departure times)
                    if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                        itinerary.schedule_items.forEach(scheduleItem => {
                            if (scheduleItem.is_real_time && scheduleItem.departure_time) {
                                // TODO: render live vehicle markers on the map here.
                                // For now we just log so devs can see the data is flowing.
                                console.log(`Real-time bus for route ${route.route_short_name || route.real_time_route_id}: ${new Date(scheduleItem.departure_time * 1000).toLocaleTimeString()}`);
                            }
                        });
                    }
                });
            }
        });
    };

    const clearBusMarkers = () => {
        if (routeMarkers && Array.isArray(routeMarkers)) {
            routeMarkers.forEach(marker => {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            routeMarkers = [];
        }
    };

    const updateRouteArrivalsSection = (routes) => {
        const routeArrivalsContent = document.querySelector('.route-arrivals-content');

        if (!routeArrivalsContent) return;

        routeArrivalsContent.innerHTML = '';

        if (!routes || routes.length === 0) {
            routeArrivalsContent.innerHTML = '<div class="route-row"><div class="route-info">No routes available</div><div class="arrival-info">-</div></div>';
            updateShuttleCapacitySection([]);
            return;
        }

        routes.forEach(route => {
            if (route.itineraries && route.itineraries.length > 0) {
                route.itineraries.forEach((itinerary, index) => {
                    if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                        const scheduleItem = itinerary.schedule_items[0];

                        let arrivalText = 'Departing soon';
                        if (scheduleItem.departure_time) {
                            const now = Date.now() / 1000;
                            const timeDiff = Math.max(0, scheduleItem.departure_time - now);
                            const minutes = Math.ceil(timeDiff / 60);

                            if (minutes === 0) {
                                arrivalText = 'Departing now';
                            } else {
                                arrivalText = `Departing in ${minutes} min`;
                            }
                        }

                        const routeRow = document.createElement('div');
                        routeRow.className = 'route-row';

                        const routeName = route.route_short_name || route.real_time_route_id || 'Unknown Route';

                        routeRow.innerHTML = `
                        <div class="route-info">
                            ${routeName} (${route.mode_name || (route.route_type !== undefined ? getRouteTypeText(route.route_type) : (route.route_type_id !== undefined ? getRouteTypeText(route.route_type_id) : 'Bus'))}) - ${itinerary.headsign || 'Direction Unknown'}
                        </div>
                        <div class="arrival-info">${arrivalText}</div>
                    `;

                        routeArrivalsContent.appendChild(routeRow);
                    } else {
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

        updateShuttleCapacitySection(routes);
    };

    window.addEventListener('popstate', (event) => {
        // Browser back/forward: the router's popstate handler already drives
        // the SPA navigation, so this is intentionally a no-op.
        console.log('Back button pressed');
    });

    // Hardcoded seat counts per shuttle class. The Transit API doesn't expose
    // real-time capacity, so we use these to render the capacity bar.
    const SHUTTLE_CAPACITY_MAP = {
        micro: 6,
        small: 12,
        standard: 16,
        large: 24,
        minibus: 30,
        bus: 40
    };

    const updateShuttleCapacitySection = (routes) => {
        const shuttleCapacityContent = document.querySelector('.shuttle-capacity-content');

        if (!shuttleCapacityContent) return;

        if (routes === undefined) {
            return;
        }

        shuttleCapacityContent.innerHTML = '';

        const now = new Date();
        const currentHour = now.getHours();
        // 0 = Sunday, 1 = Monday, ...; used below to detect weekends.
        const currentDay = now.getDay();

        const isPeakTime = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 18);
        const isWeekend = (currentDay === 0 || currentDay === 6);

        let shuttles = [];

        if (routes && routes.length > 0) {
            routes.forEach((route, index) => {
                const routeType = getRouteTypeText(route.route_type || 3);
                let shuttleType = 'bus';

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
        }

        if (!shuttles || shuttles.length === 0) {
            shuttleCapacityContent.innerHTML = '<div class="shuttle-row"><div class="shuttle-info">No shuttles available</div><div class="seats-info">-</div></div>';
            return;
        }

        shuttles.forEach(shuttle => {
            const shuttleRow = document.createElement('div');
            shuttleRow.className = 'shuttle-row';

            const baseCapacity = SHUTTLE_CAPACITY_MAP[shuttle.type] || SHUTTLE_CAPACITY_MAP['standard'];

            // We don't get live capacity from the API, so we fake "available
            // seats" based on time of day to give the UI something useful to show.
            let dynamicCapacity = baseCapacity;
            let capacityStatus = 'seats';

            if (isPeakTime) {
                dynamicCapacity = Math.max(1, Math.floor(baseCapacity * 0.3));
                capacityStatus = 'seats available';
            } else if (isWeekend) {
                dynamicCapacity = Math.max(1, Math.floor(baseCapacity * 0.8));
                capacityStatus = 'seats available';
            } else {
                dynamicCapacity = Math.max(1, Math.floor(baseCapacity * 0.6));
                capacityStatus = 'seats available';
            }

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
    };

    const refreshPageData = async () => {
        const center = map.getCenter();

        clearBusMarkers();
        fetchRealTimeBuses(center.lat, center.lng);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`);
            const data = await response.json();

            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                if (data && data.display_name) {
                    const addressParts = data.display_name.split(',');
                    if (addressParts.length >= 3) {
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

            const locationDisplay = document.getElementById('selectedLocationDisplay');
            if (locationDisplay) {
                locationDisplay.textContent = 'Current Location';
            }
        }
    };
})();