// JavaScript for Landing Page

// Ensure DOM is fully loaded before running scripts
document.addEventListener('DOMContentLoaded', function () {
    // Get the status indicator element
    const statusIndicator = document.getElementById('statusIndicator');

    // Add click event to the status indicator to demonstrate interactivity
    if (statusIndicator) {
        statusIndicator.addEventListener('click', function () {
            alert('Bus status: Currently tracking');
        });
    }

    // Add click event to the next button
    const nextButton = document.getElementById('nextButton');
    if (nextButton) {
        nextButton.addEventListener('click', function () {
            // Navigate to the Live Tracking page
            window.location.href = 'live-tracking.html';
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
});

// Additional utility functions can be added here

// Add functionality to close desktop notification
document.addEventListener('DOMContentLoaded', function () {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', function () {
            desktopNotification.style.display = 'none';
        });
    }
});