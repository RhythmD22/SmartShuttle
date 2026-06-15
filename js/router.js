// SPA Router for SmartShuttle
window.isSPA = true;

const routes = {
    landing: {
        templateId: 'template-landing',
        styleId: 'style-index',
        bodyClass: 'home-page',
        init: () => window.initIndexPage && window.initIndexPage(),
        title: 'SmartShuttle - Live Shuttle Tracker',
        path: '/'
    },
    stops: {
        templateId: 'template-stops',
        styleId: 'style-stops',
        bodyClass: '',
        init: () => window.initStopsPage && window.initStopsPage(),
        title: 'SmartShuttle - Stops',
        path: '/stops',
        swipeEnabled: true
    },
    routes: {
        templateId: 'template-routes',
        styleId: 'style-routes',
        bodyClass: '',
        init: () => window.initRoutesPage && window.initRoutesPage(),
        title: 'SmartShuttle - Routes',
        path: '/routes',
        swipeEnabled: true
    },
    notifications: {
        templateId: 'template-notifications',
        styleId: 'style-notifications',
        bodyClass: '',
        init: () => window.initNotificationsPage && window.initNotificationsPage(),
        title: 'SmartShuttle - Notifications',
        path: '/notifications',
        swipeEnabled: true
    },
    feedback: {
        templateId: 'template-feedback',
        styleId: 'style-feedback',
        bodyClass: '',
        init: () => window.initFeedbackPage && window.initFeedbackPage(),
        title: 'SmartShuttle - Feedback',
        path: '/feedback'
    }
};

function resolveRouteFromUrl() {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (hash.includes('stops') || path.includes('stops')) return 'stops';
    if (hash.includes('routes') || path.includes('routes')) return 'routes';
    if (hash.includes('notifications') || path.includes('notifications')) return 'notifications';
    if (hash.includes('feedback') || path.includes('feedback')) return 'feedback';
    if (hash.includes('landing') || path.includes('landing') || path.includes('index') || path === '/' || path === '') return 'landing';

    return 'landing';
}

window.navigateTo = function (routeName, pushState = true, options = {}) {
    const route = routes[routeName];
    if (!route) return;

    const skipTransition = options.skipTransition === true;
    const supportsViewTransition = typeof document.startViewTransition === 'function';

    // Clear any running interval from notifications page
    if (window.notificationsInterval) {
        clearInterval(window.notificationsInterval);
        window.notificationsInterval = null;
    }

    // Tear down any swipe handlers from the previous route
    if (window.__tearDownSwipeNavigation) {
        window.__tearDownSwipeNavigation();
    }

    // All visual state changes go inside performSwap so the View Transitions
    // API sees one atomic old -> new transition with no intermediate paint.
    // The new content is serialized to a string first so #app-root is never
    // momentarily empty.
    const performSwap = () => {
        Object.values(routes).forEach(r => {
            const link = document.getElementById(r.styleId);
            if (link) {
                link.disabled = (r.styleId !== route.styleId);
            }
        });

        document.body.className = route.bodyClass;

        const appRoot = document.getElementById('app-root');
        const template = document.getElementById(route.templateId);
        if (appRoot && template) {
            const wrapper = document.createElement('div');
            wrapper.appendChild(template.content.cloneNode(true));
            appRoot.innerHTML = wrapper.innerHTML;
        }
        document.title = route.title;

        updateBottomNav(routeName, { instant: routeName === 'feedback' });
    };

    if (supportsViewTransition && !skipTransition) {
        const transition = document.startViewTransition(performSwap);
        // Initialize the new view once the new DOM state is committed (before
        // the animation finishes) so the page is interactive as early as possible.
        transition.updateCallbackDone.then(() => {
            setTimeout(() => route.init(), 0);
        });
    } else {
        performSwap();
        const appRoot = document.getElementById('app-root');
        const newContainer = appRoot ? appRoot.firstElementChild : null;
        if (newContainer && !skipTransition) {
            newContainer.classList.add('app-page-enter');
            const cleanup = () => newContainer.classList.remove('app-page-enter');
            newContainer.addEventListener('animationend', cleanup, { once: true });
            setTimeout(cleanup, 500);
        }
        setTimeout(() => route.init(), 0);
    }

    if (pushState) {
        try {
            window.history.pushState({ route: routeName }, route.title, route.path);
        } catch (e) {
            console.warn('History pushState blocked (possibly file:// protocol):', e);
            window.location.hash = '/' + routeName;
        }
    }

    if (route.swipeEnabled) {
        setupSwipeNavigation(routeName);
    }

    window.__currentRouteName = routeName;
};

