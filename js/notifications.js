(() => {
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let lastUpdated = null;

    window.initNotificationsPage = () => {
        currentFilter = 'all';
        currentSearchTerm = '';

        initializeDesktopNotification();
        initializeFeedbackButton();
        initializeRefreshButton(refreshLiveAlerts);
        initializeSearch();
        initializePullToRefresh();
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

        if (searchInput) {
            searchInput.addEventListener('focus', function () {
                const nav = document.getElementById('bottomNav');
                if (nav) nav.classList.add('search-active');
            });

            searchInput.addEventListener('blur', function () {
                const nav = document.getElementById('bottomNav');
                if (nav) nav.classList.remove('search-active');
                setTimeout(function () {
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                }, 100);
            });
        }

        if (searchPill && searchInput) {
            searchPill.addEventListener('click', () => {
                searchInput.focus();
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

                    saveLocationToStorage(userLat, userLng, 'Current Location');

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

        showAlertSkeletons(container);

        try {
            // The Transit API returns routes near the user, and each
            // route carries its own alerts.
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
            updateLiveFeedTimestamp();
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

        const severity = (alert.severity || 'Info').toLowerCase();
        const severityLabel = alert.severity || 'Info';

        const affectedRoutes = extractAffectedRoutes(alert.informed_entities, route);

        const timeAgo = alert.created_at ? formatTimeAgo(alert.created_at) : '';

        const alertElement = document.createElement('div');
        alertElement.className = 'live-alert-item';
        alertElement.dataset.effect = displayEffect;
        alertElement.dataset.severity = severity;
        alertElement.innerHTML = `
        <img src="images/${icon}" alt="${title}" class="live-alert-icon">
        <div class="live-alert-text">
            <div class="live-alert-title">
                ${title}
                <span class="live-alert-severity ${severity}">${severityLabel}</span>
            </div>
            <div class="live-alert-description">${alert.description || 'Service disruption on route'}</div>
            ${affectedRoutes ? `<div class="live-alert-routes">${affectedRoutes}</div>` : ''}
            ${timeAgo ? `<div class="live-alert-time">${timeAgo}</div>` : ''}
        </div>
    `;

        container.appendChild(alertElement);
    };

    function extractAffectedRoutes(informedEntities, currentRoute) {
        if (!informedEntities || !informedEntities.length) return '';

        const routeIds = [];
        informedEntities.forEach(entity => {
            if (entity.global_route_id) {
                const parts = entity.global_route_id.split('|');
                const shortName = parts.length > 1 ? parts[1] : entity.global_route_id;
                if (!routeIds.includes(shortName)) {
                    routeIds.push(shortName);
                }
            }
        });

        if (currentRoute && currentRoute.route_short_name && !routeIds.includes(currentRoute.route_short_name)) {
            routeIds.push(currentRoute.route_short_name);
        }

        if (!routeIds.length) return '';

        const displayRoutes = routeIds.slice(0, 5);
        const tags = displayRoutes.map(id => `<span class="live-alert-route-tag">${id}</span>`).join('');
        const more = routeIds.length > 5 ? `<span class="live-alert-route-tag">+${routeIds.length - 5} more</span>` : '';

        return tags + more;
    }

    function formatTimeAgo(unixTimestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - unixTimestamp;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    function updateLiveFeedTimestamp() {
        lastUpdated = Math.floor(Date.now() / 1000);
        refreshLiveFeedTimestamp();
    }

    function refreshLiveFeedTimestamp() {
        const el = document.getElementById('liveFeedUpdated');
        if (!el || !lastUpdated) return;

        const now = Math.floor(Date.now() / 1000);
        const diff = now - lastUpdated;

        if (diff < 60) {
            el.textContent = 'Updated just now';
        } else if (diff < 3600) {
            el.textContent = 'Updated ' + Math.floor(diff / 60) + 'm ago';
        } else {
            el.textContent = 'Updated ' + Math.floor(diff / 3600) + 'h ago';
        }
    }

    let timestampInterval = setInterval(refreshLiveFeedTimestamp, 30000);

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
            const searchText = item.textContent.toLowerCase();

            const matchesFilter = filterValue === 'all' || alertEffect === filterValue;
            const matchesSearch = currentSearchTerm === '' ||
                searchText.includes(currentSearchTerm);

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

    function showAlertSkeletons(container) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const row = document.createElement('div');
            row.className = 'skeleton-row';
            row.style.padding = '10px 0';
            row.innerHTML = '<div class="skeleton skeleton-text" style="height:14px; width:80%;"></div>';
            container.appendChild(row);
        }
    }

    function initializePullToRefresh() {
        const mainContent = document.getElementById('notificationsMainContent');
        const ptr = document.getElementById('pullToRefresh');

        if (!mainContent || !ptr) return;

        let startY = 0;
        let pulling = false;
        const threshold = 80;

        mainContent.addEventListener('touchstart', function (e) {
            if (mainContent.scrollTop <= 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        }, { passive: true });

        mainContent.addEventListener('touchmove', function (e) {
            if (!pulling) return;
            const deltaY = e.touches[0].clientY - startY;
            if (deltaY > 0 && mainContent.scrollTop <= 0) {
                ptr.style.height = Math.min(deltaY * 0.5, 60) + 'px';
            }
        }, { passive: true });

        mainContent.addEventListener('touchend', function () {
            if (!pulling) return;
            pulling = false;

            const currentHeight = parseFloat(ptr.style.height) || 0;
            if (currentHeight >= threshold) {
                ptr.classList.add('refreshing');
                refreshLiveAlerts();
                setTimeout(function () {
                    ptr.classList.remove('refreshing');
                    ptr.style.height = '0';
                }, 1000);
            } else {
                ptr.style.height = '0';
            }
        });
    }
})();