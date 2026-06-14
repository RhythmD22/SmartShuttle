// Shared utility functions for SmartShuttle project

function initializeDesktopNotification() {
    const closeNotificationBtn = document.getElementById('closeNotification');
    const desktopNotification = document.getElementById('desktopNotification');

    if (closeNotificationBtn && desktopNotification) {
        closeNotificationBtn.addEventListener('click', () => {
            desktopNotification.style.display = 'none';
        });
    }

    // PWA: register the service worker for offline support and caching.
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

function initializeFeedbackButton(page = 'Feedback.html') {
    const feedbackBtn = document.querySelector('.feedback-btn') || document.querySelector('.menu-btn');

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            if (window.navigateTo) {
                window.navigateTo('feedback');
            } else {
                window.location.href = page;
            }
        });
    }
}

function validateFormFields(requiredFields) {
    for (const [name, value] of Object.entries(requiredFields)) {
        if (!value) {
            alert(`Please select an ${name} before submitting.`);
            return false;
        }
    }
    return true;
}

function validateDescriptionLength(description, minLength = 10) {
    if (description.length < minLength) {
        alert(`Please provide a more detailed description (at least ${minLength} characters).`);
        return false;
    }
    return true;
}

function validateFileSize(file, maxSizeMB = 5) {
    if (file && file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
        return false;
    }
    return true;
}

function updateAttachmentPreview(file, previewElement, previewIcon, previewText) {
    let icon = '📄';
    if (file.type.startsWith('image/')) {
        icon = '🖼️';
    } else if (file.type === 'application/pdf') {
        icon = '📋';
    } else if (file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        icon = '📝';
    } else if (file.type === 'text/plain') {
        icon = '📝';
    }

    if (previewIcon) {
        previewIcon.textContent = icon;
    }

    if (previewText) {
        previewText.textContent = 'Attached';
    }

    if (previewElement) {
        previewElement.style.display = 'block';
    }
    const attachmentLabel = document.getElementById('attachmentLabel');
    if (attachmentLabel) {
        attachmentLabel.style.display = 'none';
    }
}

function resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview) {
    if (attachmentInput) {
        attachmentInput.value = '';
    }
    if (attachmentPreview) {
        attachmentPreview.style.display = 'none';
    }
    if (attachmentLabel) {
        attachmentLabel.style.display = 'flex';
    }
}

// Trailing-edge debounce; used to throttle API calls triggered by typing or
// map panning.
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

const getVehicleTypeClass = (vehicleType) => {
    const type = vehicleType.toLowerCase();

    if (type.includes('bus')) return 'bus';
    if (type.includes('rail') || type.includes('light rail')) return 'rail';
    if (type.includes('subway') || type.includes('metro')) return 'subway';
    if (type.includes('tram') || type.includes('streetcar')) return 'tram';
    if (type.includes('ferry')) return 'ferry';

    return 'bus';
};

function setupKeyboardViewportFix(searchInput) {
    if (!searchInput) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isIOS || !isStandalone) return;

    let keyboardOpen = false;

    searchInput.addEventListener('focus', () => {
        keyboardOpen = true;
    });

    function scheduleLayoutReset() {
        keyboardOpen = false;
        [120, 350, 650].forEach(function (delay) {
            setTimeout(function () {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;

                var containers = document.querySelectorAll('.container');
                for (var i = 0; i < containers.length; i++) {
                    containers[i].style.height = '';
                    void containers[i].offsetHeight;
                }

                if (window.__repositionBottomNav) {
                    window.__repositionBottomNav();
                }
            }, delay);
        });
    }

    searchInput.addEventListener('blur', scheduleLayoutReset);

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            searchInput.blur();
        }
    });
}

function initializeRefreshButton(refreshCallback) {
    const refreshBtn = document.getElementById('refreshBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const refreshIcon = refreshBtn.querySelector('.icon');
            refreshIcon.style.transition = 'transform 0.3s ease';
            refreshIcon.style.transform = 'rotate(360deg)';

            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 300);

            if (refreshCallback && typeof refreshCallback === 'function') {
                refreshCallback();
            }
        });
    }
}