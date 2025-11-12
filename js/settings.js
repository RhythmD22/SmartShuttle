// JavaScript for Settings page

document.addEventListener('DOMContentLoaded', function () {
    initializeDesktopNotification();
    initializeFeedbackButton();
    initializeThemeToggle();
    initializeRefreshButton();
    setupLiveFeedUpdates();

});

// Initialize desktop notification functionality
function initializeDesktopNotification() {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', function () {
            desktopNotification.style.display = 'none';
        });
    }

    // Service Worker registration for PWA functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('./service-worker.js')
                .then(function (registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(function (error) {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
}

// Initialize feedback button functionality
function initializeFeedbackButton() {
    const feedbackBtn = document.querySelector('.feedback-btn');

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function () {
            // Redirect to feedback page
            window.location.href = 'feedback.html';
        });
    }
}

// Initialize theme toggle functionality
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
        // Check for saved theme preference or default to light theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', function () {
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
}

// Initialize live feed functionality
function initializeLiveFeed() {
    // Get saved location from localStorage (from live notifications page)
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
}

// Get the user's current location
function getCurrentLocation() {
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
}

// Display message when no location is selected
function displayNoLocationMessage() {
    const container = document.getElementById('liveAlertsContainer');
    container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No location selected</div><div class="live-alert-description">Please select a location in Live Notifications first</div></div></div>';
}

// Fetch live alerts from Transit API
async function fetchLiveAlerts(lat, lon) {
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
            // Filter routes that have alerts
            const routesWithAlerts = data.routes.filter(route => route.alerts && route.alerts.length > 0);

            if (routesWithAlerts.length > 0) {
                // Process each route's alerts while avoiding duplicates
                let alertsFound = false;
                const displayedAlerts = new Set(); // To track unique alerts

                routesWithAlerts.forEach(route => {
                    if (route.alerts && route.alerts.length > 0) {
                        route.alerts.forEach(alert => {
                            // Create a unique identifier for the alert to check for duplicates
                            const alertIdentifier = `${alert.effect}-${alert.title || ''}-${alert.description || ''}`;

                            // Only add if we haven't seen this alert before
                            if (!displayedAlerts.has(alertIdentifier)) {
                                displayedAlerts.add(alertIdentifier);
                                addAlertToFeed(alert, route);
                                alertsFound = true;
                            }
                        });
                    }
                });

                if (!alertsFound) {
                    container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No service alerts</div><div class="live-alert-description">No service disruptions in your area at this time</div></div></div>';
                }
            } else {
                // If no alerts found in nearby routes, show a message
                container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No service alerts</div><div class="live-alert-description">No service disruptions in your area at this time</div></div></div>';
            }
        } else {
            container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No routes found</div><div class="live-alert-description">No transit routes found in your area</div></div></div>';
        }
    } catch (error) {
        console.error('Error fetching live alerts:', error);
        container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">Error loading alerts</div><div class="live-alert-description">Could not fetch service alerts. Please check your connection.</div></div></div>';
    }
}

// Add an alert to the live feed
function addAlertToFeed(alert, route) {
    const container = document.getElementById('liveAlertsContainer');

    // Map alert effect to appropriate icon and text
    let icon = 'alert.svg';
    let title = alert.title || 'Service Alert';

    // Determine icon based on alert effect
    switch (alert.effect) {
        case 'NO_SERVICE':
            icon = 'alert.svg';
            title = 'No Service';
            break;
        case 'SIGNIFICANT_DELAYS':
            icon = 'clock.svg';
            title = 'Significant Delays';
            break;
        case 'DETOUR':
            icon = 'directions.svg';
            title = 'Detour';
            break;
        default:
            icon = 'alert.svg';
            title = alert.title || 'Service Alert';
    }

    // Create alert element with data attribute for filtering
    const alertElement = document.createElement('div');
    alertElement.className = 'live-alert-item';
    alertElement.dataset.effect = alert.effect || 'OTHER_EFFECT';
    alertElement.innerHTML = `
        <img src="images/${icon}" alt="${title}" class="live-alert-icon">
        <div class="live-alert-text">
            <div class="live-alert-title">${title}</div>
            <div class="live-alert-description">${alert.description || 'Service disruption on route'}</div>
        </div>
    `;

    // Add to container
    container.appendChild(alertElement);
}

// Initialize alert filter functionality
function initializeAlertFilters() {
    const filterButtons = document.querySelectorAll('.alert-filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Apply filter
            const filterValue = this.getAttribute('data-filter');
            applyAlertFilter(filterValue);
        });
    });
}

// Apply the selected filter to show only matching alerts
function applyAlertFilter(filterValue) {
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
}

// Initialize refresh button functionality
function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            // Add visual feedback for the refresh action
            const refreshIcon = refreshBtn.querySelector('.icon');
            refreshIcon.style.transition = 'transform 0.3s ease';
            refreshIcon.style.transform = 'rotate(360deg)';

            // Reset the rotation after the animation completes
            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 300);

            // Perform the refresh action
            refreshLiveAlerts();
        });
    }
}

// Refresh function to update live alerts
function refreshLiveAlerts() {
    // Get saved location from localStorage (from live notifications page)
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
}

// Update live feed periodically (every 5 minutes)
function setupLiveFeedUpdates() {
    // Initial load
    initializeLiveFeed();
    initializeAlertFilters(); // Initialize filters after live feed is loaded

    // Update every 5 minutes
    setInterval(initializeLiveFeed, 5 * 60 * 1000);
}

