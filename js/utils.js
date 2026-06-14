// Shared utility functions for SmartShuttle project

function initializeDesktopNotification() {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', () => {
            desktopNotification.style.display = 'none';
        });
    }

    // PWA: register the service worker for offline support and caching.
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

// Reverse-geocode coordinates to a human-readable location name.
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

// Promise-based wrapper for navigator.geolocation.getCurrentPosition.
function getCurrentPositionPromise(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

// Update a .current-location span or #selectedLocationDisplay with a name.
function updateLocationDisplay(displayName) {
    let el = document.querySelector('.current-location span');
    if (!el) el = document.getElementById('selectedLocationDisplay');
    if (el) el.textContent = displayName || 'Current Location';
}