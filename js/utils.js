// Shared utility functions for SmartShuttle project

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
function initializeFeedbackButton(page = 'Feedback.html') {
    const feedbackBtn = document.querySelector('.feedback-btn') || document.querySelector('.menu-btn');

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function () {
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