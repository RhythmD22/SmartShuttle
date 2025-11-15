// Shared utility functions for SmartShuttle project

// Initialize desktop notification functionality
function initializeDesktopNotification() {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', () => {
            desktopNotification.style.display = 'none';
        });
    }

    // Service Worker registration for PWA functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
}

// Initialize feedback button functionality
function initializeFeedbackButton(page = 'Feedback.html') {
    const feedbackBtn = document.querySelector('.feedback-btn') || document.querySelector('.menu-btn');

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            // Redirect to feedback page
            window.location.href = page;
        });
    }
}

// Validate form fields
function validateFormFields(requiredFields) {
    for (const [name, value] of Object.entries(requiredFields)) {
        if (!value) {
            alert(`Please select an ${name} before submitting.`);
            return false;
        }
    }
    return true;
}

// Validate description length
function validateDescriptionLength(description, minLength = 10) {
    if (description.length < minLength) {
        alert(`Please provide a more detailed description (at least ${minLength} characters).`);
        return false;
    }
    return true;
}

// Validate file size
function validateFileSize(file, maxSizeMB = 5) {
    if (file && file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
        return false;
    }
    return true;
}

// Update attachment preview
function updateAttachmentPreview(file, previewElement, previewIcon, previewText) {
    // Determine appropriate icon based on file type
    let icon = '📄'; // Default document icon
    if (file.type.startsWith('image/')) {
        icon = '🖼️'; // Image icon
    } else if (file.type === 'application/pdf') {
        icon = '📋'; // PDF document
    } else if (file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        icon = '📝'; // Word document
    } else if (file.type === 'text/plain') {
        icon = '📝'; // Text file
    }

    // Update the preview icon and text
    if (previewIcon) {
        previewIcon.textContent = icon;
    }

    if (previewText) {
        previewText.textContent = 'Attached';
    }

    // Show the preview and hide the original button
    if (previewElement) {
        previewElement.style.display = 'block';
    }
    const attachmentLabel = document.getElementById('attachmentLabel');
    if (attachmentLabel) {
        attachmentLabel.style.display = 'none';
    }
}

// Reset attachment UI
function resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview) {
    if (attachmentInput) {
        attachmentInput.value = '';
    }
    if (attachmentPreview) {
        attachmentPreview.style.display = 'none';
    }
    if (attachmentLabel) {
        attachmentLabel.style.display = 'flex'; // or 'block' to match original display
    }
}

// Debounce function to limit API calls
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Helper function to get human-readable route type text
const getRouteTypeText = (routeType) => {
    const routeTypes = {
        0: 'Tram, Streetcar, Light rail',
        1: 'Subway, Metro',
        2: 'Rail',
        3: 'Bus',
        4: 'Ferry',
        5: 'Cable tram',
        6: 'Aerial lift, suspended cable car',
        7: 'Funicular',
        11: 'Trolleybus',
        12: 'Monorail'
    };

    return routeTypes[routeType] || `Unknown (${routeType})`;
};

// Helper function to get CSS class for vehicle type
const getVehicleTypeClass = (vehicleType) => {
    const type = vehicleType.toLowerCase();

    if (type.includes('bus')) return 'bus';
    if (type.includes('rail') || type.includes('light rail')) return 'rail';
    if (type.includes('subway') || type.includes('metro')) return 'subway';
    if (type.includes('tram') || type.includes('streetcar')) return 'tram';
    if (type.includes('ferry')) return 'ferry';

    // Default to bus for unknown types
    return 'bus';
};

// Initialize refresh button functionality
function initializeRefreshButton(refreshCallback) {
    const refreshBtn = document.getElementById('refreshBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Add visual feedback for the refresh action
            const refreshIcon = refreshBtn.querySelector('.icon');
            refreshIcon.style.transition = 'transform 0.3s ease';
            refreshIcon.style.transform = 'rotate(360deg)';

            // Reset the rotation after the animation completes
            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 300);

            // Perform the refresh action if callback provided
            if (refreshCallback && typeof refreshCallback === 'function') {
                refreshCallback();
            }
        });
    }
};