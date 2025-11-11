// JavaScript for Settings page

document.addEventListener('DOMContentLoaded', function () {
    initializeDesktopNotification();
    initializeFeedbackButton();
    initializeThemeToggle();
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
        // If no saved location, display message to select location in live notifications
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
                // Process each route's alerts
                let alertsFound = false;
                routesWithAlerts.forEach(route => {
                    if (route.alerts && route.alerts.length > 0) {
                        route.alerts.forEach(alert => {
                            addAlertToFeed(alert, route);
                            alertsFound = true;
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

    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = 'live-alert-item';
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

// Update live feed periodically (every 5 minutes)
function setupLiveFeedUpdates() {
    // Initial load
    initializeLiveFeed();

    // Update every 5 minutes
    setInterval(initializeLiveFeed, 5 * 60 * 1000);
}

