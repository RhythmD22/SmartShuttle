(() => {
  let map;
  let routeMarkers = [];
  let currentRoutes = [];

  window.initRoutesPage = () => {
    map = null;
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
    initializeLocationSearch(map, (lat, lng) => {
      fetchRealTimeBuses(lat, lng);
    });
  };

  const initializeRouteSearch = () => {
    const routeSearchInput = document.getElementById('routeSearchInput');
    if (!routeSearchInput) return;

    routeSearchInput.addEventListener('focus', function () {
      const nav = document.getElementById('bottomNav');
      if (nav) nav.classList.add('search-active');
    });

    routeSearchInput.addEventListener('blur', function () {
      const nav = document.getElementById('bottomNav');
      if (nav) nav.classList.remove('search-active');
      setTimeout(function () {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    });

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
    map = createLeafletMap('map');

    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 350);

    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
      } else {
        console.error('Geolocation is not supported by this browser.');
        loadSelectedLocation();
      }
    };

    const showUserLocation = async (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      addMapUserMarker(map, userLat, userLng, position);
      map.setView([userLat, userLng], 13);

      try {
        const displayName = await reverseGeocodeLocation(userLat, userLng);
        updateLocationDisplay(displayName);
        fetchRealTimeBuses(userLat, userLng);
      } catch (error) {
        console.error('Error getting location name:', error);
        updateLocationDisplay('Current Location');
      }
    };

    const handleLocationError = (error) => {
      console.error('Unable to retrieve your location. Error code: ' + error.code + ', Message: ' + error.message);
      updateLocationDisplay('Location unavailable');
      loadSelectedLocation();
    };

    map.whenReady(() => {
      const savedLocation = localStorage.getItem('selectedLocation');
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation);

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
      const locationData = JSON.parse(savedLocation);

      const locationDisplay = document.getElementById('selectedLocationDisplay');
      if (locationDisplay) {
        locationDisplay.textContent = locationData.displayName || 'Saved Location';
      }

      if (locationData) {
        map.setView([locationData.lat, locationData.lon], 13);
        fetchRealTimeBuses(locationData.lat, locationData.lon);
      }
    } else {
      const locationDisplay = document.getElementById('selectedLocationDisplay');
      if (locationDisplay) {
        locationDisplay.textContent = 'Select a location';
      }
    }
  };

  const fetchRealTimeBuses = async (lat, lng) => {
    showRouteSkeletons();
    hideRoutesEmptyState();

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
        hideRoutesEmptyState();
      } else {
        currentRoutes = [];
        showRoutesEmptyState();
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
      showRouteErrorState();
    }
  };

  const processRoutesData = (routes) => {
    routes.forEach(route => {
      if (route.itineraries && route.itineraries.length > 0) {
        route.itineraries.forEach(itinerary => {
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
      routeArrivalsContent.innerHTML = '<div class="route-row"><div class="route-info" style="color:#ABA9A6;">No matching routes</div><div class="arrival-info" style="color:#ABA9A6;">-</div></div>';
      updateShuttleCapacitySection([]);
      return;
    }

    routes.forEach(route => {
      if (route.itineraries && route.itineraries.length > 0) {
        route.itineraries.forEach(itinerary => {
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
          type: shuttleType
        });
      });
    }

    if (!shuttles || shuttles.length === 0) {
      shuttleCapacityContent.innerHTML = '<div class="shuttle-row"><div class="shuttle-info" style="color:#ABA9A6;">No shuttles available</div><div class="seats-info" style="color:#ABA9A6;">-</div></div>';
      return;
    }

    shuttles.forEach(shuttle => {
      const shuttleRow = document.createElement('div');
      shuttleRow.className = 'shuttle-row';

      const baseCapacity = SHUTTLE_CAPACITY_MAP[shuttle.type] || SHUTTLE_CAPACITY_MAP['standard'];

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
      let capacityLabel = '';
      if (dynamicCapacity / baseCapacity < 0.4) {
        capacityClass = 'low-capacity';
        capacityLabel = 'Low';
      } else if (dynamicCapacity / baseCapacity < 0.7) {
        capacityClass = 'medium-capacity';
        capacityLabel = 'Medium';
      } else {
        capacityClass = 'high-capacity';
        capacityLabel = 'High';
      }

      shuttleRow.innerHTML = `
      <div class="shuttle-info">${shuttle.name}</div>
      <div class="seats-info ${capacityClass}">
        <span class="capacity-count">${dynamicCapacity} seats</span>
        <span class="capacity-label">${capacityLabel}</span>
      </div>
    `;

      shuttleCapacityContent.appendChild(shuttleRow);
    });
  };

  const refreshPageData = async () => {
    const center = map.getCenter();

    clearBusMarkers();
    fetchRealTimeBuses(center.lat, center.lng);

    try {
      const displayName = await reverseGeocodeLocation(center.lat, center.lng);
      updateLocationDisplay(displayName);
    } catch (error) {
      console.error('Error getting location name:', error);
      updateLocationDisplay('Current Location');
    }
  };

  function showRouteSkeletons() {
    const routeContent = document.getElementById('routeArrivalsContent');
    const capacityContent = document.getElementById('shuttleCapacityContent');

    if (routeContent) {
      routeContent.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const row = document.createElement('div');
        row.className = 'skeleton-row';
        row.innerHTML = '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';
        routeContent.appendChild(row);
      }
    }

    if (capacityContent) {
      capacityContent.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const row = document.createElement('div');
        row.className = 'skeleton-row';
        row.innerHTML = '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';
        capacityContent.appendChild(row);
      }
    }
  }

  function showRoutesEmptyState() {
    const wrapper = document.querySelector('.info-containers-wrapper');
    const emptyState = document.getElementById('routesEmptyState');

    if (wrapper) wrapper.style.display = 'none';
    if (emptyState) emptyState.classList.add('visible');

    const locationDisplay = document.getElementById('selectedLocationDisplay');
    if (locationDisplay) {
      locationDisplay.textContent = 'No transit available in this area';
    }
  }

  function hideRoutesEmptyState() {
    const wrapper = document.querySelector('.info-containers-wrapper');
    const emptyState = document.getElementById('routesEmptyState');

    if (wrapper) wrapper.style.display = '';
    if (emptyState) emptyState.classList.remove('visible');
  }

  function showRouteErrorState() {
    const routeContent = document.getElementById('routeArrivalsContent');
    const capacityContent = document.getElementById('shuttleCapacityContent');

    if (routeContent) {
      routeContent.innerHTML = '<div class="route-row"><div class="route-info" style="color:#ff6b6b;">Could not load routes</div><div class="arrival-info">-</div></div>';
    }
    if (capacityContent) {
      capacityContent.innerHTML = '<div class="shuttle-row"><div class="shuttle-info" style="color:#ff6b6b;">Could not load capacity</div><div class="seats-info">-</div></div>';
    }

    hideRoutesEmptyState();
  }
})();