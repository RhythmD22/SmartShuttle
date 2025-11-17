// JavaScript for Notifications page

// Variable to track the currently selected filter
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    initializeDesktopNotification();
    initializeFeedbackButton();
    initializeThemeToggle();
    initializeRefreshButton(refreshLiveAlerts);
    setupLiveFeedUpdates();

});

// Initialize theme toggle functionality
const initializeThemeToggle = () => {
    const themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
        // Check for saved theme preference or default to light theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', () => {
            if (this.checked) {
                // Switch to dark theme
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                // Switch to light theme
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }
};

// Initialize live feed functionality
const initializeLiveFeed = () => {
    // Get saved location from localStorage (from routes page)
    const savedLocation = localStorage.getItem('selectedNotificationLocation');

    if (savedLocation) {
        try {
            const locationData = JSON.parse(savedLocation);
            fetchLiveAlerts(locationData.lat, locationData.lon);
        } catch (e) {
            console.error('Error parsing saved location:', e);
        }
    } else {
        // If no saved location, try to get current location
        getCurrentLocation();
    }
};

// Get the user's current location
const getCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                // Save the current location to localStorage
                const selectedLocation = {
                    lat: userLat,
                    lon: userLng,
                    displayName: 'Current Location',
                    timestamp: Date.now()
                };
                localStorage.setItem('selectedNotificationLocation', JSON.stringify(selectedLocation));

                // Fetch alerts for current location
                fetchLiveAlerts(userLat, userLng);
            },
            error => {
                console.error('Error getting current location:', error);
                displayNoLocationMessage();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // 1 minute
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
        displayNoLocationMessage();
    }
};

// Display message when no location is selected
const displayNoLocationMessage = () => {
    const container = document.getElementById('liveAlertsContainer');
    container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No location selected</div><div class="live-alert-description">Please select a location in Routes first</div></div></div>';

    // Apply the current filter even for location messages
    applyAlertFilter(currentFilter);
};