// Ordered list of bottom-nav routes (left-to-right) used for swipe navigation
const swipeNavOrder = ['stops', 'routes', 'notifications'];
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_VERTICAL = 75;
const SWIPE_MAX_DURATION = 600;
let swipeState = null;

function setupSwipeNavigation(currentRoute) {
    swipeState = null;

    const currentIndex = swipeNavOrder.indexOf(currentRoute);
    if (currentIndex === -1) return;

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < swipeNavOrder.length - 1;
    if (!hasPrev && !hasNext) return;

    const handleTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        swipeState = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now()
        };
    };

    const handleTouchEnd = (e) => {
        if (!swipeState) return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - swipeState.startX;
        const deltaY = touch.clientY - swipeState.startY;
        const elapsed = Date.now() - swipeState.startTime;
        swipeState = null;

        if (elapsed > SWIPE_MAX_DURATION) return;
        if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;
        if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL) return;

        // Ignore swipes that start inside the map (Leaflet handles its own
        // pan gestures) or any element marked swipe-ignore.
        const startTarget = e.target;
        if (startTarget && startTarget.closest) {
            const scrollable = startTarget.closest('.swipe-ignore, .map-container');
            if (scrollable) return;
        }

        if (deltaX < 0 && hasNext) {
            window.navigateTo(swipeNavOrder[currentIndex + 1], true);
        } else if (deltaX > 0 && hasPrev) {
            window.navigateTo(swipeNavOrder[currentIndex - 1], true);
        }
    };

    const handleTouchCancel = () => {
        swipeState = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Expose a teardown function on the window for the next navigateTo call
    window.__tearDownSwipeNavigation = () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchCancel);
        window.__tearDownSwipeNavigation = null;
    };
}

function setFixedLayoutHeight() {
    document.body.style.height = window.innerHeight + 'px';
    const containers = document.querySelectorAll('.container');
    for (let i = 0; i < containers.length; i++) {
        containers[i].style.height = '';
    }
}

function repositionBottomNav() {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;

    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    bottomNav.classList.toggle('landscape-hidden', isLandscape && isStandalone);
}

function updateBottomNav(routeName, options = {}) {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;

    repositionBottomNav();

    const route = routes[routeName];
    const shouldShow = !!(route && route.swipeEnabled);

    if (options.instant) {
        const prev = bottomNav.style.transition;
        bottomNav.style.transition = 'none';
        bottomNav.classList.toggle('visible', shouldShow);
        void bottomNav.offsetHeight;
        bottomNav.style.transition = prev;
    } else {
        bottomNav.classList.toggle('visible', shouldShow);
    }

    if (shouldShow) {
        const items = bottomNav.querySelectorAll('.nav-item');
        items.forEach(item => {
            item.classList.toggle('active', item.dataset.route === routeName);
        });
    }
}

window.addEventListener('resize', function () {
    setFixedLayoutHeight();
    repositionBottomNav();
});
window.addEventListener('orientationchange', function () {
    setTimeout(function () {
        setFixedLayoutHeight();
        repositionBottomNav();
    }, 100);
});

window.addEventListener('popstate', (event) => {
    const routeName = resolveRouteFromUrl();
    window.navigateTo(routeName, false);
});

document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    if (anchor.getAttribute('target') === '_blank' || href.startsWith('http') || href.startsWith('//')) {
        return;
    }

    let route = null;
    if (href.toLowerCase().includes('stops')) route = 'stops';
    else if (href.toLowerCase().includes('routes')) route = 'routes';
    else if (href.toLowerCase().includes('notifications')) route = 'notifications';
    else if (href.toLowerCase().includes('feedback')) route = 'feedback';
    else if (href.toLowerCase().includes('index') || href.toLowerCase().includes('landing') || href === '/') route = 'landing';

    if (route) {
        e.preventDefault();
        window.navigateTo(route);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    setFixedLayoutHeight();
    const initialRoute = resolveRouteFromUrl();
    window.navigateTo(initialRoute, false, { skipTransition: true });
});