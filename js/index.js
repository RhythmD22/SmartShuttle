// JavaScript for Landing Page

// Ensure DOM is fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
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
            window.location.href = 'Stops.html';
        });
    }

    // Initialize desktop notification functionality
    initializeDesktopNotification();
});