// Fetch live alerts from Transit API
const fetchLiveAlerts = async (lat, lon) => {
    const container = document.getElementById('liveAlertsContainer');

    try {
        // Get nearby routes to find alerts associated with them
        // Using the same API endpoint as live-notifications.js but for alerts
        const response = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lon}&max_distance=1500&should_update_realtime=true`);

        if (!response.ok) {
            throw new Error(`Transit API error: ${response.status}`);
        }

        const data = await response.json();

        // Clear previous content
        container.innerHTML = '';

        if (data.routes && data.routes.length > 0) {
            // Collect all alerts from all routes and deduplicate them
            let allAlerts = [];
            const displayedAlerts = new Set(); // To track unique alerts globally

            data.routes.forEach(route => {
                if (route.alerts && route.alerts.length > 0) {
                    route.alerts.forEach(alert => {
                        // Create a unique identifier for the alert to check for duplicates
                        // Use the alert ID if available, otherwise create a hash from available fields
                        const alertIdentifier = alert.id ||
                            `${alert.effect}-${alert.title || ''}-${alert.description || ''}-${JSON.stringify(alert.informed_entities || [])}`;

                        // Only add if we haven't seen this alert before
                        if (!displayedAlerts.has(alertIdentifier)) {
                            displayedAlerts.add(alertIdentifier);
                            // Include route information with the alert for display purposes
                            allAlerts.push({ alert, route });
                        }
                    });
                }
            });

            if (allAlerts.length > 0) {
                // Add all unique alerts to the feed
                allAlerts.forEach(({ alert, route }) => {
                    addAlertToFeed(alert, route);
                });
            } else {
                // If no alerts found in nearby routes, show a message
                container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No alerts</div><div class="live-alert-description">No transit disruptions in your area at this time.</div></div></div>';
            }
        } else {
            container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No routes found</div><div class="live-alert-description">No transit routes found in your area</div></div></div>';
        }

        // Apply the current filter after all alerts have been added to the feed
        applyAlertFilter(currentFilter);
    } catch (error) {
        console.error('Error fetching live alerts:', error);
        container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">Error loading alerts</div><div class="live-alert-description">Could not fetch service alerts. Please check your connection.</div></div></div>';

        // Apply the current filter even for error messages
        applyAlertFilter(currentFilter);
    }
};

// Add an alert to the live feed
const addAlertToFeed = (alert, route) => {
    const container = document.getElementById('liveAlertsContainer');

    // Map alert effect to appropriate icon and text
    let icon = 'alert.svg';
    let title = alert.title || 'Service Alert';

    // Determine display category for filtering (grouping service-related effects)
    let displayEffect = alert.effect || 'OTHER_EFFECT';

    // Determine icon based on alert effect
    switch (alert.effect) {
        case 'NO_SERVICE':
        case 'REDUCED_SERVICE':
        case 'ADDITIONAL_SERVICE':
        case 'MODIFIED_SERVICE':
            icon = 'alert.svg';
            // Set a generic title for all service-related alerts under "Service" filter
            title = 'Service Alert'; // Or use the original title if available
            if (alert.title) {
                title = alert.title;
            } else {
                // Use specific names if no title provided
                switch (alert.effect) {
                    case 'NO_SERVICE': title = 'No Service'; break;
                    case 'REDUCED_SERVICE': title = 'Reduced Service'; break;
                    case 'ADDITIONAL_SERVICE': title = 'Additional Service'; break;
                    case 'MODIFIED_SERVICE': title = 'Modified Service'; break;
                    default: title = 'Service Alert'; break;
                }
            }
            displayEffect = 'SERVICE'; // Group all service-related effects under "Service" filter
            break;
        case 'SIGNIFICANT_DELAYS':
            icon = 'clock.svg';
            title = 'Significant Delays';
            displayEffect = 'SIGNIFICANT_DELAYS';
            break;
        case 'DETOUR':
            icon = 'directions.svg';
            title = 'Detour';
            displayEffect = 'DETOUR';
            break;
        default:
            icon = 'alert.svg';
            title = alert.title || 'Service Alert';
            displayEffect = 'SERVICE'; // Default to service for other effects
    }

    // Create alert element with data attribute for filtering
    const alertElement = document.createElement('div');
    alertElement.className = 'live-alert-item';
    alertElement.dataset.effect = displayEffect;
    alertElement.innerHTML = `
        <img src="images/${icon}" alt="${title}" class="live-alert-icon">
        <div class="live-alert-text">
            <div class="live-alert-title">${title}</div>
            <div class="live-alert-description">${alert.description || 'Service disruption on route'}</div>
        </div>
    `;

    // Add to container
    container.appendChild(alertElement);
};

// Initialize alert filter functionality
const initializeAlertFilters = () => {
    const filterButtons = document.querySelectorAll('.alert-filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Apply filter
            currentFilter = this.getAttribute('data-filter');
            applyAlertFilter(currentFilter);
        });
    });
};

// Apply the selected filter to show only matching alerts
const applyAlertFilter = (filterValue) => {
    const alertItems = document.querySelectorAll('.live-alert-item');

    alertItems.forEach(item => {
        const alertEffect = item.dataset.effect || '';

        if (filterValue === 'all') {
            // Show all items
            item.style.display = 'flex';
        } else {
            // Show only items that match the filter
            if (alertEffect === filterValue) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        }
    });
};

// Refresh function to update live alerts
const refreshLiveAlerts = () => {
    // Get saved location from localStorage (from routes page)
    const savedLocation = localStorage.getItem('selectedNotificationLocation');

    if (savedLocation) {
        try {
            const locationData = JSON.parse(savedLocation);
            fetchLiveAlerts(locationData.lat, locationData.lon);
        } catch (e) {
            console.error('Error parsing saved location:', e);
            getCurrentLocation();
        }
    } else {
        // If no saved location, try to get current location
        getCurrentLocation();
    }
};

// Update live feed periodically (every 5 minutes)
const setupLiveFeedUpdates = () => {
    // Set default filter to 'all' on initial load
    currentFilter = 'all';

    // Initial load
    initializeLiveFeed();
    initializeAlertFilters(); // Initialize filters after live feed is loaded

    // Update every 5 minutes
    setInterval(initializeLiveFeed, 5 * 60 * 1000);
};