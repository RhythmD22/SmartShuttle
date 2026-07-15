import { SS } from './utils.js';
import { TransitCache } from './cache.js';

(() => {
  let map;
  let shuttleMarkers = [];
  let debouncedFindShuttles;

  window.initStopsPage = () => {
    map = null;
    shuttleMarkers = [];

    initializeMap();
    initializeSearch();
    SS.initializeFeedbackButton();
    SS.initializeDesktopNotification();
    SS.initializeRefreshButton(refreshPageData);
  };

  SS.pageInit(window.initStopsPage);

  const displayStopsFromData = (transitData) => {
    const stopCountDisplay = document.getElementById('stopCountDisplay');

    SS.clearMapMarkers(map, shuttleMarkers);

    if (transitData.nearby_routes && transitData.nearby_routes.length > 0) {
      let stopCount = 0;
      transitData.nearby_routes.forEach((route) => {
        if (route.merged_itineraries && route.merged_itineraries.length > 0) {
          route.merged_itineraries.forEach((itinerary) => {
            if (itinerary.itineraries?.[0]?.canonical_itinerary === false) return;
            if (itinerary.closest_stop) {
              stopCount++;
              const stop = itinerary.closest_stop;

              const routeColor = route.route_color || '413C96';
              const stopIcon = L.divIcon({
                className: 'stop-icon',
                html: `<div style="background-color: #${routeColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              });

              const { cls: vehicleClass, text: vehicleText } = SS.getVehicleDisplayData(route);
              const networkName = route.route_network_name ? ` &middot; ${route.route_network_name}` : '';

              let departureHTML = '';
              if (itinerary.schedule_items && itinerary.schedule_items.length > 0) {
                const nextItem = itinerary.schedule_items.find(
                  (si) => si.departure_time && !si.is_cancelled
                );
                if (nextItem) {
                  const timeText = SS.formatDepartureTime(nextItem.departure_time);
                  const lastNote = nextItem.is_last ? ' &middot; <span class="last-bus-badge">Last bus</span>' : '';
                  departureHTML = `<div class="departure-info">${timeText}${lastNote}</div>`;
                } else if (itinerary.schedule_items[0].is_cancelled) {
                  departureHTML = '<div class="departure-info cancelled">Cancelled</div>';
                }
              }

              const popupContent = `
                                        <div class="bus-stop-popup">
                                            <h3 class="stop-name">${stop.stop_name}${networkName}</h3>
                                            ${departureHTML}
                                            <div class="popup-details">
                                                <div class="vehicle-type">
                                                    <span class="vehicle-type-label">Vehicle:</span>
                                                    <span class="vehicle-type-value ${vehicleClass}">${vehicleText}</span>
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
                purpose: 'bus-stop',
              })
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

              shuttleMarkers.push(stopMarker);
            }
          });
        }
      });

      if (stopCount === 0) {
        if (stopCountDisplay) stopCountDisplay.textContent = 'No stops nearby';
      } else {
        if (stopCountDisplay)
          stopCountDisplay.textContent = `${stopCount} ${stopCount === 1 ? 'stop' : 'stops'} nearby`;
      }
    } else {
      if (stopCountDisplay) stopCountDisplay.textContent = 'No stops nearby';
    }
  };

  const initShuttleFinder = () => {
    const stopCountDisplay = document.getElementById('stopCountDisplay');

    debouncedFindShuttles = SS.debounce(async (lat, lng) => {
      if (stopCountDisplay) stopCountDisplay.textContent = 'Searching...';

      let hasCachedData = false;

      try {
        const cached = await TransitCache.getTransitData(lat, lng);
        if (cached && cached.data) {
          displayStopsFromData(cached.data);
          SS.renderShapesOnMap(map, cached.data.nearby_routes);
          hasCachedData = true;
        }
      } catch (e) {
        // Cache read failed — proceed to fetch fresh data
      }

      try {
        const transitResponse = await fetch(
          `/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true&include_stops_and_shapes=true&stop_detailed=true`
        );

        if (!transitResponse.ok) {
          throw new Error(`Transit API error! status: ${transitResponse.status}`);
        }

        const transitData = await transitResponse.json();

        TransitCache.setTransitData(lat, lng, transitData);

        displayStopsFromData(transitData);
        SS.renderShapesOnMap(map, transitData.nearby_routes);
        hasCachedData = false;
      } catch (error) {
        console.error('Error finding nearby bus stops:', error);
        if (!hasCachedData && stopCountDisplay) {
          stopCountDisplay.textContent = 'Unable to load stops';
        }
      }
    }, 800);
  };

  const findNearbyShuttles = async (lat, lng) => {
    if (debouncedFindShuttles) {
      debouncedFindShuttles(lat, lng);
    }
  };

  const initializeMap = () => {
    initShuttleFinder();

    map = SS.initializeTransitMap({
      elementId: 'map',
      zoom: 15,
      onLocationReady: (lat, lng) => findNearbyShuttles(lat, lng),
    });

    map.on('moveend', () => {
      if (map._programmaticMove) {
        map._programmaticMove = false;
        return;
      }
      const center = map.getCenter();
      findNearbyShuttles(center.lat, center.lng);
    });

    map.on('click', function () {
      if (window.__activePolyline) {
        map.removeLayer(window.__activePolyline);
        window.__activePolyline = null;
        window.__activePolylineTarget = null;
      }
    });
  };

  const initializeSearch = () => {
    SS.initializeLocationSearch(map, (lat, lng) => {
      findNearbyShuttles(lat, lng);
    });
  };

  const refreshPageData = async () => {
    const center = map.getCenter();

    SS.clearMapMarkers(map, shuttleMarkers);
    findNearbyShuttles(center.lat, center.lng);

    try {
      const displayName = await SS.reverseGeocodeLocation(center.lat, center.lng);
      SS.updateLocationDisplay(displayName);
    } catch (error) {
      console.error('Error getting location name:', error);
      SS.updateLocationDisplay('Current Location');
    }
  };
})();