// JavaScript for Landing Page

window.initIndexPage = () => {
    // Get the status indicator element
    const statusIndicator = document.getElementById('statusIndicator');

    // Add click event to the status indicator to demonstrate interactivity
    if (statusIndicator) {
        statusIndicator.addEventListener('click', () => {
            alert('Bus status: Currently tracking');
        });
    }

    // Add click event to the next button
    const nextButton = document.getElementById('nextButton');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            // Navigate to the Stops page
            if (window.navigateTo) {
                window.navigateTo('stops');
            } else {
                window.location.href = 'Stops.html';
            }
        });
    }

    // Initialize desktop notification functionality
    initializeDesktopNotification();
};

// Fallback for standalone loading
document.addEventListener('DOMContentLoaded', () => {
    if (!window.isSPA) {
        window.initIndexPage();
    }
});