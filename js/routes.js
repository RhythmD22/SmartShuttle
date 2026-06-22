import { SS } from './utils.js';
import { TransitCache } from './cache.js';

(() => {
  let map;
  let routeMarkers = [];
  let currentRoutes = [];

  window.initRoutesPage = () => {
    map = null;
    routeMarkers = [];
    currentRoutes = [];

    initializeMap();
    initializeSearch();
    initializeRouteSearch();
    SS.initializeDesktopNotification();
    SS.initializeFeedbackButton();
    updateShuttleCapacitySection();
    SS.initializeRefreshButton(refreshPageData);
  };

  SS.pageInit(window.initRoutesPage);

  const initializeSearch = () => {
    SS.initializeLocationSearch(map, (lat, lng) => {
      fetchRealTimeBuses(lat, lng);
    });
  };

  const initializeRouteSearch = () => {
    const routeSearchInput = document.getElementById('routeSearchInput');
    const routeSearchClear = document.getElementById('routeSearchClear');
    if (!routeSearchInput) return;

    SS.hideBottomNavOnSearch(routeSearchInput);

    if (routeSearchClear) {
      routeSearchClear.addEventListener('pointerdown', (e) => {
        e.preventDefault();
      });
      routeSearchClear.addEventListener('click', (e) => {
        e.stopPropagation();
        routeSearchInput.value = '';
        routeSearchClear.classList.remove('visible');
        updateRouteArrivalsSection(currentRoutes);
        routeMarkers.forEach((m) => {
          if (!map.hasLayer(m)) m.addTo(map);
        });
        routeSearchInput.focus();
      });
    }

    routeSearchInput.addEventListener('input', () => {
      const query = routeSearchInput.value.toLowerCase().trim();

      if (routeSearchClear) {
        routeSearchClear.classList.toggle('visible', query.length > 0);
      }

      if (query === '') {
        updateRouteArrivalsSection(currentRoutes);
        routeMarkers.forEach((m) => {
          if (map.hasLayer(m)) return;
          m.addTo(map);
        });
        return;
      }

      const filteredRoutes = currentRoutes.filter((route) => {
        const shortName = (route.route_short_name || '').toLowerCase();
        const longName = (route.route_long_name || '').toLowerCase();
        const routeName = (route.route_name || '').toLowerCase();
        const routeId = (route.real_time_route_id || '').toLowerCase();
        const headsign = route.itineraries?.[0]?.headsign?.toLowerCase() || '';

        return (
          shortName.includes(query) ||
          longName.includes(query) ||
          routeName.includes(query) ||
          routeId.includes(query) ||
          headsign.includes(query)
        );
      });

      routeMarkers.forEach((m) => {
        if (m.searchText && m.searchText.includes(query)) {
          if (!map.hasLayer(m)) m.addTo(map);
        } else {
          if (map.hasLayer(m)) map.removeLayer(m);
        }
      });

      updateRouteArrivalsSection(filteredRoutes);
    });

    routeSearchInput.addEventListener('blur', () => {
      if (routeSearchClear && routeSearchInput.value.trim() === '') {
        routeSearchClear.classList.remove('visible');
      }
    });
  };

  const initializeMap = () => {
    map = SS.initializeTransitMap({
      elementId: 'map',
      zoom: 13,
      invalidateDelay: 350,
      fallbackToSaved: true,
      onLocationReady: (lat, lng) => fetchRealTimeBuses(lat, lng),
    });

    map.on('click', function () {
      if (window.__activePolyline) {
        map.removeLayer(window.__activePolyline);
        window.__activePolyline = null;
        window.__activePolylineTarget = null;
      }
    });
  };

  const displayRoutesFromData = (data) => {
    SS.clearMapMarkers(map, routeMarkers);

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
  };

  const fetchRealTimeBuses = async (lat, lng) => {
    SS.showSkeletons(document.getElementById('routeArrivalsContent'));
    SS.showSkeletons(document.getElementById('shuttleCapacityContent'));
    hideRoutesEmptyState();

    let hasCachedData = false;

    try {
      const cached = await TransitCache.getTransitData(lat, lng);
      if (cached && cached.data) {
        displayRoutesFromData(cached.data);
        hasCachedData = true;
      }
    } catch (e) {
      // Cache read failed — proceed to fetch fresh data
    }

    try {
      const response = await fetch(
        `/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`
      );

      if (!response.ok) {
        throw new Error(`Transit API error: ${response.status}`);
      }

      const data = await response.json();

      TransitCache.setTransitData(lat, lng, data);

      displayRoutesFromData(data);
      hasCachedData = false;
    } catch (error) {
      console.error('Error fetching real-time transit:', error);

      if (!hasCachedData) {
        SS.clearMapMarkers(map, routeMarkers);

        const locationDisplay = document.getElementById('selectedLocationDisplay');
        if (locationDisplay) {
          locationDisplay.textContent = 'Error fetching transit data';
        }

        updateShuttleCapacitySection([]);
        showRouteErrorState();
      }
    }
  };

  const processRoutesData = (routes) => {
    routes.forEach((route) => {
      if (route.itineraries && route.itineraries.length > 0) {
        route.itineraries.forEach((itinerary) => {
          if (itinerary.closest_stop) {
            const stop = itinerary.closest_stop;

            let nextDepartureTime = 'No schedule available';
            let isRealTime = false;

            if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
              const nextDeparture = itinerary.schedule_items[0];
              if (nextDeparture.departure_time) {
                nextDepartureTime = SS.formatDepartureTime(nextDeparture.departure_time);
                isRealTime = SS.isRealTimeDeparture(nextDeparture);
              }
            }

            const stopIcon = L.divIcon({
              className: 'stop-marker',
              html: `<div style="background-color: #${route.route_color || '6A63F6'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });

            const { cls: vehicleClass, text: vehicleText } = SS.getVehicleDisplayData(route);

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
                                    <span class="vehicle-type-value ${vehicleClass}">${vehicleText}</span>
                                </div>
                                <div class="departure-info">
                                    <span class="next-departure">
                                        ${nextDepartureTime}
                                    </span>
                                    <span class="${isRealTime ? 'real-time-badge' : 'scheduled-badge'}">
                                        ${isRealTime ? '\u2022 Real-time' : '\u2022 Scheduled'}
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

            stopMarker.on('popupopen', function () {
              if (window.userLocationMarker) {
                if (window.__activePolyline) {
                  map.removeLayer(window.__activePolyline);
                }
                var userPos = window.userLocationMarker.getLatLng();
                window.__activePolylineTarget = [stop.stop_lat, stop.stop_lon];
                window.__activePolyline = L.polyline([userPos, [stop.stop_lat, stop.stop_lon]], {
                  color: '#6A63F6',
                  weight: 3,
                  dashArray: '8 6',
                  opacity: 0.8,
                }).addTo(map);
              }
            });

            stopMarker.searchText = [
              route.route_short_name,
              route.route_long_name,
              route.route_name,
              route.real_time_route_id,
              itinerary.headsign,
              stop.stop_name,
            ]
              .filter(Boolean)
              .map((s) => s.toLowerCase())
              .join(' ');

            routeMarkers.push(stopMarker);
          }
        });
      }
    });
  };

  const updateRouteArrivalsSection = (routes) => {
    const routeArrivalsContent = document.querySelector('.route-arrivals-content');

    if (!routeArrivalsContent) return;

    routeArrivalsContent.innerHTML = '';

    if (!routes || routes.length === 0) {
      routeArrivalsContent.innerHTML =
        '<div class="route-row"><div class="route-info" style="color:#ABA9A6;">No matching routes</div><div class="arrival-info" style="color:#ABA9A6;">\u2014</div></div>';
      updateShuttleCapacitySection([]);
      return;
    }

    routes.forEach((route) => {
      if (route.itineraries && route.itineraries.length > 0) {
        route.itineraries.forEach((itinerary) => {
          if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
            const scheduleItem = itinerary.schedule_items[0];
            const arrivalText = SS.formatDepartureTimeShort(scheduleItem.departure_time);

            const routeRow = document.createElement('div');
            routeRow.className = 'route-row';

            const routeName = SS.getRouteDisplayName(route);
            const modeText = SS.getVehicleDisplayData(route).text;

            routeRow.innerHTML = `
                        <div class="route-info">
                            ${routeName} (${modeText}) - ${itinerary.headsign || 'Direction Unknown'}
                        </div>
                        <div class="arrival-info">${arrivalText}</div>
                    `;

            routeArrivalsContent.appendChild(routeRow);
          } else {
            const routeRow = document.createElement('div');
            routeRow.className = 'route-row';

            const routeName = SS.getRouteDisplayName(route);

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

        const routeName = SS.getRouteDisplayName(route);

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

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function getOccupancyLevel(route, index) {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
    const isWeekend = day === 0 || day === 6;

    let baseOccupancy;
    if (isPeak) {
      baseOccupancy = 0.82;
    } else if (isWeekend) {
      baseOccupancy = 0.35;
    } else {
      baseOccupancy = 0.55;
    }

    const typeText = SS.getRouteTypeText(route.route_type || 3).toLowerCase();
    if (typeText.includes('subway') || typeText.includes('metro')) {
      baseOccupancy += 0.07;
    } else if (typeText.includes('ferry')) {
      baseOccupancy -= 0.1;
    } else if (typeText.includes('cable') || typeText.includes('aerial')) {
      baseOccupancy -= 0.1;
    }

    const routeName = route.route_short_name || route.real_time_route_id || `Route ${index}`;
    const variation = (hashString(routeName) % 140) / 1000 - 0.07;
    return Math.max(0.1, Math.min(0.95, baseOccupancy + variation));
  }

  const updateShuttleCapacitySection = (routes) => {
    const shuttleCapacityContent = document.querySelector('.shuttle-capacity-content');
    if (!shuttleCapacityContent) return;

    if (routes === undefined) return;

    shuttleCapacityContent.innerHTML = '';

    if (!routes || routes.length === 0) {
      shuttleCapacityContent.innerHTML =
        '<div class="shuttle-row"><div class="shuttle-info" style="color:#ABA9A6;">No routes available</div><div class="seats-info" style="color:#ABA9A6;">—</div></div>';
      return;
    }

    routes.forEach((route, index) => {
      const occupancy = getOccupancyLevel(route, index);

      let occupancyClass;
      let occupancyLabel;
      if (occupancy >= 0.7) {
        occupancyClass = 'low-capacity';
        occupancyLabel = 'Likely Full';
      } else if (occupancy >= 0.4) {
        occupancyClass = 'medium-capacity';
        occupancyLabel = 'Moderate';
      } else {
        occupancyClass = 'high-capacity';
        occupancyLabel = 'Seats Available';
      }

      const routeName = SS.getRouteDisplayName(route);
      const shuttleRow = document.createElement('div');
      shuttleRow.className = 'shuttle-row';
      shuttleRow.innerHTML = `
        <div class="shuttle-info">${routeName}</div>
        <div class="seats-info ${occupancyClass}">
          <span class="capacity-label">${occupancyLabel}</span>
        </div>
      `;
      shuttleCapacityContent.appendChild(shuttleRow);
    });
  };

  const refreshPageData = async () => {
    const center = map.getCenter();

    SS.clearMapMarkers(map, routeMarkers);
    fetchRealTimeBuses(center.lat, center.lng);

    try {
      const displayName = await SS.reverseGeocodeLocation(center.lat, center.lng);
      SS.updateLocationDisplay(displayName);
    } catch (error) {
      console.error('Error getting location name:', error);
      SS.updateLocationDisplay('Current Location');
    }
  };

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
      routeContent.innerHTML =
        '<div class="route-row"><div class="route-info" style="color:#ff6b6b;">Could not load routes</div><div class="arrival-info">\u2014</div></div>';
    }
    if (capacityContent) {
      capacityContent.innerHTML =
        '<div class="shuttle-row"><div class="shuttle-info" style="color:#ff6b6b;">Could not load occupancy</div><div class="seats-info">—</div></div>';
    }

    hideRoutesEmptyState();
  }
})();