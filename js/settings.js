// JavaScript for Settings page

document.addEventListener('DOMContentLoaded', function () {
    initializeDesktopNotification();
    initializeFeedbackButton();
    initializeThemeToggle();
    initializeNotificationToggleSync();
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

// Initialize notification toggle synchronization with status icons
function initializeNotificationToggleSync() {
    // Get all the toggle switches
    const toggleSwitches = [
        document.getElementById('delayAlertsToggle'),
        document.getElementById('routeChangesToggle'),
        document.getElementById('arrivalTimesToggle')
    ];

    // Get all the status icons
    const statusIcons = [
        document.getElementById('statusIcon0'),
        document.getElementById('statusIcon1'),
        document.getElementById('statusIcon2')
    ];

    // Set initial state for each toggle based on existing icons
    // Initially assume offstatus is for off and onstatus is for on
    toggleSwitches.forEach((toggle, index) => {
        if (toggle && statusIcons[index]) {
            if (statusIcons[index].src.includes('onstatus')) {
                toggle.checked = true;
            } else {
                toggle.checked = false;
            }

            // Add event listener to each toggle
            toggle.addEventListener('change', function () {
                // Update the corresponding status icon
                if (this.checked) {
                    statusIcons[index].src = 'images/onstatus.svg';
                } else {
                    statusIcons[index].src = 'images/offstatus.svg';
                }
            });
        }
    });
}