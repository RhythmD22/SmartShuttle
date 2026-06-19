import { SS } from './utils.js';

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

  const initShuttleFinder = () => {
    const stopCountDisplay = document.getElementById('stopCountDisplay');

    debouncedFindShuttles = SS.debounce(async (lat, lng) => {
      SS.clearMapMarkers(map, shuttleMarkers);

      if (stopCountDisplay) stopCountDisplay.textContent = 'Searching...';

      try {
        const transitResponse = await fetch(
          `/api/transit/nearby_routes?lat=${lat}&lon=${lng}&max_distance=1500&should_update_realtime=true`
        );

        if (!transitResponse.ok) {
          throw new Error(`Transit API error! status: ${transitResponse.status}`);
        }

        const transitData = await transitResponse.json();

        if (transitData.routes && transitData.routes.length > 0) {
          let stopCount = 0;
          transitData.routes.forEach((route) => {
            if (route.itineraries && route.itineraries.length > 0) {
              route.itineraries.forEach((itinerary) => {
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

                  const popupContent = `
                                        <div class="bus-stop-popup">
                                            <h3 class="stop-name">${stop.stop_name}</h3>
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