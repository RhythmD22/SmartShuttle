(() => {
    let currentFilter = 'all';
    let currentSearchTerm = '';

    window.initNotificationsPage = () => {
        currentFilter = 'all';
        currentSearchTerm = '';

        initializeDesktopNotification();
        initializeFeedbackButton();
        initializeThemeToggle();
        initializeRefreshButton(refreshLiveAlerts);
        initializeSearch();
        setupLiveFeedUpdates();
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.isSPA) {
            window.initNotificationsPage();
        }
    });

    const initializeSearch = () => {
        const searchInput = document.getElementById('notificationSearchInput');
        const searchPill = document.querySelector('.notification-search-pill');
        const filterContainer = document.querySelector('.alert-filter-container');

        if (searchPill && searchInput) {
            searchPill.addEventListener('click', () => {
                searchInput.focus();
            });

            searchInput.addEventListener('focus', () => {
                if (filterContainer) {
                    // Wait for the iOS keyboard to finish opening (~300ms) before
                    // scrolling, otherwise it scrolls the wrong amount.
                    setTimeout(() => {
                        filterContainer.scrollTo({
                            left: filterContainer.scrollWidth,
                            behavior: 'smooth'
                        });
                    }, 320);
                }
            });

            searchInput.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value.toLowerCase();
                applyAlertFilter(currentFilter);

                if (currentSearchTerm.length > 0) {
                    searchPill.classList.add('expanded');
                } else {
                    searchPill.classList.remove('expanded');
                }
            });

            searchInput.addEventListener('blur', () => {
                if (searchInput.value.trim() === '') {
                    searchPill.classList.remove('expanded');
                }
            });
        }
    };

    const initializeThemeToggle = () => {
        const themeToggle = document.getElementById('themeToggle');

        if (themeToggle) {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                themeToggle.checked = true;
            }

            themeToggle.addEventListener('change', () => {
                if (themeToggle.checked) {
                    document.body.classList.add('dark-theme');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.body.classList.remove('dark-theme');
                    localStorage.setItem('theme', 'light');
                }
            });
        }
    };

    const initializeLiveFeed = () => {
        const savedLocation = localStorage.getItem('selectedLocation');

        if (savedLocation) {
            try {
                const locationData = JSON.parse(savedLocation);
                fetchLiveAlerts(locationData.lat, locationData.lon);
            } catch (e) {
                console.error('Error parsing saved location:', e);
            }
        } else {
            getCurrentLocation();
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    const selectedLocation = {
                        lat: userLat,
                        lon: userLng,
                        displayName: 'Current Location',
                        timestamp: Date.now()
                    };
                    localStorage.setItem('selectedLocation', JSON.stringify(selectedLocation));

                    fetchLiveAlerts(userLat, userLng);
                },
                error => {
                    console.error('Error getting current location:', error);
                    displayNoLocationMessage();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            displayNoLocationMessage();
        }
    };

    const displayNoLocationMessage = () => {
        const container = document.getElementById('liveAlertsContainer');
        container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No location selected</div><div class="live-alert-description">Please select a location in Routes first</div></div></div>';

        applyAlertFilter(currentFilter);
    };

    const fetchLiveAlerts = async (lat, lon) => {
        const container = document.getElementById('liveAlertsContainer');

        try {
            // Same endpoint as live-notifications.js: the Transit API returns
            // routes near the user, and each route carries its own alerts.
            const response = await fetch(`/api/transit/nearby_routes?lat=${lat}&lon=${lon}&max_distance=1500&should_update_realtime=true`);

            if (!response.ok) {
                throw new Error(`Transit API error: ${response.status}`);
            }

            const data = await response.json();

            container.innerHTML = '';

            if (data.routes && data.routes.length > 0) {
                const allAlerts = [];
                // Alerts can appear under multiple nearby routes; dedupe by an
                // id (or a content hash when no id is provided) so the user
                // doesn't see the same disruption twice.
                const displayedAlerts = new Set();

                data.routes.forEach(route => {
                    if (route.alerts && route.alerts.length > 0) {
                        route.alerts.forEach(alert => {
                            const alertIdentifier = alert.id ||
                                `${alert.effect}-${alert.title || ''}-${alert.description || ''}-${JSON.stringify(alert.informed_entities || [])}`;

                            if (!displayedAlerts.has(alertIdentifier)) {
                                displayedAlerts.add(alertIdentifier);
                                allAlerts.push({ alert, route });
                            }
                        });
                    }
                });

                if (allAlerts.length > 0) {
                    allAlerts.forEach(({ alert, route }) => {
                        addAlertToFeed(alert, route);
                    });
                } else {
                    container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No alerts</div><div class="live-alert-description">No transit disruptions in your area at this time.</div></div></div>';
                }
            } else {
                container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">No routes found</div><div class="live-alert-description">No transit routes found in your area</div></div></div>';
            }

            applyAlertFilter(currentFilter);
        } catch (error) {
            console.error('Error fetching live alerts:', error);
            container.innerHTML = '<div class="live-alert-item"><div class="live-alert-text"><div class="live-alert-title">Error loading alerts</div><div class="live-alert-description">Could not fetch service alerts. Please check your connection.</div></div></div>';

            applyAlertFilter(currentFilter);
        }
    };

    const addAlertToFeed = (alert, route) => {
        const container = document.getElementById('liveAlertsContainer');

        let icon = 'alert.svg';
        let title = alert.title || 'Service Alert';

        // All service-class effects (NO_SERVICE, REDUCED_SERVICE, etc.) are
        // grouped under the single "Service" filter, hence the SERVICE bucket.
        let displayEffect = alert.effect || 'OTHER_EFFECT';

        switch (alert.effect) {
            case 'NO_SERVICE':
            case 'REDUCED_SERVICE':
            case 'ADDITIONAL_SERVICE':
            case 'MODIFIED_SERVICE':
                icon = 'alert.svg';
                if (alert.title) {
                    title = alert.title;
                } else {
                    switch (alert.effect) {
                        case 'NO_SERVICE': title = 'No Service'; break;
                        case 'REDUCED_SERVICE': title = 'Reduced Service'; break;
                        case 'ADDITIONAL_SERVICE': title = 'Additional Service'; break;
                        case 'MODIFIED_SERVICE': title = 'Modified Service'; break;
                        default: title = 'Service Alert'; break;
                    }
                }
                displayEffect = 'SERVICE';
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
                displayEffect = 'SERVICE';
        }

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

        container.appendChild(alertElement);
    };

    const initializeAlertFilters = () => {
        const filterButtons = document.querySelectorAll('.alert-filter-btn');

        filterButtons.forEach(button => {
            button.addEventListener('click', function () {
                filterButtons.forEach(btn => btn.classList.remove('active'));

                this.classList.add('active');

                currentFilter = this.getAttribute('data-filter');
                applyAlertFilter(currentFilter);
            });
        });
    };

    const applyAlertFilter = (filterValue) => {
        const alertItems = document.querySelectorAll('.live-alert-item');

        alertItems.forEach(item => {
            const alertEffect = item.dataset.effect || '';
            const titleElement = item.querySelector('.live-alert-title');
            const descElement = item.querySelector('.live-alert-description');

            const title = titleElement ? titleElement.textContent.toLowerCase() : '';
            const description = descElement ? descElement.textContent.toLowerCase() : '';

            const matchesFilter = filterValue === 'all' || alertEffect === filterValue;
            const matchesSearch = currentSearchTerm === '' ||
                title.includes(currentSearchTerm) ||
                description.includes(currentSearchTerm);

            item.style.display = matchesFilter && matchesSearch ? 'flex' : 'none';
        });
    };

    const refreshLiveAlerts = () => {
        const savedLocation = localStorage.getItem('selectedLocation');

        if (savedLocation) {
            try {
                const locationData = JSON.parse(savedLocation);
                fetchLiveAlerts(locationData.lat, locationData.lon);
            } catch (e) {
                console.error('Error parsing saved location:', e);
                getCurrentLocation();
            }
        } else {
            getCurrentLocation();
        }
    };

    const setupLiveFeedUpdates = () => {
        currentFilter = 'all';

        initializeLiveFeed();
        initializeAlertFilters();

        if (window.notificationsInterval) {
            clearInterval(window.notificationsInterval);
        }
        window.notificationsInterval = setInterval(initializeLiveFeed, 5 * 60 * 1000);
    };
})();