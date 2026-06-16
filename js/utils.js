const SS = (() => {
  let serviceWorkerRegistered = false;

  function registerServiceWorker() {
    if (serviceWorkerRegistered) return;
    serviceWorkerRegistered = true;
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./service-worker.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed: ', error);
          });
      });
    }
  }

  function initializeDesktopNotification() {
    registerServiceWorker();

    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
      closeNotificationBtn.addEventListener('click', () => {
        desktopNotification.style.display = 'none';
      });
    }
  }

  function initializeFeedbackButton() {
    const feedbackBtn =
      document.querySelector('.feedback-btn') || document.querySelector('.menu-btn');

    if (feedbackBtn) {
      feedbackBtn.addEventListener('click', () => {
        if (window.navigateTo) {
          window.navigateTo('feedback');
        } else {
          window.location.href = '/feedback';
        }
      });
    }
  }

  function validateFormFields(requiredFields) {
    for (const [name, value] of Object.entries(requiredFields)) {
      if (!value) {
        alert(`Please select an ${name} before submitting.`);
        return false;
      }
    }
    return true;
  }

  function validateDescriptionLength(description, minLength = 10) {
    if (description.length < minLength) {
      alert(`Please provide a more detailed description (at least ${minLength} characters).`);
      return false;
    }
    return true;
  }

  function validateFileSize(file, maxSizeMB = 5) {
    if (file && file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
      return false;
    }
    return true;
  }

  function updateAttachmentPreview(
    file,
    previewElement,
    previewIcon,
    previewText,
    attachmentLabelEl
  ) {
    let icon = '\u{1F4C4}';
    if (file.type.startsWith('image/')) {
      icon = '\u{1F5BC}\uFE0F';
    } else if (file.type === 'application/pdf') {
      icon = '\u{1F4CB}';
    } else if (
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      icon = '\u{1F4DD}';
    } else if (file.type === 'text/plain') {
      icon = '\u{1F4DD}';
    }

    if (previewIcon) {
      previewIcon.textContent = icon;
    }

    if (previewText) {
      previewText.textContent = 'Attached';
    }

    if (previewElement) {
      previewElement.style.display = 'block';
    }

    const label = attachmentLabelEl || document.getElementById('attachmentLabel');
    if (label) {
      label.style.display = 'none';
    }
  }

  function resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview) {
    if (attachmentInput) {
      attachmentInput.value = '';
    }
    if (attachmentPreview) {
      attachmentPreview.style.display = 'none';
    }
    if (attachmentLabel) {
      attachmentLabel.style.display = 'flex';
    }
  }

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const ROUTE_TYPE_MAP = {
    0: { text: 'Tram, Streetcar, Light rail', cls: 'tram' },
    1: { text: 'Subway, Metro', cls: 'subway' },
    2: { text: 'Rail', cls: 'rail' },
    3: { text: 'Bus', cls: 'bus' },
    4: { text: 'Ferry', cls: 'ferry' },
    5: { text: 'Cable tram', cls: 'tram' },
    6: { text: 'Aerial lift, suspended cable car', cls: 'tram' },
    7: { text: 'Funicular', cls: 'rail' },
    11: { text: 'Trolleybus', cls: 'bus' },
    12: { text: 'Monorail', cls: 'rail' },
  };

  function getRouteTypeInfo(routeType) {
    return ROUTE_TYPE_MAP[routeType] || { text: `Unknown (${routeType})`, cls: 'bus' };
  }

  function getRouteTypeText(routeType) {
    return getRouteTypeInfo(routeType).text;
  }

  function getRouteDisplayName(route) {
    return route.route_short_name || route.real_time_route_id || 'Unknown Route';
  }

  function getVehicleDisplayData(route) {
    const text =
      route.mode_name ||
      (route.route_type !== undefined
        ? getRouteTypeText(route.route_type)
        : route.route_type_id !== undefined
          ? getRouteTypeText(route.route_type_id)
          : 'Bus');
    const type = text.toLowerCase();

    let cls = 'bus';
    if (type.includes('bus')) cls = 'bus';
    else if (type.includes('rail') || type.includes('light rail')) cls = 'rail';
    else if (type.includes('subway') || type.includes('metro')) cls = 'subway';
    else if (type.includes('tram') || type.includes('streetcar')) cls = 'tram';
    else if (type.includes('ferry')) cls = 'ferry';

    return { text, cls };
  }

  function getVehicleTypeClassFromMode(modeName, routeType, routeTypeId) {
    return getVehicleDisplayData({
      mode_name: modeName,
      route_type: routeType,
      route_type_id: routeTypeId,
    }).cls;
  }

  function formatDepartureTime(departureTimestamp) {
    if (!departureTimestamp) return 'No schedule available';

    const now = Date.now() / 1000;
    const timeDiff = Math.max(0, departureTimestamp - now);
    const minutes = Math.ceil(timeDiff / 60);

    if (minutes === 0) return 'Departing now';
    return `Departing in ${minutes} min`;
  }

  function formatDepartureTimeShort(departureTimestamp) {
    if (!departureTimestamp) return '—';

    const now = Date.now() / 1000;
    const timeDiff = Math.max(0, departureTimestamp - now);
    const minutes = Math.ceil(timeDiff / 60);

    if (minutes === 0) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  function isRealTimeDeparture(scheduleItem) {
    return (scheduleItem && scheduleItem.is_real_time) || false;
  }

  function initializeRefreshButton(refreshCallback) {
    const refreshBtn = document.getElementById('refreshBtn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const refreshIcon = refreshBtn.querySelector('.icon');
        refreshIcon.style.transition = 'transform 0.3s ease';
        refreshIcon.style.transform = 'rotate(360deg)';

        setTimeout(() => {
          refreshIcon.style.transform = 'rotate(0deg)';
        }, 300);

        if (refreshCallback && typeof refreshCallback === 'function') {
          refreshCallback();
        }
      });
    }
  }

  function formatLocationName(displayName) {
    if (!displayName) return 'Current Location';
    const parts = displayName.split(',');
    if (parts.length >= 3) {
      return `${parts[0].trim()}, ${parts[1].trim()}`;
    }
    return parts[0].trim() || 'Current Location';
  }

  function saveLocationToStorage(lat, lon, displayName) {
    const location = { lat, lon, displayName, timestamp: Date.now() };
    localStorage.setItem('selectedLocation', JSON.stringify(location));
    return location;
  }

  function addMapUserMarker(map, lat, lng, position) {
    const userIcon = L.divIcon({
      className: 'user-location-icon',
      html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (window.userLocationMarker) {
      map.removeLayer(window.userLocationMarker);
    }

    const userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    userMarker.bindPopup('Your Location').openPopup();
    window.userLocationMarker = userMarker;

    const accuracy = position?.coords?.accuracy || 100;
    L.circle([lat, lng], {
      color: '#6A63F6',
      fillColor: '#6A63F6',
      fillOpacity: 0.5,
      radius: accuracy,
    }).addTo(map);

    L.circle([lat, lng], {
      color: '#CCCAF6',
      fillColor: '#CCCAF6',
      fillOpacity: 0.5,
      radius: accuracy * 1.5,
      purpose: 'user-location',
    }).addTo(map);
  }

  async function reverseGeocodeLocation(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return formatLocationName(data?.display_name);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Current Location';
    }
  }

  async function searchNominatim(query) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=US&limit=10&addressdetails=1`,
      {
        headers: { 'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)' },
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  function createLeafletMap(elementId) {
    const map = L.map(elementId).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    return map;
  }

  function updateLocationDisplay(displayName) {
    let el = document.querySelector('.current-location span');
    if (!el) el = document.getElementById('selectedLocationDisplay');
    if (el) el.textContent = displayName || 'Current Location';
  }

  function initializeLocationSearch(map, onLocationSelected) {
    let searchModal = document.getElementById('searchModal');
    if (!searchModal) {
      const searchTemplate = document.getElementById('template-search-modal');
      if (searchTemplate) {
        const container = document.querySelector('.container');
        if (container) {
          container.appendChild(searchTemplate.content.cloneNode(true));
          searchModal = document.getElementById('searchModal');
        }
      }
    }
    if (!searchModal) return;

    const searchBtn = document.querySelector('.search-btn');
    const closeSearchModal = document.getElementById('closeSearchModal');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    const closeSearchModalFn = () => {
      searchModal.style.display = 'none';
      searchInput.value = '';
      searchResults.innerHTML = '';
    };

    searchBtn.addEventListener('click', () => {
      searchModal.style.display = 'block';
      searchInput.focus();
      showSearchPrompt();
      showCurrentLocationOption();
    });

    closeSearchModal.addEventListener('click', closeSearchModalFn);

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
        showSearchPrompt();
        showCurrentLocationOption();
        return;
      }

      if (query.length < 3) {
        showSearchPrompt('Type at least 3 characters to search');
        return;
      }

      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 400);
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
      showSearchLoading();
      try {
        const generalResults = await searchNominatim(query);
        displaySearchResults(generalResults);
      } catch (error) {
        console.error('Error with search:', error);
        searchResults.innerHTML =
          '<div class="search-result-item">Error performing search. Please try again.</div>';
      }
    };

    const displaySearchResults = (results) => {
      searchResults.innerHTML = '';
      showCurrentLocationOption();

      if (!results || !Array.isArray(results) || results.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'search-result-item';
        noResult.innerHTML =
          '<div class="result-title">No results found</div><div class="result-address">Try a different search term</div>';
        searchResults.appendChild(noResult);
        return;
      }

      const validResults = results.filter((result) => {
        return (
          result &&
          typeof result.lat !== 'undefined' &&
          typeof result.lon !== 'undefined' &&
          result.display_name
        );
      });

      const busStops = [];
      const otherLocations = [];

      validResults.forEach((result) => {
        const isBusStop =
          (result.class === 'highway' && result.type === 'bus_stop') ||
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

      orderedResults.forEach((result) => {
        const isBusStop = busStops.includes(result);
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result-item';

        const typeBadge = isBusStop ? '<span class="result-type">Bus Stop</span>' : '';

        resultElement.innerHTML = `
                    <div class="result-title">${result.display_name}${typeBadge}</div>
                    <div class="result-address">${result.address?.state || result.address?.county || result.address?.country || ''}</div>
                `;

        resultElement.addEventListener('click', () => {
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);

          if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            console.error('Invalid coordinates from search result:', lat, lon);
            return;
          }

          selectLocation(lat, lon, result.display_name);
        });

        searchResults.appendChild(resultElement);
      });
    };

    const showSearchPrompt = (message) => {
      searchResults.innerHTML = '';
      const prompt = document.createElement('div');
      prompt.className = 'search-prompt';
      prompt.innerHTML = `
                <div class="search-prompt-icon">&#128270;</div>
                <div>${message || 'Search for a city, address, or stop'}</div>
            `;
      searchResults.appendChild(prompt);
    };

    const showSearchLoading = () => {
      searchResults.innerHTML = '';
      const loading = document.createElement('div');
      loading.className = 'search-loading';
      loading.innerHTML = '<div class="search-loading-spinner"></div> Searching...';
      searchResults.appendChild(loading);
    };

    const showCurrentLocationOption = () => {
      const existing = searchResults.querySelector('.current-location-option');
      if (existing) existing.remove();

      const currentLocationElement = document.createElement('div');
      currentLocationElement.className = 'search-result-item current-location-option';
      currentLocationElement.innerHTML = `
                <div class="result-title">&#128205; Current Location</div>
                <div class="result-address">Use your device GPS</div>
            `;

      currentLocationElement.addEventListener('click', () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;

              try {
                const displayName = await reverseGeocodeLocation(userLat, userLng);
                selectLocation(userLat, userLng, displayName);
              } catch (error) {
                console.error('Error getting location name:', error);
                selectLocation(userLat, userLng, 'Current Location');
              }
            },
            (error) => {
              console.error('Error getting current location:', error);
              searchResults.innerHTML =
                '<div class="search-result-item">Unable to retrieve your location. Please check permissions.</div>';
              updateLocationDisplay('Location access denied');
            }
          );
        } else {
          searchResults.innerHTML =
            '<div class="search-result-item">Geolocation is not supported by your browser.</div>';
        }
      });

      searchResults.insertBefore(currentLocationElement, searchResults.firstChild);
    };

    const selectLocation = (lat, lng, displayName) => {
      saveLocationToStorage(lat, lng, displayName);
      updateLocationDisplay(displayName);
      map.setView([lat, lng], 13);

      searchModal.style.display = 'none';
      searchInput.value = '';
      searchResults.innerHTML = '';

      addMapUserMarker(map, lat, lng, null);

      onLocationSelected(lat, lng, displayName);
    };
  }

  function hideBottomNavOnSearch(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener('focus', () => {
      const nav = document.getElementById('bottomNav');
      if (nav) nav.classList.add('search-active');
    });
    inputEl.addEventListener('blur', () => {
      const nav = document.getElementById('bottomNav');
      if (nav) nav.classList.remove('search-active');
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    });
  }

  function clearMapMarkers(map, markersArray) {
    if (!map || !markersArray) return;
    markersArray.forEach((marker) => map.removeLayer(marker));
    markersArray.length = 0;
  }

  function showSkeletons(container, count = 3) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const row = document.createElement('div');
      row.className = 'skeleton-row';
      row.innerHTML =
        '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';
      container.appendChild(row);
    }
  }

  function pageInit(initFn) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.isSPA) {
        initFn();
      }
    });
  }

  function initializeTransitMap(options) {
    const {
      elementId = 'map',
      onLocationReady,
      zoom = 15,
      defaultCenter = [39.8283, -98.5795],
      defaultZoom = 4,
    } = options;

    const mapInstance = createLeafletMap(elementId);

    if (options.invalidateDelay) {
      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, options.invalidateDelay);
    }

    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showUserLocation, handleLocationError);
      } else {
        console.error('Geolocation is not supported by this browser.');
        handleLocationError({ code: -1, message: 'Not supported' });
      }
    };

    const showUserLocation = async (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      addMapUserMarker(mapInstance, userLat, userLng, position);
      mapInstance.setView([userLat, userLng], zoom);

      try {
        const displayName = await reverseGeocodeLocation(userLat, userLng);
        updateLocationDisplay(displayName);
      } catch (error) {
        console.error('Error getting location name:', error);
        updateLocationDisplay('Current Location');
      }

      if (onLocationReady) onLocationReady(userLat, userLng);
    };

    const handleLocationError = async (error) => {
      console.error(
        'Unable to retrieve your location. Error code: ' +
        error.code +
        ', Message: ' +
        error.message
      );
      updateLocationDisplay('Location unavailable');

      if (options.fallbackToSaved) {
        const savedLocation = localStorage.getItem('selectedLocation');
        if (savedLocation) {
          try {
            const locationData = JSON.parse(savedLocation);
            updateLocationDisplay(locationData.displayName || 'Current Location');
            mapInstance.setView([locationData.lat, locationData.lon], zoom);
            if (onLocationReady) onLocationReady(locationData.lat, locationData.lon);
            return;
          } catch (e) {
            console.error('Error loading saved location:', e);
          }
        }
      }

      const [defaultLat, defaultLng] = defaultCenter;
      const defaultMarker = L.marker([defaultLat, defaultLng]).addTo(mapInstance);
      defaultMarker.bindPopup('Default Location (location access blocked)').openPopup();
      mapInstance.setView([defaultLat, defaultLng], defaultZoom);

      try {
        const displayName = await reverseGeocodeLocation(defaultLat, defaultLng);
        updateLocationDisplay(displayName);
      } catch (e) {
        console.error('Error getting location name:', e);
        updateLocationDisplay('Location unavailable');
      }

      if (onLocationReady) onLocationReady(defaultLat, defaultLng);
    };

    mapInstance.whenReady(() => {
      let savedLocationHandled = false;

      if (options.useSavedLocation !== false) {
        const savedLocation = localStorage.getItem('selectedLocation');
        if (savedLocation) {
          try {
            const locationData = JSON.parse(savedLocation);
            updateLocationDisplay(locationData.displayName || 'Current Location');
            mapInstance.setView([locationData.lat, locationData.lon], zoom);
            addMapUserMarker(mapInstance, locationData.lat, locationData.lon, null);
            if (onLocationReady) onLocationReady(locationData.lat, locationData.lon);
            savedLocationHandled = true;
          } catch (e) {
            console.error('Error loading saved location:', e);
          }
        }
      }

      if (!savedLocationHandled) {
        getUserLocation();
      }
    });

    return mapInstance;
  }

  return {
    initializeDesktopNotification,
    initializeFeedbackButton,
    validateFormFields,
    validateDescriptionLength,
    validateFileSize,
    updateAttachmentPreview,
    resetAttachmentUI,
    debounce,
    getRouteTypeText,
    getRouteDisplayName,
    getVehicleDisplayData,
    getVehicleTypeClassFromMode,
    formatDepartureTime,
    formatDepartureTimeShort,
    isRealTimeDeparture,
    initializeRefreshButton,
    formatLocationName,
    saveLocationToStorage,
    addMapUserMarker,
    reverseGeocodeLocation,
    searchNominatim,
    createLeafletMap,
    updateLocationDisplay,
    initializeLocationSearch,
    hideBottomNavOnSearch,
    clearMapMarkers,
    showSkeletons,
    pageInit,
    initializeTransitMap,
  };
})();

window.SS = SS;
export { SS };