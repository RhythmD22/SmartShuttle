window.initIndexPage = () => {
    const statusIndicator = document.getElementById('statusIndicator');

    // Placeholder: clicking the LIVE status pill just confirms it's live.
    // Replace with a real status panel when one is built.
    if (statusIndicator) {
        statusIndicator.addEventListener('click', () => {
            alert('Bus status: Currently tracking');
        });
    }

    const nextButton = document.getElementById('nextButton');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (window.navigateTo) {
                window.navigateTo('stops');
            } else {
                window.location.href = 'Stops.html';
            }
        });
    }

    initializeDesktopNotification();
};

// Standalone-page fallback: the SPA loads this via initIndexPage, but if the
// page is opened directly (not through the router) we still need to boot it.
document.addEventListener('DOMContentLoaded', () => {
    if (!window.isSPA) {
        window.initIndexPage();
    }
});