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
    const stopCountDisplay = document.getElementById('stopCountDisplay');

    debouncedFindShuttles = debounce(async (lat, lng) => {
      clearShuttleMarkers();

      if (stopCountDisplay) stopCountDisplay.textContent = 'Searching...';

      try {
        const transitResponse = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`);

        if (!transitResponse.ok) {
          throw new Error(`Transit API error! status: ${transitResponse.status}`);
        }

        const transitData = await transitResponse.json();

        if (transitData.routes && transitData.routes.length > 0) {
          let stopCount = 0;
          transitData.routes.forEach(route => {
            if (route.itineraries && route.itineraries.length > 0) {
              route.itineraries.forEach(itinerary => {
                if (itinerary.closest_stop) {
                  stopCount++;
                  const stop = itinerary.closest_stop;

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

          if (stopCount === 0) {
            if (stopCountDisplay) stopCountDisplay.textContent = 'No stops nearby';
          } else {
            if (stopCountDisplay) stopCountDisplay.textContent = `${stopCount} ${stopCount === 1 ? 'stop' : 'stops'} nearby`;
          }
        } else {
          if (stopCountDisplay) stopCountDisplay.textContent = 'No stops nearby';
        }
      } catch (error) {
        console.error('Error finding nearby bus stops:', error);
        if (stopCountDisplay) stopCountDisplay.textContent = 'Unable to load stops';
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
        console.error('Geolocation is not supported by this browser.');
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
      console.error('Unable to retrieve your location. Error code: ' + error.code + ', Message: ' + error.message);

      updateLocationDisplay('Location unavailable');

      const defaultLat = 39.8283;
      const defaultLng = -98.5795;

      const defaultMarker = L.marker([defaultLat, defaultLng]).addTo(map);
      defaultMarker.bindPopup('Default Location (location access blocked)').openPopup();
      map.setView([defaultLat, defaultLng], 4);

      try {
        const displayName = await reverseGeocodeLocation(defaultLat, defaultLng);
        updateLocationDisplay(displayName);
      } catch (e) {
        console.error('Error getting location name:', e);
        updateLocationDisplay('Location unavailable');
      }

      findNearbyShuttles(defaultLat, defaultLng);
    };

    map.whenReady(() => {
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
    initializeLocationSearch(map, (lat, lng) => {
      findNearbyShuttles(lat, lng);
    });
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