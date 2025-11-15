// JavaScript for Feedback page
// Import shared utilities

document.addEventListener('DOMContentLoaded', function () {
    initializeDesktopNotification();
    initializeFeedbackButton();
    initializeFeedbackForm();
    initializeBackButton();
});

// Initialize feedback form functionality
function initializeFeedbackForm() {
    const submitBtn = document.getElementById('submitFeedback');
    const descriptionText = document.getElementById('descriptionText');
    const issueType = document.getElementById('issueType');
    const attachmentInput = document.getElementById('attachmentInput');
    const attachmentLabel = document.getElementById('attachmentLabel');
    const attachmentPreview = document.getElementById('attachmentPreview');
    const attachmentPreviewIcon = document.querySelector('#attachmentPreview .attachment-preview-icon');
    const attachmentPreviewText = document.querySelector('#attachmentPreview .attachment-preview-text');

    // Handle file selection
    if (attachmentInput) {
        attachmentInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const file = this.files[0];

                // Use shared utility function to update preview
                updateAttachmentPreview(file, attachmentPreview, attachmentPreviewIcon, attachmentPreviewText);

                if (attachmentLabel) {
                    attachmentLabel.style.display = 'none';
                }
            }
        });
    }

    // Handle preview click to allow re-uploading
    if (attachmentPreview) {
        attachmentPreview.addEventListener('click', () => {
            // Use shared utility to reset attachment UI
            resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            handleFeedbackSubmission(submitBtn, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
        });
    }
}

// Main function to handle feedback submission
function handleFeedbackSubmission(submitBtn, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview) {
    // Get form values
    const selectedIssueType = issueType ? issueType.value : '';
    const descriptionValue = descriptionText ? descriptionText.value.trim() : '';

    // Validate required fields using shared utility
    if (!validateFormFields({ 'issue type': selectedIssueType, 'description': descriptionValue })) {
        return;
    }

    // Disable submit button during submission to prevent duplicate submissions
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    // Additional validation for description length using shared utility
    if (!validateDescriptionLength(descriptionValue)) {
        resetSubmitButton(submitBtn, originalText);
        return;
    }

    // Additional validation for file size (limit to 5MB) using shared utility
    if (attachmentInput && attachmentInput.files.length > 0) {
        const file = attachmentInput.files[0];
        if (!validateFileSize(file)) {
            resetSubmitButton(submitBtn, originalText);
            return;
        }
    }

    // Prepare basic email parameters for the API
    let emailParams = {
        to_name: 'Rhythm Desai',
        issue_type: selectedIssueType,
        description: descriptionValue,
        attachment_info: attachmentInput && attachmentInput.files.length > 0 ? 'Attachment included' : 'No attachment'
    };

    // Handle file attachment if present
    if (attachmentInput && attachmentInput.files.length > 0) {
        const file = attachmentInput.files[0];

        // For image files, convert to base64 to embed in email
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();

            reader.onload = function (event) {
                // Update emailParams with base64 image data
                emailParams.image_attachment = event.target.result;
                emailParams.attachment_name = file.name;

                // Include attachment metadata in the attachment_info
                emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                // Send the email through our API proxy
                sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
            };

            reader.onerror = function () {
                console.error("Error reading file");
                alert('Error reading the file. Please try again.');

                // Include attachment metadata in the attachment_info even if there's an error reading the file
                emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                // Still send the email without the actual attachment data through our API proxy
                sendFeedbackAPIWithoutAttachment(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, "without attachment");
            };

            reader.readAsDataURL(file); // Convert image to base64
            return; // Return early since we're handling asynchronously
        } else {
            // For non-image files, include the metadata in attachment_info
            emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;
        }
    }

    // Send email through our API proxy without attachment processing
    sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
}

// Function to send feedback via API with attachment
function sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview) {
    fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailParams)
    })
        .then(response => response.json())
        .then(data => {
            handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, "");
        })
        .catch(error => {
            console.log('FAILED...', error);
            // Reset form state anyway so user can try again
            resetSubmitButton(submitBtn, originalText);
        });
}

// Function to send feedback via API without attachment when file read fails
function sendFeedbackAPIWithoutAttachment(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
    fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailParams)
    })
        .then(response => response.json())
        .then(data => {
            handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage);
        })
        .catch(error => {
            console.log('FAILED...', error);
            // Reset form state anyway so user can try again
            resetSubmitButton(submitBtn, originalText);
        });
}

// Generic function to handle API responses
function handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
    if (data.success) {
        console.log('SUCCESS!', data);

        // Show success popup to user instead of alert
        showFeedbackPopup('✅', 'Thank You!', `Your feedback has been received!${suffixMessage ? ' (' + suffixMessage + ')' : ''}`);

        // Reset form
        if (issueType) issueType.value = '';
        if (descriptionText) descriptionText.value = '';

        // Use shared utility to reset attachment UI
        resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

        // Re-enable submit button
        resetSubmitButton(submitBtn, originalText);
    } else {
        // Hide error popup but still handle error appropriately
        console.log('FAILED...', data.error || 'Failed to send feedback');

        // Show error popup to user
        showFeedbackPopup('❌', 'Error', 'Failed to send feedback. Please try again.');

        // Reset form state anyway so user can try again
        resetSubmitButton(submitBtn, originalText);
    }
}

// Function to show feedback popup
function showFeedbackPopup(icon, title, message) {
    // Create overlay element if it doesn't exist
    let overlay = document.getElementById('feedbackPopupOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'feedbackPopupOverlay';
        overlay.className = 'popup-overlay';

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'popup-content';

        // Create popup elements
        const iconElement = document.createElement('div');
        iconElement.className = 'popup-icon';
        iconElement.textContent = icon;

        const titleElement = document.createElement('h3');
        titleElement.className = 'popup-title';
        titleElement.textContent = title;

        const messageElement = document.createElement('p');
        messageElement.className = 'popup-message';
        messageElement.textContent = message;

        const buttonElement = document.createElement('button');
        buttonElement.className = 'popup-button';
        buttonElement.textContent = 'OK';
        buttonElement.onclick = function () {
            hideFeedbackPopup(overlay);
        };

        // Add elements to popup content
        popupContent.appendChild(iconElement);
        popupContent.appendChild(titleElement);
        popupContent.appendChild(messageElement);
        popupContent.appendChild(buttonElement);

        // Add popup content to overlay
        overlay.appendChild(popupContent);

        // Add overlay to body
        document.body.appendChild(overlay);
    } else {
        // Update existing popup content
        const iconElement = overlay.querySelector('.popup-icon');
        const titleElement = overlay.querySelector('.popup-title');
        const messageElement = overlay.querySelector('.popup-message');
        iconElement.textContent = icon;
        titleElement.textContent = title;
        messageElement.textContent = message;
    }

    // Show the popup
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);

    // Close popup after 5 seconds if not manually closed
    if (icon === '✅') { // Only auto-close success messages
        setTimeout(() => {
            hideFeedbackPopup(overlay);
        }, 5000);
    }
}

// Function to hide feedback popup
function hideFeedbackPopup(overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 300);
}

// Function to initialize back button functionality
function initializeBackButton() {
    const backBtn = document.querySelector('.back-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Use history.back() to go back to the previous page
            window.history.back();
        });
    }
}

// Function to reset submit button state
function resetSubmitButton(submitBtn, originalText) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
}