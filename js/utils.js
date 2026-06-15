// Shared utility functions for SmartShuttle project

function initializeDesktopNotification() {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', () => {
            desktopNotification.style.display = 'none';
        });
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
}

function initializeFeedbackButton() {
    const feedbackBtn = document.querySelector('.feedback-btn') || document.querySelector('.menu-btn');

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

function updateAttachmentPreview(file, previewElement, previewIcon, previewText) {
    let icon = '📄';
    if (file.type.startsWith('image/')) {
        icon = '🖼️';
    } else if (file.type === 'application/pdf') {
        icon = '📋';
    } else if (file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        icon = '📝';
    } else if (file.type === 'text/plain') {
        icon = '📝';
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
    const attachmentLabel = document.getElementById('attachmentLabel');
    if (attachmentLabel) {
        attachmentLabel.style.display = 'none';
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

// Trailing-edge debounce; used to throttle API calls triggered by typing or
// map panning.
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const getRouteTypeText = (routeType) => {
    const routeTypes = {
        0: 'Tram, Streetcar, Light rail',
        1: 'Subway, Metro',
        2: 'Rail',
        3: 'Bus',
        4: 'Ferry',
        5: 'Cable tram',
        6: 'Aerial lift, suspended cable car',
        7: 'Funicular',
        11: 'Trolleybus',
        12: 'Monorail'
    };

    return routeTypes[routeType] || `Unknown (${routeType})`;
};

const getVehicleTypeClass = (vehicleType) => {
    const type = vehicleType.toLowerCase();

    if (type.includes('bus')) return 'bus';
    if (type.includes('rail') || type.includes('light rail')) return 'rail';
    if (type.includes('subway') || type.includes('metro')) return 'subway';
    if (type.includes('tram') || type.includes('streetcar')) return 'tram';
    if (type.includes('ferry')) return 'ferry';

    return 'bus';
};

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

// Format a Nominatim display_name to a short city/street level label.
function formatLocationName(displayName) {
    if (!displayName) return 'Current Location';
    const parts = displayName.split(',');
    if (parts.length >= 3) {
        return `${parts[0].trim()}, ${parts[1].trim()}`;
    }
    return parts[0].trim() || 'Current Location';
}

// Persist a selected location to localStorage for cross-page access.
function saveLocationToStorage(lat, lon, displayName) {
    const location = { lat, lon, displayName, timestamp: Date.now() };
    localStorage.setItem('selectedLocation', JSON.stringify(location));
    return location;
}

// Add a user-location marker + accuracy circles to a Leaflet map.
// If a marker already exists on the map, it is replaced.
function addMapUserMarker(map, lat, lng, position) {
    const userIcon = L.divIcon({
        className: 'user-location-icon',
        html: `<img src="images/current.svg" style="width: 24px; height: 24px;">`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
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
        radius: accuracy
    }).addTo(map);

    L.circle([lat, lng], {
        color: '#CCCAF6',
        fillColor: '#CCCAF6',
        fillOpacity: 0.5,
        radius: accuracy * 1.5,
        purpose: 'user-location'
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

// Forward-geocode a query string via Nominatim (US-only, 10 results).
async function searchNominatim(query) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=US&limit=10&addressdetails=1`,
        {
            headers: { 'User-Agent': 'SmartShuttle/1.0 (https://github.com/rhythmd22/SmartShuttle)' }
        }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

// Create a Leaflet map with OpenStreetMap tiles.
function createLeafletMap(elementId) {
    const map = L.map(elementId).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    return map;
}

function updateLocationDisplay(displayName) {
    let el = document.querySelector('.current-location span');
    if (!el) el = document.getElementById('selectedLocationDisplay');
    if (el) el.textContent = displayName || 'Current Location';
}

function initializeLocationSearch(map, onLocationSelected) {
    const searchBtn = document.querySelector('.search-btn');
    const searchModal = document.getElementById('searchModal');
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
            searchResults.innerHTML = '<div class="search-result-item">Error performing search. Please try again.</div>';
        }
    };

    const displaySearchResults = (results) => {
        searchResults.innerHTML = '';
        showCurrentLocationOption();

        if (!results || !Array.isArray(results) || results.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'search-result-item';
            noResult.innerHTML = '<div class="result-title">No results found</div><div class="result-address">Try a different search term</div>';
            searchResults.appendChild(noResult);
            return;
        }

        const validResults = results.filter(result => {
            return result &&
                typeof result.lat !== 'undefined' &&
                typeof result.lon !== 'undefined' &&
                result.display_name;
        });

        const busStops = [];
        const otherLocations = [];

        validResults.forEach(result => {
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

                saveLocationToStorage(lat, lon, result.display_name);
                updateLocationDisplay(result.display_name);
                map.setView([lat, lon], 13);

                searchModal.style.display = 'none';
                searchInput.value = '';
                searchResults.innerHTML = '';

                onLocationSelected(lat, lon, result.display_name);
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
                        searchResults.innerHTML = '<div class="search-result-item">Unable to retrieve your location. Please check permissions.</div>';
                        updateLocationDisplay('Location access denied');
                    }
                );
            } else {
                searchResults.innerHTML = '<div class="search-result-item">Geolocation is not supported by your browser.</div>';
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